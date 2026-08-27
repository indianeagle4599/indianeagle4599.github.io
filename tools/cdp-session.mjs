#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webm': 'video/webm',
    '.xml': 'application/xml; charset=utf-8'
};

export function delay(milliseconds) {
    return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

async function firstExisting(paths) {
    for (const path of paths.filter(Boolean)) {
        try {
            await access(path);
            return path;
        } catch (error) {}
    }
    return '';
}

export async function findBrowser(override) {
    if (override) {
        const path = resolve(override);
        if (await firstExisting([path])) return path;
        throw new Error(`Browser not found: ${path}`);
    }

    const programFiles = process.env.ProgramFiles || process.env.PROGRAMFILES;
    const programFilesX86 = process.env['ProgramFiles(x86)'] || process.env.PROGRAMFILES_X86;
    const localAppData = process.env.LOCALAPPDATA;
    const browser = await firstExisting([
        programFilesX86 && join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        programFiles && join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        localAppData && join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
    ]);
    if (!browser) throw new Error('Chrome or Edge was not found. Pass --browser PATH.');
    return browser;
}

export function startServer(root = ROOT) {
    const server = createServer(async (request, response) => {
        try {
            const url = new URL(request.url, 'http://localhost');
            let pathname = decodeURIComponent(url.pathname);
            if (pathname.endsWith('/')) pathname += 'index.html';
            const filePath = resolve(root, '.' + pathname);
            if (filePath !== root && !filePath.startsWith(root + sep)) {
                response.writeHead(403).end('Forbidden');
                return;
            }
            const body = await readFile(filePath);
            response.writeHead(200, {
                'Cache-Control': 'no-store',
                'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream'
            });
            response.end(body);
        } catch (error) {
            response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
        }
    });

    return new Promise((resolvePromise, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolvePromise({ server, url: `http://127.0.0.1:${port}/` });
        });
    });
}

async function waitForDebugger(userDataDir, browserProcess) {
    const activePortFile = join(userDataDir, 'DevToolsActivePort');
    for (let attempt = 0; attempt < 200; attempt++) {
        if (browserProcess.exitCode !== null) throw new Error(`Browser exited with code ${browserProcess.exitCode}`);
        try {
            const [port] = (await readFile(activePortFile, 'utf8')).split(/\r?\n/);
            if (port) return Number(port);
        } catch (error) {}
        await delay(50);
    }
    throw new Error('Timed out waiting for the browser debugger.');
}

function launchBrowser(executable, userDataDir) {
    const args = [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-default-browser-check',
        '--no-first-run',
        '--remote-allow-origins=*',
        '--remote-debugging-port=0',
        `--user-data-dir=${userDataDir}`,
        'about:blank'
    ];
    if (typeof process.getuid === 'function' && process.getuid() === 0) args.unshift('--no-sandbox');
    return spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

export class CdpClient {
    constructor(url) {
        this.id = 0;
        this.listeners = new Map();
        this.pending = new Map();
        this.socket = new WebSocket(url);
    }

    async open() {
        await new Promise((resolvePromise, reject) => {
            this.socket.addEventListener('open', resolvePromise, { once: true });
            this.socket.addEventListener('error', reject, { once: true });
        });
        this.socket.addEventListener('message', event => this.handleMessage(event.data));
    }

    handleMessage(data) {
        const message = JSON.parse(typeof data === 'string' ? data : Buffer.from(data).toString());
        if (message.id) {
            const pending = this.pending.get(message.id);
            if (!pending) return;
            this.pending.delete(message.id);
            if (message.error) pending.reject(new Error(message.error.message));
            else pending.resolve(message.result || {});
            return;
        }
        (this.listeners.get(message.method) || []).forEach(listener => listener(message.params || {}));
    }

    on(method, listener) {
        const listeners = this.listeners.get(method) || [];
        listeners.push(listener);
        this.listeners.set(method, listeners);
    }

    once(method, timeout = 15000) {
        return new Promise((resolvePromise, reject) => {
            const listener = params => {
                clearTimeout(timer);
                const listeners = this.listeners.get(method) || [];
                this.listeners.set(method, listeners.filter(item => item !== listener));
                resolvePromise(params);
            };
            const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
            this.on(method, listener);
        });
    }

    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((resolvePromise, reject) => {
            this.pending.set(id, { reject, resolve: resolvePromise });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    close() {
        this.socket.close();
    }
}

export async function evaluate(client, expression) {
    const response = await client.send('Runtime.evaluate', {
        awaitPromise: true,
        expression,
        returnByValue: true
    });
    if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Page evaluation failed');
    }
    return response.result?.value;
}

async function stopBrowser(browserProcess) {
    if (!browserProcess || browserProcess.exitCode !== null) return;
    const exited = new Promise(resolvePromise => browserProcess.once('exit', resolvePromise));
    browserProcess.kill();
    await Promise.race([exited, delay(3000)]);
    if (browserProcess.exitCode === null) {
        browserProcess.kill('SIGKILL');
        await Promise.race([exited, delay(3000)]);
    }
}

async function removeBrowserProfile(userDataDir) {
    if (!userDataDir) return;
    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            await rm(userDataDir, { force: true, recursive: true });
            return;
        } catch (error) {
            if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 19) throw error;
            await delay(100);
        }
    }
}

export async function openSession({ browser, baseUrl } = {}) {
    const browserPath = await findBrowser(browser);
    let localServer;
    let browserProcess;
    let client;
    let userDataDir;

    const serverInfo = baseUrl ? null : await startServer();
    localServer = serverInfo?.server;
    const url = baseUrl || serverInfo.url;
    userDataDir = await mkdtemp(join(tmpdir(), 'portfolio-cdp-'));
    browserProcess = launchBrowser(browserPath, userDataDir);
    const debugPort = await waitForDebugger(userDataDir, browserProcess);
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response => response.json());
    const target = targets.find(item => item.type === 'page');
    if (!target) throw new Error('The browser did not expose a page target.');

    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await Promise.all([
        client.send('Log.enable'),
        client.send('Network.enable'),
        client.send('Page.enable'),
        client.send('Page.setLifecycleEventsEnabled', { enabled: true }),
        client.send('Runtime.enable')
    ]);

    return {
        browserPath,
        client,
        url,
        async close() {
            if (client) client.close();
            await stopBrowser(browserProcess);
            if (localServer) await new Promise(resolvePromise => localServer.close(resolvePromise));
            await removeBrowserProfile(userDataDir);
        }
    };
}

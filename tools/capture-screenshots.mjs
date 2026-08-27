#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT = join(ROOT, '.artifacts', 'screenshots-spacing');

const VIEWPORTS = {
    desktop: { width: 1440, height: 900 },
    laptop: { width: 1366, height: 768 },
    tabletLandscape: { width: 1024, height: 768 },
    tabletPortrait: { width: 768, height: 1024 },
    mobileLarge: { width: 430, height: 932 },
    mobile: { width: 390, height: 844 },
    mobileCompact: { width: 360, height: 800 },
    mobileSmall: { width: 320, height: 568 }
};

const PRESETS = {
    quick: ['desktop', 'mobile'],
    core: ['desktop', 'tabletPortrait', 'mobile', 'mobileSmall'],
    all: Object.keys(VIEWPORTS)
};

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

function parseArgs(argv) {
    const options = {
        baseUrl: '',
        browser: '',
        fullPage: false,
        motion: 'reduce',
        output: DEFAULT_OUTPUT,
        preset: 'core',
        theme: 'both'
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--full-page') options.fullPage = true;
        else if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg === '--base-url') options.baseUrl = argv[++i];
        else if (arg === '--browser') options.browser = argv[++i];
        else if (arg === '--output') options.output = resolve(argv[++i]);
        else if (arg === '--preset') options.preset = argv[++i];
        else if (arg === '--theme') options.theme = argv[++i];
        else if (arg === '--motion') options.motion = argv[++i];
        else throw new Error(`Unknown option: ${arg}`);
    }

    if (!PRESETS[options.preset]) throw new Error(`Unknown preset: ${options.preset}`);
    if (!['both', 'dark', 'light'].includes(options.theme)) throw new Error(`Unknown theme: ${options.theme}`);
    if (!['reduce', 'normal', 'both'].includes(options.motion)) throw new Error(`Unknown motion: ${options.motion}`);
    return options;
}

function printHelp() {
    console.log(`Usage: node tools/capture-screenshots.mjs [options]

Options:
  --preset quick|core|all     Viewport set (default: core)
  --theme light|dark|both    Theme set (default: both)
  --motion reduce|normal|both  prefers-reduced-motion (default: reduce)
  --full-page                Also capture full home and project pages
  --base-url URL             Capture an existing server instead of starting one
  --browser PATH             Chrome/Edge executable override
  --output DIR               Output directory (default: .artifacts/screenshots-spacing)
  -h, --help                 Show this help`);
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

async function findBrowser(override) {
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

function startServer() {
    const server = createServer(async (request, response) => {
        try {
            const url = new URL(request.url, 'http://localhost');
            let pathname = decodeURIComponent(url.pathname);
            if (pathname.endsWith('/')) pathname += 'index.html';
            const filePath = resolve(ROOT, '.' + pathname);
            if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
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

class CdpClient {
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

function delay(milliseconds) {
    return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
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

async function evaluate(client, expression) {
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

async function waitForPage(client, kind, motion) {
    const condition = kind === 'home'
        ? `document.querySelector('#introduction-summary')?.textContent.trim()
            && document.querySelector('.project-card')
            && document.querySelector('.timeline-node')`
        : `document.querySelector('#project-title')?.textContent !== 'Loading project...'
            && (document.querySelector('#project-writeup')?.children.length
                || document.querySelector('#project-media:not([hidden])')
                || document.querySelector('#project-coming-soon:not([hidden])'))`;

    for (let attempt = 0; attempt < 120; attempt++) {
        if (await evaluate(client, `Boolean(${condition})`)) {
            await evaluate(client, `document.fonts ? document.fonts.ready.then(() => true) : true`);
            if (kind === 'home') await delay(motion === 'normal' ? 2600 : 400);
            await evaluate(client, `(() => {
                document.querySelectorAll('.fade-in').forEach(element => element.classList.add('visible'));
                const style = document.createElement('style');
                style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
                document.head.appendChild(style);
            })()`);
            return;
        }
        await delay(100);
    }
    throw new Error(`Timed out waiting for ${kind} content.`);
}

async function navigate(client, url, kind, issues, motion) {
    issues.length = 0;
    const loaded = client.once('Page.loadEventFired');
    const result = await client.send('Page.navigate', { url });
    if (result.errorText) throw new Error(result.errorText);
    await loaded;
    await waitForPage(client, kind, motion);
}

async function scrollTo(client, selector) {
    await evaluate(client, `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'start'})`);
    await delay(120);
}

async function click(client, selector) {
    const clicked = await evaluate(client, `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return false;
        element.click();
        return true;
    })()`);
    if (!clicked) throw new Error(`Element not found: ${selector}`);
    await delay(120);
}

async function pageMetrics(client) {
    return evaluate(client, `(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const selectors = ['.nav-content', '#home', '#about', '#projects', '#timeline', '.projects-carousel', '.project-card', '.carousel-stage', '.project-introduction', '#project-media', '.project-writeup-section'];
        const bounds = {};
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) return;
            const rect = element.getBoundingClientRect();
            bounds[selector] = { left: rect.left, right: rect.right, top: rect.top, width: rect.width };
        });

        const beyondViewport = [];
        document.querySelectorAll('section, .nav-content, .projects-carousel, .project-card, .stack-item, .cert-card, h1, h2, h3, p, img, video, iframe').forEach(element => {
            if (element.closest('.carousel-strip')) return;
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            if (rect.right > viewportWidth + 1 || rect.left < -1) {
                beyondViewport.push({
                    className: element.className || '',
                    tag: element.tagName.toLowerCase(),
                    left: rect.left,
                    right: rect.right,
                    width: rect.width
                });
            }
        });

        const clippedCards = [];
        const narrowCards = [];
        document.querySelectorAll('.project-card').forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.right <= 0 || rect.left >= viewportWidth) return;
            if (card.scrollWidth > card.clientWidth + 1) {
                clippedCards.push({ title: card.querySelector('.project-card-title')?.textContent || '', scrollWidth: card.scrollWidth, clientWidth: card.clientWidth });
            }
            if (viewportWidth <= 430 && rect.width < viewportWidth * 0.72) {
                narrowCards.push({ title: card.querySelector('.project-card-title')?.textContent || '', width: rect.width, viewportWidth });
            }
        });

        const smallTargets = [];
        document.querySelectorAll('a.btn, button, .nav-links a, .back-button, .scroll-hint, .carousel-nav, .carousel-dot').forEach(element => {
            if (element.closest('[hidden], [inert]')) return;
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') return;
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            if (rect.width < 44 || rect.height < 44) {
                smallTargets.push({
                    label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 48),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                });
            }
        });

        return {
            beyondViewport: beyondViewport.slice(0, 12),
            bounds,
            clientHeight: viewportHeight,
            clientWidth: viewportWidth,
            clippedCards,
            narrowCards,
            overflowX: document.documentElement.scrollWidth > viewportWidth,
            smallTargets: smallTargets.slice(0, 20),
            scrollHeight: document.documentElement.scrollHeight,
            scrollWidth: document.documentElement.scrollWidth
        };
    })()`);
}

async function capture(client, outputDir, context, name, issues, fullPage = false) {
    const folder = join(outputDir, context.theme, context.motion, context.viewportName);
    await mkdir(folder, { recursive: true });
    const file = join(folder, `${name}${fullPage ? '-full' : ''}.png`);
    const params = { captureBeyondViewport: fullPage, format: 'png', fromSurface: true };

    if (fullPage) {
        const layout = await client.send('Page.getLayoutMetrics');
        const size = layout.cssContentSize || layout.contentSize;
        params.clip = {
            height: Math.ceil(size.height),
            scale: 1,
            width: Math.ceil(size.width),
            x: 0,
            y: 0
        };
    }

    const screenshot = await client.send('Page.captureScreenshot', params);
    await writeFile(file, Buffer.from(screenshot.data, 'base64'));
    const metrics = await pageMetrics(client);
    const flags = [];
    if (metrics.overflowX) flags.push('horizontal overflow');
    if (metrics.beyondViewport?.length) flags.push(`${metrics.beyondViewport.length} beyond viewport`);
    if (metrics.clippedCards?.length) flags.push('clipped project card');
    if (metrics.narrowCards?.length) flags.push('narrow project card');
    if (metrics.smallTargets?.length) flags.push(`${metrics.smallTargets.length} small targets`);
    console.log(`${context.theme}/${context.motion}/${context.viewportName}/${name}${fullPage ? '-full' : ''}.png${flags.length ? ` [${flags.join(', ')}]` : ''}`);
    return {
        file: file.slice(outputDir.length + 1).split(sep).join('/'),
        issues: [...issues],
        metrics,
        name,
        theme: context.theme,
        motion: context.motion,
        viewport: { ...context.viewport, name: context.viewportName }
    };
}

async function captureHome(client, baseUrl, outputDir, context, options, issues, report) {
    await navigate(client, new URL('/', baseUrl).href, 'home', issues, context.motion);
    report.push(await capture(client, outputDir, context, 'home', issues));
    if (options.fullPage) report.push(await capture(client, outputDir, context, 'home', issues, true));

    await scrollTo(client, '#about');
    report.push(await capture(client, outputDir, context, 'about', issues));

    await scrollTo(client, '#projects');
    report.push(await capture(client, outputDir, context, 'projects', issues));
    await click(client, '.carousel-dot:nth-child(2)');
    report.push(await capture(client, outputDir, context, 'projects-second-slide', issues));
    if (context.viewport.width <= 768) {
        await evaluate(client, `document.querySelector('.carousel-dots')?.scrollIntoView({block:'center'})`);
        await delay(120);
        report.push(await capture(client, outputDir, context, 'projects-carousel-controls', issues));
    }
    await click(client, '#other-projects-list button.stack-hit');
    await scrollTo(client, '#other-projects');
    report.push(await capture(client, outputDir, context, 'projects-other-expanded', issues));

    await scrollTo(client, '#timeline');
    report.push(await capture(client, outputDir, context, 'timeline-work', issues));
    await click(client, '[data-filter="education"]');
    report.push(await capture(client, outputDir, context, 'timeline-education', issues));
    await click(client, '[data-filter="certificates"]');
    for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(client, `Boolean(document.querySelector('#certificate-grid .cert-card'))`)) break;
        await delay(100);
    }
    report.push(await capture(client, outputDir, context, 'timeline-certificates', issues));
    await click(client, '#cert-toggle');
    await scrollTo(client, '#certificate-archive');
    report.push(await capture(client, outputDir, context, 'timeline-certificates-expanded', issues));

    if (context.viewport.width <= 768) {
        await evaluate(client, 'window.scrollTo(0, 0)');
        await click(client, '#nav-toggle');
        report.push(await capture(client, outputDir, context, 'mobile-navigation-open', issues));
    }
}

async function loadProjectSlugs() {
    const projects = JSON.parse(await readFile(join(ROOT, 'data', 'projects.json'), 'utf8'));
    return projects.map(project => project.slug).filter(Boolean);
}

async function captureProjects(client, baseUrl, outputDir, context, options, issues, report, slugs) {
    for (const slug of slugs) {
        const url = new URL(`/projects/?slug=${slug}`, baseUrl).href;
        await navigate(client, url, 'project', issues, context.motion);
        report.push(await capture(client, outputDir, context, `project-${slug}`, issues));
        if (options.fullPage) report.push(await capture(client, outputDir, context, `project-${slug}`, issues, true));
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }

    const browserPath = await findBrowser(options.browser);
    const outputDir = resolve(options.output);
    await mkdir(outputDir, { recursive: true });

    let localServer;
    let browserProcess;
    let client;
    let userDataDir;

    try {
        const serverInfo = options.baseUrl ? null : await startServer();
        localServer = serverInfo?.server;
        const baseUrl = options.baseUrl || serverInfo.url;
        userDataDir = await mkdtemp(join(tmpdir(), 'portfolio-screenshots-'));
        browserProcess = launchBrowser(browserPath, userDataDir);
        const browserErrors = [];
        browserProcess.stderr.on('data', chunk => browserErrors.push(chunk.toString()));
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
            client.send('Runtime.enable')
        ]);

        const issues = [];
        client.on('Log.entryAdded', ({ entry }) => {
            if (entry.level === 'error') issues.push({ source: 'log', text: entry.text });
        });
        client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
            issues.push({ source: 'exception', text: exceptionDetails.text });
        });
        client.on('Runtime.consoleAPICalled', ({ args, type }) => {
            if (type === 'error') issues.push({ source: 'console', text: args.map(arg => arg.value || arg.description).join(' ') });
        });
        client.on('Network.loadingFailed', event => {
            if (!event.canceled) issues.push({ source: 'network', text: event.errorText });
        });

        const slugs = await loadProjectSlugs();
        const themes = options.theme === 'both' ? ['dark', 'light'] : [options.theme];
        const motions = options.motion === 'both' ? ['reduce', 'normal'] : [options.motion];
        const report = [];

        for (const theme of themes) {
            for (const motion of motions) {
                for (const viewportName of PRESETS[options.preset]) {
                    const viewport = VIEWPORTS[viewportName];
                    const context = { motion, theme, viewport, viewportName };
                    await client.send('Emulation.setDeviceMetricsOverride', {
                        deviceScaleFactor: 1,
                        height: viewport.height,
                        mobile: viewport.width <= 768,
                        screenHeight: viewport.height,
                        screenWidth: viewport.width,
                        width: viewport.width
                    });
                    await client.send('Emulation.setTouchEmulationEnabled', {
                        enabled: viewport.width <= 768,
                        maxTouchPoints: viewport.width <= 768 ? 5 : 1
                    });
                    await client.send('Emulation.setEmulatedMedia', {
                        features: [
                            { name: 'prefers-color-scheme', value: theme },
                            { name: 'prefers-reduced-motion', value: motion }
                        ],
                        media: 'screen'
                    });
                    await captureHome(client, baseUrl, outputDir, context, options, issues, report);
                    await captureProjects(client, baseUrl, outputDir, context, options, issues, report, slugs);
                }
            }
        }

        await writeFile(join(outputDir, 'report.json'), JSON.stringify({
            baseUrl,
            browser: browserPath,
            captures: report,
            generatedAt: new Date().toISOString(),
            motion: options.motion,
            preset: options.preset
        }, null, 2) + '\n');
        console.log(`Captured ${report.length} screenshots in ${outputDir}`);
    } finally {
        if (client) client.close();
        await stopBrowser(browserProcess);
        if (localServer) await new Promise(resolvePromise => localServer.close(resolvePromise));
        await removeBrowserProfile(userDataDir);
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

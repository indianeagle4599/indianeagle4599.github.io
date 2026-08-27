#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ROOT, delay, evaluate, openSession } from './cdp-session.mjs';

const DEFAULT_BASELINE = join(ROOT, '.artifacts', 'theme-baselines');
const DEFAULT_AFTER = join(ROOT, '.artifacts', 'theme-after');
const DEFAULT_DIFF = join(ROOT, '.artifacts', 'theme-diffs');

const VIEWPORTS = {
    desktop: { width: 1440, height: 900, mobile: false },
    mobile: { width: 390, height: 844, mobile: true }
};

function parseArgs(argv) {
    const options = {
        after: DEFAULT_AFTER,
        baseline: DEFAULT_BASELINE,
        browser: '',
        diff: DEFAULT_DIFF,
        mode: 'all'
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg === '--mode') options.mode = argv[++i];
        else if (arg === '--baseline') options.baseline = resolve(argv[++i]);
        else if (arg === '--after') options.after = resolve(argv[++i]);
        else if (arg === '--diff') options.diff = resolve(argv[++i]);
        else if (arg === '--browser') options.browser = argv[++i];
        else throw new Error(`Unknown option: ${arg}`);
    }
    if (!['all', 'baseline', 'check', 'e2e', 'source'].includes(options.mode)) {
        throw new Error('Unknown mode. Use all|baseline|check|e2e|source');
    }
    return options;
}

function printHelp() {
    console.log(`Usage: node tools/theme-regression.mjs [--mode all|baseline|check|e2e|source]

Modes:
  baseline   Capture the theme visual matrix into .artifacts/theme-baselines/
  check      Capture into .artifacts/theme-after/ and diff against baselines
  e2e        Interaction, theme, overflow, and accessibility checks
  source     JSON parse + stale-token scan
  all        source, e2e, then check (or baseline if none exist)

Visual baselines are gitignored. Do not commit them unless storage is approved.`);
}

const injectedScripts = new WeakMap();

async function emulate(client, { theme, viewport, storedTheme }) {
    await client.send('Emulation.setDeviceMetricsOverride', {
        deviceScaleFactor: 1,
        height: viewport.height,
        mobile: viewport.mobile,
        screenHeight: viewport.height,
        screenWidth: viewport.width,
        width: viewport.width
    });
    await client.send('Emulation.setTouchEmulationEnabled', {
        enabled: viewport.mobile,
        maxTouchPoints: viewport.mobile ? 5 : 1
    });
    await client.send('Emulation.setEmulatedMedia', {
        features: [
            { name: 'prefers-color-scheme', value: theme },
            { name: 'prefers-reduced-motion', value: 'reduce' }
        ],
        media: 'screen'
    });
    const previous = injectedScripts.get(client);
    if (previous) {
        await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: previous });
    }
    const storage = storedTheme === undefined || storedTheme === null
        ? `try { localStorage.removeItem('portfolio-theme'); } catch (error) {}`
        : `try { localStorage.setItem('portfolio-theme', ${JSON.stringify(storedTheme)}); } catch (error) {}`;
    const { identifier } = await client.send('Page.addScriptToEvaluateOnNewDocument', { source: storage });
    injectedScripts.set(client, identifier);
}

async function freeze(client) {
    await evaluate(client, `(() => {
        document.querySelectorAll('.fade-in').forEach(element => element.classList.add('visible'));
        if (!document.getElementById('theme-regression-freeze')) {
            const style = document.createElement('style');
            style.id = 'theme-regression-freeze';
            style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
            document.head.appendChild(style);
        }
        return true;
    })()`);
}

async function waitFor(client, kind) {
    const condition = kind === 'home'
        ? `document.querySelector('#introduction-summary')?.textContent.trim()
            && document.querySelector('.project-card')
            && document.querySelector('.timeline-node')
            && document.getElementById('theme-toggle')`
        : `document.querySelector('#project-title')?.textContent
            && document.querySelector('#project-title')?.textContent !== 'Loading project...'`;
    for (let attempt = 0; attempt < 120; attempt++) {
        if (await evaluate(client, `Boolean(${condition})`)) {
            await evaluate(client, `document.fonts ? document.fonts.ready.then(() => true) : true`);
            await freeze(client);
            return;
        }
        await delay(100);
    }
    throw new Error(`Timed out waiting for ${kind}`);
}

async function goto(client, url, kind) {
    const loaded = client.once('Page.loadEventFired', 30000);
    const result = await client.send('Page.navigate', { url });
    if (result.errorText) throw new Error(result.errorText);
    try {
        await loaded;
    } catch (error) {
        const ready = await evaluate(client, 'document.readyState');
        if (ready !== 'complete' && ready !== 'interactive') throw error;
    }
    await waitFor(client, kind);
}

async function click(client, selector) {
    const clicked = await evaluate(client, `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return false;
        element.click();
        return true;
    })()`);
    if (!clicked) throw new Error(`Element not found: ${selector}`);
    await delay(80);
    await freeze(client);
}

async function screenshot(client, file) {
    await mkdir(resolve(file, '..'), { recursive: true });
    const shot = await client.send('Page.captureScreenshot', {
        captureBeyondViewport: false,
        format: 'png',
        fromSurface: true
    });
    await writeFile(file, Buffer.from(shot.data, 'base64'));
}

async function setViewportTheme(client, viewportName, theme, storedTheme) {
    await emulate(client, {
        storedTheme,
        theme,
        viewport: VIEWPORTS[viewportName]
    });
}

async function captureMatrix(session, outputDir) {
    const { client, url } = session;
    const captures = [];
    for (const theme of ['dark', 'light']) {
        for (const viewportName of ['desktop', 'mobile']) {
            await setViewportTheme(client, viewportName, theme, theme);
            await goto(client, new URL('/', url).href, 'home');
            const folder = join(outputDir, theme, viewportName);
            await screenshot(client, join(folder, 'home.png'));
            captures.push(`${theme}/${viewportName}/home.png`);

            await click(client, '#tab-certificates');
            for (let attempt = 0; attempt < 80; attempt++) {
                if (await evaluate(client, `Boolean(document.querySelector('#certificate-grid .cert-card'))`)) break;
                await delay(80);
            }
            await click(client, '#cert-toggle');
            await evaluate(client, `document.querySelector('#certificate-archive')?.scrollIntoView({block:'start'})`);
            await delay(80);
            await freeze(client);
            await screenshot(client, join(folder, 'certificates-archive.png'));
            captures.push(`${theme}/${viewportName}/certificates-archive.png`);

            if (viewportName === 'desktop') {
                await evaluate(client, 'window.scrollTo(0, 0)');
                await click(client, '#about-contact');
                await delay(80);
                await freeze(client);
                await screenshot(client, join(folder, 'contact-modal.png'));
                captures.push(`${theme}/${viewportName}/contact-modal.png`);
                await click(client, '[data-contact-dismiss]');
            }

            if (viewportName === 'mobile') {
                await evaluate(client, 'window.scrollTo(0, 0)');
                await click(client, '#nav-toggle');
                await delay(80);
                await freeze(client);
                await screenshot(client, join(folder, 'mobile-nav.png'));
                captures.push(`${theme}/${viewportName}/mobile-nav.png`);
            }
        }

        for (const viewportName of ['desktop', 'mobile']) {
            await setViewportTheme(client, viewportName, theme, theme);
            await goto(client, new URL('/projects/?slug=ask-krishna', url).href, 'project');
            const folder = join(outputDir, theme, viewportName);
            await screenshot(client, join(folder, 'project-ask-krishna.png'));
            captures.push(`${theme}/${viewportName}/project-ask-krishna.png`);
            const hasNext = await evaluate(client, `Boolean(document.querySelector('#project-media .carousel-nav--next:not([disabled])'))`);
            if (hasNext) {
                await click(client, '#project-media .carousel-nav--next');
                await delay(80);
                await freeze(client);
                await screenshot(client, join(folder, 'project-ask-krishna-next.png'));
                captures.push(`${theme}/${viewportName}/project-ask-krishna-next.png`);
            }
        }

        await setViewportTheme(client, 'desktop', theme, theme);
        await goto(client, new URL('/projects/?slug=os-toolkit', url).href, 'project');
        await evaluate(client, `document.getElementById('project-results')?.scrollIntoView({block:'start'})`);
        await delay(80);
        await freeze(client);
        await screenshot(client, join(outputDir, theme, 'desktop', 'project-os-toolkit-results.png'));
        captures.push(`${theme}/desktop/project-os-toolkit-results.png`);
    }
    await writeFile(join(outputDir, 'manifest.json'), JSON.stringify({
        captures,
        generatedAt: new Date().toISOString()
    }, null, 2) + '\n');
    console.log(`Captured ${captures.length} theme screenshots in ${outputDir}`);
    return captures;
}

function check(name, ok, detail = '') {
    return { detail, name, ok: Boolean(ok) };
}

async function runE2E(session) {
    const { client, url } = session;
    const results = [];

    await setViewportTheme(client, 'desktop', 'dark', null);
    await goto(client, new URL('/', url).href, 'home');
    const fresh = await evaluate(client, `({
        hash: location.hash,
        nav: document.querySelector('.nav-links a.active')?.textContent.trim(),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        scrollY: Math.round(window.scrollY),
        theme: document.documentElement.getAttribute('data-theme'),
        themeLabel: document.getElementById('theme-toggle')?.getAttribute('aria-label') || ''
    })`);
    results.push(check('fresh-load-top', fresh.scrollY === 0 && (!fresh.hash || fresh.hash === ''), `scrollY=${fresh.scrollY} hash=${fresh.hash}`));
    results.push(check('fresh-load-home-nav', /home/i.test(fresh.nav || ''), `active=${fresh.nav}`));
    results.push(check('system-dark-fallback', fresh.theme === 'dark', `theme=${fresh.theme}`));
    results.push(check('theme-toggle-named', /switch to light mode/i.test(fresh.themeLabel), fresh.themeLabel));
    results.push(check('home-no-overflow', !fresh.overflowX, `overflowX=${fresh.overflowX}`));

    const beforeTab = await evaluate(client, 'Math.round(window.scrollY)');
    await click(client, '#tab-education');
    const afterEdu = await evaluate(client, `({
        selected: document.querySelector('#tab-education')?.getAttribute('aria-selected'),
        scrollY: Math.round(window.scrollY),
        hiddenWork: document.getElementById('panel-work')?.hidden
    })`);
    await click(client, '#tab-work');
    const afterWork = await evaluate(client, `({
        selected: document.querySelector('#tab-work')?.getAttribute('aria-selected'),
        scrollY: Math.round(window.scrollY)
    })`);
    results.push(check('timeline-education-selected', afterEdu.selected === 'true', `aria-selected=${afterEdu.selected}`));
    results.push(check('timeline-work-selected', afterWork.selected === 'true', `aria-selected=${afterWork.selected}`));
    results.push(check('timeline-tabs-no-document-jump', Math.abs(afterEdu.scrollY - beforeTab) < 80 && Math.abs(afterWork.scrollY - beforeTab) < 80, `before=${beforeTab} edu=${afterEdu.scrollY} work=${afterWork.scrollY}`));

    await click(client, '#tab-certificates');
    for (let attempt = 0; attempt < 80; attempt++) {
        if (await evaluate(client, `Boolean(document.querySelector('#certificate-grid .cert-card'))`)) break;
        await delay(80);
    }
    const certBefore = await evaluate(client, `document.getElementById('cert-toggle')?.getAttribute('aria-expanded')`);
    await click(client, '#cert-toggle');
    const certAfter = await evaluate(client, `({
        expanded: document.getElementById('cert-toggle')?.getAttribute('aria-expanded'),
        archiveHidden: document.getElementById('certificate-archive')?.hidden,
        archiveCards: document.querySelectorAll('#certificate-archive .cert-card').length
    })`);
    results.push(check('cert-archive-closed-then-open', certBefore === 'false' && certAfter.expanded === 'true' && !certAfter.archiveHidden && certAfter.archiveCards > 0, JSON.stringify({ certBefore, certAfter })));

    await click(client, '#theme-toggle');
    const toggled = await evaluate(client, `({
        stored: localStorage.getItem('portfolio-theme'),
        theme: document.documentElement.getAttribute('data-theme'),
        themeColor: document.querySelector('meta[name="theme-color"]')?.content,
        page: getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim()
            || getComputedStyle(document.documentElement).getPropertyValue('--bg-dark').trim()
    })`);
    results.push(check('theme-toggle-persists-light', toggled.theme === 'light' && toggled.stored === 'light', JSON.stringify(toggled)));
    results.push(check('theme-color-tracks-page', Boolean(toggled.themeColor) && toggled.themeColor.replace(/\s/g, '') !== '', `theme-color=${toggled.themeColor}`));

    await goto(client, new URL('/#projects', url).href, 'home');
    const projectsHash = await evaluate(client, `({
        hash: location.hash,
        top: Math.round(document.getElementById('projects')?.getBoundingClientRect().top || 9999)
    })`);
    results.push(check('hash-projects', projectsHash.hash === '#projects' && projectsHash.top < 140, JSON.stringify(projectsHash)));

    await goto(client, new URL('/#timeline', url).href, 'home');
    const timelineHash = await evaluate(client, `({
        hash: location.hash,
        top: Math.round(document.getElementById('timeline')?.getBoundingClientRect().top || 9999)
    })`);
    results.push(check('hash-timeline', timelineHash.hash === '#timeline' && timelineHash.top < 140, JSON.stringify(timelineHash)));

    await evaluate(client, 'history.back()');
    await delay(200);
    const backState = await evaluate(client, 'location.hash');
    results.push(check('history-back-to-projects', backState === '#projects', `hash=${backState}`));

    const contact = await evaluate(client, `({
        labels: [...document.querySelectorAll('#contact-form label[for], #contact-form legend')].map(node => ({
            for: node.getAttribute('for'),
            text: node.textContent.trim()
        })),
        named: ['contact-name','contact-email','contact-phone','contact-message'].every(id => document.getElementById(id))
    })`);
    results.push(check('contact-inputs-labelled', contact.named && contact.labels.length >= 4, JSON.stringify(contact.labels)));

    await setViewportTheme(client, 'mobile', 'dark', 'dark');
    await goto(client, new URL('/', url).href, 'home');
    await click(client, '#nav-toggle');
    const mobileNav = await evaluate(client, `({
        expanded: document.getElementById('nav-toggle')?.getAttribute('aria-expanded'),
        open: document.body.classList.contains('nav-open')
    })`);
    results.push(check('mobile-nav-opens', mobileNav.expanded === 'true' && mobileNav.open, JSON.stringify(mobileNav)));
    const mobileOverflow = await evaluate(client, 'document.documentElement.scrollWidth > document.documentElement.clientWidth + 1');
    results.push(check('mobile-no-overflow', !mobileOverflow, `overflow=${mobileOverflow}`));

    await setViewportTheme(client, 'desktop', 'dark', 'dark');
    await goto(client, new URL('/projects/?slug=ask-krishna', url).href, 'project');
    const project = await evaluate(client, `({
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        galleryNext: document.querySelector('#project-media .carousel-nav--next')?.getAttribute('aria-label') || '',
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        summary: document.getElementById('project-description')?.textContent.trim().length || 0,
        title: document.getElementById('project-title')?.textContent.trim()
    })`);
    results.push(check('project-ask-krishna-loads', /ask krishna/i.test(project.title || '') && project.summary > 20, JSON.stringify({ title: project.title, summary: project.summary })));
    results.push(check('project-canonical', /\/projects\/\?slug=ask-krishna$/.test(project.canonical || ''), project.canonical));
    results.push(check('project-gallery-label', /previous|next|show/i.test(project.galleryNext), project.galleryNext || 'missing gallery next label'));
    results.push(check('project-no-overflow', !project.overflowX, `overflowX=${project.overflowX}`));

    const focusRule = await evaluate(client, `(() => {
        for (const sheet of document.styleSheets) {
            for (const rule of sheet.cssRules) {
                if (rule.selectorText === ':focus-visible') return rule.cssText;
            }
        }
        return '';
    })()`);
    results.push(check('focus-visible-rule', /outline:\s*2px solid/.test(focusRule) && /outline-offset:\s*2px/.test(focusRule), focusRule.slice(0, 160)));

    await goto(client, new URL('/projects/?slug=os-toolkit', url).href, 'project');
    const table = await evaluate(client, `({
        best: document.querySelectorAll('.project-results-cell--best').length,
        ours: document.querySelectorAll('.project-results-cell--ours, .project-results-row--ours').length,
        rows: document.querySelectorAll('.project-results-table tbody tr').length,
        title: document.getElementById('project-title')?.textContent.trim()
    })`);
    results.push(check('project-os-toolkit-results', /os toolkit/i.test(table.title || '') && table.rows > 0 && table.ours > 0 && table.best > 0, JSON.stringify(table)));

    await setViewportTheme(client, 'desktop', 'light', null);
    await goto(client, new URL('/', url).href, 'home');
    const systemLight = await evaluate(client, `({
        stored: localStorage.getItem('portfolio-theme'),
        theme: document.documentElement.getAttribute('data-theme')
    })`);
    results.push(check('system-light-fallback', systemLight.stored === null && systemLight.theme === 'light', JSON.stringify(systemLight)));

    const failed = results.filter(item => !item.ok);
    for (const item of results) {
        console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `  (${item.detail})` : ''}`);
    }
    if (failed.length) throw new Error(`${failed.length} e2e checks failed`);
    console.log(`E2E ${results.length} checks passed`);
    return results;
}

async function runSource() {
    const jsonFiles = ['profile.json', 'projects.json', 'timeline.json', 'certificates.json', 'recommendations.json'];
    for (const name of jsonFiles) {
        JSON.parse(await readFile(join(ROOT, 'data', name), 'utf8'));
    }
    const css = await readFile(join(ROOT, 'style.css'), 'utf8');
    const js = await readFile(join(ROOT, 'scripts', 'main.js'), 'utf8');
    const stale = [];
    if (/\b--bg-dark\b/.test(css) || /\b--bg-dark\b/.test(js)) stale.push('--bg-dark');
    if (/\b--bg-card\b/.test(css) || /\b--bg-card\b/.test(js)) stale.push('--bg-card');
    const required = ['--bg-page', '--bg-surface', '--on-accent', '--logo-plate', '--media-letterbox', '--about-wash', '--overlay', '--dialog-shadow', '--nav-drawer-shadow'];
    const missing = required.filter(token => !css.includes(token));
    if (stale.length || missing.length) {
        throw new Error(`source check failed: stale=${stale.join(',') || 'none'} missing=${missing.join(',') || 'none'}`);
    }
    console.log('Source checks passed (JSON parse, normalized token names)');
}

function runCompare(baseline, after, diff) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn('python', [join(ROOT, 'tools', 'compare-png.py'), baseline, after, diff], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('exit', code => {
            if (code !== 0) {
                reject(new Error(stderr || `compare-png.py exited ${code}`));
                return;
            }
            resolvePromise(JSON.parse(stdout));
        });
    });
}

async function baselineExists(dir) {
    try {
        const entries = await readdir(dir);
        return entries.some(name => name.endsWith('.png') || name === 'dark' || name === 'light');
    } catch (error) {
        return false;
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }

    if (options.mode === 'source' || options.mode === 'all') {
        if (options.mode === 'source') {
            await runSource();
            return;
        }
        try {
            await runSource();
        } catch (error) {
            if (options.mode === 'all') console.warn(`Source: ${error.message}`);
            else throw error;
        }
    }

    const session = await openSession({ browser: options.browser || undefined });
    try {
        if (options.mode === 'e2e' || options.mode === 'all') {
            await runE2E(session);
        }
        if (options.mode === 'baseline') {
            await mkdir(options.baseline, { recursive: true });
            await captureMatrix(session, options.baseline);
        }
        if (options.mode === 'check' || (options.mode === 'all' && await baselineExists(options.baseline))) {
            await mkdir(options.after, { recursive: true });
            await captureMatrix(session, options.after);
            const summary = await runCompare(options.baseline, options.after, options.diff);
            await writeFile(join(options.diff, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
            const diffs = summary.pairs.filter(row => row.status !== 'match');
            console.log(`Visual compare: ${summary.pairs.length - diffs.length} match, ${diffs.length} differ`);
            for (const row of diffs) {
                console.log(`  DIFF ${row.file}  ${row.changed_percent}%  ${row.status}`);
            }
            if (summary.missing.length) console.log(`  missing after: ${summary.missing.join(', ')}`);
            if (summary.extra.length) console.log(`  extra after: ${summary.extra.join(', ')}`);
        } else if (options.mode === 'all') {
            await mkdir(options.baseline, { recursive: true });
            await captureMatrix(session, options.baseline);
            console.log('No prior baseline; captured a new baseline instead of diffing.');
        }
    } finally {
        await session.close();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import {
    ROOT,
    delay,
    evaluate,
    openSession
} from './cdp-session.mjs';

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

    const outputDir = resolve(options.output);
    await mkdir(outputDir, { recursive: true });
    const session = await openSession({
        baseUrl: options.baseUrl || undefined,
        browser: options.browser || undefined
    });
    const { client, url: baseUrl, browserPath } = session;

    try {
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
        await session.close();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

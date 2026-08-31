#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, delay, evaluate, openSession } from './cdp-session.mjs';

const NEW_MARKS = [
    {
        dark: '#A3B6C9',
        darkFile: 'lazy-resume-logo-dark.svg',
        file: 'lazy-resume-logo.svg',
        light: '#6E849C',
        slug: 'lazy-resume',
        title: 'LazyResume'
    },
    {
        dark: '#5BBAA8',
        darkFile: 'ai-generated-image-classifier-logo-dark.svg',
        file: 'ai-generated-image-classifier-logo.svg',
        light: '#3FA896',
        slug: 'ai-generated-image-classifier',
        title: 'Detecting AI Generated Images'
    },
    {
        dark: '#D4B445',
        darkFile: 'fuzzy-hybrid-stock-trading-logo-dark.svg',
        file: 'fuzzy-hybrid-stock-trading-logo.svg',
        light: '#C9A227',
        slug: 'fuzzy-hybrid-stock-trading',
        title: 'Fuzzy Hybrid Model for Stock Trading'
    }
];

function parseArgs(argv) {
    const options = { browser: '', mode: 'all' };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg === '--mode') options.mode = argv[++i];
        else if (arg === '--browser') options.browser = argv[++i];
        else throw new Error(`Unknown option: ${arg}`);
    }
    if (!['all', 'e2e', 'source'].includes(options.mode)) {
        throw new Error('Unknown mode. Use all|source|e2e');
    }
    return options;
}

function printHelp() {
    console.log(`Usage: node tools/logo-marks-verify.mjs [--mode all|source|e2e]

Modes:
  source   JSON paths, asset files, renderer locks (no browser)
  e2e      Homepage Other-projects + three detail pages
  all      source, then e2e`);
}

function check(name, ok, detail = '') {
    return { detail, name, ok: Boolean(ok) };
}

async function goto(client, url) {
    const loaded = client.once('Page.loadEventFired', 30000);
    const result = await client.send('Page.navigate', { url });
    if (result.errorText) throw new Error(result.errorText);
    try {
        await loaded;
    } catch (error) {
        const ready = await evaluate(client, 'document.readyState');
        if (ready !== 'complete' && ready !== 'interactive') throw error;
    }
}

async function waitFor(client, expression) {
    for (let attempt = 0; attempt < 120; attempt++) {
        if (await evaluate(client, `Boolean(${expression})`)) {
            await delay(50);
            return;
        }
        await delay(100);
    }
    throw new Error(`Timed out waiting for ${expression}`);
}

function geometryKey(svg) {
    return svg.replace(/#[0-9A-Fa-f]{6}/g, '').replace(/fill-opacity="[0-9.]+"/g, '');
}

async function runSource() {
    const projects = JSON.parse(await readFile(join(ROOT, 'data', 'projects.json'), 'utf8'));
    const css = await readFile(join(ROOT, 'style.css'), 'utf8');
    const js = await readFile(join(ROOT, 'scripts', 'main.js'), 'utf8');
    const tagIcons = js.match(/const TAG_ICONS = \{[\s\S]*?\n\};/)?.[0] || '';

    if (!Array.isArray(projects)) throw new Error('data/projects.json must be an array');

    for (const mark of NEW_MARKS) {
        const project = projects.find(item => item.slug === mark.slug);
        if (!project) throw new Error(`missing project ${mark.slug}`);
        if (project.logo !== `./assets/${mark.file}`) {
            throw new Error(`${mark.slug} logo path is ${JSON.stringify(project.logo)}`);
        }
        if (project.logoDark !== `./assets/${mark.darkFile}`) {
            throw new Error(`${mark.slug} logoDark path is ${JSON.stringify(project.logoDark)}`);
        }
        const lightSvg = await readFile(join(ROOT, 'assets', mark.file), 'utf8');
        const darkSvg = await readFile(join(ROOT, 'assets', mark.darkFile), 'utf8');
        if (!/viewBox="0 0 24 24"/.test(lightSvg) || !/viewBox="0 0 24 24"/.test(darkSvg)) {
            throw new Error(`${mark.file} pair is missing a 24×24 viewBox`);
        }
        if (!lightSvg.includes(mark.light)) throw new Error(`${mark.file} lost its light ink ${mark.light}`);
        if (!darkSvg.includes(mark.dark)) throw new Error(`${mark.darkFile} lost its dark ink ${mark.dark}`);
        if (darkSvg.includes(mark.light)) throw new Error(`${mark.darkFile} still uses the light ink`);
        if (geometryKey(lightSvg) !== geometryKey(darkSvg)) {
            throw new Error(`${mark.slug} light/dark geometry diverged`);
        }
        if (tagIcons.includes(mark.file) || tagIcons.includes(mark.darkFile)) {
            throw new Error(`${mark.file} is referenced from TAG_ICONS`);
        }
    }

    const missing = projects.filter(project => !project.logo);
    if (missing.length) throw new Error(`projects still missing logo: ${missing.map(item => item.slug).join(', ')}`);
    const unexpectedDark = projects.filter(project => project.logoDark && !NEW_MARKS.some(mark => mark.slug === project.slug));
    if (unexpectedDark.length) throw new Error(`unexpected logoDark on ${unexpectedDark.map(item => item.slug).join(', ')}`);

    const expectedExisting = {
        'ask-krishna': './assets/ask-krishna-logo.svg',
        'media-search-engine': './assets/aftersight-logo.png',
        pixtyle: './assets/pixtyle-logo.png',
        flodoro: './assets/flodoro-logo.png',
        'os-toolkit': './assets/os-toolkit-logo-blink.gif'
    };
    for (const [slug, logo] of Object.entries(expectedExisting)) {
        const project = projects.find(item => item.slug === slug);
        if (project?.logo !== logo) throw new Error(`${slug} existing logo path changed: ${JSON.stringify(project?.logo)}`);
    }

    if (!/\.node-logo \{\s*width: 36px;\s*height: 36px;/.test(css)) {
        throw new Error('.node-logo 36×36 sizing changed');
    }
    if (!/\.project-logo \{\s*width: 56px;\s*height: 56px;/.test(css)) {
        throw new Error('.project-logo 56×56 sizing changed');
    }
    if (!/function logoImg\(src, className, tone\)/.test(js) || !/logoEl\.src = assetUrl\(project\.logo\)/.test(js)) {
        throw new Error('project logo renderer changed');
    }
    if (!/logoImg\(project\.logo, 'node-logo', project\.logoTone\)/.test(js)) {
        throw new Error('Other-projects renderer is no longer using the light logo on the plate');
    }
    if (!/data-logo-pair/.test(js) || !/\[data-logo-pair\] \.project-logo--dark/.test(css)) {
        throw new Error('detail logo pair / data-theme swap is missing');
    }

    console.log(`Source: OK (${projects.length} projects, ${NEW_MARKS.length} new marks)`);
}

async function describeHomeLogos(client) {
    return evaluate(client, `(() => {
        const marks = ${JSON.stringify(NEW_MARKS)};
        const existing = [
            { slug: 'os-toolkit', title: 'OS Toolkit' },
            { slug: 'ask-krishna', title: 'Ask Krishna' }
        ];
        const inspect = (title, expectedFile) => {
            const item = Array.from(document.querySelectorAll('#other-projects-list .stack-item, .project-card'))
                .find(node => node.querySelector('.node-entity, .project-card-title')?.textContent === title);
            if (!item) return { found: false };
            const img = item.querySelector('img.node-logo, img.project-card-logo');
            if (!img) return { found: true, hasImg: false };
            const row = img.closest('.node-entity-group, .project-card-title-row') || img.parentElement;
            const titleEl = item.querySelector('.node-entity, .project-card-title');
            const imgBox = img.getBoundingClientRect();
            const rowBox = row.getBoundingClientRect();
            const style = getComputedStyle(img);
            return {
                found: true,
                hasImg: true,
                alt: img.alt,
                src: img.getAttribute('src'),
                complete: img.complete,
                naturalWidth: img.naturalWidth,
                w: Math.round(imgBox.width),
                h: Math.round(imgBox.height),
                overflow: imgBox.right > rowBox.right + 0.5 || imgBox.bottom > rowBox.bottom + 0.5,
                plate: style.backgroundColor,
                display: style.display,
                srcOk: img.getAttribute('src')?.includes(expectedFile) || false,
                usesDarkAsset: (img.getAttribute('src') || '').includes('-dark.svg'),
                titleAligned: titleEl ? Math.abs((imgBox.top + imgBox.height / 2) - (titleEl.getBoundingClientRect().top + titleEl.getBoundingClientRect().height / 2)) < 8 : false
            };
        };
        return {
            newMarks: marks.map(mark => inspect(mark.title, mark.file)),
            existing: existing.map(item => inspect(item.title, item.slug === 'os-toolkit' ? 'os-toolkit-logo-blink.gif' : 'ask-krishna-logo.svg')),
            otherCount: document.querySelectorAll('#other-projects-list .stack-item img.node-logo').length
        };
    })()`);
}

async function describeDetailLogo(client) {
    return evaluate(client, `(() => {
        const light = document.getElementById('project-logo');
        const dark = document.getElementById('project-logo-dark');
        if (!light) return { found: false };
        const heading = light.closest('.project-introduction-heading');
        const title = document.getElementById('project-title');
        const theme = document.documentElement.getAttribute('data-theme');
        const describe = img => {
            if (!img) return null;
            const box = img.getBoundingClientRect();
            const display = getComputedStyle(img).display;
            return {
                complete: img.complete,
                display,
                hidden: img.hidden,
                naturalWidth: img.naturalWidth,
                src: img.getAttribute('src') || '',
                visible: !img.hidden && display !== 'none' && box.width > 0,
                w: Math.round(box.width),
                h: Math.round(box.height)
            };
        };
        const lightState = describe(light);
        const darkState = describe(dark);
        const visibleImg = lightState?.visible ? light : (darkState?.visible ? dark : null);
        const visibleBox = visibleImg?.getBoundingClientRect();
        const titleBox = title?.getBoundingClientRect();
        const headingBox = heading?.getBoundingClientRect();
        return {
            dark: darkState,
            found: true,
            light: lightState,
            og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
            overflow: visibleBox && headingBox ? visibleBox.right > headingBox.right + 0.5 : false,
            page: getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim(),
            pair: heading?.hasAttribute('data-logo-pair') || false,
            theme,
            titleAligned: visibleBox && titleBox ? Math.abs((visibleBox.top + visibleBox.height / 2) - (titleBox.top + titleBox.height / 2)) < 10 : false,
            visibleSize: visibleBox ? { w: Math.round(visibleBox.width), h: Math.round(visibleBox.height) } : null,
            visibleSrc: visibleImg?.getAttribute('src') || ''
        };
    })()`);
}

async function fetchOk(client, src) {
    return evaluate(client, `fetch(${JSON.stringify(src)}, { method: 'GET', cache: 'no-store' }).then(r => r.ok).catch(() => false)`);
}

async function setTheme(client, theme) {
    await evaluate(client, `document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
    await delay(40);
}

async function runE2E(options) {
    const session = await openSession({ browser: options.browser || undefined });
    const results = [];
    try {
        const { client, url } = session;
        await client.send('Emulation.setDeviceMetricsOverride', {
            deviceScaleFactor: 1,
            height: 900,
            mobile: false,
            screenHeight: 900,
            screenWidth: 1440,
            width: 1440
        });

        await goto(client, new URL('/', url).href);
        await waitFor(client, `document.querySelectorAll('#other-projects-list .stack-item').length > 0`);
        await evaluate(client, `document.getElementById('other-projects')?.scrollIntoView({ block: 'center' })`);
        await waitFor(client, `Array.from(document.querySelectorAll('#other-projects-list img.node-logo')).every(img => img.complete && img.naturalWidth > 0)`);

        for (const theme of ['dark', 'light']) {
            await setTheme(client, theme);
            const home = await describeHomeLogos(client);
            results.push(check(`home-${theme}-new-marks-present`, home.newMarks.every(item => item.found && item.hasImg), JSON.stringify(home.newMarks)));
            results.push(check(`home-${theme}-src-and-load`, home.newMarks.every(item => item.srcOk && item.complete && item.naturalWidth > 0 && !item.usesDarkAsset), JSON.stringify(home.newMarks.map(item => ({ src: item.src, complete: item.complete, naturalWidth: item.naturalWidth, usesDarkAsset: item.usesDarkAsset })))));
            results.push(check(`home-${theme}-36px-plate`, home.newMarks.every(item => item.w === 36 && item.h === 36 && item.plate === 'rgb(255, 255, 255)'), JSON.stringify(home.newMarks.map(item => ({ w: item.w, h: item.h, plate: item.plate })))));
            results.push(check(`home-${theme}-align-no-overflow`, home.newMarks.every(item => item.titleAligned && !item.overflow), JSON.stringify(home.newMarks.map(item => ({ titleAligned: item.titleAligned, overflow: item.overflow })))));
            results.push(check(`home-${theme}-existing-still-render`, home.existing.every(item => item.found && item.hasImg && item.complete && item.naturalWidth > 0), JSON.stringify(home.existing)));
            results.push(check(`home-${theme}-root-relative-src`, home.newMarks.every(item => (item.src || '').startsWith('./assets/')), JSON.stringify(home.newMarks.map(item => item.src))));
        }

        const homeDark = await describeHomeLogos(client);
        for (const [index, mark] of NEW_MARKS.entries()) {
            const src = homeDark.newMarks[index].src;
            results.push(check(`home-fetch-${mark.slug}`, await fetchOk(client, new URL(src, url).href), src));
        }

        for (const mark of NEW_MARKS) {
            await goto(client, new URL(`/projects/?slug=${mark.slug}`, url).href);
            await waitFor(client, `document.querySelector('#project-title')?.textContent && document.querySelector('#project-title')?.textContent !== 'Loading project...'`);
            await waitFor(client, `document.getElementById('project-logo')?.complete && document.getElementById('project-logo-dark')?.complete && document.getElementById('project-logo-dark')?.naturalWidth > 0`);

            await setTheme(client, 'light');
            let detail = await describeDetailLogo(client);
            results.push(check(`detail-light-${mark.slug}-uses-light-asset`, detail.pair && detail.visibleSrc.includes(mark.file) && !detail.visibleSrc.includes('-dark') && detail.light.complete && detail.dark.complete && detail.dark.display === 'none', JSON.stringify(detail)));
            results.push(check(`detail-light-${mark.slug}-56px`, detail.visibleSize?.w === 56 && detail.visibleSize?.h === 56 && detail.titleAligned && !detail.overflow && detail.page.includes('244'), JSON.stringify(detail)));

            await setTheme(client, 'dark');
            detail = await describeDetailLogo(client);
            results.push(check(`detail-dark-${mark.slug}-uses-dark-asset`, detail.pair && detail.visibleSrc.includes(mark.darkFile) && detail.light.display === 'none' && detail.dark.complete && detail.dark.naturalWidth > 0, JSON.stringify(detail)));
            results.push(check(`detail-dark-${mark.slug}-56px`, detail.visibleSize?.w === 56 && detail.visibleSize?.h === 56 && detail.titleAligned && !detail.overflow && detail.page.includes('0, 0, 0'), JSON.stringify(detail)));
            results.push(check(`detail-fetch-dark-${mark.slug}`, await fetchOk(client, new URL(detail.dark.src, url).href), detail.dark.src));

            await evaluate(client, `document.getElementById('theme-toggle')?.click()`);
            await delay(80);
            const afterToggle = await describeDetailLogo(client);
            results.push(check(`detail-toggle-${mark.slug}-to-light`, afterToggle.theme === 'light' && afterToggle.visibleSrc.includes(mark.file) && !afterToggle.visibleSrc.includes('-dark') && afterToggle.visibleSize?.w === 56 && afterToggle.light.complete && afterToggle.dark.complete, JSON.stringify(afterToggle)));
            await evaluate(client, `document.getElementById('theme-toggle')?.click()`);
            await delay(80);
            const afterToggleBack = await describeDetailLogo(client);
            results.push(check(`detail-toggle-${mark.slug}-back-to-dark`, afterToggleBack.theme === 'dark' && afterToggleBack.visibleSrc.includes(mark.darkFile) && afterToggleBack.visibleSize?.w === 56, JSON.stringify(afterToggleBack)));
        }

        await goto(client, new URL('/projects/?slug=ask-krishna', url).href);
        await waitFor(client, `document.querySelector('#project-title')?.textContent === 'Ask Krishna'`);
        await setTheme(client, 'dark');
        const askDark = await describeDetailLogo(client);
        await setTheme(client, 'light');
        const askLight = await describeDetailLogo(client);
        results.push(check('detail-existing-ask-krishna-unaffected', !askDark.pair && !askLight.pair && askDark.visibleSrc.includes('ask-krishna-logo.svg') && askLight.visibleSrc.includes('ask-krishna-logo.svg') && askDark.dark.hidden && askLight.dark.hidden, JSON.stringify({ askDark, askLight })));
    } finally {
        await session.close();
    }

    for (const item of results) {
        console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `  (${item.detail})` : ''}`);
    }
    const failed = results.filter(item => !item.ok);
    if (failed.length) throw new Error(`${failed.length} e2e check(s) failed`);
    console.log(`E2E: ${results.length} checks passed`);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }
    if (options.mode === 'source' || options.mode === 'all') await runSource();
    if (options.mode === 'e2e' || options.mode === 'all') await runE2E(options);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, delay, evaluate, openSession } from './cdp-session.mjs';

const NEW_MARKS = [
    { file: 'lazy-resume-logo.svg', slug: 'lazy-resume', title: 'LazyResume' },
    { file: 'ai-generated-image-classifier-logo.svg', slug: 'ai-generated-image-classifier', title: 'Detecting AI Generated Images' },
    { file: 'fuzzy-hybrid-stock-trading-logo.svg', slug: 'fuzzy-hybrid-stock-trading', title: 'Fuzzy Hybrid Model for Stock Trading' }
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
        const asset = join(ROOT, 'assets', mark.file);
        await access(asset);
        const svg = await readFile(asset, 'utf8');
        if (!/viewBox="0 0 24 24"/.test(svg)) throw new Error(`${mark.file} is missing a 24×24 viewBox`);
        if ((JSON.stringify(project).match(/"logo"/g) || []).length !== 1) {
            throw new Error(`${mark.slug} has a duplicate logo field`);
        }
        if (tagIcons.includes(mark.file)) throw new Error(`${mark.file} is referenced from TAG_ICONS`);
    }

    const missing = projects.filter(project => !project.logo);
    if (missing.length) throw new Error(`projects still missing logo: ${missing.map(item => item.slug).join(', ')}`);

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

async function describeDetailLogo(client, file) {
    return evaluate(client, `(() => {
        const img = document.getElementById('project-logo');
        if (!img) return { found: false };
        const heading = img.closest('.project-introduction-heading');
        const title = document.getElementById('project-title');
        const imgBox = img.getBoundingClientRect();
        const headingBox = heading?.getBoundingClientRect();
        const titleBox = title?.getBoundingClientRect();
        const page = getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim();
        return {
            found: true,
            hidden: img.hidden,
            src: img.getAttribute('src'),
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            w: Math.round(imgBox.width),
            h: Math.round(imgBox.height),
            srcOk: img.getAttribute('src')?.includes(${JSON.stringify(file)}) || false,
            relative: (img.getAttribute('src') || '').startsWith('../assets/'),
            overflow: headingBox ? imgBox.right > headingBox.right + 0.5 : false,
            titleAligned: titleBox ? Math.abs((imgBox.top + imgBox.height / 2) - (titleBox.top + titleBox.height / 2)) < 10 : false,
            og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
            page
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
            results.push(check(`home-${theme}-src-and-load`, home.newMarks.every(item => item.srcOk && item.complete && item.naturalWidth > 0), JSON.stringify(home.newMarks.map(item => ({ src: item.src, complete: item.complete, naturalWidth: item.naturalWidth })))));
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
            for (const theme of ['dark', 'light']) {
                await setTheme(client, theme);
                const detail = await describeDetailLogo(client, mark.file);
                results.push(check(`detail-${theme}-${mark.slug}-visible`, detail.found && !detail.hidden && detail.srcOk && detail.complete && detail.naturalWidth > 0, JSON.stringify(detail)));
                results.push(check(`detail-${theme}-${mark.slug}-56px`, detail.w === 56 && detail.h === 56 && detail.relative && !detail.overflow && detail.titleAligned, JSON.stringify(detail)));
            }
            const detail = await describeDetailLogo(client, mark.file);
            results.push(check(`detail-fetch-${mark.slug}`, await fetchOk(client, new URL(detail.src, url).href), detail.src));
        }

        await goto(client, new URL('/projects/?slug=ask-krishna', url).href);
        await waitFor(client, `document.querySelector('#project-title')?.textContent === 'Ask Krishna'`);
        const ask = await describeDetailLogo(client, 'ask-krishna-logo.svg');
        results.push(check('detail-existing-ask-krishna', ask.found && !ask.hidden && ask.srcOk && ask.complete, JSON.stringify(ask)));
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

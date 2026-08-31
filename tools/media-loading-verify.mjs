#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, delay, evaluate, openSession } from './cdp-session.mjs';

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
    console.log(`Usage: node tools/media-loading-verify.mjs [--mode all|source|e2e]

Modes:
  source   Static checks on scripts/main.js + data/projects.json (no browser)
  e2e      Live network/viewport checks on the Pixtyle project page (headless browser)
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
    await delay(150);
}

async function runSource() {
    const projects = JSON.parse(await readFile(join(ROOT, 'data', 'projects.json'), 'utf8'));
    const js = await readFile(join(ROOT, 'scripts', 'main.js'), 'utf8');

    if (!Array.isArray(projects)) throw new Error('data/projects.json must be an array');

    const gifRegexMatch = js.match(/function isAnimatedGif\(src\) \{\s*return \/(.+?)\/([a-z]*)\.test/);
    if (!gifRegexMatch) throw new Error('isAnimatedGif() helper is missing or no longer extension-based');
    const gifRegex = new RegExp(gifRegexMatch[1], gifRegexMatch[2]);
    const cases = { 'foo.GIF': true, 'foo.gif': true, 'foo.gif#frame': true, 'foo.gif?v=2': true, 'foo.gifx': false, 'foo.png': false };
    const badCases = Object.entries(cases).filter(([sample, expected]) => gifRegex.test(sample) !== expected);
    if (badCases.length) throw new Error(`isAnimatedGif() extension tolerance failed: ${JSON.stringify(badCases)}`);

    if (!/function createProjectMediaLeaf\(item, projectTitle, ancestry\)/.test(js)) {
        throw new Error('createProjectMediaLeaf still takes an external defer/index flag');
    }
    const leafBody = js.match(/function createProjectMediaLeaf[\s\S]*?\n}\n/)?.[0] || '';
    if (!/if \(isAnimatedGif\(item\.src\)\) image\.dataset\.src = src;\s*else image\.src = src;/.test(leafBody)) {
        throw new Error('static/GIF defer decision is no longer keyed on isAnimatedGif(item.src)');
    }
    if (/image\.loading = ['"]lazy['"]/.test(leafBody)) {
        throw new Error('project-media images still set loading="lazy" (blocks eager static + anticipatory GIF loading)');
    }
    if (!/\[-1, 0, 1\]\.forEach/.test(js)) {
        throw new Error('warmAdjacentMediaLeaves no longer warms a prev/current/next window');
    }

    if (/warmAdjacentMediaLeaves\(leaves, 0\);/.test(js) || /warmAdjacentMediaLeaves\(variantLeaves, 0\);/.test(js)) {
        throw new Error('gallery/comparison still warms GIFs eagerly at construction time (defeats near-viewport gating)');
    }
    if (!/function activateMediaCarouselNearViewport\(root, activate\)/.test(js)) {
        throw new Error('activateMediaCarouselNearViewport() viewport-gating helper is missing');
    }
    if (!/rootMargin: '800px 0px'/.test(js)) {
        throw new Error('GIF carousel activation no longer uses an ~800px vertical preload margin');
    }
    if (!/observer\.disconnect\(\);\s*\n\s*activate\(\);/.test(js)) {
        throw new Error('GIF carousel activation is no longer one-shot (disconnect before activate)');
    }
    if (!/function edgeClonesFromMotion\(motion, leafCount\)/.test(js)) {
        throw new Error('edgeClonesFromMotion() clone-sync helper is missing');
    }
    if (!/const hasDeferredMedia = leaves\.some/.test(js) || !/const hasDeferredMedia = variantLeaves\.some/.test(js)) {
        throw new Error('gallery/comparison no longer gate activation on the presence of deferred (GIF) media');
    }

    const locked = {
        'CAROUSEL_FLING_VX = 0.5': /const CAROUSEL_FLING_VX = 0\.5;/,
        'CAROUSEL_SWIPE_PX = 48': /const CAROUSEL_SWIPE_PX = 48;/,
        'CAROUSEL_TRANSITION_MS = 820': /const CAROUSEL_TRANSITION_MS = 820;/,
        'PROJECTS_CAROUSEL_MS = 8400': /const PROJECTS_CAROUSEL_MS = 8400;/
    };
    const brokenLocks = Object.entries(locked).filter(([, pattern]) => !pattern.test(js)).map(([name]) => name);
    if (brokenLocks.length) throw new Error(`locked carousel constants changed: ${brokenLocks.join(', ')}`);

    const allSrc = [];
    const collect = item => { if (item?.src) allSrc.push(item.src); };
    for (const project of projects) {
        for (const block of project.media?.blocks || []) {
            if (block.presentation === 'comparison') {
                for (const group of block.groups || []) {
                    collect(group.source);
                    (group.variants || []).forEach(collect);
                }
            } else {
                (block.items || []).forEach(collect);
            }
        }
    }
    const gifs = allSrc.filter(src => /\.gif$/i.test(src));
    if (gifs.length !== 5 || !gifs.every(src => src.includes('/pixtyle/deer-vs-'))) {
        throw new Error(`expected exactly 5 Pixtyle "deer-vs-*" GIFs in data/projects.json, found: ${JSON.stringify(gifs)}`);
    }

    console.log(`Source: OK (${allSrc.length} media items, ${gifs.length} GIF, ${allSrc.length - gifs.length} static)`);
}

async function readGifGalleryStates(client) {
    return evaluate(client, `(() => {
        const gallery = Array.from(document.querySelectorAll('.project-media-gallery')).find(g => g.querySelector('img[data-src*=".gif"], img[src*=".gif"]'));
        if (!gallery) return null;
        const describe = card => {
            const img = card.querySelector('img');
            return img ? (img.hasAttribute('src') ? 'src' : (img.hasAttribute('data-src') ? 'data-src' : 'none')) : 'no-img';
        };
        return Array.from(gallery.querySelector('.carousel-strip').children).map(describe);
    })()`);
}

async function runE2E(options) {
    const session = await openSession({ browser: options.browser || undefined });
    const results = [];
    const gifRequests = [];
    try {
        const { client, url } = session;
        client.on('Network.requestWillBeSent', params => {
            if (/\.gif(?:[?#]|$)/i.test(params.request?.url || '')) gifRequests.push(params.request.url);
        });

        await goto(client, new URL('/projects/?slug=pixtyle', url).href);
        await delay(200);

        const farStates = await readGifGalleryStates(client);
        results.push(check('gif-gallery-found', Boolean(farStates), farStates ? '' : 'no .project-media-gallery with a .gif slide on the Pixtyle page'));
        if (farStates) {
            results.push(check('gif-strip-has-loop-clones', farStates.length === 7, `cardCount=${farStates.length} (expected 5 real + 2 clones)`));
            results.push(check('far-from-viewport-zero-gif-src', farStates.every(state => state !== 'src'), JSON.stringify(farStates)));
            results.push(check('far-from-viewport-zero-gif-requests', gifRequests.length === 0, `requests=${JSON.stringify(gifRequests)}`));

            const approach = await evaluate(client, `(() => {
                const gallery = Array.from(document.querySelectorAll('.project-media-gallery')).find(g => g.querySelector('img[data-src*=".gif"], img[src*=".gif"]'));
                const rect = gallery.getBoundingClientRect();
                const target = Math.max(0, window.scrollY + rect.top - window.innerHeight - 600);
                window.scrollTo(0, target);
                return { rectTopBefore: rect.top, scrolledTo: target };
            })()`);
            await delay(350);
            const notYetVisible = await evaluate(client, `(() => {
                const gallery = Array.from(document.querySelectorAll('.project-media-gallery')).find(g => g.querySelector('img[data-src*=".gif"], img[src*=".gif"]'));
                const rect = gallery.getBoundingClientRect();
                return rect.top > window.innerHeight;
            })()`);
            results.push(check('approach-scroll-still-not-visible', notYetVisible, JSON.stringify(approach)));

            const nearStates = await readGifGalleryStates(client);
            const warmWindow = nearStates.slice(0, 3);
            results.push(check('near-viewport-warms-current-and-adjacent', warmWindow.every(state => state === 'src'), JSON.stringify(nearStates)));
            results.push(check('near-viewport-non-adjacent-still-deferred', nearStates[3] === 'data-src' && nearStates[4] === 'data-src', JSON.stringify(nearStates)));
            results.push(check('near-viewport-clone-edges-usable', nearStates[0] === 'src' && nearStates[nearStates.length - 1] === 'src', JSON.stringify(nearStates)));
            results.push(check('near-viewport-gif-requests-approx-3', gifRequests.length >= 3 && gifRequests.length <= 4, `requests=${JSON.stringify(gifRequests)}`));

            await evaluate(client, `document.querySelector('.project-media-gallery .carousel-nav--next')?.click()`);
            const afterAdvance = await readGifGalleryStates(client);
            results.push(check('advancing-warms-next-window-before-settle', afterAdvance[3] === 'src', JSON.stringify(afterAdvance)));
        }

        const staticState = await evaluate(client, `(() => {
            const comparisons = Array.from(document.querySelectorAll('.project-media-comparison-group'));
            const imgs = comparisons.flatMap(group => Array.from(group.querySelectorAll('img')));
            return {
                allHaveSrc: imgs.every(img => img.hasAttribute('src')),
                count: imgs.length,
                noneAreLazy: imgs.every(img => !img.hasAttribute('loading')),
                noneHaveDataSrc: imgs.every(img => !img.hasAttribute('data-src'))
            };
        })()`);
        results.push(check('static-comparison-images-render-eagerly', staticState.count > 0 && staticState.allHaveSrc && staticState.noneHaveDataSrc, JSON.stringify(staticState)));
        results.push(check('static-comparison-images-not-native-lazy', staticState.noneAreLazy, JSON.stringify(staticState)));

        const locked = await evaluate(client, `({
            autoplay: typeof PROJECTS_CAROUSEL_MS !== 'undefined' ? PROJECTS_CAROUSEL_MS : null,
            fling: typeof CAROUSEL_FLING_VX !== 'undefined' ? CAROUSEL_FLING_VX : null,
            swipe: typeof CAROUSEL_SWIPE_PX !== 'undefined' ? CAROUSEL_SWIPE_PX : null,
            tween: typeof CAROUSEL_TRANSITION_MS !== 'undefined' ? CAROUSEL_TRANSITION_MS : null
        })`);
        results.push(check('locked-carousel-timing-unchanged', locked.autoplay === 8400 && locked.tween === 820 && locked.swipe === 48 && locked.fling === 0.5, JSON.stringify(locked)));
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

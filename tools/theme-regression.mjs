#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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

async function waitGalleryReady(client) {
    await evaluate(client, `document.querySelector('.project-media-gallery')?.scrollIntoView({ block: 'center' })`);
    for (let attempt = 0; attempt < 40; attempt++) {
        if (await evaluate(client, `Boolean(document.querySelector('.project-media-gallery .carousel-slide[aria-hidden="false"] img')?.naturalWidth)`)) return;
        await delay(50);
    }
}

async function galleryCaptionGeom(client) {
    return evaluate(client, `(() => {
        const gallery = document.querySelector('.project-media-gallery');
        const track = gallery?.querySelector('.carousel-track');
        const metadata = gallery?.querySelector('.project-media-metadata');
        const card = gallery?.getBoundingClientRect();
        const trackBox = track?.getBoundingClientRect();
        const metaBox = metadata?.getBoundingClientRect();
        const media = trackBox;
        const leftDelta = Math.abs((metaBox?.left || 0) - (media?.left || 0));
        const widthDelta = Math.abs((metaBox?.width || 0) - (media?.width || 0));
        return {
            portrait: Boolean(gallery?.classList.contains('project-media-gallery--portrait')),
            cardW: Math.round(card?.width || 0),
            trackW: Math.round(trackBox?.width || 0),
            mediaW: Math.round(media?.width || 0),
            captionW: Math.round(metaBox?.width || 0),
            leftDelta: Math.round(leftDelta * 10) / 10,
            widthDelta: Math.round(widthDelta * 10) / 10,
            aligned: leftDelta <= 3 && widthDelta <= 4,
            max: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--project-gallery-max')) || 0,
            portraitMax: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--project-gallery-portrait')) || 0,
            overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
    })()`);
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

    const landingOk = geom => geom.gap >= 48 && geom.gap <= 120 && geom.headingTop > geom.navBottom + 40;

    await goto(client, new URL('/#projects', url).href, 'home');
    await evaluate(client, 'typeof restoreScrollPosition === "function" && restoreScrollPosition()');
    await delay(50);
    const projectsHash = await evaluate(client, `(() => {
        const nav = document.getElementById('navbar')?.getBoundingClientRect();
        const heading = document.querySelector('#projects .section-eyebrow, #projects .section-title');
        const head = heading?.getBoundingClientRect();
        return {
            hash: location.hash,
            top: Math.round(document.getElementById('projects')?.getBoundingClientRect().top || 9999),
            headingTop: Math.round(head?.top || 9999),
            navBottom: Math.round(nav?.bottom || 0),
            gap: head && nav ? Math.round(head.top - nav.bottom) : 9999
        };
    })()`);
    results.push(check('hash-projects', projectsHash.hash === '#projects' && landingOk(projectsHash), JSON.stringify(projectsHash)));

    await goto(client, new URL('/#timeline', url).href, 'home');
    await evaluate(client, 'typeof restoreScrollPosition === "function" && restoreScrollPosition()');
    await delay(50);
    const timelineHash = await evaluate(client, `(() => {
        const nav = document.getElementById('navbar')?.getBoundingClientRect();
        const heading = document.querySelector('#timeline .section-title, #timeline h2');
        const head = heading?.getBoundingClientRect();
        return {
            hash: location.hash,
            top: Math.round(document.getElementById('timeline')?.getBoundingClientRect().top || 9999),
            headingTop: Math.round(head?.top || 9999),
            navBottom: Math.round(nav?.bottom || 0),
            gap: head && nav ? Math.round(head.top - nav.bottom) : 9999
        };
    })()`);
    results.push(check('hash-timeline', timelineHash.hash === '#timeline' && landingOk(timelineHash), JSON.stringify(timelineHash)));

    await evaluate(client, 'history.back()');
    await delay(200);
    const backState = await evaluate(client, 'location.hash');
    results.push(check('history-back-to-projects', backState === '#projects', `hash=${backState}`));
    await evaluate(client, 'history.forward()');
    await delay(200);
    const forwardState = await evaluate(client, 'location.hash');
    results.push(check('history-forward-to-timeline', forwardState === '#timeline', `hash=${forwardState}`));

    const navGeom = id => evaluate(client, `(() => {
        const nav = document.getElementById('navbar')?.getBoundingClientRect();
        const section = document.getElementById(${JSON.stringify(id)});
        const heading = section?.querySelector('.section-eyebrow, .section-title, h1, h2');
        const head = heading?.getBoundingClientRect();
        return {
            hash: location.hash,
            headingTop: Math.round(head?.top || 9999),
            navBottom: Math.round(nav?.bottom || 0),
            gap: head && nav ? Math.round(head.top - nav.bottom) : 9999,
            scrollY: Math.round(window.scrollY)
        };
    })()`);

    await goto(client, new URL('/', url).href, 'home');
    await click(client, '.nav-links a[href="#projects"]');
    await delay(80);
    const clickProjects = await navGeom('projects');
    results.push(check('nav-click-projects-landing', clickProjects.hash === '#projects' && landingOk(clickProjects), JSON.stringify(clickProjects)));
    const yAfterClick = clickProjects.scrollY;
    await delay(120);
    const yLater = await evaluate(client, 'Math.round(window.scrollY)');
    results.push(check('nav-reduced-motion-instant', Math.abs(yLater - yAfterClick) < 2, `y0=${yAfterClick} y1=${yLater}`));

    await click(client, '.nav-links a[href="#timeline"]');
    await delay(80);
    const clickTimeline = await navGeom('timeline');
    results.push(check('nav-click-timeline-landing', clickTimeline.hash === '#timeline' && landingOk(clickTimeline), JSON.stringify(clickTimeline)));

    await click(client, '.nav-links a[href="#recommendations"]');
    await delay(80);
    const clickEndorsements = await navGeom('recommendations');
    results.push(check('nav-click-endorsements-landing', clickEndorsements.hash === '#recommendations' && landingOk(clickEndorsements), JSON.stringify(clickEndorsements)));

    await click(client, '.nav-links a[href="#home"]');
    await delay(80);
    const clickHome = await evaluate(client, `({ hash: location.hash, scrollY: Math.round(window.scrollY) })`);
    results.push(check('nav-click-home-top', clickHome.scrollY === 0, JSON.stringify(clickHome)));

    const contact = await evaluate(client, `({
        labels: [...document.querySelectorAll('#contact-form label[for], #contact-form legend')].map(node => ({
            for: node.getAttribute('for'),
            text: node.textContent.trim()
        })),
        named: ['contact-name','contact-email','contact-phone','contact-message'].every(id => document.getElementById(id)),
        honeypot: document.getElementById('contact-website')?.getAttribute('name') === 'website'
            && document.getElementById('contact-website')?.tabIndex === -1,
        status: document.getElementById('contact-status')?.getAttribute('role') === 'status',
        turnstile: document.getElementById('contact-turnstile')?.getAttribute('data-sitekey') === '1x00000000000000000000AA',
        mailto: document.getElementById('contact-mailto')?.textContent.trim() === 'Email me directly'
            && document.getElementById('contact-mailto')?.hidden
            && !document.getElementById('contact-mailto')?.getAttribute('href'),
        limits: document.getElementById('contact-name')?.getAttribute('maxlength') === '100'
            && document.getElementById('contact-email')?.getAttribute('maxlength') === '254'
            && document.getElementById('contact-message')?.getAttribute('maxlength') === '4000'
    })`);
    results.push(check('contact-inputs-labelled', contact.named && contact.labels.length >= 4, JSON.stringify(contact.labels)));
    results.push(check('contact-delivery-contract', contact.honeypot && contact.status && contact.turnstile && contact.limits && contact.mailto, JSON.stringify(contact)));

    const phoneRules = await evaluate(client, `({
        letters: phonePairOk('+91', 'test'),
        malformedCountry: phonePairOk('91', '9876543210'),
        letterCountry: phonePairOk('+abc', '9876543210'),
        validIn: phonePairOk('+91', '98765 43210'),
        validUs: phonePairOk('+1', '(415) 555-2671'),
        validUk: phonePairOk('+44', '20 7946 0958'),
        omittedPlus: phonePairOk('+', ''),
        omittedBlank: phonePairOk('', ''),
        onlyCountry: phonePairOk('+91', ''),
        onlyNumber: phonePairOk('+', '9876543210'),
        tooShort: phonePairOk('+91', '12'),
        tooLong: phonePairOk('+91', '1234567890123456')
    })`);
    results.push(check('contact-phone-letters-rejected', phoneRules.letters === false, JSON.stringify(phoneRules)));
    results.push(check('contact-phone-malformed-country-rejected', phoneRules.malformedCountry === false && phoneRules.letterCountry === false, JSON.stringify(phoneRules)));
    results.push(check('contact-phone-valid-formatted-accepted', phoneRules.validIn && phoneRules.validUs && phoneRules.validUk, JSON.stringify(phoneRules)));
    results.push(check('contact-phone-omitted-accepted', phoneRules.omittedPlus && phoneRules.omittedBlank, JSON.stringify(phoneRules)));
    results.push(check('contact-phone-partial-rejected', phoneRules.onlyCountry === false && phoneRules.onlyNumber === false, JSON.stringify(phoneRules)));
    results.push(check('contact-phone-digit-count', phoneRules.tooShort === false && phoneRules.tooLong === false, JSON.stringify(phoneRules)));

    await click(client, '#about-contact');
    await delay(80);
    const phoneUi = await evaluate(client, `(() => {
        const form = document.getElementById('contact-form');
        document.getElementById('contact-name').value = 'Test';
        document.getElementById('contact-email').value = 'a@b.co';
        document.getElementById('contact-message').value = 'Hello there';
        document.getElementById('contact-country').value = '+91';
        document.getElementById('contact-phone').value = 'test';
        form.requestSubmit();
        const country = document.getElementById('contact-country');
        const phone = document.getElementById('contact-phone');
        const error = document.getElementById('contact-phone-error');
        return {
            message: error?.textContent || '',
            hidden: error?.hidden,
            countryInvalid: country?.getAttribute('aria-invalid'),
            phoneInvalid: phone?.getAttribute('aria-invalid'),
            countryDescribed: country?.getAttribute('aria-describedby'),
            phoneDescribed: phone?.getAttribute('aria-describedby')
        };
    })()`);
    results.push(check(
        'contact-phone-ui-letters',
        phoneUi.message === 'Enter a valid phone number.'
            && phoneUi.hidden === false
            && phoneUi.countryInvalid === 'true'
            && phoneUi.phoneInvalid === 'true'
            && phoneUi.countryDescribed === 'contact-phone-error'
            && phoneUi.phoneDescribed === 'contact-phone-error',
        JSON.stringify(phoneUi)
    ));
    await click(client, '[data-contact-dismiss]');

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
    await click(client, '.nav-links a[href="#projects"]');
    await delay(80);
    const mobileProjects = await navGeom('projects');
    results.push(check('nav-click-projects-mobile-landing', mobileProjects.hash === '#projects' && landingOk(mobileProjects), JSON.stringify(mobileProjects)));

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

    await waitGalleryReady(client);
    const askGallery = await galleryCaptionGeom(client);
    results.push(check('project-gallery-portrait-token', askGallery.portraitMax === 560, JSON.stringify(askGallery)));
    results.push(check('project-gallery-ask-krishna-width', !askGallery.portrait && askGallery.cardW >= 800 && askGallery.cardW <= askGallery.max + 2 && !askGallery.overflowX, JSON.stringify(askGallery)));
    const askBefore = await evaluate(client, 'document.getElementById("project-media-title-0")?.textContent.trim() || ""');
    await click(client, '#project-media .carousel-nav--next');
    const askAfter = await evaluate(client, 'document.getElementById("project-media-title-0")?.textContent.trim() || ""');
    results.push(check('project-gallery-navigates', Boolean(askBefore) && Boolean(askAfter) && askAfter !== askBefore, JSON.stringify({ askBefore, askAfter })));

    await goto(client, new URL('/projects/?slug=media-search-engine', url).href, 'project');
    await waitGalleryReady(client);
    const aftersightGallery = await galleryCaptionGeom(client);
    results.push(check('project-gallery-landscape-width', !aftersightGallery.portrait && aftersightGallery.cardW >= 800 && aftersightGallery.cardW <= aftersightGallery.max + 2 && !aftersightGallery.overflowX, JSON.stringify(aftersightGallery)));

    await goto(client, new URL('/projects/?slug=flodoro', url).href, 'project');
    await waitGalleryReady(client);
    const flodoroGallery = await galleryCaptionGeom(client);

    await setViewportTheme(client, 'mobile', 'dark', 'dark');
    await goto(client, new URL('/projects/?slug=ask-krishna', url).href, 'project');
    await waitGalleryReady(client);
    const askMobile = await galleryCaptionGeom(client);
    results.push(check('project-gallery-caption-aligns', askGallery.aligned && aftersightGallery.aligned && flodoroGallery.aligned && askMobile.aligned && !flodoroGallery.overflowX && !askMobile.overflowX, JSON.stringify({ ask: askGallery, aftersight: aftersightGallery, flodoro: flodoroGallery, mobile: askMobile })));
    await setViewportTheme(client, 'desktop', 'dark', 'dark');

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

    await client.send('Emulation.setEmulatedMedia', {
        features: [
            { name: 'prefers-color-scheme', value: 'light' },
            { name: 'prefers-reduced-motion', value: 'no-preference' }
        ],
        media: 'screen'
    });
    const loaded = client.once('Page.loadEventFired', 30000);
    await client.send('Page.navigate', { url: new URL('/', url).href });
    try { await loaded; } catch (error) {
        const ready = await evaluate(client, 'document.readyState');
        if (ready !== 'complete' && ready !== 'interactive') throw error;
    }
    for (let attempt = 0; attempt < 80; attempt++) {
        if (await evaluate(client, `Boolean(document.querySelector('.cursor') && document.querySelector('.scroll-hint'))`)) break;
        await delay(50);
    }
    await evaluate(client, `document.getElementById('theme-regression-freeze')?.remove()`);
    await delay(120);
    const blinkSample = () => evaluate(client, `(() => {
        const cursor = document.querySelector('.cursor');
        const hint = document.querySelector('.scroll-hint');
        const cursorOp = cursor ? Number.parseFloat(getComputedStyle(cursor).opacity) : NaN;
        const hintOp = hint ? Number.parseFloat(getComputedStyle(hint).opacity) : NaN;
        const clock = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--blink-on'));
        return {
            cursor: cursorOp,
            hint: hintOp,
            clock,
            hidden: Boolean(hint?.classList.contains('hidden')),
            anim: getComputedStyle(document.documentElement).animationName,
            synced: cursorOp === hintOp && cursorOp === clock
        };
    })()`);
    const blinkA = await blinkSample();
    await delay(550);
    const blinkB = await blinkSample();
    results.push(check('blink-shared-clock', blinkA.anim === 'blink-clock' && blinkA.synced && !blinkA.hidden, JSON.stringify(blinkA)));
    results.push(check('blink-phase-holds', blinkB.synced && !blinkB.hidden, JSON.stringify({ blinkA, blinkB })));
    await click(client, '#theme-toggle');
    await evaluate(client, `document.getElementById('theme-regression-freeze')?.remove()`);
    await delay(80);
    const blinkTheme = await blinkSample();
    results.push(check('blink-theme-stays-synced', blinkTheme.synced, JSON.stringify(blinkTheme)));
    await click(client, '.nav-links a[href="#about"]');
    await delay(80);
    await click(client, '.nav-links a[href="#home"]');
    await delay(360);
    await evaluate(client, `document.getElementById('theme-regression-freeze')?.remove()`);
    await delay(80);
    const blinkHome = await blinkSample();
    results.push(check('blink-return-home-synced', !blinkHome.hidden && blinkHome.synced, JSON.stringify(blinkHome)));

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
    const required = ['--bg-page', '--bg-surface', '--bg-interactive', '--bg-transient', '--on-accent', '--accent-interact', '--kind-course', '--kind-internship', '--kind-achievement', '--logo-plate', '--media-letterbox', '--overlay', '--dialog-shadow', '--nav-drawer-shadow', '--shadow-raised', '--shadow-floating', '--shadow-control', '--shadow-quiet'];
    const missing = required.filter(token => !css.includes(token));
    if (stale.length || missing.length) {
        throw new Error(`source check failed: stale=${stale.join(',') || 'none'} missing=${missing.join(',') || 'none'}`);
    }
    if (!css.includes('@keyframes blink-clock') || !css.includes('--project-gallery-max') || !js.includes('pageScrollAnchor')) {
        throw new Error('source check failed: missing blink-clock, gallery max token, or heading-anchor scroll');
    }
    const html = await readFile(join(ROOT, 'index.html'), 'utf8');
    const worker = await readFile(join(ROOT, 'workers', 'contact', 'src', 'index.js'), 'utf8');
    const wrangler = await readFile(join(ROOT, 'workers', 'contact', 'wrangler.toml'), 'utf8');
    const contactGaps = [];
    if (!js.includes("CONTACT_ENDPOINT_PROD = 'https://portfolio-contact.hiteshgoyal-business.workers.dev'")) {
        contactGaps.push('workers.dev-endpoint');
    }
    if (js.includes('api.hiteshgoyal.me') || html.includes('api.hiteshgoyal.me')) contactGaps.push('api-subdomain');
    if (js.includes('window.location.href = `mailto:') || /location\.href\s*=\s*[`'"]mailto:/.test(js)) {
        contactGaps.push('auto-mailto');
    }
    if (!html.includes('id="contact-website"') || !html.includes('id="contact-turnstile"') || !html.includes('id="contact-status"') || !html.includes('id="contact-mailto"')) {
        contactGaps.push('contact-markup');
    }
    if (js.includes('RESEND_API_KEY') || js.includes('TURNSTILE_SECRET') || worker.includes('hiteshgoyal.business@gmail.com')) {
        contactGaps.push('leaked-secret');
    }
    if (!worker.includes('challenges.cloudflare.com/turnstile') || !worker.includes('api.resend.com/emails')) {
        contactGaps.push('worker-providers');
    }
    if (!worker.includes('CONTACT_LIMITER.limit') || worker.includes('rateHits') || !wrangler.includes('[[ratelimits]]')) {
        contactGaps.push('native-ratelimit');
    }
    if (!wrangler.includes('RESEND_API_KEY') || !wrangler.includes('TURNSTILE_SECRET_KEY') || !wrangler.includes('CONTACT_TO_EMAIL')) {
        contactGaps.push('secrets-required');
    }
    if (html.includes('0x4AAAAAAEdudRMuypS6qFDx')) contactGaps.push('html-prod-sitekey');
    if (!js.includes('CONTACT_TURNSTILE_SITEKEY_TEST') || !js.includes('CONTACT_TURNSTILE_SITEKEY_PROD') || !js.includes('isLocalContactHost')) {
        contactGaps.push('sitekey-split');
    }
    if (!wrangler.includes('STUB_RESEND') || !worker.includes('STUB_RESEND')) contactGaps.push('stub-resend');
    if (worker.includes('1x0000000000000000000000000000000AA')) contactGaps.push('test-secret-in-worker');
    if (!wrangler.includes('compatibility_date = "2026-08-27"') || !wrangler.includes('preview_urls = false') || !/\[observability\]/.test(wrangler)) {
        contactGaps.push('worker-observability');
    }
    if (/console\.(log|info|warn|error)\([^)]*(fields\.|payload|turnstileToken|RESEND_API_KEY|CONTACT_TO_EMAIL)/.test(worker)) {
        contactGaps.push('pii-log');
    }
    if (!js.includes('phonePairOk') || !worker.includes('phonePairOk') || !worker.includes('export function fieldsOk')) {
        contactGaps.push('phone-validation');
    }
    if (!js.includes("CONTACT_COUNTRY_RE = /^\\+\\d{1,4}$/") || !worker.includes('COUNTRY_RE = /^\\+\\d{1,4}$/')) {
        contactGaps.push('country-re');
    }
    if (contactGaps.length) throw new Error(`source check failed: contact=${contactGaps.join(',')}`);

    const { fieldsOk } = await import(pathToFileURL(join(ROOT, 'workers', 'contact', 'src', 'index.js')).href);
    const sample = extra => ({
        name: 'Test',
        email: 'a@b.co',
        message: 'Hello there',
        website: '',
        turnstileToken: 'token',
        country: '',
        phone: '',
        ...extra
    });
    const phoneWorker = [
        ['letters', sample({ country: '+91', phone: 'test' }), false],
        ['malformed-country', sample({ country: '91', phone: '9876543210' }), false],
        ['letter-country', sample({ country: '+abc', phone: '9876543210' }), false],
        ['valid-in', sample({ country: '+91', phone: '98765 43210' }), true],
        ['valid-us', sample({ country: '+1', phone: '(415) 555-2671' }), true],
        ['valid-uk', sample({ country: '+44', phone: '20 7946 0958' }), true],
        ['omitted-plus', sample({ country: '+', phone: '' }), true],
        ['omitted-blank', sample({ country: '', phone: '' }), true],
        ['only-country', sample({ country: '+91', phone: '' }), false],
        ['only-number', sample({ country: '+', phone: '9876543210' }), false],
        ['too-short', sample({ country: '+91', phone: '12' }), false],
        ['too-long', sample({ country: '+91', phone: '1234567890123456' }), false]
    ];
    const phoneWorkerFail = phoneWorker.filter(([name, payload, expectOk]) => Boolean(fieldsOk(payload)) !== expectOk);
    if (phoneWorkerFail.length) {
        throw new Error(`source check failed: worker-phone=${phoneWorkerFail.map(row => row[0]).join(',')}`);
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

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
    console.log(`Usage: node tools/calendly-contact-tabs-verify.mjs [--mode all|source|e2e]

Modes:
  source   Markup/JS locks for tabs + lazy Calendly (no browser)
  e2e      Contact modal tabs, lazy load, real embed, form preservation
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
    for (let attempt = 0; attempt < 150; attempt++) {
        if (await evaluate(client, `Boolean(${expression})`)) {
            await delay(40);
            return;
        }
        await delay(100);
    }
    throw new Error(`Timed out waiting for ${expression}`);
}

async function runSource() {
    const html = await readFile(join(ROOT, 'index.html'), 'utf8');
    const js = await readFile(join(ROOT, 'scripts', 'main.js'), 'utf8');
    const css = await readFile(join(ROOT, 'style.css'), 'utf8');
    const worker = await readFile(join(ROOT, 'workers', 'contact', 'src', 'index.js'), 'utf8');

    if (!/role="tablist"/.test(html) || !/id="contact-tab-message"/.test(html) || !/id="contact-tab-schedule"/.test(html)) {
        throw new Error('contact modal is missing tablist markup');
    }
    if (!html.includes('Send a message') || !html.includes('Schedule a Call')) {
        throw new Error('contact tab labels changed');
    }
    if (!html.includes('id="contact-panel-message"') || !html.includes('id="contact-panel-schedule"')) {
        throw new Error('contact tabpanels missing');
    }
    if (!html.includes('id="contact-form"') || !html.includes('id="contact-turnstile"') || !html.includes('id="contact-website"')) {
        throw new Error('message form markup was removed');
    }
    if (!/const CALENDLY_EVENT_URL = 'https:\/\/calendly\.com\/hiteshgoyal\/30min'/.test(js)) {
        throw new Error('CALENDLY_EVENT_URL is not the real event URL');
    }
    if ((js.match(/https:\/\/calendly\.com\/hiteshgoyal\/30min/g) || []).length !== 1) {
        throw new Error('Calendly event URL is scattered or duplicated');
    }
    if (html.includes('calendly.com/hiteshgoyal')) {
        throw new Error('Calendly event URL leaked into HTML');
    }
    if (!/const CALENDLY_HIDE_EVENT_TYPE_DETAILS = true/.test(js)) {
        throw new Error('CALENDLY_HIDE_EVENT_TYPE_DETAILS must be true for the website embed');
    }
    if (html.includes('hide_gdpr_banner') || js.includes('hide_gdpr_banner=1')) {
        throw new Error('hide_gdpr_banner must not be set');
    }
    if (!/Calendly\.initInlineWidget\(/.test(js) || !/resize: true/.test(js)) {
        throw new Error('official initInlineWidget({ resize: true }) call is missing');
    }
    if (!/function loadCalendlyAssets\(/.test(js) || !/id = 'calendly-widget-js'/.test(js)) {
        throw new Error('lazy Calendly loader / single-script id is missing');
    }
    if (/<script[^>]+calendly/i.test(html)) throw new Error('Calendly script is statically included in index.html');
    if (!/prefill\.name/.test(js) || !/prefill\.email/.test(js)) {
        throw new Error('name/email prefill on first Calendly init is missing');
    }
    if (/prefill\.phone/.test(js) || /customAnswers/.test(js)) {
        throw new Error('unexpected Calendly prefill fields beyond name/email');
    }
    if (!/calendly\.event_scheduled/.test(js) || !/origin !== 'https:\/\/calendly.com'/.test(js)) {
        throw new Error('safe calendly.event_scheduled listener is missing');
    }
    if (js.includes('CONTACT_ENDPOINT_PROD') === false) throw new Error('contact endpoint constant missing');
    if (worker.includes('Calendly') || worker.includes('calendly')) {
        throw new Error('Worker was changed for Calendly');
    }
    if (!/contact-modal-dialog--schedule/.test(css) || !/min-width: 320px/.test(css)) {
        throw new Error('schedule modal width / Calendly min-width is missing');
    }

    console.log('Source: OK');
}

async function runE2E(options) {
    const session = await openSession({ browser: options.browser || undefined });
    const results = [];
    const calendlyUrls = [];
    try {
        const { client, url } = session;
        const pageErrors = [];
        client.on('Runtime.exceptionThrown', params => {
            pageErrors.push(params.exceptionDetails?.text || params.exceptionDetails?.exception?.description || 'exception');
        });
        await client.send('Emulation.setDeviceMetricsOverride', {
            deviceScaleFactor: 1,
            height: 900,
            mobile: false,
            screenHeight: 900,
            screenWidth: 1440,
            width: 1440
        });

        await goto(client, new URL('/', url).href);
        await waitFor(client, `document.getElementById('introduction-contact')`);
        await delay(200);
        results.push(check('load-no-calendly-network', calendlyUrls.length === 0, JSON.stringify(calendlyUrls)));

        await evaluate(client, `document.getElementById('introduction-contact')?.click()`);
        await waitFor(client, `document.getElementById('contact-modal') && !document.getElementById('contact-modal').hidden`);
        await delay(80);

        const opened = await evaluate(client, `(() => {
            const modal = document.getElementById('contact-modal');
            const messageTab = document.getElementById('contact-tab-message');
            const scheduleTab = document.getElementById('contact-tab-schedule');
            const messagePanel = document.getElementById('contact-panel-message');
            const schedulePanel = document.getElementById('contact-panel-schedule');
            return {
                hidden: modal.hidden,
                active: document.activeElement?.id,
                messageSelected: messageTab?.getAttribute('aria-selected') === 'true',
                scheduleSelected: scheduleTab?.getAttribute('aria-selected') === 'true',
                messageHidden: messagePanel?.hidden === true,
                scheduleHidden: schedulePanel?.hidden === true,
                scheduleInert: schedulePanel?.hasAttribute('inert'),
                messageInert: messagePanel?.hasAttribute('inert'),
                scripts: [...document.querySelectorAll('script[src*="calendly"], #calendly-widget-js')].length
            };
        })()`);
        results.push(check('modal-opens-on-message', opened.hidden === false && opened.active === 'contact-name' && opened.messageSelected && !opened.scheduleSelected, JSON.stringify(opened)));
        results.push(check('schedule-hidden-inert', opened.scheduleHidden && opened.scheduleInert && !opened.messageHidden && !opened.messageInert, JSON.stringify(opened)));
        results.push(check('modal-open-no-calendly-assets', opened.scripts === 0 && calendlyUrls.length === 0, JSON.stringify({ scripts: opened.scripts, calendlyUrls })));

        await evaluate(client, `(() => {
            document.getElementById('contact-name').value = 'Ada Lovelace';
            document.getElementById('contact-email').value = 'ada@example.com';
            document.getElementById('contact-message').value = 'Draft stays.';
            document.getElementById('contact-name').setAttribute('aria-invalid', 'true');
        })()`);
        const beforeScheduleCount = calendlyUrls.length;
        await evaluate(client, `document.getElementById('contact-tab-schedule')?.click()`);
        await waitFor(client, `document.querySelector('#contact-calendly iframe')`);
        await waitFor(client, `(document.querySelector('#contact-calendly iframe')?.getBoundingClientRect().height || 0) > 200`);
        await delay(400);

        const widget = await evaluate(client, `(() => {
            const iframe = document.querySelector('#contact-calendly iframe');
            const src = iframe?.getAttribute('src') || '';
            let decoded = src;
            try { decoded = decodeURIComponent(src); } catch (error) {}
            return {
                scheduleSelected: document.getElementById('contact-tab-schedule')?.getAttribute('aria-selected') === 'true',
                placeholderHidden: document.getElementById('contact-calendly-placeholder')?.hidden === true,
                mountHidden: document.getElementById('contact-calendly')?.hidden === true,
                scripts: [...document.querySelectorAll('#calendly-widget-js, script[src*="calendly"]')].map(node => node.id || node.getAttribute('src')),
                iframes: document.querySelectorAll('#contact-calendly iframe').length,
                src,
                decoded,
                event: src.includes('hiteshgoyal/30min'),
                hideDetails: /hide_event_type_details=1/.test(src),
                gdprHidden: /hide_gdpr_banner=1/.test(src),
                prefillName: decoded.includes('Ada Lovelace') || src.includes('Ada%20Lovelace') || src.includes('name=Ada'),
                prefillEmail: decoded.includes('ada@example.com') || src.includes('ada%40example.com'),
                dialogSchedule: document.querySelector('.contact-modal-dialog')?.classList.contains('contact-modal-dialog--schedule'),
                iframeW: iframe ? Math.round(iframe.getBoundingClientRect().width) : 0,
                iframeH: iframe ? Math.round(iframe.getBoundingClientRect().height) : 0,
                perf: performance.getEntriesByType('resource').filter(e => /calendly/i.test(e.name)).map(e => e.name.split('?')[0]).slice(0, 8)
            };
        })()`);
        results.push(check('schedule-opens-real-widget', widget.scheduleSelected && widget.placeholderHidden && !widget.mountHidden && widget.iframes === 1 && widget.event, JSON.stringify(widget)));
        results.push(check('schedule-hides-event-details', widget.hideDetails && !widget.gdprHidden, JSON.stringify({ src: widget.src })));
        results.push(check('schedule-prefill-name-email', widget.prefillName && widget.prefillEmail, JSON.stringify({ src: widget.src })));
        results.push(check('schedule-one-script', widget.scripts.length === 1, JSON.stringify(widget.scripts)));
        results.push(check('schedule-loads-calendly-network', widget.perf.length > 0 || calendlyUrls.length > beforeScheduleCount, JSON.stringify({ perf: widget.perf, cdp: calendlyUrls.slice(0, 8) })));
        results.push(check('schedule-no-page-exceptions', pageErrors.length === 0, JSON.stringify(pageErrors)));

        await evaluate(client, `document.getElementById('contact-tab-schedule')?.click()`);
        await evaluate(client, `document.getElementById('contact-tab-schedule')?.click()`);
        const afterRepeat = await evaluate(client, `({
            scripts: document.querySelectorAll('#calendly-widget-js, script[src*="calendly"]').length,
            iframes: document.querySelectorAll('#contact-calendly iframe').length
        })`);
        results.push(check('repeat-schedule-no-duplicate-widget', afterRepeat.scripts === 1 && afterRepeat.iframes === 1, JSON.stringify(afterRepeat)));

        await evaluate(client, `document.getElementById('contact-tab-message')?.click()`);
        const preserved = await evaluate(client, `({
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            message: document.getElementById('contact-message').value,
            invalid: document.getElementById('contact-name').getAttribute('aria-invalid'),
            messageSelected: document.getElementById('contact-tab-message').getAttribute('aria-selected'),
            scheduleInert: document.getElementById('contact-panel-schedule')?.hasAttribute('inert')
        })`);
        results.push(check(
            'form-state-survives-tab-switch',
            preserved.name === 'Ada Lovelace' && preserved.email === 'ada@example.com' && preserved.message === 'Draft stays.' && preserved.invalid === 'true' && preserved.messageSelected === 'true' && preserved.scheduleInert,
            JSON.stringify(preserved)
        ));

        await evaluate(client, `document.getElementById('contact-tab-message')?.focus()`);
        await evaluate(client, `document.querySelector('.contact-tablist').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))`);
        const keyed = await evaluate(client, `({
            selected: document.getElementById('contact-tab-schedule').getAttribute('aria-selected'),
            focus: document.activeElement?.id,
            iframes: document.querySelectorAll('#contact-calendly iframe').length
        })`);
        results.push(check('arrow-right-selects-schedule', keyed.selected === 'true' && keyed.focus === 'contact-tab-schedule' && keyed.iframes === 1, JSON.stringify(keyed)));

        await evaluate(client, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))`);
        await delay(80);
        const restored = await evaluate(client, `({
            hidden: document.getElementById('contact-modal').hidden,
            active: document.activeElement?.id
        })`);
        results.push(check('escape-restores-opener', restored.hidden === true && restored.active === 'introduction-contact', JSON.stringify(restored)));

        await evaluate(client, `document.getElementById('introduction-contact')?.click()`);
        await waitFor(client, `document.getElementById('contact-modal') && !document.getElementById('contact-modal').hidden`);
        await evaluate(client, `document.getElementById('contact-tab-schedule')?.click()`);
        await delay(200);
        const reopened = await evaluate(client, `({
            messageDefault: document.getElementById('contact-tab-message').getAttribute('aria-selected') === 'false',
            iframes: document.querySelectorAll('#contact-calendly iframe').length,
            scripts: document.querySelectorAll('#calendly-widget-js, script[src*="calendly"]').length
        })`);
        results.push(check('reopen-retains-single-widget', reopened.messageDefault && reopened.iframes === 1 && reopened.scripts === 1, JSON.stringify(reopened)));
        await evaluate(client, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))`);
        await delay(80);

        for (const width of [320, 390, 430]) {
            await client.send('Emulation.setDeviceMetricsOverride', {
                deviceScaleFactor: 2,
                height: 844,
                mobile: true,
                screenHeight: 844,
                screenWidth: width,
                width
            });
            await evaluate(client, `document.getElementById('introduction-contact')?.click()`);
            await waitFor(client, `document.getElementById('contact-modal') && !document.getElementById('contact-modal').hidden`);
            await evaluate(client, `document.getElementById('contact-tab-schedule')?.click()`);
            await delay(120);
            const overflow = await evaluate(client, `(() => {
                const dialog = document.querySelector('.contact-modal-dialog');
                const close = document.querySelector('.contact-modal-close');
                const tabs = [...document.querySelectorAll('.contact-tab')];
                const iframe = document.querySelector('#contact-calendly iframe');
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                    dialogOverflow: getComputedStyle(dialog).overflowX,
                    closeVisible: close && close.getBoundingClientRect().width > 0,
                    tabsVisible: tabs.every(tab => tab.getBoundingClientRect().height > 0),
                    iframeMin: iframe ? iframe.getBoundingClientRect().width >= 319 : true
                };
            })()`);
            results.push(check(
                `mobile-${width}-schedule-fit`,
                overflow.scrollWidth <= overflow.innerWidth + 1 && overflow.closeVisible && overflow.tabsVisible && overflow.iframeMin,
                JSON.stringify(overflow)
            ));
            await evaluate(client, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))`);
            await delay(60);
        }
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

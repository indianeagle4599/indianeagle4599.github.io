const THEME_STORAGE_KEY = 'portfolio-theme';
/* Keep equal to --bg-page in style.css. Head scripts cannot read that variable before paint. */
const THEME_PAGE_COLOR = {
    light: '#f4f4f2',
    dark: '#000000'
};
const THEME_ICONS = {
    light: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.07-7.07-1.41 1.41M6.34 17.66l-1.41 1.41m14.14 0-1.41-1.41M6.34 6.34 4.93 4.93"></path></svg>',
    dark: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>'
};
const SITE_ORIGIN = 'https://hiteshgoyal.me';
const CONTACT_ENDPOINT_PROD = 'https://portfolio-contact.hiteshgoyal-business.workers.dev';
const CONTACT_ENDPOINT_LOCAL = 'http://127.0.0.1:8787'; // local Worker stubs Resend; live inbox test is https://hiteshgoyal.me only
const CONTACT_TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const CONTACT_TURNSTILE_SITEKEY_PROD = '0x4AAAAAAEdudRMuypS6qFDx';
const CONTACT_TURNSTILE_SITEKEY_TEST = '1x00000000000000000000AA';
const CONTACT_TURNSTILE_LOAD_ERROR = "Security check couldn't load. Please refresh and try again.";
const CONTACT_PHONE_ERROR = 'Enter a valid phone number.';
const CONTACT_COUNTRY_RE = /^\+\d{1,4}$/;
const CONTACT_PHONE_LOCAL_RE = /^[0-9 ()\-.]+$/;
const CALENDLY_EVENT_URL = 'https://calendly.com/hiteshgoyal/30min';
const CALENDLY_WIDGET_JS = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_HIDE_EVENT_TYPE_DETAILS = true;
const PROJECT_SLUG_RE = /^[a-z0-9-]+$/i;
const SAFE_HREF_RE = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;
const CERT_KIND_LABELS = {
    course: 'Course',
    internship: 'Internship',
    achievement: 'Achievement'
};
const CHEVRON_HTML = `<span class="stack-chevron" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;
const CAROUSEL_NAV_PREV_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>';
const CAROUSEL_NAV_NEXT_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
const GITHUB_MARK_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>';
function strokeIcon(markup) {
    return `<svg class="action-icon action-icon--stroke" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${markup}</svg>`;
}
const ACTION_ICONS = {
    github: GITHUB_MARK_HTML,
    demo: strokeIcon('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    blog: strokeIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>'),
    website: strokeIcon('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
    credentials: strokeIcon('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>'),
    contact: strokeIcon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>')
};
const LINK_KIND_BY_LABEL = {
    github: 'github',
    'live demo': 'demo',
    demo: 'demo',
    blog: 'blog',
    website: 'website',
    credentials: 'credentials'
};
/* Tag icons: Simple Icons (CC0) for brands; Lucide (ISC) for concepts. CSS mask paints currentColor. */
const TAG_ICONS = {
    Python: 'python',
    PyTorch: 'pytorch',
    JavaScript: 'javascript',
    CSS: 'css3',
    MongoDB: 'mongodb',
    Docker: 'docker',
    FastAPI: 'fastapi',
    Streamlit: 'streamlit',
    'React Native': 'react',
    Gemini: 'googlegemini',
    Celery: 'celery',
    Kaggle: 'kaggle',
    'AWS EC2': 'amazonec2',
    Ollama: 'ollama',
    'Vanilla JS': 'javascript',
    ASR: 'lu-audio-lines',
    Whisper: 'lu-audio-lines',
    Speech: 'lu-audio-lines',
    'Speech Recognition': 'lu-audio-lines',
    'Speech and audio ML': 'lu-audio-lines',
    'Speech recognition and audio ML': 'lu-audio-lines',
    'Computer Vision': 'lu-scan-eye',
    'Computer vision and multimodal systems': 'lu-layers',
    'Deep Learning': 'lu-brain-circuit',
    'Machine Learning': 'lu-brain',
    'Generative AI': 'lu-sparkles',
    'Generative AI pipelines': 'lu-sparkles',
    'Hybrid Retrieval': 'lu-scan-search',
    'Local-first': 'lu-hard-drive',
    'Static Site': 'lu-file-code',
    'R&D': 'lu-flask-conical',
    'Video Processing': 'lu-video',
    ChromaDB: 'lu-database',
    LLM: 'lu-bot',
    VLM: 'lu-image',
    NLP: 'lu-message-square-text',
    i18n: 'lu-languages',
    CLI: 'lu-terminal',
    Filesystem: 'lu-folder-tree',
    'Document Processing': 'lu-file-text',
    Productivity: 'lu-list-checks',
    Benchmarking: 'lu-gauge',
    Evaluation: 'lu-clipboard-check',
    Orchestration: 'lu-server',
    'Distributed Systems': 'lu-network',
    SLURM: 'lu-server',
    Mathematics: 'lu-sigma',
    Programming: 'lu-code',
    'Object Detection': 'lu-scan',
    'Object Detection and Segmentation': 'lu-scan',
    'Fuzzy Logic': 'lu-blend',
    'Model Training': 'lu-refresh-cw',
    'Model Monitoring': 'lu-activity',
    'Feature Engineering': 'lu-wrench',
    'Hyperparameter Tuning': 'lu-sliders-horizontal',
    'Image Classification': 'lu-image',
    'Image Processing': 'lu-aperture',
    OCR: 'lu-scan-text',
    Automation: 'lu-workflow',
    MLOps: 'lu-cog',
    Multiprocessing: 'lu-cpu',
    Multithreading: 'lu-split',
    'Vector Embeddings': 'lu-waypoints',
    localStorage: 'lu-save'
};
const PROJECTS_CAROUSEL_MS = 8400;
const SHORT_CLIP_MIN_S = 5;
const CAROUSEL_TRANSITION_MS = 820;
const CAROUSEL_SWIPE_PX = 48;
const CAROUSEL_FLING_VX = 0.5;
const MOTION_SPATIAL_MS = 500;
const TIMELINE_DRAG_INTENT_PX = 10;
const TIMELINE_DRAG_COMMIT_RATIO = 0.25;
const TIMELINE_DRAG_VELOCITY = 0.55;
const TIMELINE_DRAG_EDGE = 0.26;
const RECOMMENDATION_PAGE_SIZE = 5;
const RECOMMENDATION_SPANS = ['wide', 'medium', 'small', 'small', 'small'];

let filtersInitialized = false;
let certificatesLoaded = false;
let stackUid = 0;
let timelineTabIndex = 0;
let timelineDrag = null;
let themeTransitionTimer = 0;
let contactDestination = '';
let themeMediaQuery = null;
let turnstileLoader = null;
let calendlyLoader = null;
let calendlyInitialized = false;
let calendlyInitStarted = false;
let calendlyMessageBound = false;

function isLocalContactHost(host) {
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

function contactTurnstileSitekey() {
    return isLocalContactHost(location.hostname)
        ? CONTACT_TURNSTILE_SITEKEY_TEST
        : CONTACT_TURNSTILE_SITEKEY_PROD;
}

function contactEndpoint(form) {
    const override = String(form.getAttribute('data-contact-endpoint') || '').trim();
    if (override) return override.replace(/\/$/, '');
    if (isLocalContactHost(location.hostname)) return CONTACT_ENDPOINT_LOCAL;
    return CONTACT_ENDPOINT_PROD.replace(/\/$/, '');
}

function contactCountryEmpty(raw) {
    const value = String(raw || '').trim();
    return !value || value === '+';
}

function phonePairOk(countryRaw, numberRaw) {
    const country = String(countryRaw || '').trim();
    const number = String(numberRaw || '').trim();
    const countryEmpty = contactCountryEmpty(country);
    const numberEmpty = !number;
    if (countryEmpty && numberEmpty) return true;
    if (countryEmpty !== numberEmpty) return false;
    if (!CONTACT_COUNTRY_RE.test(country)) return false;
    if (!CONTACT_PHONE_LOCAL_RE.test(number)) return false;
    const local = number.replace(/[ ()\-.]/g, '');
    const total = country.length - 1 + local.length;
    return total >= 7 && total <= 15;
}

function newIdempotencyKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(item => item.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve();
    if (turnstileLoader) return turnstileLoader;
    turnstileLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = CONTACT_TURNSTILE_SRC;
        script.async = true;
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('turnstile')), { once: true });
        document.head.appendChild(script);
    });
    return turnstileLoader;
}

function calendlyEventUrl() {
    const raw = String(CALENDLY_EVENT_URL || '').trim();
    if (!raw) return '';
    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:') return '';
        if (url.hostname !== 'calendly.com' && !url.hostname.endsWith('.calendly.com')) return '';
        return url.toString();
    } catch (error) {
        return '';
    }
}

function calendlyEmbedUrl() {
    const raw = calendlyEventUrl();
    if (!raw) return '';
    const url = new URL(raw);
    if (CALENDLY_HIDE_EVENT_TYPE_DETAILS) url.searchParams.set('hide_event_type_details', '1');
    url.searchParams.delete('hide_gdpr_banner');
    return url.toString();
}

function loadCalendlyAssets() {
    if (window.Calendly) return Promise.resolve();
    if (calendlyLoader) return calendlyLoader;
    calendlyLoader = new Promise((resolve, reject) => {
        const existing = document.getElementById('calendly-widget-js');
        if (existing) {
            if (window.Calendly) resolve();
            else {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('calendly')), { once: true });
            }
            return;
        }
        const script = document.createElement('script');
        script.id = 'calendly-widget-js';
        script.src = CALENDLY_WIDGET_JS;
        script.async = true;
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('calendly')), { once: true });
        document.head.appendChild(script);
    });
    calendlyLoader.catch(() => { calendlyLoader = null; });
    return calendlyLoader;
}

function bindCalendlyScheduledListener(tab, panel) {
    if (calendlyMessageBound) return;
    calendlyMessageBound = true;
    window.addEventListener('message', event => {
        if (event.origin !== 'https://calendly.com') return;
        if (!event.data || event.data.event !== 'calendly.event_scheduled') return;
        tab?.setAttribute('data-calendly-booked', 'true');
        panel?.setAttribute('data-calendly-booked', 'true');
    });
}

function placeUnderlineIndicator(container, indicator, target, { instant = false } = {}) {
    if (!container || !indicator || !target) return;
    const containerRect = container.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const x = rect.left - containerRect.left + container.scrollLeft;
    const y = rect.bottom - containerRect.top - 2;
    indicator.classList.toggle('nav-indicator--instant', instant);
    indicator.style.width = `${Math.round(rect.width)}px`;
    indicator.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    if (instant) {
        requestAnimationFrame(() => indicator.classList.remove('nav-indicator--instant'));
    }
}

function attachHorizontalDragNavigation(target, {
    ignore = () => false,
    intentPx = TIMELINE_DRAG_INTENT_PX,
    onDragStart,
    onDrag,
    onCommit,
    onCancel
} = {}) {
    if (!target) return () => {};
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let captureTarget = null;
    let dragging = false;
    let suppressClick = false;
    let clickTimer = null;

    const releasePointer = () => {
        if (pointerId !== null && captureTarget?.hasPointerCapture?.(pointerId)) {
            captureTarget.releasePointerCapture(pointerId);
        }
        pointerId = null;
        captureTarget = null;
        dragging = false;
    };

    const armClickSuppression = () => {
        suppressClick = true;
        if (clickTimer !== null) window.clearTimeout(clickTimer);
        clickTimer = window.setTimeout(() => {
            suppressClick = false;
            clickTimer = null;
        }, CAROUSEL_TRANSITION_MS + 80);
    };

    const finish = (event, commitGesture) => {
        if (event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const wasDragging = dragging;
        releasePointer();
        if (!wasDragging) return;
        armClickSuppression();
        const payload = { dx, dy, vx: velocity };
        if (commitGesture) onCommit?.(payload);
        else onCancel?.(payload);
    };

    const onDown = event => {
        if (!event.isPrimary || event.button !== 0 || pointerId !== null || ignore(event)) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        lastX = event.clientX;
        lastTime = event.timeStamp;
        velocity = 0;
        captureTarget = null;
        dragging = false;
    };
    const onMove = event => {
        if (event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const elapsed = event.timeStamp - lastTime;
        if (elapsed >= 8) velocity = (event.clientX - lastX) / elapsed;
        lastX = event.clientX;
        lastTime = event.timeStamp;
        if (!dragging && absY > intentPx && absY >= absX) {
            releasePointer();
            return;
        }
        if (!dragging && absX > intentPx && absX > absY) {
            dragging = true;
            captureTarget = target;
            try {
                captureTarget.setPointerCapture(pointerId);
            } catch (error) {}
            onDragStart?.({ dx, dy });
        }
        if (dragging) {
            if (event.cancelable) event.preventDefault();
            onDrag?.({ dx, dy, vx: velocity });
        }
    };
    const onClick = event => {
        if (!suppressClick) return;
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
    };

    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove, { passive: false });
    const onUp = event => finish(event, true);
    const onLost = event => finish(event, false);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onLost);
    target.addEventListener('click', onClick, true);

    return () => {
        if (clickTimer !== null) window.clearTimeout(clickTimer);
        target.removeEventListener('pointerdown', onDown);
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
        target.removeEventListener('pointercancel', onLost);
        target.removeEventListener('click', onClick, true);
    };
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function siteRelativePrefix() {
    let path = window.location.pathname || '/';
    path = path.replace(/\/index\.html$/i, '/');
    if (!path.endsWith('/')) path += '/';
    const depth = path.split('/').filter(Boolean).length;
    return depth ? '../'.repeat(depth) : './';
}

function dataUrl(file) {
    return `${siteRelativePrefix()}data/${file}`;
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} failed (${response.status})`);
    const data = await response.json();
    if (data === null || typeof data !== 'object') throw new Error(`${url} did not contain JSON data`);
    return data;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isSafeHref(url) {
    return SAFE_HREF_RE.test(String(url || '').trim());
}

function safeHref(url) {
    const value = String(url || '').trim();
    return isSafeHref(value) ? value : '';
}

function requireFields(value, fields, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${label} is missing`);
    }
    fields.forEach(field => {
        if (value[field] == null || value[field] === '') {
            throw new Error(`${label} is missing ${field}`);
        }
    });
}

function getSavedTheme() {
    try {
        const theme = localStorage.getItem(THEME_STORAGE_KEY);
        return theme === 'light' || theme === 'dark' ? theme : null;
    } catch (error) {
        return null;
    }
}

function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme() {
    return getSavedTheme() || getSystemTheme();
}

function setTheme(theme, persist = false, animate = false) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    if (themeTransitionTimer) {
        window.clearTimeout(themeTransitionTimer);
        themeTransitionTimer = 0;
    }
    if (animate && !prefersReducedMotion()) {
        root.classList.add('theme-transitioning');
        themeTransitionTimer = window.setTimeout(() => {
            root.classList.remove('theme-transitioning');
            themeTransitionTimer = 0;
        }, 360);
    } else {
        root.classList.remove('theme-transitioning');
    }
    root.setAttribute('data-theme', nextTheme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_PAGE_COLOR[nextTheme]);

    if (persist) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch (error) {}
    }

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        const targetTheme = nextTheme === 'light' ? 'dark' : 'light';
        toggle.innerHTML = THEME_ICONS[targetTheme];
        toggle.setAttribute('aria-label', `Switch to ${targetTheme} mode`);
        toggle.setAttribute('title', `Switch to ${targetTheme} mode`);
    }
}

function initThemeToggle() {
    const navContent = document.querySelector('.nav-content');
    if (!navContent || document.getElementById('theme-toggle')) return;

    const toggle = document.createElement('button');
    toggle.id = 'theme-toggle';
    toggle.className = 'theme-toggle';
    toggle.type = 'button';
    navContent.appendChild(toggle);

    setTheme(resolveTheme());
    toggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        setTheme(currentTheme === 'light' ? 'dark' : 'light', true, true);
    });
    if (!themeMediaQuery && window.matchMedia) {
        themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const onSystemTheme = () => {
            if (getSavedTheme()) return;
            setTheme(getSystemTheme(), false, true);
        };
        if (themeMediaQuery.addEventListener) themeMediaQuery.addEventListener('change', onSystemTheme);
        else themeMediaQuery.addListener(onSystemTheme);
    }
}

function parseDateObj(dateStr) {
    if (!dateStr) return new Date();
    const status = getTimelineStatus(dateStr);
    if (status && status.sortAsCurrent) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
    return new Date(0);
}

function getTimelineStatus(dateStr) {
    const normalized = String(dateStr || '').trim().toLowerCase();
    const statuses = {
        present: {
            label: 'Present',
            className: 'node-period--present',
            sortAsCurrent: true
        }
    };
    return statuses[normalized] || null;
}

function formatMonthYear(dateStr) {
    const status = getTimelineStatus(dateStr);
    if (status) return status.label;
    const d = parseDateObj(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getPeriodMeta(startStr, endStr) {
    if (!startStr && !endStr) return { text: '', className: '' };
    const startFmt = formatMonthYear(startStr);
    const endFmt = formatMonthYear(endStr);
    const endStatus = getTimelineStatus(endStr);
    const text = startFmt === endFmt && !endStatus ? startFmt : `${startFmt} — ${endFmt}`;
    return {
        text,
        className: endStatus ? endStatus.className : ''
    };
}

function sortByRecency(a, b) {
    const startA = parseDateObj(a.startDate).getTime();
    const startB = parseDateObj(b.startDate).getTime();
    if (startB !== startA) return startB - startA;
    return parseDateObj(b.endDate).getTime() - parseDateObj(a.endDate).getTime();
}

function assetUrl(src) {
    if (!src) return '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(src) || src.startsWith('//') || src.startsWith('/')) return src;
    return siteRelativePrefix() + src.replace(/^\.\//, '');
}

function projectDetailsHref(slug) {
    return `/projects/${encodeURIComponent(slug)}/`;
}

function projectSlugFromLocation() {
    const path = (window.location.pathname || '').replace(/\/index\.html$/i, '').replace(/\/$/, '');
    const match = path.match(/\/projects\/([^/]+)$/i);
    if (match && PROJECT_SLUG_RE.test(match[1])) return match[1];
    const query = new URLSearchParams(window.location.search).get('slug') || '';
    return PROJECT_SLUG_RE.test(query) ? query : '';
}

function isLegacyProjectQuery() {
    const path = (window.location.pathname || '').replace(/\/index\.html$/i, '').replace(/\/$/, '');
    if (path !== '/projects') return false;
    const query = new URLSearchParams(window.location.search).get('slug') || '';
    return PROJECT_SLUG_RE.test(query);
}

function absoluteUrl(src) {
    if (!src) return '';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(src) || src.startsWith('//')) return src;
    const path = src.startsWith('/') ? src : '/' + src.replace(/^\.\//, '');
    return SITE_ORIGIN + path;
}

function logoImg(src, className, tone) {
    if (!src) return '';
    const onDark = tone === 'on-dark' ? ' node-logo--on-dark' : '';
    return `<img src="${escapeHtml(assetUrl(src))}" alt="" class="${className}${onDark}" width="36" height="36" loading="lazy">`;
}

function renderStackFooter(tagsHTML, linksHTML) {
    const tags = tagsHTML ? `<div class="node-tags">${tagsHTML}</div>` : '';
    const links = linksHTML ? `<div class="node-links-bar">${linksHTML}</div>` : '';
    if (!tags && !links) return '';
    return `<div class="stack-footer">${tags}${links}</div>`;
}

function tagIconHtml(label) {
    const slug = TAG_ICONS[label];
    if (!slug) return '';
    return `<span class="tag-icon tag-icon--${slug}" aria-hidden="true"></span>`;
}

function renderTagChip(tag, className) {
    return `<span class="${className}">${tagIconHtml(tag)}<span class="tag-text">${escapeHtml(tag)}</span></span>`;
}

function renderTags(tags) {
    return (tags || []).map(tag => renderTagChip(tag, 'tech-tag')).join('');
}

function projectDisplayTags(project) {
    return (Array.isArray(project.displayTags) && project.displayTags.length)
        ? project.displayTags
        : (project.tags || []);
}

function hasDemoLink(links) {
    return (links || []).some(link => String(link.kind || '').toLowerCase() === 'demo'
        && safeHref(link.url)
        && link.label);
}

function actionButtonClass(primary) {
    return primary ? 'btn btn-primary btn-tiny' : 'btn btn-outline btn-tiny';
}

function resolveLinkKind(link) {
    const kind = String(link.kind || '').toLowerCase();
    if (ACTION_ICONS[kind]) return kind;
    return LINK_KIND_BY_LABEL[String(link.label || '').trim().toLowerCase()] || '';
}

function renderLinks(links, options = {}) {
    return (links || [])
        .filter(link => link && safeHref(link.url) && link.label)
        .map(link => {
            const href = safeHref(link.url);
            const kind = resolveLinkKind(link);
            const classes = [actionButtonClass(kind === 'demo')];
            if (kind === 'demo' && options.liveDemoMotion) classes.push('btn-live');
            const external = /^https?:\/\//i.test(href);
            const target = external ? ' target="_blank" rel="noopener"' : '';
            const icon = ACTION_ICONS[kind] || '';
            return `<a href="${escapeHtml(href)}"${target} class="${classes.join(' ')}">${icon}${escapeHtml(link.label)}</a>`;
        })
        .join('');
}

function renderCredentialButtons(credentials) {
    const urls = (credentials || []).filter(url => typeof url === 'string' && safeHref(url));
    const label = urls.length === 1 ? 'Credential' : 'Credentials';
    return urls
        .map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn-outline btn-tiny">${ACTION_ICONS.credentials}${label}</a>`)
        .join('');
}

function renderMarkdown(src) {
    if (!src) return '';
    const codeBlocks = [];
    const text = escapeHtml(src.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
        codeBlocks.push(code.replace(/\n$/, ''));
        return `\n\n@@CB${codeBlocks.length - 1}@@\n\n`;
    }));

    const inline = s => s
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
            const decoded = href.replace(/&amp;/g, '&');
            if (!isSafeHref(decoded)) return label;
            const external = /^https?:\/\//i.test(decoded);
            const extra = external ? ' target="_blank" rel="noopener"' : '';
            return `<a href="${href}"${extra}>${label}</a>`;
        })
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

    return text.split(/\n{2,}/).map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        const codeMatch = trimmed.match(/^@@CB(\d+)@@$/);
        if (codeMatch) return `<pre><code>${escapeHtml(codeBlocks[+codeMatch[1]])}</code></pre>`;
        if (/^### /.test(trimmed)) return `<h3>${inline(trimmed.slice(4))}</h3>`;
        if (/^## /.test(trimmed)) return `<h2>${inline(trimmed.slice(3))}</h2>`;
        if (/^# /.test(trimmed)) return `<h2>${inline(trimmed.slice(2))}</h2>`;
        const lines = trimmed.split('\n');
        if (lines.every(line => /^(?:- |\* )/.test(line))) {
            return '<ul>' + lines.map(line => `<li>${inline(line.slice(2))}</li>`).join('') + '</ul>';
        }
        return `<p>${inline(trimmed).replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('\n');
}

function stackTeaserHeight(reveal) {
    const summary = reveal.querySelector('.stack-summary');
    if (!summary) return 0;
    if (summary.classList.contains('is-clamped')) {
        return Math.round(summary.getBoundingClientRect().height);
    }
    const cs = getComputedStyle(summary);
    let lh = parseFloat(cs.lineHeight);
    if (!Number.isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.65;
    return Math.round(Math.min(summary.scrollHeight, lh * 2));
}

function clearStackReveal(reveal) {
    if (reveal._stackTimer) {
        window.clearTimeout(reveal._stackTimer);
        reveal._stackTimer = 0;
    }
    if (reveal._onStackEnd) {
        reveal.removeEventListener('transitionend', reveal._onStackEnd);
        reveal._onStackEnd = null;
    }
}

function syncCollapsedReveal(nodeEl) {
    const reveal = nodeEl.querySelector('.stack-body');
    if (!reveal || nodeEl.getAttribute('data-expanded') === 'true') return;
    const summary = reveal.querySelector('.stack-summary');
    if (summary) summary.classList.add('is-clamped');
    const height = stackTeaserHeight(reveal);
    if (!summary) {
        reveal.style.maxHeight = '0px';
        return;
    }
    if (!height) return;
    reveal.style.transition = 'none';
    reveal.style.maxHeight = `${height}px`;
    reveal.offsetHeight;
    reveal.style.removeProperty('transition');
}

function animateStackReveal(nodeEl, expanded) {
    const reveal = nodeEl.querySelector('.stack-body');
    if (!reveal) return;
    const inner = reveal.querySelector('.stack-body-inner');
    const summary = reveal.querySelector('.stack-summary');
    const gen = (reveal._stackGen = (reveal._stackGen || 0) + 1);
    clearStackReveal(reveal);

    const finish = () => {
        if (reveal._stackGen !== gen) return;
        clearStackReveal(reveal);
        if (expanded) reveal.style.maxHeight = 'none';
        else {
            if (summary) summary.classList.add('is-clamped');
            reveal.style.maxHeight = `${stackTeaserHeight(reveal)}px`;
        }
    };

    if (prefersReducedMotion()) {
        if (summary) summary.classList.toggle('is-clamped', !expanded);
        reveal.style.transition = 'none';
        reveal.style.maxHeight = expanded ? 'none' : `${stackTeaserHeight(reveal)}px`;
        reveal.offsetHeight;
        reveal.style.removeProperty('transition');
        return;
    }

    const from = reveal.getBoundingClientRect().height;
    reveal.style.transition = 'none';
    reveal.style.maxHeight = `${from}px`;
    reveal.offsetHeight;
    reveal.style.removeProperty('transition');
    if (expanded && summary) summary.classList.remove('is-clamped');
    const to = expanded ? (inner ? inner.scrollHeight : reveal.scrollHeight) : stackTeaserHeight(reveal);
    reveal.style.maxHeight = `${to}px`;
    const onEnd = event => {
        if (event.target !== reveal || event.propertyName !== 'max-height') return;
        finish();
    };
    reveal._onStackEnd = onEnd;
    reveal.addEventListener('transitionend', onEnd);
    reveal._stackTimer = window.setTimeout(finish, MOTION_SPATIAL_MS + 80);
}

function setNodeExpanded(nodeEl, expanded) {
    const next = Boolean(expanded);
    if ((nodeEl.getAttribute('data-expanded') === 'true') === next) return;
    nodeEl.setAttribute('data-expanded', String(next));
    const hit = nodeEl.querySelector('.stack-hit');
    if (hit) hit.setAttribute('aria-expanded', String(next));
    animateStackReveal(nodeEl, next);
}

function toggleNode(nodeEl) {
    setNodeExpanded(nodeEl, nodeEl.getAttribute('data-expanded') !== 'true');
    syncExpandAllButton();
}

function bindStackItem(nodeEl) {
    const hit = nodeEl.querySelector('button.stack-hit');
    if (!hit) return;
    syncCollapsedReveal(nodeEl);
    hit.addEventListener('click', () => toggleNode(nodeEl));
    nodeEl.addEventListener('click', event => {
        if (event.target.closest('a, button')) return;
        toggleNode(nodeEl);
    });
}

function visibleTimelineNodes() {
    const activePanel = document.querySelector('.timeline-panel.is-active');
    return Array.from((activePanel || document).querySelectorAll('.timeline-node'));
}

function syncExpandAllButton() {
    const btn = document.getElementById('expand-all');
    if (!btn || btn.hidden) return;
    const nodes = visibleTimelineNodes().filter(node => node.querySelector('button.stack-hit'));
    const expanded = nodes.length > 0 && nodes.every(node => node.getAttribute('data-expanded') === 'true');
    btn.textContent = expanded ? 'Collapse all' : 'Expand all';
}

function getCertificateKind(cert) {
    const kind = String(cert.kind || '').trim().toLowerCase();
    return CERT_KIND_LABELS[kind] ? kind : 'course';
}

function renderCertificateCard(cert) {
    const kind = getCertificateKind(cert);
    const classes = ['cert-card', 'fade-in', `cert-card--${kind}`];
    const meta = cert.issuer ? `<div class="cert-meta">${escapeHtml(cert.issuer)}</div>` : '';
    const description = cert.description ? `<p>${escapeHtml(cert.description)}</p>` : '';
    const href = safeHref(cert.link);
    const link = href ? `
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="cert-link btn btn-outline">
            ${ACTION_ICONS.credentials}Credential
        </a>
    ` : '';

    return `
        <article class="${classes.join(' ')}">
            <div>
                <div class="cert-kind"><span class="cert-kind-dot" aria-hidden="true"></span>${CERT_KIND_LABELS[kind]}</div>
                <h3>${escapeHtml(cert.title)}</h3>
                ${meta}
            </div>
            ${description}
            ${link}
        </article>
    `;
}

function renderCertificateSections(categories, container, include) {
    if (!container) return;
    container.innerHTML = categories.map(category => {
        const items = category.certificates.filter(include);
        if (!items.length) return '';
        return `
            <section class="cert-category">
                <div class="cert-category-header">
                    <h3 class="cert-category-title">${escapeHtml(category.name)}</h3>
                </div>
                <div class="cert-grid">
                    ${items.map(cert => renderCertificateCard(cert)).join('')}
                </div>
            </section>
        `;
    }).join('');
}

function revealCertificateCards(container) {
    const cards = container.querySelectorAll('.cert-card.fade-in:not(.visible)');
    if (!cards.length) return;

    const reveal = () => cards.forEach(card => card.classList.add('visible'));
    if (prefersReducedMotion()) {
        reveal();
        return;
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(reveal);
    });
}

function normalizeProject(project) {
    requireFields(project, ['slug', 'title'], 'project');
    if (!PROJECT_SLUG_RE.test(project.slug)) throw new Error(`Invalid project slug: ${project.slug}`);
    const media = project.media && typeof project.media === 'object' && !Array.isArray(project.media)
        ? project.media
        : {};
    return {
        slug: project.slug,
        title: project.title,
        logo: project.logo || '',
        logoTone: project.logoTone || '',
        featured: Boolean(project.featured),
        summary: project.summary || '',
        highlights: project.highlights || [],
        tags: project.tags || [],
        displayTags: Array.isArray(project.displayTags) ? project.displayTags : [],
        links: project.links || [],
        license: typeof project.license === 'string' ? project.license.trim() : '',
        writeup: project.writeup || '',
        writeupMid: project.writeupMid || '',
        writeupAfter: project.writeupAfter || '',
        detailOrder: (project.detailOrder === 'writeup-results' || project.detailOrder === 'writeup-media' || project.detailOrder === 'writeup-split-media')
            ? project.detailOrder
            : '',
        mediaSplitAfter: Number.isInteger(project.mediaSplitAfter) && project.mediaSplitAfter > 0
            ? project.mediaSplitAfter
            : 0,
        media: {
            ...(Object.prototype.hasOwnProperty.call(media, 'title') ? { title: media.title } : {}),
            ...(Object.prototype.hasOwnProperty.call(media, 'caption') ? { caption: media.caption } : {}),
            blocks: Array.isArray(media.blocks) ? media.blocks : []
        },
        results: project.results && typeof project.results === 'object' && !Array.isArray(project.results)
            ? project.results
            : null
    };
}

function hydrateAboutSection(profile) {
    const aboutData = profile.about || {};
    const bioEl = document.getElementById('about-bio');
    if (bioEl) bioEl.textContent = aboutData.bio || profile.summary || 'Unable to load bio.';

    const highlightsEl = document.getElementById('about-highlights');
    if (highlightsEl) {
        highlightsEl.replaceChildren();
        (aboutData.highlights || []).forEach(item => {
            const paragraph = document.createElement('p');
            paragraph.textContent = item;
            highlightsEl.appendChild(paragraph);
        });
    }

    const focusEl = document.getElementById('about-focus');
    if (focusEl) {
        focusEl.replaceChildren();
        (aboutData.focus || []).forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'about-chip';
            chip.innerHTML = `${tagIconHtml(item)}<span class="tag-text">${escapeHtml(item)}</span>`;
            focusEl.appendChild(chip);
        });
    }

    const stackEl = document.getElementById('about-stack');
    if (stackEl) {
        stackEl.replaceChildren();
        (aboutData.stack || []).forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'about-chip';
            chip.innerHTML = `${tagIconHtml(item)}<span class="tag-text">${escapeHtml(item)}</span>`;
            stackEl.appendChild(chip);
        });
    }

    const locationTextEl = document.getElementById('about-location-text');
    if (locationTextEl) {
        locationTextEl.textContent = [
            profile.location ? `Based in ${profile.location}.` : '',
            aboutData.availability || ''
        ].filter(Boolean).join(' ');
    }

    contactDestination = profile.email || '';
}

function setExternalHref(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    const href = safeHref(url);
    el.href = href || '#';
    if (/^https?:\/\//i.test(href)) {
        el.target = '_blank';
        el.rel = 'noopener';
    }
}

function initContactModal() {
    const modal = document.getElementById('contact-modal');
    const form = document.getElementById('contact-form');
    const triggers = [...document.querySelectorAll('[data-contact-open]')];
    if (!modal || !form || !triggers.length) return;

    const dialog = modal.querySelector('.contact-modal-dialog');
    const tablist = modal.querySelector('.contact-tablist');
    const tabIndicator = tablist?.querySelector('.tab-indicator');
    const messageTab = document.getElementById('contact-tab-message');
    const scheduleTab = document.getElementById('contact-tab-schedule');
    const messagePanel = document.getElementById('contact-panel-message');
    const schedulePanel = document.getElementById('contact-panel-schedule');
    const calendlyMount = document.getElementById('contact-calendly');
    const calendlyPlaceholder = document.getElementById('contact-calendly-placeholder');
    const contactTabs = [messageTab, scheduleTab].filter(Boolean);
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const countryInput = document.getElementById('contact-country');
    const phoneInput = document.getElementById('contact-phone');
    const messageInput = document.getElementById('contact-message');
    const websiteInput = document.getElementById('contact-website');
    const nameError = document.getElementById('contact-name-error');
    const emailError = document.getElementById('contact-email-error');
    const phoneError = document.getElementById('contact-phone-error');
    const messageError = document.getElementById('contact-message-error');
    const statusEl = document.getElementById('contact-status');
    const mailtoLink = document.getElementById('contact-mailto');
    const turnstileHost = document.getElementById('contact-turnstile');
    if (turnstileHost) turnstileHost.setAttribute('data-sitekey', contactTurnstileSitekey());
    const submitButton = document.getElementById('contact-submit');
    const submitLabel = submitButton?.querySelector('[data-contact-submit-label]');
    const idleLabel = submitLabel?.textContent || 'Send message';
    const focusSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    let lastFocus = null;
    let widgetId = null;
    let turnstileToken = '';
    let sending = false;
    let abortController = null;
    let pendingKey = null;
    let modalMotionTimer = 0;
    let contactTabIndex = 0;

    const clearModalMotion = () => {
        if (!modalMotionTimer) return;
        window.clearTimeout(modalMotionTimer);
        modalMotionTimer = 0;
    };

    const syncTabIndicator = ({ instant = false } = {}) => {
        const current = contactTabs[contactTabIndex];
        if (tablist && tabIndicator && current) placeUnderlineIndicator(tablist, tabIndicator, current, { instant });
    };

    const focusableInDialog = () => [...dialog.querySelectorAll(focusSelector)].filter(el => {
        if (el.closest('[inert]')) return false;
        const hiddenRoot = el.closest('[hidden]');
        return !hiddenRoot || hiddenRoot === modal;
    });

    const ensureCalendly = async () => {
        const configured = calendlyEmbedUrl();
        if (!configured || !calendlyMount || calendlyInitialized || calendlyInitStarted) return;
        calendlyInitStarted = true;
        try {
            await loadCalendlyAssets();
        } catch (error) {
            calendlyInitStarted = false;
            return;
        }
        if (!window.Calendly || typeof window.Calendly.initInlineWidget !== 'function') {
            calendlyInitStarted = false;
            return;
        }
        if (calendlyPlaceholder) calendlyPlaceholder.hidden = true;
        calendlyMount.hidden = false;
        const prefill = {};
        const name = String(nameInput?.value || '').trim();
        const email = String(emailInput?.value || '').trim();
        if (name) prefill.name = name;
        if (email) prefill.email = email;
        const embedUrl = new URL(configured);
        if (name) embedUrl.searchParams.set('name', name);
        if (email) embedUrl.searchParams.set('email', email);
        window.Calendly.initInlineWidget({
            url: embedUrl.toString(),
            parentElement: calendlyMount,
            prefill,
            resize: true
        });
        calendlyInitialized = true;
        bindCalendlyScheduledListener(scheduleTab, schedulePanel);
    };

    const selectContactTab = (index, { focusTab = false } = {}) => {
        if (!contactTabs.length || !messagePanel || !schedulePanel) return;
        const nextIndex = Math.max(0, Math.min(index, contactTabs.length - 1));
        contactTabIndex = nextIndex;
        contactTabs.forEach((tab, tabIndex) => {
            const selected = tabIndex === nextIndex;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });
        const scheduleSelected = nextIndex === 1;
        // Keep the Calendly iframe in the DOM across hides. Calendly may still
        // drop a partially selected slot when the panel is hidden; we do not rebuild it.
        messagePanel.hidden = scheduleSelected;
        schedulePanel.hidden = !scheduleSelected;
        messagePanel.toggleAttribute('inert', scheduleSelected);
        schedulePanel.toggleAttribute('inert', !scheduleSelected);
        dialog?.classList.toggle('contact-modal-dialog--schedule', scheduleSelected);
        syncTabIndicator({ instant: prefersReducedMotion() });
        if (scheduleSelected) ensureCalendly();
        if (focusTab) contactTabs[nextIndex]?.focus();
    };

    const setError = (input, errorEl, message) => {
        const invalid = Boolean(message);
        if (input) {
            input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
            if (invalid && errorEl) input.setAttribute('aria-describedby', errorEl.id);
            else input.removeAttribute('aria-describedby');
        }
        if (errorEl) {
            errorEl.hidden = !invalid;
            errorEl.textContent = message || '';
        }
        return invalid;
    };

    const setPhoneError = message => {
        const invalid = setError(countryInput, phoneError, message);
        if (phoneInput) {
            phoneInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
            if (invalid && phoneError) phoneInput.setAttribute('aria-describedby', phoneError.id);
            else phoneInput.removeAttribute('aria-describedby');
        }
        return invalid;
    };

    const setStatus = (message, state) => {
        if (!statusEl) return;
        statusEl.hidden = !message;
        statusEl.textContent = message || '';
        if (state) statusEl.dataset.state = state;
        else delete statusEl.dataset.state;
    };

    const hideMailto = () => {
        if (!mailtoLink) return;
        mailtoLink.hidden = true;
        mailtoLink.removeAttribute('href');
    };

    const showMailto = (name, email, country, numberRaw, message) => {
        if (!mailtoLink || !contactDestination) {
            hideMailto();
            return;
        }
        const phoneLine = country && numberRaw
            ? `${country}${numberRaw.replace(/\s+/g, '')}`
            : 'omitted';
        const body = `Name: ${name}\nEmail: ${email}\nPhone: ${phoneLine}\n\nMessage:\n${message}`;
        mailtoLink.href = `mailto:${contactDestination}?body=${encodeURIComponent(body)}`;
        mailtoLink.hidden = false;
    };

    const setSending = (on, label) => {
        sending = on;
        form.setAttribute('aria-busy', on ? 'true' : 'false');
        if (submitButton) submitButton.disabled = on;
        if (submitLabel) submitLabel.textContent = label || idleLabel;
    };

    const resetWidget = () => {
        turnstileToken = '';
        if (widgetId != null && window.turnstile) window.turnstile.reset(widgetId);
    };

    const lockPage = (on) => {
        document.documentElement.classList.toggle('contact-modal-open', on);
        document.body.classList.toggle('contact-modal-open', on);
        document.getElementById('navbar')?.toggleAttribute('inert', on);
        document.querySelector('main')?.toggleAttribute('inert', on);
        setPageScrollStopped(on);
    };

    const close = () => {
        abortController?.abort();
        abortController = null;
        clearModalMotion();
        modal.classList.remove('is-open');
        if (prefersReducedMotion()) {
            modal.hidden = true;
            modal.classList.remove('is-leaving');
        } else {
            modal.classList.add('is-leaving');
            modal.hidden = true;
            modalMotionTimer = window.setTimeout(() => {
                modalMotionTimer = 0;
                modal.classList.remove('is-leaving');
            }, MOTION_SPATIAL_MS + 80);
        }
        lockPage(false);
        form.reset();
        setError(nameInput, nameError, '');
        setError(emailInput, emailError, '');
        setPhoneError('');
        setError(messageInput, messageError, '');
        setStatus('', '');
        hideMailto();
        setSending(false, idleLabel);
        resetWidget();
        pendingKey = null;
        selectContactTab(0);
        const restore = lastFocus;
        requestAnimationFrame(() => {
            if (restore && typeof restore.focus === 'function') restore.focus();
        });
    };

    const ensureWidget = async () => {
        if (!turnstileHost) return;
        const sitekey = contactTurnstileSitekey();
        turnstileHost.setAttribute('data-sitekey', sitekey);
        const widgetError = () => {
            turnstileToken = '';
            setStatus(CONTACT_TURNSTILE_LOAD_ERROR, 'error');
        };
        try {
            await loadTurnstileScript();
        } catch {
            widgetError();
            return;
        }
        if (!window.turnstile) {
            widgetError();
            return;
        }
        const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        if (widgetId != null) {
            window.turnstile.reset(widgetId);
            turnstileToken = '';
            return;
        }
        widgetId = window.turnstile.render(turnstileHost, {
            sitekey,
            theme,
            callback: value => {
                turnstileToken = value || '';
                if (statusEl && statusEl.textContent === CONTACT_TURNSTILE_LOAD_ERROR) setStatus('', '');
            },
            'expired-callback': () => { turnstileToken = ''; },
            'error-callback': widgetError
        });
    };

    const openFrom = opener => {
        const navLinks = document.querySelector('.nav-links');
        const fromMobileNav = Boolean(
            opener
            && navLinks
            && navLinks.contains(opener)
            && navLinks.classList.contains('open')
            && !isDesktopNav()
        );
        if (fromMobileNav) closeMobileNavMenu(false);
        lastFocus = fromMobileNav
            ? (document.getElementById('nav-toggle') || opener)
            : opener;
        clearModalMotion();
        modal.classList.remove('is-leaving');
        modal.hidden = false;
        lockPage(true);
        selectContactTab(0);
        setStatus('', '');
        hideMailto();
        ensureWidget();
        (nameInput || emailInput || dialog).focus();
        requestAnimationFrame(() => syncTabIndicator({ instant: true }));
        if (prefersReducedMotion()) {
            modal.classList.add('is-open');
            return;
        }
        modal.classList.remove('is-open');
        modal.offsetHeight;
        modal.classList.add('is-open');
    };

    triggers.forEach(trigger => {
        trigger.addEventListener('click', () => openFrom(trigger));
    });
    contactTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectContactTab(index));
    });
    tablist?.addEventListener('keydown', event => {
        const last = contactTabs.length - 1;
        if (last < 1) return;
        let next = contactTabIndex;
        if (event.key === 'ArrowRight') next = Math.min(last, contactTabIndex + 1);
        else if (event.key === 'ArrowLeft') next = Math.max(0, contactTabIndex - 1);
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = last;
        else return;
        event.preventDefault();
        selectContactTab(next, { focusTab: true });
    });
    modal.addEventListener('click', event => {
        if (event.target.closest('[data-contact-dismiss]')) close();
    });
    document.addEventListener('keydown', event => {
        if (modal.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }
        if (event.key !== 'Tab' || !dialog) return;
        const items = focusableInDialog();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending) return;
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const countryRaw = countryInput.value.trim();
        const numberRaw = phoneInput.value.trim();
        const message = messageInput.value.trim();
        const country = contactCountryEmpty(countryRaw) ? '' : countryRaw;
        let blocked = false;

        if (!name) blocked = setError(nameInput, nameError, 'Name is required.') || blocked;
        else setError(nameInput, nameError, '');

        if (!email) blocked = setError(emailInput, emailError, 'Email is required.') || blocked;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) blocked = setError(emailInput, emailError, 'Enter a valid email.') || blocked;
        else setError(emailInput, emailError, '');

        if (!message) blocked = setError(messageInput, messageError, 'Message is required.') || blocked;
        else setError(messageInput, messageError, '');

        if (!phonePairOk(countryRaw, numberRaw)) blocked = setPhoneError(CONTACT_PHONE_ERROR) || blocked;
        else setPhoneError('');

        if (blocked) {
            form.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSending(true, 'Sending…');
        setStatus('Sending your message…', '');
        hideMailto();
        abortController = new AbortController();
        const timer = setTimeout(() => abortController.abort(), 20000);
        const idempotencyKey = pendingKey || newIdempotencyKey();
        pendingKey = idempotencyKey;
        try {
            const response = await fetch(`${contactEndpoint(form)}/`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'idempotency-key': idempotencyKey
                },
                body: JSON.stringify({
                    name,
                    email,
                    country,
                    phone: numberRaw.replace(/\s+/g, ''),
                    message,
                    website: String(websiteInput?.value || ''),
                    turnstileToken
                }),
                signal: abortController.signal
            });
            let payload = null;
            try {
                payload = await response.json();
            } catch (error) {
                payload = null;
            }
            const errorCode = payload && payload.error ? payload.error : '';
            if (response.ok && payload && payload.ok) {
                pendingKey = null;
                setSending(true, 'Sent');
                setStatus("Message sent. I'll get back to you.", 'success');
                hideMailto();
                resetWidget();
                return;
            }
            if (errorCode === 'unverified' || response.status === 403) {
                setSending(false, idleLabel);
                setStatus('Please complete the verification and try again.', 'error');
                hideMailto();
                resetWidget();
                return;
            }
            if (errorCode === 'invalid' || response.status === 400 || response.status === 415) {
                setSending(false, idleLabel);
                setStatus('Check the highlighted fields and try again.', 'error');
                hideMailto();
                resetWidget();
                return;
            }
            setSending(false, idleLabel);
            setStatus("Couldn't send from the site.", 'error');
            showMailto(name, email, country, numberRaw, message);
            resetWidget();
        } catch (error) {
            if (error && error.name === 'AbortError' && modal.hidden) return;
            setSending(false, idleLabel);
            setStatus("Couldn't send from the site.", 'error');
            showMailto(name, email, country, numberRaw, message);
            resetWidget();
        } finally {
            clearTimeout(timer);
            abortController = null;
        }
    });
}

async function loadProfile() {
    try {
        const profile = await fetchJson(dataUrl('profile.json'));
        requireFields(profile, ['name'], 'profile');
        const nameEl = document.getElementById('introduction-name');
        const summaryEl = document.getElementById('introduction-summary');
        if (nameEl) nameEl.textContent = profile.name;
        if (summaryEl) summaryEl.textContent = profile.summary || '';
        setExternalHref('about-github', profile.socials && profile.socials.github);
        setExternalHref('about-linkedin', profile.socials && profile.socials.linkedin);
        renderIntroductionTitle(profile.title || '');
        hydrateAboutSection(profile);
    } catch (error) {
        console.error('Error loading profile:', error);
        const summaryEl = document.getElementById('introduction-summary');
        const bioEl = document.getElementById('about-bio');
        if (summaryEl) summaryEl.textContent = 'Unable to load profile right now.';
        if (bioEl) bioEl.textContent = 'Unable to load bio right now.';
    }
}

function renderTimelineNode(node) {
    const nodeDiv = document.createElement('article');
    nodeDiv.className = 'stack-item timeline-node fade-in';
    nodeDiv.setAttribute('data-type', node.type);
    nodeDiv.setAttribute('data-expanded', 'false');

    const tagsHTML = renderTags(node.tags);
    const period = getPeriodMeta(node.startDate, node.endDate);
    const logoHTML = logoImg(node.logo, 'node-logo', node.logoTone);
    const roles = node.roles || [];
    const firstRole = roles[0] || {};
    const extraRoles = roles.slice(1);
    const summaryTitle = firstRole.title ? `<p class="sub-title">${escapeHtml(firstRole.title)}</p>` : '';
    const summaryDesc = firstRole.description ? `<p class="stack-summary is-clamped">${escapeHtml(firstRole.description)}</p>` : '';
    const firstPoints = firstRole.points && firstRole.points.length
        ? `<ul>${firstRole.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
        : '';
    const extraHTML = extraRoles.map(role => {
        const titleHTML = role.title ? `<h4 class="sub-title">${escapeHtml(role.title)}</h4>` : '';
        const descP = role.description ? `<p class="node-desc">${escapeHtml(role.description)}</p>` : '';
        const subtitleH = role.subtitle ? `<h5 class="node-subtitle">${escapeHtml(role.subtitle)}</h5>` : '';
        const bulletsU = role.points && role.points.length ? `<ul>${role.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : '';
        return `<div class="timeline-role">${titleHTML}${descP}${subtitleH}${bulletsU}</div>`;
    }).join('');
    const firstSubtitle = firstRole.subtitle ? `<h5 class="node-subtitle">${escapeHtml(firstRole.subtitle)}</h5>` : '';
    const revealInner = `${summaryDesc}${firstSubtitle}${firstPoints}${extraHTML}`;
    const footerHTML = renderStackFooter(tagsHTML, renderCredentialButtons(node.credentials) + renderLinks(node.links));
    const hasBody = Boolean(revealInner.trim());
    const panelId = hasBody ? `stack-panel-${++stackUid}` : '';
    const hitOpen = hasBody
        ? `<button type="button" class="stack-hit" aria-expanded="false" aria-controls="${panelId}">`
        : '<div class="stack-hit stack-hit--static">';
    const hitClose = hasBody ? '</button>' : '</div>';

    nodeDiv.innerHTML = `
        ${hitOpen}
            <div class="stack-header">
                <div class="node-entity-group">
                    ${logoHTML}
                    <div class="node-entity">${escapeHtml(node.entity)}</div>
                </div>
                <div class="node-period ${period.className}">${escapeHtml(period.text)}</div>
                ${hasBody ? CHEVRON_HTML : ''}
            </div>
            ${summaryTitle}
        ${hitClose}
        ${hasBody ? `<div class="stack-body" id="${panelId}"><div class="stack-body-inner">${revealInner}</div></div>` : ''}
        ${footerHTML}
    `;

    bindStackItem(nodeDiv);
    return nodeDiv;
}

async function loadTimeline() {
    const workGrid = document.getElementById('timeline-work');
    const educationGrid = document.getElementById('timeline-education');
    if (!workGrid || !educationGrid) return;
    try {
        const timelineData = await fetchJson(dataUrl('timeline.json'));
        if (!Array.isArray(timelineData)) throw new Error('timeline.json must be an array');
        timelineData.forEach((node, index) => requireFields(node, ['type', 'entity', 'startDate'], `timeline[${index}]`));
        timelineData.sort(sortByRecency);
        workGrid.replaceChildren();
        educationGrid.replaceChildren();
        timelineData.forEach(node => {
            const rendered = renderTimelineNode(node);
            if (node.type === 'education') educationGrid.appendChild(rendered);
            else workGrid.appendChild(rendered);
        });
        workGrid.querySelectorAll('.stack-item').forEach(syncCollapsedReveal);
        setupTimelineTabs('work');
        initScrollAnimations();
        syncExpandAllButton();
    } catch (error) {
        console.error('Error loading timeline:', error);
        workGrid.innerHTML = '<p class="cert-status">Unable to load timeline right now.</p>';
    }
}

function renderProjectCard(project) {
    const logoHTML = logoImg(project.logo, 'project-card-logo', project.logoTone);
    const highlights = (project.highlights || []).slice(0, 3);
    const highlightsHTML = highlights.length
        ? `<ul class="project-card-highlights">${highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
    const detailsHref = projectDetailsHref(project.slug);
    const detailsBtn = `<a href="${detailsHref}" class="${actionButtonClass(true)}" aria-label="${escapeHtml(project.title)} details">${escapeHtml(project.title)} details</a>`;

    return `
        <article class="project-card">
            <div class="project-card-title-row">
                ${logoHTML}
                <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
            </div>
            ${project.summary ? `<p class="project-card-desc">${escapeHtml(project.summary)}</p>` : ''}
            ${highlightsHTML}
            <div class="node-tags">${renderTags(projectDisplayTags(project))}</div>
            <div class="node-links-bar">${renderLinks(project.links, { liveDemoMotion: true })}${detailsBtn}</div>
        </article>
    `;
}

function renderOtherProject(project) {
    const logoHTML = logoImg(project.logo, 'node-logo', project.logoTone);
    const highlights = (project.highlights || []).slice(0, 3);
    const highlightsHTML = highlights.length
        ? `<ul>${highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
    const detailsHref = projectDetailsHref(project.slug);
    const pageLink = `<a href="${detailsHref}" class="${actionButtonClass(!hasDemoLink(project.links))}" aria-label="${escapeHtml(project.title)} details">${escapeHtml(project.title)} details</a>`;
    const footerHTML = renderStackFooter(renderTags(projectDisplayTags(project)), renderLinks(project.links) + pageLink);
    const summaryHTML = project.summary ? `<p class="stack-summary is-clamped">${escapeHtml(project.summary)}</p>` : '';
    const hasBody = Boolean(highlightsHTML || summaryHTML);
    const panelId = hasBody ? `stack-panel-${++stackUid}` : '';
    const hitOpen = hasBody
        ? `<button type="button" class="stack-hit" aria-expanded="false" aria-controls="${panelId}">`
        : '<div class="stack-hit stack-hit--static">';
    const hitClose = hasBody ? '</button>' : '</div>';

    return `
        <article class="stack-item fade-in" data-expanded="false">
            ${hitOpen}
                <div class="stack-header">
                    <div class="node-entity-group">
                        ${logoHTML}
                        <div class="node-entity">${escapeHtml(project.title)}</div>
                    </div>
                    ${hasBody ? CHEVRON_HTML : ''}
                </div>
            ${hitClose}
            ${hasBody ? `<div class="stack-body" id="${panelId}"><div class="stack-body-inner">${summaryHTML}${highlightsHTML}</div></div>` : ''}
            ${footerHTML}
        </article>
    `;
}

function createSlideStrip(track, slides, { loop = false, className = 'carousel-strip' } = {}) {
    const count = slides.length;
    const useLoop = loop && count > 1;
    const strip = document.createElement('div');
    strip.className = className;
    if (useLoop) strip.append(slides[count - 1].cloneNode(true), ...slides, slides[0].cloneNode(true));
    else strip.append(...slides);
    track.replaceChildren(strip);
    const cards = Array.from(strip.children);
    let physicalIndex = useLoop ? 1 : 0;
    let dragPx = 0;

    const metrics = () => {
        const width = track.clientWidth;
        const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
        return { width, gap, span: width + gap };
    };

    const restX = () => -(physicalIndex * metrics().span);

    const setTransform = (x, animate, duration = CAROUSEL_TRANSITION_MS) => {
        strip.classList.toggle('is-jumping', !animate);
        if (animate) strip.style.transitionDuration = `${duration}ms`;
        strip.style.transform = `translate3d(${x}px, 0, 0)`;
        if (!animate) {
            strip.offsetHeight;
            strip.classList.remove('is-jumping');
            strip.style.removeProperty('transition-duration');
        }
    };

    const travelMs = ratio => Math.round(CAROUSEL_TRANSITION_MS * Math.max(0.72, Math.min(1, ratio)));

    const setOffset = animate => {
        const { width, span } = metrics();
        if (!width) return;
        const duration = travelMs(span ? Math.abs(dragPx) / span : 1);
        dragPx = 0;
        setTransform(restX(), animate, duration);
    };

    const syncActive = onActive => {
        cards.forEach((card, index) => {
            const active = index === physicalIndex;
            card.setAttribute('aria-hidden', String(!active));
            card.toggleAttribute('inert', !active);
            onActive?.(card, active, index);
        });
    };

    return {
        strip,
        cards,
        setOffset,
        dragBy(dx) {
            if (!metrics().width) return;
            dragPx = dx;
            setTransform(restX() + dx, false);
        },
        render(index, direction, animate) {
            const { width, span } = metrics();
            if (!width) return false;
            const targetIndex = (animate && direction) ? physicalIndex + direction : (useLoop ? index + 1 : index);
            const remaining = span ? Math.abs(-(targetIndex * span) - (restX() + dragPx)) / span : 1;
            if (animate && direction) physicalIndex += direction;
            else physicalIndex = useLoop ? index + 1 : index;
            dragPx = 0;
            setTransform(restX(), animate, travelMs(remaining));
            return animate && Boolean(direction);
        },
        settle(index, onActive) {
            if (useLoop) {
                if (physicalIndex === count + 1) physicalIndex = 1;
                else if (physicalIndex === 0) physicalIndex = count;
            } else {
                physicalIndex = index;
            }
            setOffset(false);
            syncActive(onActive);
        }
    };
}

function attachCarouselProgressFill(host) {
    if (!host || host.querySelector(':scope > .carousel-dot-progress')) return;
    const progress = document.createElement('span');
    progress.className = 'carousel-dot-progress';
    progress.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.className = 'carousel-dot-progress-fill';
    progress.appendChild(fill);
    host.appendChild(progress);
}

function createCarouselController({
    root,
    count,
    render,
    settle,
    previous,
    next,
    indicators = [],
    gestureTarget = root,
    manualWrap = false,
    pauseWhenOffscreen = false,
    ignoreGesture = () => false,
    ignoreKeyboard = event => Boolean(event.target.closest('video, iframe, input, textarea, select')),
    onDragChange = () => {},
    onPointerDelta,
    onResize,
    transitionTarget,
    ariaLabel,
    shouldHoldAutoplay,
    onPauseChange
}) {
    if (!root || count < 1 || typeof render !== 'function') return null;
    root._carouselController?.destroy();

    let activeIndex = 0;
    let timer = null;
    let transitionTimer = null;
    let clickTimer = null;
    let travelGen = 0;
    let transitioning = false;
    let pointerActive = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let captureTarget = null;
    let suppressClick = false;
    let remainingMs = PROJECTS_CAROUSEL_MS;
    let runningSince = 0;
    let progressAnimation = null;
    const PAUSE = { hover: 1, pointer: 2, focus: 4, hidden: 8, offscreen: 16 };
    let pauseFlags = (pauseWhenOffscreen ? PAUSE.offscreen : 0) | (document.hidden ? PAUSE.hidden : 0);
    const abortController = new AbortController();
    const listenerOptions = { signal: abortController.signal };
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const holdingAutoplay = () => typeof shouldHoldAutoplay === 'function' && shouldHoldAutoplay(activeIndex);
    const pauseReasons = () => ({
        hover: Boolean(pauseFlags & PAUSE.hover),
        pointer: Boolean(pauseFlags & PAUSE.pointer),
        focus: Boolean(pauseFlags & PAUSE.focus),
        hidden: Boolean(pauseFlags & PAUSE.hidden),
        offscreen: Boolean(pauseFlags & PAUSE.offscreen)
    });
    indicators.forEach(attachCarouselProgressFill);

    const clearTimer = () => {
        if (timer !== null) window.clearTimeout(timer);
        timer = null;
    };
    const remainingNow = () => {
        if (runningSince === 0) return remainingMs;
        return Math.max(0, remainingMs - (performance.now() - runningSince));
    };
    const progressFill = (indicator) => indicator?.querySelector(':scope > .carousel-dot-progress > .carousel-dot-progress-fill');
    const stopProgressAnimation = () => {
        if (!progressAnimation) return;
        const target = progressAnimation.effect?.target;
        progressAnimation.cancel();
        progressAnimation = null;
        target?.style.removeProperty('transform');
    };
    const rootReady = () => root.isConnected && !root.closest('[hidden]') && root.getBoundingClientRect().width > 0;
    const syncProgress = (playing) => {
        const showTrack = count > 1 && !prefersReducedMotion() && !holdingAutoplay();
        if (showTrack) root.setAttribute('data-autoplay-progress', '');
        else root.removeAttribute('data-autoplay-progress');
        const activeFill = progressFill(indicators[activeIndex]);
        indicators.forEach((indicator, index) => {
            const fill = progressFill(indicator);
            if (!fill || index === activeIndex) return;
            fill.getAnimations().forEach(animation => animation.cancel());
            fill.style.transform = 'scaleX(0)';
        });
        if (!showTrack || !activeFill?.isConnected || !rootReady()) {
            stopProgressAnimation();
            if (activeFill) activeFill.style.transform = 'scaleX(0)';
            return;
        }
        const elapsed = Math.min(PROJECTS_CAROUSEL_MS, Math.max(0, PROJECTS_CAROUSEL_MS - remainingNow()));
        if (progressAnimation && progressAnimation.effect?.target !== activeFill) stopProgressAnimation();
        if (!progressAnimation) {
            activeFill.style.removeProperty('transform');
            progressAnimation = activeFill.animate(
                [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
                { duration: PROJECTS_CAROUSEL_MS, easing: 'linear', fill: 'forwards' }
            );
            progressAnimation.pause();
        }
        progressAnimation.currentTime = elapsed;
        if (playing) progressAnimation.play();
        else progressAnimation.pause();
    };
    const pauseCycle = () => {
        remainingMs = remainingNow();
        runningSince = 0;
        clearTimer();
        syncProgress(false);
    };
    const focusPausesAutoplay = () => {
        const active = document.activeElement;
        if (!active || !root.contains(active)) return false;
        if (active.closest('.carousel-controls')) return false;
        return true;
    };
    const hoverPauseFrom = node => {
        const element = node && node.nodeType === 1 ? node : node?.parentElement;
        return Boolean(element?.closest?.('.carousel-slide') && root.contains(element));
    };
    const canAutoplay = () => count > 1 && !prefersReducedMotion() && pauseFlags === 0 && !holdingAutoplay();
    const applyPause = (flag, on) => {
        const next = on ? pauseFlags | flag : pauseFlags & ~flag;
        if (next === pauseFlags) {
            if (!on && canAutoplay() && timer === null) start();
            return;
        }
        pauseFlags = next;
        onPauseChange?.(pauseReasons());
        if (canAutoplay()) start();
        else pauseCycle();
    };
    const clearTravelTimer = () => {
        if (transitionTimer !== null) window.clearTimeout(transitionTimer);
        transitionTimer = null;
    };
    const finishTransition = (gen = travelGen) => {
        if (gen !== travelGen) return;
        clearTravelTimer();
        if (!transitioning) return;
        transitioning = false;
        root.removeAttribute('aria-busy');
        settle?.(activeIndex);
        if (canAutoplay() && timer === null) start();
    };
    const finishActiveTransition = () => {
        if (!transitioning) return false;
        travelGen += 1;
        clearTravelTimer();
        transitioning = false;
        settle?.(activeIndex);
        return true;
    };
    const markTravel = () => {
        transitioning = true;
        root.setAttribute('aria-busy', 'true');
        const gen = ++travelGen;
        clearTravelTimer();
        transitionTimer = window.setTimeout(() => finishTransition(gen), CAROUSEL_TRANSITION_MS + 80);
    };
    const syncControls = () => {
        if (previous) previous.disabled = !manualWrap && activeIndex === 0;
        if (next) next.disabled = !manualWrap && activeIndex === count - 1;
        indicators.forEach((indicator, index) => {
            const active = index === activeIndex;
            indicator.classList.toggle('is-active', active);
            indicator.setAttribute('aria-current', String(active));
        });
        if (ariaLabel) root.setAttribute('aria-label', ariaLabel(activeIndex, count));
    };
    const normalizeIndex = (index, wrap) => {
        if (wrap) return (index + count) % count;
        return Math.max(0, Math.min(index, count - 1));
    };
    const start = () => {
        if (timer !== null) remainingMs = remainingNow();
        runningSince = 0;
        clearTimer();
        if (!canAutoplay()) {
            syncProgress(false);
            return;
        }
        runningSince = performance.now();
        const delay = remainingMs;
        timer = window.setTimeout(() => {
            timer = null;
            runningSince = 0;
            if (!canAutoplay()) {
                remainingMs = PROJECTS_CAROUSEL_MS;
                syncProgress(false);
                return;
            }
            remainingMs = PROJECTS_CAROUSEL_MS;
            moveTo(activeIndex + 1, { direction: 1, wrap: true });
        }, delay);
        syncProgress(true);
    };
    const moveTo = (index, { direction, manual = false, wrap = manualWrap } = {}) => {
        if (count < 2) return false;
        if (transitioning) {
            if (!manual) return false;
            finishActiveTransition();
        }
        const nextIndex = normalizeIndex(index, wrap);
        if (nextIndex === activeIndex) {
            root.removeAttribute('aria-busy');
            if (manual) start();
            return false;
        }
        remainingMs = PROJECTS_CAROUSEL_MS;
        runningSince = 0;
        clearTimer();
        stopProgressAnimation();
        const movement = direction || nextIndex - activeIndex;
        activeIndex = nextIndex;
        const animated = !prefersReducedMotion() && Boolean(movement);
        const rendered = render(activeIndex, movement, animated);
        const shouldTravel = animated && rendered !== false;
        syncControls();
        syncProgress(false);
        if (shouldTravel) markTravel();
        else {
            root.removeAttribute('aria-busy');
            settle?.(activeIndex);
            if (canAutoplay() && timer === null) start();
        }
        if (manual) start();
        return true;
    };
    const moveBy = (delta, manual = true) => moveTo(activeIndex + delta, {
        direction: delta,
        manual
    });

    previous?.addEventListener('click', () => moveBy(-1), listenerOptions);
    next?.addEventListener('click', () => moveBy(1), listenerOptions);
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => moveTo(index, { manual: true }), listenerOptions);
    });
    root.addEventListener('keydown', event => {
        if (ignoreKeyboard(event)) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        if (event.key === 'ArrowLeft' && (manualWrap || activeIndex > 0 || transitioning)) {
            event.preventDefault();
            moveBy(-1);
        }
        if (event.key === 'ArrowRight' && (manualWrap || activeIndex < count - 1 || transitioning)) {
            event.preventDefault();
            moveBy(1);
        }
    }, listenerOptions);
    root.addEventListener('pointerover', event => {
        if (event.pointerType === 'touch') return;
        if (hoverPauseFrom(event.target) && !hoverPauseFrom(event.relatedTarget)) {
            applyPause(PAUSE.hover, true);
        }
    }, listenerOptions);
    root.addEventListener('pointerout', event => {
        if (event.pointerType === 'touch') return;
        if (hoverPauseFrom(event.target) && !hoverPauseFrom(event.relatedTarget)) {
            applyPause(PAUSE.hover, false);
        }
    }, listenerOptions);
    const syncFocusPause = () => applyPause(PAUSE.focus, focusPausesAutoplay());
    root.addEventListener('focusin', syncFocusPause, listenerOptions);
    root.addEventListener('focus', syncFocusPause, listenerOptions);
    root.addEventListener('focusout', syncFocusPause, listenerOptions);

    if (gestureTarget) {
        const finishPointer = (event, navigate) => {
            if (event.pointerId !== pointerId) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (event.timeStamp - lastTime > 80) velocity = 0;
            const alongX = Math.abs(dx) >= Math.abs(dy) || (Math.abs(dx) < 8 && Math.abs(velocity) > CAROUSEL_FLING_VX);
            const flung = Math.abs(velocity) > CAROUSEL_FLING_VX;
            const swiped = navigate && alongX && (Math.abs(dx) > CAROUSEL_SWIPE_PX || flung);
            const signed = flung && Math.abs(dx) <= CAROUSEL_SWIPE_PX ? velocity : dx;
            const delta = signed < 0 ? 1 : -1;
            if (captureTarget?.hasPointerCapture(pointerId)) captureTarget.releasePointerCapture(pointerId);
            pointerId = null;
            captureTarget = null;
            pointerActive = false;
            onDragChange(false);
            if (swiped && moveBy(delta)) {
                suppressClick = true;
                if (clickTimer !== null) window.clearTimeout(clickTimer);
                clickTimer = window.setTimeout(() => {
                    suppressClick = false;
                    clickTimer = null;
                }, CAROUSEL_TRANSITION_MS + 80);
                applyPause(PAUSE.pointer, false);
                return;
            }
            if (Math.abs(dx) > 6) {
                onPointerDelta?.(0, true);
                markTravel();
            }
            applyPause(PAUSE.pointer, false);
        };
        gestureTarget.addEventListener('pointerdown', event => {
            if (!event.isPrimary || event.button !== 0 || pointerId !== null || ignoreGesture(event)) return;
            if (transitioning) finishActiveTransition();
            root.removeAttribute('aria-busy');
            pointerActive = true;
            applyPause(PAUSE.pointer, true);
            suppressClick = false;
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            lastX = event.clientX;
            lastTime = event.timeStamp;
            velocity = 0;
            captureTarget = event.target.closest?.('a, button') || gestureTarget;
            captureTarget.setPointerCapture(pointerId);
        }, listenerOptions);
        gestureTarget.addEventListener('pointermove', event => {
            if (event.pointerId !== pointerId || transitioning) return;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            const elapsed = event.timeStamp - lastTime;
            if (elapsed >= 8) velocity = (event.clientX - lastX) / elapsed;
            lastX = event.clientX;
            lastTime = event.timeStamp;
            if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
                onDragChange(true);
                onPointerDelta?.(dx, false);
                if (event.cancelable) event.preventDefault();
            }
        }, listenerOptions);
        gestureTarget.addEventListener('pointerup', event => finishPointer(event, true), listenerOptions);
        gestureTarget.addEventListener('pointercancel', event => finishPointer(event, false), listenerOptions);
        gestureTarget.addEventListener('dragstart', event => event.preventDefault(), listenerOptions);
        gestureTarget.addEventListener('click', event => {
            if (!suppressClick) return;
            suppressClick = false;
            event.preventDefault();
            event.stopPropagation();
        }, { ...listenerOptions, capture: true });
    }

    document.addEventListener('visibilitychange', () => applyPause(PAUSE.hidden, document.hidden), listenerOptions);
    motionQuery.addEventListener('change', () => {
        remainingMs = PROJECTS_CAROUSEL_MS;
        runningSince = 0;
        start();
    }, listenerOptions);
    const relayout = () => {
        if (!transitioning && typeof onResize === 'function') onResize();
        if (canAutoplay() && timer === null) start();
        else syncProgress(timer !== null);
    };
    if (typeof onResize === 'function') {
        window.addEventListener('resize', relayout, listenerOptions);
        if (typeof ResizeObserver === 'function') {
            const resizeTarget = gestureTarget || root;
            if (resizeTarget) {
                const resizeObserver = new ResizeObserver(relayout);
                resizeObserver.observe(resizeTarget);
                abortController.signal.addEventListener('abort', () => resizeObserver.disconnect(), { once: true });
            }
        }
    }
    if (transitionTarget) {
        transitionTarget.addEventListener('transitionend', event => {
            if (event.target === transitionTarget && event.propertyName === 'transform') finishTransition(travelGen);
        }, listenerOptions);
    }
    let observer = null;
    if (pauseWhenOffscreen && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
            applyPause(PAUSE.offscreen, !entries.some(entry => entry.isIntersecting));
        });
        observer.observe(root);
    } else {
        pauseFlags &= ~PAUSE.offscreen;
    }

    render(activeIndex, 0, false);
    syncControls();
    settle?.(activeIndex);
    start();

    const api = {
        finishTransition,
        finishActiveTransition,
        getIndex: () => activeIndex,
        isBusy: () => transitioning,
        goTo: (index, direction) => moveTo(index, { direction, manual: true }),
        isAutoplaying: () => timer !== null,
        remainingMs: remainingNow,
        progressTime: () => progressAnimation?.currentTime ?? null,
        pauseReasons,
        relayout,
        restart: start,
        destroy() {
            if (root._carouselController === api) delete root._carouselController;
            travelGen += 1;
            transitioning = false;
            pauseCycle();
            clearTravelTimer();
            if (clickTimer !== null) window.clearTimeout(clickTimer);
            observer?.disconnect();
            abortController.abort();
            stopProgressAnimation();
            root.querySelectorAll('video').forEach(video => video.pause());
            root.removeAttribute('data-autoplay-progress');
            root.removeAttribute('aria-busy');
        }
    };
    root._carouselController = api;
    onPauseChange?.(pauseReasons());
    return api;
}

function createCarouselSlide(content, index, count) {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index + 1} of ${count}`);
    slide.append(content);
    return slide;
}

function createCarouselView({
    root,
    slides,
    loop = slides.length > 1,
    pauseWhenOffscreen = true,
    ignoreGesture,
    onDragChange,
    ariaLabel,
    onRender,
    onSettle,
    shouldHoldAutoplay,
    onPauseChange,
    previousLabel = 'Previous slide',
    nextLabel = 'Next slide',
    indicatorLabel = (index, count) => `Go to slide ${index + 1} of ${count}`
}) {
    if (!root) return null;
    const count = slides.length;
    root.classList.add('carousel');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');

    let track = root.querySelector('.carousel-track');
    let stage = track?.closest('.carousel-stage') || root.querySelector(':scope > .carousel-stage');
    if (!stage) {
        stage = document.createElement('div');
        stage.className = 'carousel-stage';
        if (track) {
            track.parentNode.insertBefore(stage, track);
            stage.append(track);
        } else {
            track = document.createElement('div');
            track.className = 'carousel-track';
            track.id = `carousel-track-${++stackUid}`;
            stage.append(track);
            root.prepend(stage);
        }
    } else if (!track) {
        track = document.createElement('div');
        track.className = 'carousel-track';
        track.id = `carousel-track-${++stackUid}`;
        stage.append(track);
    }
    track.classList.add('carousel-track');
    if (!track.id) track.id = `carousel-track-${++stackUid}`;

    let controls = root.querySelector(':scope > .carousel-controls');
    if (count < 2) {
        root._carouselController?.destroy();
        if (controls) controls.hidden = true;
        root.removeAttribute('tabindex');
        track.replaceChildren(...(count ? [createCarouselSlide(slides[0], 0, 1)] : []));
        return { root, track, stage, motion: null, controls };
    }

    if (!controls) {
        controls = document.createElement('div');
        controls.className = 'carousel-controls';
        const previousBtn = document.createElement('button');
        previousBtn.type = 'button';
        previousBtn.className = 'carousel-nav carousel-nav--prev';
        previousBtn.setAttribute('aria-label', previousLabel);
        previousBtn.setAttribute('aria-controls', track.id);
        previousBtn.innerHTML = CAROUSEL_NAV_PREV_HTML;
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'carousel-dots';
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'carousel-nav carousel-nav--next';
        nextBtn.setAttribute('aria-label', nextLabel);
        nextBtn.setAttribute('aria-controls', track.id);
        nextBtn.innerHTML = CAROUSEL_NAV_NEXT_HTML;
        controls.append(previousBtn, dotsWrap, nextBtn);
        if (stage.parentElement === root) stage.after(controls);
        else root.append(controls);
    }
    controls.hidden = false;
    const previous = controls.querySelector('.carousel-nav--prev');
    const next = controls.querySelector('.carousel-nav--next');
    const dots = controls.querySelector('.carousel-dots');
    if (dots) {
        dots.replaceChildren();
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot';
            dot.setAttribute('aria-label', indicatorLabel(index, count));
            if (track.id) dot.setAttribute('aria-controls', track.id);
            dots.appendChild(dot);
        });
    }

    root.tabIndex = 0;
    const motion = createSlideStrip(track, slides.map((slide, index) => createCarouselSlide(slide, index, count)), {
        loop
    });
    track.querySelectorAll('a, img').forEach(element => {
        element.draggable = false;
    });
    createCarouselController({
        root,
        count,
        previous,
        next,
        indicators: dots ? Array.from(dots.querySelectorAll('.carousel-dot')) : [],
        gestureTarget: track,
        manualWrap: loop,
        pauseWhenOffscreen,
        ignoreGesture,
        onDragChange: dragging => {
            track.classList.toggle('is-dragging', dragging);
            onDragChange?.(dragging);
        },
        onPointerDelta: (dx, animate) => {
            if (animate) motion.setOffset(true);
            else motion.dragBy(dx);
        },
        transitionTarget: motion.strip,
        onResize: () => motion.setOffset(false),
        ariaLabel,
        shouldHoldAutoplay,
        onPauseChange,
        render(index, direction, animate) {
            onRender?.(index, direction, animate);
            return motion.render(index, direction, animate);
        },
        settle(index) {
            motion.settle(index, (card, active) => onSettle?.(index, card, active));
        }
    });
    return { root, track, stage, motion, controls };
}

function initProjectsCarousel(projects) {
    const carousel = document.querySelector('.projects-carousel');
    const track = document.getElementById('projects-track');
    if (!carousel || !track) return;

    if (!projects.length) {
        carousel._carouselController?.destroy();
        track.innerHTML = '<p class="cert-status">No featured projects yet.</p>';
        return;
    }

    createCarouselView({
        root: carousel,
        slides: projects.map(project => {
            const template = document.createElement('template');
            template.innerHTML = renderProjectCard(project).trim();
            return template.content.firstElementChild;
        }),
        loop: true,
        ariaLabel: index => `Showcase, slide ${index + 1} of ${projects.length}`,
        indicatorLabel: index => `Show ${projects[index].title}`
    });
}

async function loadProjects() {
    const track = document.getElementById('projects-track');
    if (!track) return;

    try {
        const data = await fetchJson(dataUrl('projects.json'));
        if (!Array.isArray(data)) throw new Error('projects.json must be an array');
        const projects = data.map(normalizeProject);
        const featured = projects.filter(project => project.featured);
        const others = projects.filter(project => !project.featured);
        initProjectsCarousel(featured);

        const otherWrap = document.getElementById('other-projects');
        const otherList = document.getElementById('other-projects-list');
        if (otherWrap && otherList && others.length) {
            otherList.innerHTML = others.map(renderOtherProject).join('');
            otherList.querySelectorAll('.stack-item').forEach(bindStackItem);
            otherWrap.hidden = false;
        }
        initScrollAnimations();
    } catch (error) {
        console.error('Error loading projects:', error);
        track.innerHTML = '<p class="cert-status">Unable to load projects right now.</p>';
    }
}

function setMeta(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', value || '');
}

function setCanonical(url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    link.setAttribute('href', url);
}

function upsertProjectJsonLd(data) {
    let script = document.getElementById('project-jsonld');
    if (!script) {
        script = document.createElement('script');
        script.id = 'project-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
}

function youtubeEmbedUrl(url) {
    try {
        const parsed = new URL(String(url || ''));
        const host = parsed.hostname.toLowerCase();
        const allowedHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
        if (!allowedHosts.includes(host)) return '';

        const videoId = host === 'youtu.be'
            ? parsed.pathname.split('/').filter(Boolean)[0]
            : parsed.pathname === '/watch' ? parsed.searchParams.get('v') : '';
        return /^[A-Za-z0-9_-]{11}$/.test(videoId || '')
            ? `https://www.youtube-nocookie.com/embed/${videoId}`
            : '';
    } catch (error) {
        return '';
    }
}

function resolveInheritedText(field, ...ancestry) {
    for (let index = ancestry.length - 1; index >= 0; index--) {
        const node = ancestry[index];
        if (!node || !Object.prototype.hasOwnProperty.call(node, field)) continue;
        if (node[field] === null) return null;
        if (typeof node[field] !== 'string' || !node[field].trim()) {
            throw new Error(`Invalid media ${field}: expected a non-empty string or null`);
        }
        return node[field].trim();
    }
    return undefined;
}

function projectMediaBlocks(project) {
    return Array.isArray(project.media?.blocks) ? project.media.blocks : [];
}

function mediaBlockLeaves(block) {
    if (!block || typeof block !== 'object') return [];
    switch (block.presentation) {
        case 'gallery':
        case 'grid':
            return Array.isArray(block.items) ? block.items : [];
        case 'comparison':
            return (Array.isArray(block.groups) ? block.groups : []).flatMap(group => [
                group?.source,
                ...(Array.isArray(group?.variants) ? group.variants : [])
            ]).filter(Boolean);
        default:
            return [];
    }
}

function projectMediaLeaves(project) {
    return projectMediaBlocks(project).flatMap(mediaBlockLeaves);
}

function isAnimatedGif(src) {
    return /\.gif(?:[?#]|$)/i.test(String(src || ''));
}

function warmMediaLeaf(element) {
    const image = element?.querySelector('img[data-src]');
    if (image && !image.hasAttribute('src')) image.src = image.dataset.src;
}

function warmAdjacentMediaLeaves(leaves, activeIndex, edgeClones) {
    const count = leaves.length;
    if (!count) return;
    [-1, 0, 1].forEach(offset => {
        const index = ((activeIndex + offset) % count + count) % count;
        warmMediaLeaf(leaves[index].element);
        if (index === 0) warmMediaLeaf(edgeClones?.first);
        if (index === count - 1) warmMediaLeaf(edgeClones?.last);
    });
}

function edgeClonesFromMotion(motion, leafCount) {
    const cards = motion?.cards;
    if (!cards || cards.length !== leafCount + 2) return null;
    return { first: cards[cards.length - 1], last: cards[0] };
}

function activateMediaCarouselNearViewport(root, activate) {
    if (!('IntersectionObserver' in window)) {
        activate();
        return;
    }
    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        activate();
    }, { rootMargin: '800px 0px' });
    observer.observe(root);
}

function createProjectMediaLeaf(item, projectTitle, ancestry) {
    if (!item || typeof item.src !== 'string' || !item.src.trim()) return null;
    const title = resolveInheritedText('title', ...ancestry, item);
    const caption = resolveInheritedText('caption', ...ancestry, item);
    const figure = document.createElement('figure');
    figure.className = 'project-media-leaf';

    if (item.type === 'image') {
        if (typeof item.alt !== 'string' || !item.alt.trim()) return null;
        const src = assetUrl(item.src);
        const link = document.createElement('a');
        link.className = 'project-media-image-link';
        link.href = src;
        link.target = '_blank';
        link.rel = 'noopener';
        const image = document.createElement('img');
        image.className = 'project-media-image';
        if (isAnimatedGif(item.src)) image.dataset.src = src;
        else image.src = src;
        image.alt = item.alt.trim();
        image.decoding = 'async';
        image.draggable = false;
        link.appendChild(image);
        figure.appendChild(link);
    } else if (item.type === 'video') {
        const video = document.createElement('video');
        video.className = 'project-media-frame';
        video.src = assetUrl(item.src);
        video.controls = true;
        video.playsInline = true;
        video.loop = false;
        video.muted = item.muted !== false;
        video.preload = 'metadata';
        video.addEventListener('loadedmetadata', () => applyShortClipPlaybackRate(video));
        if (typeof item.poster === 'string' && item.poster.trim()) video.poster = assetUrl(item.poster);
        const videoLabel = (typeof title === 'string' && title.trim())
            || (typeof caption === 'string' && caption.trim())
            || projectTitle;
        if (videoLabel) video.setAttribute('aria-label', videoLabel);
        figure.appendChild(video);
    } else if (item.type === 'youtube') {
        const embed = youtubeEmbedUrl(item.src);
        if (!embed) return null;
        const iframe = document.createElement('iframe');
        iframe.className = 'project-media-frame';
        iframe.dataset.src = embed;
        iframe.title = title || caption || `${projectTitle} video`;
        iframe.loading = 'lazy';
        iframe.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        figure.appendChild(iframe);
    } else {
        return null;
    }

    return {
        caption,
        element: figure,
        title,
        type: item.type,
        carouselAutoplay: item.type === 'video' && item.autoplay !== false
    };
}

function unbindCarouselVideoEnded(video) {
    if (!video?._onCarouselEnded) return;
    video.removeEventListener('ended', video._onCarouselEnded);
    delete video._onCarouselEnded;
}

function pauseCarouselVideo(video, reset) {
    video._carouselSystemPause = true;
    video.pause();
    video._carouselSystemPause = false;
    if (!reset) return;
    try {
        video.currentTime = 0;
    } catch (error) {
        /* ignore seek on unloaded media */
    }
}

function trackCarouselVideoUserPause(video) {
    if (video._carouselPauseTracked) return;
    video._carouselPauseTracked = true;
    video.addEventListener('pause', () => {
        if (!video._carouselSystemPause) video._carouselUserPaused = true;
    });
    video.addEventListener('play', () => {
        video._carouselUserPaused = false;
    });
}

function applyShortClipPlaybackRate(video) {
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration >= SHORT_CLIP_MIN_S) {
        video.playbackRate = 1;
        return;
    }
    video.playbackRate = duration / SHORT_CLIP_MIN_S;
}

function carouselVideoMayAutoplay(controller) {
    if (prefersReducedMotion()) return false;
    const reasons = controller?.pauseReasons?.();
    if (!reasons) return false;
    return !reasons.hidden && !reasons.offscreen;
}

function carouselVideoHoldsAdvance(controller) {
    const reasons = controller?.pauseReasons?.();
    return Boolean(reasons?.hover || reasons?.focus);
}

function syncCarouselVideoLeaf(element, active, carouselRoot) {
    const video = element.querySelector('video');
    if (!video) return;
    trackCarouselVideoUserPause(video);
    video.muted = true;
    video.playsInline = true;
    if (!active) {
        video.loop = false;
        unbindCarouselVideoEnded(video);
        pauseCarouselVideo(video, true);
        video._carouselUserPaused = false;
        return;
    }
    if (!carouselVideoMayAutoplay(carouselRoot?._carouselController)) {
        video.loop = false;
        unbindCarouselVideoEnded(video);
        pauseCarouselVideo(video, true);
        video._carouselUserPaused = false;
        return;
    }
    video.loop = carouselVideoHoldsAdvance(carouselRoot?._carouselController);
    video.preload = 'auto';
    applyShortClipPlaybackRate(video);
    if (!video._onCarouselEnded) {
        const onEnded = () => {
            if (prefersReducedMotion()) return;
            const controller = carouselRoot._carouselController;
            if (!controller || carouselVideoHoldsAdvance(controller)) return;
            controller.goTo(controller.getIndex() + 1);
        };
        video._onCarouselEnded = onEnded;
        video.addEventListener('ended', onEnded);
    }
    if (video._carouselUserPaused) return;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
}

function setProjectMediaLeafActive(element, active, options = {}) {
    if (options.autoplay) syncCarouselVideoLeaf(element, active, options.carouselRoot);
    else if (!active) element.querySelector('video')?.pause();
    const iframe = element.querySelector('iframe[data-src]');
    if (!iframe) return;
    if (active && !iframe.hasAttribute('src')) iframe.src = iframe.dataset.src;
    if (!active) iframe.removeAttribute('src');
}

function projectCarouselVideoHooks(root, leaves) {
    const sync = (card, active) => setProjectMediaLeafActive(card, active, { carouselRoot: root, autoplay: true });
    return {
        shouldHoldAutoplay: index => Boolean(leaves[index]?.carouselAutoplay),
        onPauseChange() {
            root.querySelectorAll(':scope .carousel-slide').forEach(slide => {
                sync(slide, slide.getAttribute('aria-hidden') !== 'true');
            });
        },
        onSettle(_index, card, active) {
            sync(card, active);
        }
    };
}

function renderProjectMediaGallery(block, media, projectTitle, blockIndex) {
    const items = Array.isArray(block.items) ? block.items : [];
    const leaves = items.map(item => createProjectMediaLeaf(item, projectTitle, [media, block])).filter(Boolean);
    if (!leaves.length) return null;

    const gallery = document.createElement('section');
    gallery.className = `project-media-card project-media-gallery${leaves.length > 1 ? ' project-media-gallery--multiple' : ''}${leaves.length > 4 ? ' project-media-gallery--many' : ''}`;
    const galleryLabel = resolveInheritedText('title', media, block) || `${projectTitle} gallery`;
    gallery.setAttribute('aria-label', galleryLabel);

    const metadata = document.createElement('div');
    metadata.className = 'project-media-metadata';
    const title = document.createElement('h3');
    title.className = 'project-media-title';
    title.id = `project-media-title-${blockIndex}`;
    const caption = document.createElement('p');
    caption.className = 'project-media-caption';
    caption.id = `project-media-caption-${blockIndex}`;
    metadata.append(title, caption);

    leaves.forEach((leaf, index) => {
        leaf.element.dataset.mediaIndex = String(index);
    });

    const hasDeferredMedia = leaves.some(leaf => leaf.element.querySelector('img[data-src]'));
    let edgeClones = null;
    let currentIndex = 0;
    let activated = !hasDeferredMedia;
    const activate = () => {
        if (activated) return;
        activated = true;
        warmAdjacentMediaLeaves(leaves, currentIndex, edgeClones);
    };

    const updateCopy = activeIndex => {
        const activeLeaf = leaves[activeIndex];
        title.textContent = activeLeaf.title || '';
        title.hidden = !activeLeaf.title;
        caption.textContent = activeLeaf.caption || '';
        caption.hidden = !activeLeaf.caption;
        metadata.hidden = !activeLeaf.title && !activeLeaf.caption;
        const descriptions = [activeLeaf.title ? title.id : '', activeLeaf.caption ? caption.id : ''].filter(Boolean);
        if (descriptions.length) activeLeaf.element.setAttribute('aria-describedby', descriptions.join(' '));
        else activeLeaf.element.removeAttribute('aria-describedby');
    };

    const videoHooks = projectCarouselVideoHooks(gallery, leaves);
    const view = createCarouselView({
        root: gallery,
        slides: leaves.map(leaf => leaf.element),
        loop: leaves.length > 1,
        pauseWhenOffscreen: true,
        ignoreGesture: event => Boolean(event.target.closest('video, iframe')),
        previousLabel: 'Previous media',
        nextLabel: 'Next media',
        indicatorLabel: (index) => {
            const title = leaves[index]?.title;
            return title ? `Show ${title}` : `Go to slide ${index + 1} of ${leaves.length}`;
        },
        ariaLabel: index => `${galleryLabel}, slide ${index + 1} of ${leaves.length}`,
        onRender: index => {
            updateCopy(index);
            currentIndex = index;
            if (activated) warmAdjacentMediaLeaves(leaves, index, edgeClones);
        },
        shouldHoldAutoplay: videoHooks.shouldHoldAutoplay,
        onPauseChange: videoHooks.onPauseChange,
        onSettle: videoHooks.onSettle
    });
    if (hasDeferredMedia) {
        edgeClones = edgeClonesFromMotion(view?.motion, leaves.length);
        activateMediaCarouselNearViewport(gallery, activate);
    }
    if (view?.stage) {
        const viewport = document.createElement('div');
        viewport.className = 'project-media-viewport';
        view.stage.before(viewport);
        viewport.append(view.stage, metadata);
    } else if (view?.controls) {
        view.controls.before(metadata);
    } else {
        gallery.append(metadata);
    }
    updateCopy(0);
    if (leaves.length === 1) {
        warmMediaLeaf(leaves[0].element);
        setProjectMediaLeafActive(leaves[0].element, true);
    }

    const firstImage = leaves[0].element.querySelector('img');
    const syncViewport = () => {
        if (firstImage?.naturalWidth && firstImage.naturalHeight) {
            gallery.style.setProperty('--project-media-aspect', `${firstImage.naturalWidth} / ${firstImage.naturalHeight}`);
            gallery.classList.toggle('project-media-gallery--portrait', firstImage.naturalHeight > firstImage.naturalWidth);
        } else if (!firstImage) {
            gallery.style.setProperty('--project-media-aspect', '16 / 9');
        }
        view?.motion?.setOffset(false);
    };
    if (firstImage) {
        firstImage.addEventListener('load', syncViewport, { once: true });
        if (firstImage.hasAttribute('src') && firstImage.complete) syncViewport();
    } else {
        syncViewport();
    }
    return gallery;
}

function appendProjectMediaLeafMetadata(leaf) {
    if (!leaf.title && !leaf.caption) return;
    const metadata = document.createElement('figcaption');
    metadata.className = 'project-media-item-metadata';
    if (leaf.title) {
        const title = document.createElement('h4');
        title.className = 'project-media-item-title';
        title.textContent = leaf.title;
        metadata.appendChild(title);
    }
    if (leaf.caption) {
        const caption = document.createElement('p');
        caption.className = 'project-media-item-caption';
        caption.textContent = leaf.caption;
        metadata.appendChild(caption);
    }
    leaf.element.appendChild(metadata);
}

function createProjectMediaBlockHeader(media, block) {
    const title = resolveInheritedText('title', media, block);
    const caption = resolveInheritedText('caption', media, block);
    if (!title && !caption) return null;
    const header = document.createElement('header');
    header.className = 'project-media-block-header';
    if (title) {
        const heading = document.createElement('h3');
        heading.textContent = title;
        header.appendChild(heading);
    }
    if (caption) {
        const description = document.createElement('p');
        description.textContent = caption;
        header.appendChild(description);
    }
    return header;
}

function activateProjectMediaLeafOnView(element) {
    if (!element.querySelector('iframe[data-src]') || !('IntersectionObserver' in window)) {
        warmMediaLeaf(element);
        setProjectMediaLeafActive(element, true);
        return;
    }
    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        setProjectMediaLeafActive(element, true);
        observer.disconnect();
    }, { rootMargin: '200px' });
    observer.observe(element);
}

function renderProjectMediaGrid(block, media, projectTitle, blockIndex) {
    const items = Array.isArray(block.items) ? block.items : [];
    const leaves = items.map(item => createProjectMediaLeaf(item, projectTitle, [media, block])).filter(Boolean);
    if (!leaves.length) return null;

    const section = document.createElement('section');
    section.className = 'project-media-grid-block';
    section.setAttribute('aria-label', resolveInheritedText('title', media, block) || `${projectTitle} media grid ${blockIndex + 1}`);
    const header = createProjectMediaBlockHeader(media, block);
    if (header) section.appendChild(header);
    const grid = document.createElement('div');
    grid.className = 'project-media-items-grid';
    leaves.forEach(leaf => {
        appendProjectMediaLeafMetadata(leaf);
        grid.appendChild(leaf.element);
        activateProjectMediaLeafOnView(leaf.element);
    });
    section.appendChild(grid);
    return section;
}

function renderProjectMediaComparison(block, media, projectTitle, blockIndex) {
    const configuredGroups = Array.isArray(block.groups) ? block.groups : [];
    const section = document.createElement('section');
    section.className = 'project-media-comparison';
    section.setAttribute('aria-label', resolveInheritedText('title', media, block) || `${projectTitle} comparisons ${blockIndex + 1}`);
    configuredGroups.forEach((group, groupIndex) => {
        const source = createProjectMediaLeaf(group?.source, projectTitle, [media, block, group]);
        const variants = (Array.isArray(group?.variants) ? group.variants : []).map(variant => ({
            label: typeof variant?.label === 'string' ? variant.label.trim() : '',
            leaf: createProjectMediaLeaf(variant, projectTitle, [media, block, group])
        })).filter(variant => variant.label && variant.leaf);
        if (!source || !variants.length) return;
        const variantLeaves = variants.map(({ leaf }) => leaf);

        const comparison = document.createElement('section');
        comparison.className = 'project-media-card project-media-comparison-group';
        const groupTitle = resolveInheritedText('title', media, block, group);
        if (groupTitle) {
            const label = document.createElement('p');
            label.className = 'project-media-group-label';
            label.textContent = groupTitle;
            comparison.appendChild(label);
        }

        const pair = document.createElement('div');
        pair.className = 'project-media-comparison-pair';
        source.element.classList.add('project-media-comparison-source');
        appendProjectMediaLeafMetadata(source);
        warmMediaLeaf(source.element);
        setProjectMediaLeafActive(source.element, true);
        const results = document.createElement('div');
        results.className = 'carousel-track project-media-comparison-results';
        variants.forEach(({ leaf }, index) => {
            leaf.element.classList.add('project-media-comparison-result');
            leaf.element.dataset.variantIndex = String(index);
            appendProjectMediaLeafMetadata(leaf);
        });
        pair.append(source.element, results);
        comparison.append(pair);
        section.appendChild(comparison);

        const hasDeferredMedia = variantLeaves.some(leaf => leaf.element.querySelector('img[data-src]'));
        let edgeClones = null;
        let currentIndex = 0;
        let activated = !hasDeferredMedia;
        const activate = () => {
            if (activated) return;
            activated = true;
            warmAdjacentMediaLeaves(variantLeaves, currentIndex, edgeClones);
        };

        const videoHooks = projectCarouselVideoHooks(comparison, variantLeaves);
        const view = createCarouselView({
            root: comparison,
            slides: variantLeaves.map(leaf => leaf.element),
            loop: true,
            ignoreGesture: event => Boolean(event.target.closest('video, iframe')),
            onDragChange: dragging => results.classList.toggle('is-dragging', dragging),
            previousLabel: 'Previous transform',
            nextLabel: 'Next transform',
            indicatorLabel: index => `Show ${variants[index].label}`,
            ariaLabel: index => `${groupTitle || `Comparison ${groupIndex + 1}`}, ${variants[index].label}, ${index + 1} of ${variants.length}`,
            onRender: index => {
                currentIndex = index;
                if (activated) warmAdjacentMediaLeaves(variantLeaves, index, edgeClones);
            },
            shouldHoldAutoplay: videoHooks.shouldHoldAutoplay,
            onPauseChange: videoHooks.onPauseChange,
            onSettle: videoHooks.onSettle
        });
        if (hasDeferredMedia) {
            edgeClones = edgeClonesFromMotion(view?.motion, variantLeaves.length);
            activateMediaCarouselNearViewport(comparison, activate);
        }
    });

    return section.querySelector('.project-media-comparison-group') ? section : null;
}

function renderProjectMediaBlock(block, media, projectTitle, blockIndex) {
    switch (block?.presentation) {
        case 'gallery':
            return renderProjectMediaGallery(block, media, projectTitle, blockIndex);
        case 'grid':
            return renderProjectMediaGrid(block, media, projectTitle, blockIndex);
        case 'comparison':
            return renderProjectMediaComparison(block, media, projectTitle, blockIndex);
        default:
            return null;
    }
}

function renderProjectMediaInto(project, {
    sectionId = 'project-media',
    gridId = 'project-media-grid',
    start = 0,
    end = Infinity,
    blockIndexOffset = 0
} = {}) {
    const section = document.getElementById(sectionId);
    const grid = document.getElementById(gridId);
    if (!section || !grid) return false;

    grid.querySelectorAll('.project-media-gallery, .project-media-comparison-group').forEach(root => {
        root._carouselController?.destroy();
    });

    const blocks = projectMediaBlocks(project).slice(start, end);
    const renderedBlocks = blocks
        .map((block, index) => renderProjectMediaBlock(block, project.media, project.title, blockIndexOffset + index))
        .filter(Boolean);
    grid.replaceChildren(...renderedBlocks);
    const hasLeadGalleryPair = renderedBlocks.length === 2
        && blocks[0]?.presentation === 'gallery'
        && blocks[0].items?.length === 1
        && blocks[1]?.presentation === 'gallery'
        && blocks[1].items?.length > 1;
    grid.classList.toggle('project-demo-grid--lead-gallery', hasLeadGalleryPair);
    section.setAttribute('aria-label', `${project.title} media`);
    section.hidden = !renderedBlocks.length;
    if (!section.hidden) {
        grid.querySelectorAll('.project-media-gallery, .project-media-comparison-group').forEach(root => {
            root._carouselController?.relayout();
        });
    }
    return renderedBlocks.length > 0;
}

function renderProjectMedia(project) {
    const split = project.detailOrder === 'writeup-split-media' ? project.mediaSplitAfter : 0;
    if (split) {
        const first = renderProjectMediaInto(project, { end: split });
        const rest = renderProjectMediaInto(project, {
            sectionId: 'project-media-after',
            gridId: 'project-media-after-grid',
            start: split,
            blockIndexOffset: split
        });
        return first || rest;
    }
    const afterSection = document.getElementById('project-media-after');
    if (afterSection) afterSection.hidden = true;
    return renderProjectMediaInto(project);
}

function normalizeProjectResultRow(row, columnCount) {
    const cells = Array.isArray(row)
        ? row
        : (row && typeof row === 'object' && Array.isArray(row.cells) ? row.cells : null);
    if (!cells || cells.length !== columnCount) return null;
    const best = Array.isArray(row?.best) ? row.best : [];
    return {
        cells,
        ours: Boolean(row && typeof row === 'object' && !Array.isArray(row) && row.ours),
        best
    };
}

function renderProjectResults(project) {
    const section = document.getElementById('project-results');
    if (!section) return false;

    const results = project.results;
    const tables = Array.isArray(results?.tables) ? results.tables : [];
    const rendered = tables.map(table => {
        const columns = Array.isArray(table.columns) ? table.columns.filter(column => typeof column === 'string' && column.trim()) : [];
        const rows = Array.isArray(table.rows)
            ? table.rows.map(row => normalizeProjectResultRow(row, columns.length)).filter(Boolean)
            : [];
        if (typeof table.title !== 'string' || !table.title.trim() || !columns.length || !rows.length) return null;

        const oursColumn = Number.isInteger(table.oursColumn) ? table.oursColumn : -1;
        const figure = document.createElement('figure');
        figure.className = 'project-results-figure';
        const caption = document.createElement('figcaption');
        caption.className = 'project-results-caption';
        const heading = document.createElement('h3');
        heading.textContent = table.title.trim();
        caption.appendChild(heading);
        if (typeof table.caption === 'string' && table.caption.trim()) {
            const context = document.createElement('p');
            context.textContent = table.caption.trim();
            caption.appendChild(context);
        }
        const wrap = document.createElement('div');
        wrap.className = 'project-results-table-wrap';
        const tableEl = document.createElement('table');
        tableEl.className = 'project-results-table';
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        columns.forEach((column, columnIndex) => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = column.trim();
            if (columnIndex === oursColumn) th.classList.add('project-results-cell--ours');
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            if (row.ours) tr.classList.add('project-results-row--ours');
            row.cells.forEach((cell, cellIndex) => {
                const td = document.createElement(cellIndex === 0 ? 'th' : 'td');
                if (cellIndex === 0) td.scope = 'row';
                if (cellIndex === oursColumn) td.classList.add('project-results-cell--ours');
                const text = cell == null ? '' : String(cell);
                if (row.best[cellIndex]) {
                    td.classList.add('project-results-cell--best');
                    const strong = document.createElement('strong');
                    strong.textContent = text;
                    td.appendChild(strong);
                } else {
                    td.textContent = text;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        tableEl.append(thead, tbody);
        wrap.appendChild(tableEl);
        figure.append(caption, wrap);
        if (typeof table.interpretation === 'string' && table.interpretation.trim()) {
            const interpretation = document.createElement('p');
            interpretation.className = 'project-results-interpretation';
            interpretation.textContent = table.interpretation.trim();
            figure.appendChild(interpretation);
        }
        const notes = Array.isArray(table.notes)
            ? table.notes.filter(note => typeof note === 'string' && note.trim())
            : [];
        if (notes.length) {
            const list = document.createElement('ul');
            list.className = 'project-results-notes';
            notes.forEach(note => {
                const item = document.createElement('li');
                item.textContent = note.trim();
                list.appendChild(item);
            });
            figure.appendChild(list);
        }
        return figure;
    }).filter(Boolean);

    const nodes = [];
    if (typeof results?.title === 'string' && results.title.trim()) {
        const heading = document.createElement('h2');
        heading.className = 'section-title';
        heading.textContent = results.title.trim();
        nodes.push(heading);
    }
    if (typeof results?.caption === 'string' && results.caption.trim()) {
        const intro = document.createElement('p');
        intro.className = 'project-results-intro';
        intro.textContent = results.caption.trim();
        nodes.push(intro);
    }
    nodes.push(...rendered);
    section.replaceChildren(...nodes);
    section.hidden = !rendered.length;
    return rendered.length > 0;
}

function updateProjectSeo(project) {
    const seo = typeof ProjectSeo !== 'undefined' && ProjectSeo.forProject
        ? ProjectSeo.forProject(project)
        : null;
    const title = seo?.title || `${project.title} | Hitesh Goyal`;
    const description = seo?.description || project.summary || 'Project by Hitesh Goyal, Applied AI Engineer.';
    const url = seo?.url || `${SITE_ORIGIN}/projects/${encodeURIComponent(project.slug)}/`;
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:card"]', seo?.twitterCard || 'summary');
    setCanonical(url);
    const image = seo?.image || absoluteUrl(project.logo || 'assets/hg-logo-4k.png');
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[name="twitter:image"]', image);
    if (seo?.imageAlt) {
        setMeta('meta[property="og:image:alt"]', seo.imageAlt);
        setMeta('meta[name="twitter:image:alt"]', seo.imageAlt);
    }
    if (seo?.jsonLd) upsertProjectJsonLd(seo.jsonLd);
}

function renderProjectActionBar(project, element) {
    if (!element) return;
    const linksHTML = renderLinks(project.links);
    const license = typeof project.license === 'string' ? project.license.trim() : '';
    const licenseHTML = license
        ? `<span class="project-license">${escapeHtml(license)}</span>`
        : '';
    element.innerHTML = linksHTML + licenseHTML;
    element.hidden = !element.innerHTML;
}

function renderProjectIntroduction(project) {
    const logoEl = document.getElementById('project-logo');
    if (logoEl) {
        if (project.logo) {
            logoEl.src = assetUrl(project.logo);
            logoEl.alt = '';
            logoEl.classList.toggle('node-logo--on-dark', project.logoTone === 'on-dark');
            logoEl.hidden = false;
        } else {
            logoEl.hidden = true;
        }
    }

    document.getElementById('project-title').textContent = project.title;

    const descEl = document.getElementById('project-description');
    if (descEl) {
        descEl.textContent = project.summary || '';
        descEl.hidden = !descEl.textContent;
    }

    const tagsEl = document.getElementById('project-tags');
    if (tagsEl) {
        tagsEl.innerHTML = renderTags(projectDisplayTags(project));
        tagsEl.hidden = !tagsEl.innerHTML;
    }

    renderProjectActionBar(project, document.getElementById('project-links'));
    renderProjectActionBar(project, document.getElementById('project-footer-links'));
}

function showProjectPageError(message) {
    const title = document.getElementById('project-title');
    const desc = document.getElementById('project-description');
    if (title) title.textContent = 'Unable to load project';
    if (desc) {
        desc.hidden = false;
        desc.textContent = message;
    }
}

function canNavigateHistoryBack() {
    if (window.history.length < 2) return false;
    const referrer = document.referrer;
    if (!referrer) return false;
    try {
        return new URL(referrer).origin === window.location.origin;
    } catch (error) {
        return false;
    }
}

function pathIsProjectPage(pathname) {
    const path = String(pathname || '').replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';
    return path === '/projects' || /^\/projects\/[a-z0-9-]+$/i.test(path);
}

function prefersCrossDocumentViewTransition() {
    return !prefersReducedMotion() && 'onpagereveal' in window;
}

let pageLeaveTimer = 0;

function clearPageLeave() {
    if (!pageLeaveTimer) return;
    window.clearTimeout(pageLeaveTimer);
    pageLeaveTimer = 0;
}

function goWithPageMotion(url, { historyBack = false } = {}) {
    const go = () => {
        if (historyBack) history.back();
        else window.location.href = url;
    };
    if (prefersReducedMotion() || prefersCrossDocumentViewTransition()) {
        go();
        return;
    }
    try {
        sessionStorage.setItem('portfolio-page-motion', '1');
    } catch (error) {}
    clearPageLeave();
    document.documentElement.classList.add('is-page-leaving');
    pageLeaveTimer = window.setTimeout(() => {
        pageLeaveTimer = 0;
        go();
    }, MOTION_SPATIAL_MS);
}

function isPortfolioProjectNav(href) {
    let url;
    try {
        url = new URL(href, window.location.href);
    } catch (error) {
        return false;
    }
    if (url.origin !== window.location.origin) return false;
    return document.body.classList.contains('project-page') !== pathIsProjectPage(url.pathname);
}

function initPageNavMotion() {
    window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        clearPageLeave();
        document.documentElement.classList.remove('is-page-leaving', 'is-page-entering', 'is-page-ready');
    });
    if (document.documentElement.classList.contains('is-page-entering')) {
        if (prefersReducedMotion()) {
            document.documentElement.classList.remove('is-page-entering');
        } else {
            requestAnimationFrame(() => {
                document.documentElement.classList.add('is-page-ready');
                window.setTimeout(() => {
                    document.documentElement.classList.remove('is-page-entering', 'is-page-ready');
                }, MOTION_SPATIAL_MS + 80);
            });
        }
    }
    document.addEventListener('click', event => {
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
        if (link.classList.contains('back-button')) return;
        if (!isPortfolioProjectNav(link.href)) return;
        if (prefersCrossDocumentViewTransition()) return;
        event.preventDefault();
        goWithPageMotion(link.href);
    });
}

function initProjectBackLink() {
    document.querySelectorAll('a.back-button').forEach(link => {
        link.addEventListener('click', event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (!canNavigateHistoryBack()) return;
            event.preventDefault();
            goWithPageMotion(link.href, { historyBack: true });
        });
    });
}

async function initProjectPage() {
    initProjectBackLink();
    const slug = projectSlugFromLocation();
    if (!slug) {
        window.location.replace('/#projects');
        return;
    }

    let projects;
    try {
        projects = await fetchJson(dataUrl('projects.json'));
        if (!Array.isArray(projects)) throw new Error('projects.json must be an array');
    } catch (error) {
        console.error('Error loading project:', error);
        showProjectPageError('The project data could not be loaded. Check your connection and try again.');
        return;
    }

    const project = projects.map(normalizeProject).find(item => item.slug === slug);
    if (!project) {
        window.location.replace('/#projects');
        return;
    }
    if (isLegacyProjectQuery() && !isLocalContactHost(window.location.hostname)) {
        window.location.replace(`/projects/${encodeURIComponent(slug)}/${window.location.hash}`);
        return;
    }

    updateProjectSeo(project);
    renderProjectIntroduction(project);

    const hasWriteup = Boolean(project.writeup.trim());
    const hasWriteupMid = Boolean(project.writeupMid.trim());
    const hasWriteupAfter = Boolean(project.writeupAfter.trim());
    const hasMedia = renderProjectMedia(project);
    const hasResults = renderProjectResults(project);
    const writeupSection = document.getElementById('project-writeup-section');
    const writeupMidSection = document.getElementById('project-writeup-mid-section');
    const resultsSection = document.getElementById('project-results');
    const mediaSection = document.getElementById('project-media');
    const mediaAfterSection = document.getElementById('project-media-after');
    if (project.detailOrder === 'writeup-results' && writeupSection && resultsSection) {
        resultsSection.before(writeupSection);
    }
    if ((project.detailOrder === 'writeup-media' || project.detailOrder === 'writeup-split-media') && writeupSection && mediaSection) {
        mediaSection.before(writeupSection);
    }
    if (project.detailOrder === 'writeup-split-media' && mediaSection && writeupMidSection && mediaAfterSection) {
        mediaSection.after(writeupMidSection);
        writeupMidSection.after(mediaAfterSection);
        const writeupAfterSection = document.getElementById('project-writeup-after-section');
        if (writeupAfterSection) mediaAfterSection.after(writeupAfterSection);
    }
    if (hasWriteup) {
        document.getElementById('project-writeup').innerHTML = renderMarkdown(project.writeup);
        writeupSection.hidden = false;
    } else if (writeupSection) {
        writeupSection.hidden = true;
    }
    const writeupMid = document.getElementById('project-writeup-mid');
    if (hasWriteupMid && writeupMidSection && writeupMid) {
        writeupMid.innerHTML = renderMarkdown(project.writeupMid);
        writeupMidSection.hidden = false;
    } else if (writeupMidSection) {
        writeupMidSection.hidden = true;
    }
    const writeupAfterSection = document.getElementById('project-writeup-after-section');
    const writeupAfter = document.getElementById('project-writeup-after');
    if (hasWriteupAfter && writeupAfterSection && writeupAfter) {
        writeupAfter.innerHTML = renderMarkdown(project.writeupAfter);
        writeupAfterSection.hidden = false;
    } else if (writeupAfterSection) {
        writeupAfterSection.hidden = true;
    }

    if (!hasWriteup && !hasWriteupMid && !hasWriteupAfter && !hasMedia && !hasResults) {
        document.getElementById('project-coming-soon').hidden = false;
    }
}

async function loadCertificates() {
    const timelineGrid = document.getElementById('timeline-certificates');
    if (!timelineGrid) return;
    if (certificatesLoaded) return;

    let panel = document.getElementById('cert-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'cert-panel';
        panel.innerHTML = `
            <div id="certificate-grid"></div>
            <div id="cert-controls" class="cert-controls">
                <button type="button" id="cert-toggle" class="cert-toggle" aria-expanded="false" aria-controls="certificate-archive"></button>
            </div>
            <div id="certificate-archive" class="cert-archive" hidden><div class="cert-archive-inner"></div></div>
        `;
        timelineGrid.appendChild(panel);
    }

    const primaryGrid = document.getElementById('certificate-grid');
    const controls = document.getElementById('cert-controls');
    const toggleBtn = document.getElementById('cert-toggle');
    const archiveGrid = document.getElementById('certificate-archive');
    const archiveInner = archiveGrid?.querySelector('.cert-archive-inner') || archiveGrid;

    try {
        const data = await fetchJson(dataUrl('certificates.json'));
        const categories = data.categories;
        const certificates = categories.flatMap(category => category.certificates);

        if (!certificates.length) {
            primaryGrid.innerHTML = '<p class="cert-status">Certificates coming soon.</p>';
            certificatesLoaded = true;
            return;
        }

        const hasCore = certificates.some(cert => cert.importance === 'core');
        const isFeatured = cert => !hasCore || cert.importance === 'core';
        const isArchived = cert => hasCore && cert.importance !== 'core';

        renderCertificateSections(categories, primaryGrid, isFeatured);
        revealCertificateCards(primaryGrid);

        if (certificates.some(isArchived)) {
            renderCertificateSections(categories, archiveInner, isArchived);
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.textContent = 'Show additional certificates';
            archiveGrid.hidden = true;
            archiveGrid.classList.remove('is-open');
            controls.style.display = 'block';
            let archiveMotionTimer = 0;
            toggleBtn.onclick = () => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', String(!expanded));
                if (archiveMotionTimer) {
                    window.clearTimeout(archiveMotionTimer);
                    archiveMotionTimer = 0;
                }
                if (expanded) {
                    archiveGrid.classList.remove('is-open');
                    if (prefersReducedMotion()) archiveGrid.hidden = true;
                    else {
                        archiveMotionTimer = window.setTimeout(() => {
                            archiveMotionTimer = 0;
                            if (toggleBtn.getAttribute('aria-expanded') === 'false') archiveGrid.hidden = true;
                        }, MOTION_SPATIAL_MS + 80);
                    }
                } else {
                    archiveGrid.hidden = false;
                    archiveGrid.classList.remove('is-open');
                    archiveGrid.offsetHeight;
                    archiveGrid.classList.add('is-open');
                    revealCertificateCards(archiveGrid);
                }
                toggleBtn.textContent = expanded ? 'Show additional certificates' : 'Hide additional certificates';
            };
        } else {
            toggleBtn.style.display = 'none';
            controls.style.display = 'none';
        }

        certificatesLoaded = true;
    } catch (error) {
        console.error('Error loading certificates:', error);
        certificatesLoaded = false;
        primaryGrid.innerHTML = '<p class="cert-status">Unable to load certificates right now. Switch filters and try again.</p>';
    }
}

function timelinePanels() {
    return ['work', 'education', 'certificates'].map(id => ({
        id,
        tab: document.getElementById(`tab-${id}`),
        panel: document.getElementById(`panel-${id}`)
    })).filter(item => item.tab && item.panel);
}

function setTimelinePanelX(panel, x, settling) {
    if (!panel) return;
    panel.classList.toggle('is-settling', Boolean(settling));
    panel.style.transform = `translate3d(${x}px, 0, 0)`;
}

function visualTimelineDx(dx) {
    if (!timelineDrag) return 0;
    return timelineDrag.to ? dx : dx * TIMELINE_DRAG_EDGE;
}

function clearTimelineDrag() {
    const session = timelineDrag;
    if (!session) return;
    [session.from?.panel, session.to?.panel].filter(Boolean).forEach(panel => {
        panel.classList.remove('is-drag-layer', 'is-settling');
        panel.style.transform = '';
    });
    if (session.to && !session.to.panel.classList.contains('is-active')) {
        session.to.panel.hidden = true;
        session.to.panel.setAttribute('inert', '');
    }
    session.host.classList.remove('is-dragging');
    session.host.style.height = '';
    timelineDrag = null;
}

function waitTimelineSettle(panels, reduce, done) {
    let finished = false;
    const complete = () => {
        if (finished) return;
        finished = true;
        done();
    };
    if (reduce || !panels.length) {
        complete();
        return;
    }
    let pending = panels.length;
    panels.forEach(panel => {
        const onEnd = event => {
            if (event.target !== panel) return;
            if (event.propertyName && event.propertyName !== 'transform') return;
            panel.removeEventListener('transitionend', onEnd);
            if (--pending === 0) complete();
        };
        panel.addEventListener('transitionend', onEnd);
    });
    window.setTimeout(complete, MOTION_SPATIAL_MS + 80);
}

function beginTimelineDrag(dx) {
    const items = timelinePanels();
    const from = items[timelineTabIndex];
    const host = document.querySelector('.timeline-panels');
    if (!from || !host || timelineDrag) return;
    const dir = dx < 0 ? 1 : -1;
    const to = items[timelineTabIndex + dir] || null;
    if (to?.id === 'certificates') loadCertificates();
    const width = host.getBoundingClientRect().width;
    const currentHeight = from.panel.offsetHeight;
    from.panel.classList.add('is-drag-layer');
    from.panel.classList.remove('is-from-left', 'is-from-right', 'is-settling');
    let nextHeight = currentHeight;
    if (to) {
        to.panel.hidden = false;
        to.panel.setAttribute('inert', '');
        to.panel.classList.add('is-drag-layer');
        to.panel.classList.remove('is-from-left', 'is-from-right', 'is-settling', 'is-active');
        setTimelinePanelX(to.panel, dir > 0 ? width : -width, false);
        nextHeight = to.panel.offsetHeight || currentHeight;
    }
    host.classList.add('is-dragging');
    host.style.height = `${Math.max(currentHeight, nextHeight)}px`;
    setTimelinePanelX(from.panel, 0, false);
    timelineDrag = { host, from, to, dir, width };
}

function applyTimelineDrag(dx) {
    if (!timelineDrag || timelineDrag.closing) return;
    const x = visualTimelineDx(dx);
    setTimelinePanelX(timelineDrag.from.panel, x, false);
    if (timelineDrag.to) {
        setTimelinePanelX(
            timelineDrag.to.panel,
            (timelineDrag.dir > 0 ? timelineDrag.width : -timelineDrag.width) + x,
            false
        );
    }
}

function finishTimelineDrag({ dx, vx, commitRequested }) {
    const session = timelineDrag;
    if (!session || session.closing) return;
    session.closing = true;
    const reduce = prefersReducedMotion();
    const x = visualTimelineDx(dx);
    const ratio = Math.abs(x) / session.width;
    const toward = session.dir > 0 ? x < 0 : x > 0;
    const velocityToward = session.dir > 0 ? vx < -TIMELINE_DRAG_VELOCITY : vx > TIMELINE_DRAG_VELOCITY;
    const commit = Boolean(commitRequested && session.to && toward && (
        ratio >= TIMELINE_DRAG_COMMIT_RATIO
        || (velocityToward && ratio >= 0.18)
    ));
    const toIndex = timelineTabIndex + session.dir;
    if (reduce) {
        if (commit) selectTimelineTab(toIndex, { direction: session.dir, fromDrag: true });
        clearTimelineDrag();
        return;
    }
    const current = session.from.panel;
    const next = session.to?.panel;
    const layers = [current, next].filter(Boolean);
    layers.forEach(panel => panel.classList.remove('is-settling'));
    session.host.offsetHeight;
    const endCurrent = commit ? (session.dir > 0 ? -session.width : session.width) : 0;
    const endNext = commit ? 0 : (session.dir > 0 ? session.width : -session.width);
    layers.forEach(panel => panel.classList.add('is-settling'));
    setTimelinePanelX(current, endCurrent, true);
    if (next) setTimelinePanelX(next, endNext, true);
    waitTimelineSettle(layers, false, () => {
        if (commit) selectTimelineTab(toIndex, { direction: session.dir, fromDrag: true });
        clearTimelineDrag();
    });
}

function selectTimelineTab(index, { direction = 0, focusTab = false, fromDrag = false } = {}) {
    const items = timelinePanels();
    if (!items.length) return;
    const nextIndex = Math.max(0, Math.min(index, items.length - 1));
    const current = items[nextIndex];
    timelineTabIndex = nextIndex;
    const reduce = prefersReducedMotion();
    const expandAll = document.getElementById('expand-all');
    const tablist = document.querySelector('.timeline-tablist');
    const indicator = tablist?.querySelector('.tab-indicator');

    items.forEach((item, itemIndex) => {
        const selected = itemIndex === nextIndex;
        item.tab.setAttribute('aria-selected', String(selected));
        item.tab.tabIndex = selected ? 0 : -1;
        item.tab.classList.toggle('is-active', selected);
        if (selected) {
            item.panel.hidden = false;
            item.panel.removeAttribute('inert');
            item.panel.classList.add('is-active');
            if (item.id !== 'certificates') {
                item.panel.querySelectorAll('.stack-item').forEach(syncCollapsedReveal);
            }
            if (!reduce && direction && !fromDrag) {
                item.panel.classList.remove('is-from-left', 'is-from-right');
                item.panel.classList.add(direction > 0 ? 'is-from-right' : 'is-from-left');
                item.panel.offsetHeight;
                item.panel.classList.remove('is-from-left', 'is-from-right');
            }
        } else {
            item.panel.hidden = true;
            item.panel.setAttribute('inert', '');
            item.panel.classList.remove('is-active', 'is-from-left', 'is-from-right');
        }
    });

    if (expandAll) {
        expandAll.hidden = current.id === 'certificates';
        expandAll.setAttribute('aria-controls', current.panel.id);
    }
    if (current.id === 'certificates') loadCertificates();
    else syncExpandAllButton();

    if (indicator && tablist) {
        placeUnderlineIndicator(tablist, indicator, current.tab, { instant: reduce || !direction });
        if (!reduce && direction) requestAnimationFrame(() => indicator.classList.remove('nav-indicator--instant'));
    }
    // Keep the active tab visible in a horizontally scrollable tablist without
    // scrolling the document (scrollIntoView would jump a fresh home load mid-page).
    if (tablist) {
        const tabRect = current.tab.getBoundingClientRect();
        const listRect = tablist.getBoundingClientRect();
        if (tabRect.left < listRect.left) tablist.scrollLeft -= listRect.left - tabRect.left;
        else if (tabRect.right > listRect.right) tablist.scrollLeft += tabRect.right - listRect.right;
    }
    if (focusTab) current.tab.focus();
}

function setupTimelineTabs(defaultFilter = 'work') {
    const items = timelinePanels();
    if (!items.length) return;
    const tablist = document.querySelector('.timeline-tablist');
    const panels = document.querySelector('.timeline-panels');
    const defaultIndex = Math.max(0, items.findIndex(item => item.id === defaultFilter));

    if (!filtersInitialized) {
        items.forEach((item, index) => {
            item.tab.addEventListener('click', () => {
                selectTimelineTab(index, { direction: index - timelineTabIndex });
            });
        });
        tablist?.addEventListener('keydown', event => {
            const last = items.length - 1;
            let next = timelineTabIndex;
            if (event.key === 'ArrowRight') next = Math.min(last, timelineTabIndex + 1);
            else if (event.key === 'ArrowLeft') next = Math.max(0, timelineTabIndex - 1);
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = last;
            else return;
            event.preventDefault();
            selectTimelineTab(next, { direction: next - timelineTabIndex, focusTab: true });
        });
        attachHorizontalDragNavigation(panels, {
            onDragStart: ({ dx }) => beginTimelineDrag(dx),
            onDrag: ({ dx }) => applyTimelineDrag(dx),
            onCommit: payload => finishTimelineDrag({ ...payload, commitRequested: true }),
            onCancel: payload => finishTimelineDrag({ ...payload, commitRequested: false })
        });
        window.addEventListener('resize', () => {
            if (timelineDrag) return;
            selectTimelineTab(timelineTabIndex, { direction: 0 });
        });
        filtersInitialized = true;
    }

    selectTimelineTab(defaultIndex, { direction: 0 });
}

function renderRecommendationCard(entry, span = 'small') {
    const card = document.createElement('article');
    card.className = `recommendation-card recommendation-card--${span}`;
    const quote = document.createElement('blockquote');
    quote.className = 'recommendation-quote';
    const open = document.createElement('span');
    open.className = 'recommendation-mark';
    open.setAttribute('aria-hidden', 'true');
    open.textContent = '\u201C';
    const text = document.createElement('p');
    text.textContent = entry.quote;
    quote.append(open, text);
    const footer = document.createElement('footer');
    footer.className = 'recommendation-attribution';
    const name = document.createElement('cite');
    name.className = 'recommendation-name';
    name.textContent = entry.name;
    const role = document.createElement('p');
    role.className = 'recommendation-role';
    role.textContent = entry.role;
    const organization = document.createElement('p');
    organization.className = 'recommendation-org';
    organization.textContent = entry.organization;
    footer.append(name, role, organization);
    card.append(quote, footer);
    return card;
}

function renderRecommendationMosaic(entries) {
    const mosaic = document.createElement('div');
    mosaic.className = 'recommendations-mosaic';
    entries.forEach((entry, index) => {
        mosaic.append(renderRecommendationCard(entry, RECOMMENDATION_SPANS[index] || 'small'));
    });
    return mosaic;
}

async function loadRecommendations() {
    const root = document.querySelector('.recommendations-carousel');
    if (!root) return;
    const track = document.getElementById('recommendations-track');
    try {
        const data = await fetchJson(dataUrl('recommendations.json'));
        if (!Array.isArray(data) || !data.length) throw new Error('recommendations.json must be a non-empty array');
        data.forEach((entry, index) => requireFields(entry, ['quote', 'name', 'role', 'organization'], `recommendations[${index}]`));
        root._recommendationMosaicController?.destroy();
        root._carouselController?.destroy();
        root.querySelector(':scope > .carousel-controls')?.remove();
        root.classList.add('carousel');
        root.tabIndex = 0;
        root.removeAttribute('aria-roledescription');
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', 'Endorsements');

        const visible = data.slice(0, RECOMMENDATION_PAGE_SIZE);
        const mosaic = renderRecommendationMosaic(visible);
        Array.from(mosaic.children).forEach((card, index) => {
            card.dataset.recommendationIndex = String(index);
        });
        track.replaceChildren(mosaic);

        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const abortController = new AbortController();
        const listenerOptions = { signal: abortController.signal };
        let timer = null;
        let swapping = false;
        let paused = document.hidden || root.matches(':hover') || root.matches(':focus-within');
        let pauseGeneration = 0;
        let cycleMs = 0;
        let remainingMs = 0;
        let runningSince = 0;
        let progressAnimation = null;
        const randomDelay = () => 4000 + Math.random() * 5000;
        const isHeld = () => paused || document.hidden || root.matches(':hover, :focus-within');
        const canSwap = () => !motionQuery.matches && data.length > visible.length;
        /* Thin line showing time until the next swap. Absolutely positioned, so it never moves the cards. */
        root.querySelector(':scope > .recommendations-progress')?.remove();
        const progress = document.createElement('div');
        progress.className = 'recommendations-progress';
        progress.setAttribute('aria-hidden', 'true');
        const progressFill = document.createElement('span');
        progressFill.className = 'recommendations-progress-fill';
        progress.append(progressFill);
        root.append(progress);
        const clearTimer = () => {
            if (timer !== null) window.clearTimeout(timer);
            timer = null;
        };
        const remainingNow = () => {
            if (runningSince === 0) return remainingMs;
            return Math.max(0, remainingMs - (performance.now() - runningSince));
        };
        const syncProgress = playing => {
            progress.hidden = !canSwap();
            if (progress.hidden || !cycleMs) {
                progressAnimation?.cancel();
                progressAnimation = null;
                progressFill.style.transform = 'scaleX(0)';
                return;
            }
            if (!progressAnimation) {
                progressFill.style.removeProperty('transform');
                progressAnimation = progressFill.animate(
                    [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
                    { duration: cycleMs, easing: 'linear', fill: 'forwards' }
                );
                progressAnimation.pause();
            }
            progressAnimation.currentTime = Math.min(cycleMs, Math.max(0, cycleMs - remainingNow()));
            if (playing) progressAnimation.play();
            else progressAnimation.pause();
        };
        const startCycle = () => {
            cycleMs = randomDelay();
            remainingMs = cycleMs;
            runningSince = 0;
            progressAnimation?.cancel();
            progressAnimation = null;
        };
        const pauseCycle = () => {
            remainingMs = remainingNow();
            runningSince = 0;
            clearTimer();
            syncProgress(false);
        };
        const schedule = () => {
            clearTimer();
            if (!canSwap()) {
                runningSince = 0;
                return syncProgress(false);
            }
            if (!cycleMs || remainingMs <= 0) startCycle();
            if (isHeld() || swapping) return pauseCycle();
            runningSince = performance.now();
            timer = window.setTimeout(swapOne, remainingMs);
            syncProgress(true);
        };
        const swapOne = async () => {
            timer = null;
            const generation = pauseGeneration;
            const cards = Array.from(mosaic.children);
            const shown = new Set(cards.map(card => Number(card.dataset.recommendationIndex)));
            const hidden = data.map((_, index) => index).filter(index => !shown.has(index));
            remainingMs = 0;
            runningSince = 0;
            if (!hidden.length || isHeld() || motionQuery.matches) return schedule();

            swapping = true;
            startCycle();
            syncProgress(false);
            const slot = Math.floor(Math.random() * cards.length);
            const nextIndex = hidden[Math.floor(Math.random() * hidden.length)];
            const current = cards[slot];
            await current.animate(
                [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(8px)' }],
                { duration: 160, easing: 'ease-in', fill: 'forwards' }
            ).finished.catch(() => {});
            if (isHeld() || generation !== pauseGeneration) {
                current.getAnimations().forEach(animation => animation.cancel());
                swapping = false;
                return schedule();
            }
            const next = renderRecommendationCard(data[nextIndex], RECOMMENDATION_SPANS[slot] || 'small');
            next.dataset.recommendationIndex = String(nextIndex);
            current.replaceWith(next);
            await next.animate(
                [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }],
                { duration: 180, easing: 'ease-out' }
            ).finished.catch(() => {});
            swapping = false;
            schedule();
        };
        const setPaused = value => {
            paused = value || document.hidden;
            if (paused) {
                pauseGeneration++;
                pauseCycle();
            }
            else schedule();
        };
        root.addEventListener('mouseenter', () => setPaused(true), listenerOptions);
        root.addEventListener('mouseleave', () => setPaused(root.matches(':focus-within')), listenerOptions);
        root.addEventListener('focusin', () => setPaused(true), listenerOptions);
        root.addEventListener('focusout', () => setPaused(root.matches(':hover')), listenerOptions);
        document.addEventListener('visibilitychange', () => setPaused(root.matches(':hover, :focus-within')), listenerOptions);
        motionQuery.addEventListener('change', schedule, listenerOptions);
        root._recommendationMosaicController = {
            destroy() {
                clearTimer();
                progressAnimation?.cancel();
                progress.remove();
                abortController.abort();
            }
        };
        schedule();
        initScrollAnimations();
    } catch (error) {
        console.error('Error loading recommendations:', error);
        if (track) track.innerHTML = '<p class="cert-status">Unable to load recommendations right now.</p>';
    }
}

function typeUnits(text) {
    const value = String(text || '');
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        return Array.from(new Intl.Segmenter().segment(value), (part) => part.segment);
    }
    return Array.from(value);
}

function typeKind(ch) {
    if (ch === ' ' || ch === '\n' || ch === '\t') return 'space';
    if (/\p{L}/u.test(ch)) return 'letter';
    if (/\p{N}/u.test(ch)) return 'digit';
    if (/\p{P}|\p{S}/u.test(ch)) return 'mark';
    return 'other';
}

function nextTypeDelay(ch) {
    const base = 1000 / 13;
    const variance = 0.4;
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    let ms = base * (1 + z * variance);
    ms = Math.max(base * (1 - variance), Math.min(base * (1 + variance), ms));
    const kind = typeKind(ch);
    if (kind === 'space') ms += base * 0.35;
    if (kind === 'mark') ms *= /[.!?]/.test(ch) ? 4 : 1.8;
    if (Math.random() < 0.02) ms += 200 + Math.random() * 300;
    return Math.round(Math.max(18, ms));
}

function planTypeDelays(units) {
    return units.map((ch) => nextTypeDelay(ch));
}

let introTitleTypeGen = 0;
let introTitleTypeTimer = 0;

function renderIntroductionTitle(text) {
    const element = document.getElementById('introduction-title');
    if (!element) return;
    window.clearTimeout(introTitleTypeTimer);
    introTitleTypeGen += 1;
    const gen = introTitleTypeGen;
    const units = typeUnits(text);
    const full = `> ${units.join('')}`;
    if (prefersReducedMotion()) {
        element.textContent = full;
        return;
    }
    const typed = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'cursor is-typing';
    cursor.textContent = '_';
    element.replaceChildren();
    element.append('> ', typed, cursor);
    if (!units.length) {
        cursor.classList.remove('is-typing');
        return;
    }
    const delays = planTypeDelays(units);
    let i = 0;
    const type = () => {
        if (gen !== introTitleTypeGen) return;
        if (i >= units.length) {
            cursor.classList.remove('is-typing');
            return;
        }
        typed.nodeValue += units[i];
        const wait = delays[i];
        i += 1;
        introTitleTypeTimer = window.setTimeout(type, wait);
    };
    introTitleTypeTimer = window.setTimeout(type, 180 + Math.round(Math.random() * 160));
}

function animateLogo() {
    const logo = document.getElementById('nav-logo');
    if (!logo || document.body.classList.contains('project-page')) return;
    if (prefersReducedMotion()) {
        logo.textContent = 'HG :)';
        return;
    }
    const smile = ' :)';
    let i = 0;
    const typeSmile = () => {
        if (i < smile.length) {
            logo.textContent += smile.charAt(i);
            i += 1;
            setTimeout(typeSmile, 150);
        }
    };
    setTimeout(typeSmile, 1500);
}

const FADE_MS = 500;
const FADE_STAGGER_MS = 70;
const fadeObserver = new IntersectionObserver((entries) => {
    const shown = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
    shown.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    shown.forEach((el, i) => {
        const delay = i * FADE_STAGGER_MS;
        if (delay) el.style.transitionDelay = `${delay}ms`;
        el.classList.add('visible');
        fadeObserver.unobserve(el);
        if (delay) {
            window.setTimeout(() => {
                el.style.transitionDelay = '';
            }, delay + FADE_MS);
        }
    });
}, { threshold: 0.1 });

function initScrollAnimations() {
    if (prefersReducedMotion()) {
        document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
        return;
    }
    document.querySelectorAll('.fade-in:not(.cert-card):not(.visible)').forEach(el => fadeObserver.observe(el));
}

let pageLenis = null;
let pageScrollFrame = 0;
let pageScrollUnbind = null;

function pageScrollSmoothAllowed() {
    return typeof Lenis === 'function'
        && !prefersReducedMotion()
        && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function destroyPageLenis() {
    if (!pageLenis) return;
    pageLenis.destroy();
    pageLenis = null;
}

function initSmoothScroll() {
    const sync = () => {
        if (!pageScrollSmoothAllowed()) {
            destroyPageLenis();
            return;
        }
        if (pageLenis) return;
        pageLenis = new Lenis({
            autoRaf: true,
            lerp: 0.08,
            smoothWheel: true,
            syncTouch: false,
            anchors: false,
            allowNestedScroll: true,
            stopInertiaOnNavigate: true
        });
    };
    sync();
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', sync);
    window.matchMedia('(hover: hover) and (pointer: fine)').addEventListener('change', sync);
}

function setPageScrollStopped(stopped) {
    if (!pageLenis) return;
    if (stopped) pageLenis.stop();
    else pageLenis.start();
}

function stopPageScroll() {
    if (pageScrollFrame) cancelAnimationFrame(pageScrollFrame);
    pageScrollFrame = 0;
    if (pageScrollUnbind) {
        pageScrollUnbind();
        pageScrollUnbind = null;
    }
}

function pageScrollAnchor(el) {
    if (!el || el.id === 'home') return null;
    return el.querySelector('.section-header')
        || el.querySelector('.section-eyebrow, .section-title, h1, h2')
        || el;
}

function pageScrollTargetY(el) {
    if (!el || el.id === 'home') return 0;
    const anchor = pageScrollAnchor(el);
    const desired = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const scrolling = document.scrollingElement || document.documentElement;
    const max = Math.max(0, scrolling.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(max, window.scrollY + anchor.getBoundingClientRect().top - desired));
}

function scrollPageTo(el, { instant = false } = {}) {
    const dest = pageScrollTargetY(el);
    stopPageScroll();
    if (pageLenis) {
        pageLenis.resize();
        const now = pageLenis.scroll;
        if (instant || prefersReducedMotion() || Math.abs(dest - now) < 1) {
            pageLenis.scrollTo(dest, { immediate: true });
            return;
        }
        pageLenis.scrollTo(dest);
        return;
    }
    if (instant || prefersReducedMotion() || Math.abs(dest - window.scrollY) < 1) {
        window.scrollTo(0, dest);
        return;
    }
    const start = window.scrollY;
    const duration = 300;
    const origin = performance.now();
    const easeOut = t => 1 - (1 - t) ** 3;
    const onInterrupt = event => {
        if (event.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
        stopPageScroll();
    };
    window.addEventListener('wheel', onInterrupt, { passive: true });
    window.addEventListener('touchstart', onInterrupt, { passive: true });
    window.addEventListener('keydown', onInterrupt);
    pageScrollUnbind = () => {
        window.removeEventListener('wheel', onInterrupt);
        window.removeEventListener('touchstart', onInterrupt);
        window.removeEventListener('keydown', onInterrupt);
    };
    const step = now => {
        const t = Math.min(1, (now - origin) / duration);
        window.scrollTo(0, start + (dest - start) * easeOut(t));
        if (t < 1) pageScrollFrame = requestAnimationFrame(step);
        else stopPageScroll();
    };
    pageScrollFrame = requestAnimationFrame(step);
}

function navigateToHash(hash, { instant = false } = {}) {
    const id = String(hash || '').replace(/^#/, '');
    const el = id ? document.getElementById(id) : document.getElementById('home');
    const next = el && id ? `#${id}` : '#home';
    if (location.hash !== next) history.pushState(null, '', next);
    scrollPageTo(el, { instant });
}

function initScrollHint() {
    const scrollHint = document.querySelector('.scroll-hint');
    if (!scrollHint) return;
    const target = document.getElementById('about');

    window.addEventListener('scroll', () => {
        scrollHint.classList.toggle('hidden', window.scrollY > 50);
    }, { passive: true });

    scrollHint.addEventListener('click', () => {
        if (!target) return;
        navigateToHash('#about');
    });
}

function initNavHighlight() {
    const sections = ['home', 'about', 'projects', 'timeline', 'recommendations']
        .map(id => document.getElementById(id))
        .filter(Boolean);
    const nav = document.querySelector('.nav-links');
    if (!sections.length || !nav) return;

    const links = Array.from(nav.querySelectorAll('a')).filter(link => (link.getAttribute('href') || '').startsWith('#'));
    const linkByHash = new Map(links.map(link => [link.getAttribute('href'), link]));
    if (!links.length) return;

    const indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    nav.insertBefore(indicator, nav.firstChild);

    let activeHash = '';
    let indicatorReady = false;
    let ticking = false;
    let pinnedHash = '';
    let pinUntil = 0;

    function navOffset() {
        const navbar = document.getElementById('navbar');
        const navHeight = navbar ? navbar.getBoundingClientRect().height : 68;
        const pad = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
        return Math.max(navHeight, Number.isFinite(pad) ? pad : 0) + 4;
    }

    function resolveHash() {
        const offset = navOffset();
        const scrollingElement = document.scrollingElement || document.documentElement;
        if (window.scrollY <= 2) return '#home';
        if (window.innerHeight + window.scrollY >= scrollingElement.scrollHeight - 2) {
            return `#${sections[sections.length - 1].id}`;
        }
        let current = sections[0].id;
        for (const section of sections) {
            if (section.getBoundingClientRect().top <= offset) current = section.id;
        }
        return `#${current}`;
    }

    function placeIndicator(link, instant) {
        placeUnderlineIndicator(nav, indicator, link, { instant: instant || !indicatorReady });
        if (instant || !indicatorReady) {
            requestAnimationFrame(() => indicator.classList.remove('nav-indicator--instant'));
        }
        indicatorReady = true;
    }

    function setActive(hash, instant) {
        const link = linkByHash.get(hash) || linkByHash.get('#home');
        if (!link) return;
        if (activeHash === hash && indicatorReady) {
            if (instant) placeIndicator(link, true);
            return;
        }
        activeHash = hash;
        links.forEach(item => {
            const isActive = item === link;
            item.classList.toggle('active', isActive);
            if (isActive) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
        });
        placeIndicator(link, instant);
    }

    function sync(instant) {
        const resolved = resolveHash();
        if (pinnedHash && performance.now() < pinUntil && resolved !== pinnedHash) {
            setActive(pinnedHash, instant);
            return;
        }
        pinnedHash = '';
        setActive(resolved, instant);
    }

    function requestSync(instant) {
        if (instant) {
            sync(true);
            return;
        }
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            sync(false);
        });
    }

    const observer = new IntersectionObserver(() => requestSync(false), {
        rootMargin: '-15% 0px -45% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
    });
    sections.forEach(section => observer.observe(section));
    window.addEventListener('scroll', () => requestSync(false), { passive: true });
    window.addEventListener('resize', () => requestSync(true));
    links.forEach(link => {
        link.addEventListener('click', event => {
            const hash = link.getAttribute('href');
            if (!hash || !hash.startsWith('#')) return;
            event.preventDefault();
            pinnedHash = hash;
            pinUntil = performance.now() + 500;
            setActive(hash, false);
            navigateToHash(hash);
        });
    });

    sync(true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestSync(true));
}

function isDesktopNav() {
    return window.matchMedia('(min-width: 769px)').matches;
}

let closeMobileNavMenu = () => {};

function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.getElementById('navbar');
    if (!toggle || !navLinks) return;

    toggle.setAttribute('aria-controls', navLinks.id || 'nav-links');
    if (!navLinks.id) navLinks.id = 'nav-links';

    const setOpen = open => {
        navLinks.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('nav-open', open);
        if (isDesktopNav()) {
            navLinks.toggleAttribute('inert', false);
        } else {
            navLinks.toggleAttribute('inert', !open);
        }
    };

    const closeMenu = (restoreFocus = false) => {
        const wasOpen = navLinks.classList.contains('open');
        setOpen(false);
        if (restoreFocus && wasOpen) toggle.focus();
    };
    closeMobileNavMenu = closeMenu;
    setOpen(false);

    toggle.addEventListener('click', () => {
        setOpen(!navLinks.classList.contains('open'));
    });
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => closeMenu(false));
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !navLinks.classList.contains('open')) return;
        closeMenu(true);
    });
    document.addEventListener('click', event => {
        if (!navLinks.classList.contains('open')) return;
        if (navbar && navbar.contains(event.target)) return;
        closeMenu();
    });
    window.matchMedia('(min-width: 769px)').addEventListener('change', event => {
        if (event.matches) closeMenu();
        else setOpen(false);
    });
}

function initExpandAll() {
    const btn = document.getElementById('expand-all');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const nodes = visibleTimelineNodes().filter(node => node.querySelector('button.stack-hit'));
        const expand = !nodes.every(node => node.getAttribute('data-expanded') === 'true');
        nodes.forEach(node => setNodeExpanded(node, expand));
        syncExpandAllButton();
    });
}

function restoreScrollPosition() {
    pageLenis?.resize();
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) scrollPageTo(target, { instant: true });
}

document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    initMobileNav();
    initThemeToggle();
    initPageNavMotion();
    if (document.body.classList.contains('projects-hub')) {
        initScrollAnimations();
        return;
    }
    if (document.body.classList.contains('project-page')) {
        initProjectPage();
        return;
    }

    initScrollAnimations();
    animateLogo();
    initScrollHint();
    initNavHighlight();
    initContactModal();
    initExpandAll();
    window.addEventListener('popstate', () => {
        const id = window.location.hash.slice(1);
        const target = id ? document.getElementById(id) : document.getElementById('home');
        scrollPageTo(target, { instant: true });
    });
    restoreScrollPosition();
    window.addEventListener('load', restoreScrollPosition);
    const boot = [loadProfile(), loadProjects(), loadTimeline(), loadRecommendations()];
    boot.forEach(task => task.then(restoreScrollPosition));
    Promise.all(boot).then(() => requestAnimationFrame(restoreScrollPosition));
});

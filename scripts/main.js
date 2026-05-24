// --- Core Utilities ---

// Async-rendered content makes the browser's auto scroll restoration land
// against an empty layout on reload; restore manually once data is in.
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

const THEME_STORAGE_KEY = 'portfolio-theme';
const THEME_ICONS = {
    light: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.07-7.07-1.41 1.41M6.34 17.66l-1.41 1.41m14.14 0-1.41-1.41M6.34 6.34 4.93 4.93"></path></svg>',
    dark: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>'
};

function getSavedTheme() {
    try {
        const theme = localStorage.getItem(THEME_STORAGE_KEY);
        return theme === 'light' || theme === 'dark' ? theme : null;
    } catch (error) {
        return null;
    }
}

function getPreferredTheme() {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    if (activeTheme === 'light' || activeTheme === 'dark') return activeTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
}

function setTheme(theme, persist = false) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nextTheme === 'light' ? '#f6f8fa' : '#0d1117');

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

    setTheme(getSavedTheme() || getPreferredTheme());
    toggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        setTheme(currentTheme === 'light' ? 'dark' : 'light', true);
    });
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
        },
        'on and off': {
            label: 'On and off',
            className: 'node-period--intermittent',
            sortAsCurrent: true
        }
    };
    return statuses[normalized] || null;
}

function formatMonthYear(dateStr) {
    const status = getTimelineStatus(dateStr);
    if (status) return status.label;
    const d = parseDateObj(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getPeriodMeta(startStr, endStr) {
    const startFmt = formatMonthYear(startStr);
    const endFmt = formatMonthYear(endStr);
    const endStatus = getTimelineStatus(endStr);
    const text = startFmt === endFmt && !endStatus ? startFmt : `${startFmt} — ${endFmt}`;
    return {
        text,
        className: endStatus ? endStatus.className : ''
    };
}

const TYPE_PRIORITY = {
    project: 0,
    work: 1,
    education: 2
};

const CERT_CATEGORY_ORDER = [
    'AI & ML Engineering',
    'Platform & Infrastructure',
    'Professional Development',
    'Supporting Credentials'
];
const DEFAULT_CERT_CATEGORY = 'Supporting Credentials';
const TOGGLE_HTML = `<button type="button" class="node-toggle" aria-expanded="false"><span class="node-toggle-label">Details</span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>`;
const CERT_KIND_LABELS = {
    course: 'Course',
    internship: 'Internship',
    achievement: 'Achievement'
};

function getCertificateKind(cert) {
    const kind = String(cert.kind || '').trim().toLowerCase();
    return CERT_KIND_LABELS[kind] ? kind : 'course';
}

function renderCredentialButtons(credentials) {
    if (!credentials || !credentials.length) return '';
    const urls = credentials
        .map(cred => typeof cred === 'string' ? cred : cred && cred.url)
        .filter(Boolean);
    if (!urls.length) return '';
    return urls.map(url => `<a href="${url}" target="_blank" rel="noopener" class="btn btn-outline btn-tiny" title="Opens credential proof in a new tab">View Credentials</a>`).join('');
}



function setNodeExpanded(nodeEl, expanded) {
    nodeEl.setAttribute('data-expanded', String(expanded));
    const toggle = nodeEl.querySelector('.node-toggle');
    if (toggle) {
        toggle.setAttribute('aria-expanded', String(expanded));
        const label = toggle.querySelector('.node-toggle-label');
        if (label) label.textContent = expanded ? 'Collapse' : 'Details';
    }
}

function toggleNode(nodeEl) {
    setNodeExpanded(nodeEl, nodeEl.getAttribute('data-expanded') !== 'true');
}

let filtersInitialized = false;
let certificatesLoaded = false;

function renderCertificateCard(cert, isCore = false) {
    const classes = ['cert-card', 'fade-in'];
    if (isCore) classes.push('cert-card-core');
    const kind = getCertificateKind(cert);
    classes.push(`cert-card--${kind}`);
    const kindLabel = CERT_KIND_LABELS[kind];
    const meta = cert.issuer ? `<div class="cert-meta">${cert.issuer}</div>` : '';
    const description = cert.description ? `<p>${cert.description}</p>` : '';
    const link = cert.link ? `
        <a href="${cert.link}" target="_blank" class="cert-link btn btn-outline" rel="noopener" title="Opens credential proof in a new tab">
            View Credentials
        </a>
    ` : '';

    return `
        <article class="${classes.join(' ')}">
            <div>
                <div class="cert-kind">${kindLabel}</div>
                <h3>${cert.title}</h3>
                ${meta}
            </div>
            ${description}
            ${link}
        </article>
    `;
}

function renderCertificateSections(list, container, highlight = false) {
    if (!container) return;
    if (!list.length) {
        container.innerHTML = '';
        return;
    }
    const categoriesInData = Array.from(new Set(list.map(cert => cert.category || DEFAULT_CERT_CATEGORY)));
    const orderedCategories = [
        ...CERT_CATEGORY_ORDER.filter(cat => categoriesInData.includes(cat)),
        ...categoriesInData.filter(cat => !CERT_CATEGORY_ORDER.includes(cat))
    ];

    container.innerHTML = orderedCategories.map(category => {
        const items = list.filter(cert => (cert.category || DEFAULT_CERT_CATEGORY) === category);
        if (!items.length) return '';
        return `
            <section class="cert-category">
                <div class="cert-category-header">
                    <h3 class="cert-category-title">${category}</h3>
                </div>
                <div class="cert-grid">
                    ${items.map(cert => renderCertificateCard(cert, highlight && cert.importance === 'core')).join('')}
                </div>
            </section>
        `;
    }).join('');
}

// --- Data Fetching & Rendering ---

function hydrateAboutSection(profile) {
    const aboutData = profile.about || {};

    const bioEl = document.getElementById('about-bio');
    if (bioEl) {
        bioEl.textContent = aboutData.bio || profile.summary || 'Documenting bio soon.';
    }

    const highlightsEl = document.getElementById('about-highlights');
    if (highlightsEl) {
        const highlights = aboutData.highlights || [];
        highlightsEl.innerHTML = highlights.length
            ? highlights.map(item => `<li>${item}</li>`).join('')
            : '<li>Crafting new highlights. Stay tuned.</li>';
    }

    const focusEl = document.getElementById('about-focus');
    if (focusEl) {
        const focusItems = aboutData.focus || [];
        focusEl.innerHTML = focusItems.length
            ? focusItems.map(item => `<span class="about-chip">${item}</span>`).join('')
            : `<span class="about-chip">${profile.location || 'Remote-friendly'}</span>`;
    }

    const stackEl = document.getElementById('about-stack');
    if (stackEl) {
        const stackItems = aboutData.stack || [];
        stackEl.innerHTML = stackItems.length
            ? stackItems.map(item => `<span class="about-chip">${item}</span>`).join('')
            : '';
    }

    const availabilityEl = document.getElementById('about-availability');
    if (availabilityEl) {
        availabilityEl.textContent = aboutData.availability || `Based in ${profile.location || 'Singapore'}`;
    }

    const contactBtn = document.getElementById('about-contact');
    if (contactBtn) {
        contactBtn.textContent = profile.contact_cta || 'Say hello';
        if (profile.email) {
            contactBtn.href = `mailto:${profile.email}`;
            contactBtn.addEventListener('click', () => {
                const original = contactBtn.textContent;
                navigator.clipboard.writeText(profile.email).then(() => {
                    contactBtn.textContent = 'Copied!';
                    setTimeout(() => { contactBtn.textContent = original; }, 1500);
                }).catch(() => {});
            });
        }
    }
}

async function loadProfile() {
    try {
        const response = await fetch('./data/profile.json');
        if (!response.ok) throw new Error(`Profile fetch failed: ${response.status}`);

        const profile = await response.json();

        document.getElementById('hero-name').textContent = profile.name || 'Your Name';
        document.getElementById('hero-summary').textContent = profile.summary || 'No summary available yet.';
        document.getElementById('hero-resume').href = profile.resume_url || '#';
        document.getElementById('hero-github').href = (profile.socials && profile.socials.github) || '#';
        document.getElementById('hero-linkedin').href = (profile.socials && profile.socials.linkedin) || '#';

        typeWriter(profile.title || 'Your Title', 'hero-title');
        hydrateAboutSection(profile);
    } catch (error) {
        console.error("Error loading profile:", error);
        document.getElementById('hero-summary').textContent = 'Unable to load summary from profile.json. Check the console for details.';
    }
}

async function loadTimeline() {
    try {
        const response = await fetch('./data/timeline.json');
        let timelineData = await response.json();

        timelineData.sort((a, b) => {
            const typeDiff = (TYPE_PRIORITY[a.type] ?? 3) - (TYPE_PRIORITY[b.type] ?? 3);
            if (typeDiff !== 0) return typeDiff;

            const startA = parseDateObj(a.startDate).getTime();
            const startB = parseDateObj(b.startDate).getTime();
            if (startB !== startA) return startB - startA;
            // fallback to end date when start dates are identical
            return parseDateObj(b.endDate).getTime() - parseDateObj(a.endDate).getTime();
        });

        const container = document.getElementById('timeline-grid');
        container.innerHTML = '';

        timelineData.forEach(node => {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'timeline-node fade-in';
            nodeDiv.setAttribute('data-type', node.type);
            nodeDiv.setAttribute('data-expanded', 'false');

            const tagsHTML = node.tags ? node.tags.map(tech => `<span class="tech-tag">${tech}</span>`).join('') : '';
            const period = getPeriodMeta(node.startDate, node.endDate);
            const credentialHTML = renderCredentialButtons(node.credentials);

            if (node.type === 'project') {
                const logoHTML = node.logo ? `<img src="${node.logo}" alt="${node.title} logo" class="node-logo" loading="lazy">` : '';
                const entityInner = logoHTML
                    ? `<div class="node-entity-group">${logoHTML}<div class="node-entity">${node.title}</div></div>`
                    : `<div class="node-entity">${node.title}</div>`;

                let mediaLinks = '';
                if (node.media) {
                    if (node.media.github) mediaLinks += `<a href="${node.media.github}" target="_blank" class="btn btn-outline btn-tiny">GitHub</a>`;
                    if (node.media.demo) mediaLinks += `<a href="${node.media.demo}" target="_blank" class="btn btn-primary btn-tiny">Live Demo</a>`;
                    if (node.media.medium) mediaLinks += `<a href="${node.media.medium}" target="_blank" class="btn btn-outline btn-tiny">Blog</a>`;
                }
                if (node.slug) mediaLinks += `<a href="./projects/?slug=${node.slug}" class="btn btn-outline btn-tiny">Read more →</a>`;

                const allLinks = credentialHTML + mediaLinks;
                const descHTML = node.description ? `<p class="node-desc">${node.description}</p>` : '';
                const bulletsPart = node.points && node.points.length ? `<ul>${node.points.map(p => `<li>${p}</li>`).join('')}</ul>` : '';
                const bodyHTML = bulletsPart ? `<div class="node-body"><div class="sub-item">${bulletsPart}</div></div>` : '';
                const linksBarHTML = allLinks ? `<div class="node-links-bar">${allLinks}</div>` : '';
                const tagsEl = tagsHTML ? `<div class="node-tags">${tagsHTML}</div>` : '';

                nodeDiv.innerHTML = `
                    <div class="node-header">
                        ${entityInner}
                        <div class="node-period ${period.className}">${period.text}</div>
                    </div>
                    ${descHTML}
                    ${bodyHTML ? TOGGLE_HTML : ''}
                    ${bodyHTML}
                    ${linksBarHTML}
                    ${tagsEl}
                `;
            } else {
                const logoHTML = node.logo ? `<img src="${node.logo}" alt="${node.entity} logo" class="node-logo" loading="lazy">` : '';

                let hasBody = false;
                const rolesHTML = node.roles.map(role => {
                    const titleHTML = `<h4 class="sub-title">${role.title}</h4>`;
                    const descP = role.description ? `<p class="node-desc">${role.description}</p>` : '';
                    const subtitleH = role.subtitle ? `<h5 class="node-subtitle">${role.subtitle}</h5>` : '';
                    const bulletsU = role.points && role.points.length ? `<ul>${role.points.map(p => `<li>${p}</li>`).join('')}</ul>` : '';
                    const innerBody = subtitleH + bulletsU;
                    if (innerBody) hasBody = true;
                    const bodyHTML = innerBody ? `<div class="node-body"><div class="sub-item">${innerBody}</div></div>` : '';
                    return `<div class="timeline-role">${titleHTML}${descP}${bodyHTML}</div>`;
                }).join('');

                const linksBarHTML = credentialHTML ? `<div class="node-links-bar">${credentialHTML}</div>` : '';
                const tagsEl = tagsHTML ? `<div class="node-tags">${tagsHTML}</div>` : '';

                nodeDiv.innerHTML = `
                    <div class="node-header">
                        <div class="node-entity-group">
                            ${logoHTML}
                            <div class="node-entity">${node.entity}</div>
                        </div>
                        <div class="node-period ${period.className}">${period.text}</div>
                    </div>
                    ${rolesHTML}
                    ${hasBody ? TOGGLE_HTML : ''}
                    ${linksBarHTML}
                    ${tagsEl}
                `;
            }

            const toggleBtn = nodeDiv.querySelector('.node-toggle');
            if (toggleBtn) toggleBtn.addEventListener('click', () => toggleNode(nodeDiv));

            container.appendChild(nodeDiv);
        });

        setupFilters('project');
        initScrollAnimations();

    } catch (error) {
        console.error("Error loading timeline:", error);
    }
}

async function loadCertificates() {
    if (certificatesLoaded) return;
    certificatesLoaded = true;

    const timelineGrid = document.getElementById('timeline-grid');
    if (!timelineGrid) return;

    const panel = document.createElement('div');
    panel.id = 'cert-panel';

    const primaryGrid = document.createElement('div');
    primaryGrid.id = 'certificate-grid';

    const controls = document.createElement('div');
    controls.id = 'cert-controls';
    controls.className = 'cert-controls';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'cert-toggle';
    toggleBtn.className = 'cert-toggle';
    toggleBtn.setAttribute('aria-expanded', 'false');

    controls.appendChild(toggleBtn);

    const archiveGrid = document.createElement('div');
    archiveGrid.id = 'certificate-archive';
    archiveGrid.className = 'cert-archive';
    archiveGrid.hidden = true;

    panel.appendChild(primaryGrid);
    panel.appendChild(controls);
    panel.appendChild(archiveGrid);
    timelineGrid.appendChild(panel);

    try {
        const response = await fetch('./data/certificates.json');
        if (!response.ok) throw new Error(`Certificates fetch failed: ${response.status}`);
        const certificates = await response.json();

        if (!certificates.length) {
            primaryGrid.innerHTML = '<p class="cert-status">Certificates coming soon.</p>';
            return;
        }

        let featured = certificates.filter(cert => cert.importance === 'core');
        let archive = certificates.filter(cert => cert.importance !== 'core');

        if (!featured.length) {
            featured = certificates;
            archive = [];
        }

        renderCertificateSections(featured, primaryGrid, true);

        if (archive.length) {
            renderCertificateSections(archive, archiveGrid, false);
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.textContent = 'Show additional certificates';
            archiveGrid.hidden = true;
            controls.style.display = 'block';

            toggleBtn.addEventListener('click', () => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', String(!expanded));
                archiveGrid.hidden = expanded;
                toggleBtn.textContent = expanded ? 'Show additional certificates' : 'Hide additional certificates';
            });
        } else {
            toggleBtn.style.display = 'none';
            controls.style.display = 'none';
        }

        initScrollAnimations();
    } catch (error) {
        console.error('Error loading certificates:', error);
        primaryGrid.innerHTML = '<p class="cert-status">Unable to load certificates right now.</p>';
    }
}

// --- Interaction Logic ---

function updateFilterButtons(activeFilter) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        const isActive = btn.getAttribute('data-filter') === activeFilter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

function applyTimelineFilter(filterValue) {
    const nodes = document.querySelectorAll('.timeline-node');
    nodes.forEach(node => {
        node.style.display = filterValue && node.getAttribute('data-type') === filterValue ? 'block' : 'none';
    });
}

function setupFilters(defaultFilter = 'work') {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;

    if (!filtersInitialized) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterValue = btn.getAttribute('data-filter');
                const grid = document.getElementById('timeline-grid');
                const panel = document.getElementById('cert-panel');
                const expandAll = document.getElementById('expand-all');
                updateFilterButtons(filterValue);
                if (filterValue === 'certificates') {
                    applyTimelineFilter(null);
                    if (grid) grid.classList.add('showing-certs');
                    if (panel) panel.hidden = false;
                    if (expandAll) expandAll.hidden = true;
                    loadCertificates().then(scrollTimelineIntoView);
                } else {
                    if (panel) panel.hidden = true;
                    if (grid) grid.classList.remove('showing-certs');
                    applyTimelineFilter(filterValue);
                    if (expandAll) expandAll.hidden = false;
                    scrollTimelineIntoView();
                }
            });
        });
        filtersInitialized = true;
    }

    updateFilterButtons(defaultFilter);
    applyTimelineFilter(defaultFilter);
}

function typeWriter(text, elementId, speed = 40) {
    let i = 0;
    const element = document.getElementById(elementId);
    const cursor = element.querySelector('.cursor');

    function type() {
        if (i < text.length) {
            // Insert character before the cursor
            cursor.insertAdjacentText('beforebegin', text.charAt(i));
            i++;
            setTimeout(type, speed);
        }
    }
    setTimeout(type, 500);
}

function animateLogo() {
    const logo = document.getElementById('nav-logo');
    const smile = " :)";
    let i = 0;
    function typeSmile() {
        if (i < smile.length) {
            logo.innerHTML += smile.charAt(i);
            i++;
            setTimeout(typeSmile, 150);
        }
    }
    setTimeout(typeSmile, 1500);
}

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

function initScrollAnimations() {
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el => fadeObserver.observe(el));
}

function initScrollHint() {
    const scrollHint = document.querySelector('.scroll-hint');
    if (!scrollHint) return;

    window.addEventListener('scroll', () => {
        scrollHint.classList.toggle('hidden', window.scrollY > 50);
    }, { passive: true });

    const target = document.getElementById('about');
    scrollHint.addEventListener('click', () => {
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function initNavHighlight() {
    const sections = ['home', 'about', 'timeline']
        .map(id => document.getElementById(id))
        .filter(Boolean);
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'))
        .reduce((map, link) => {
            map.set(link.getAttribute('href'), link);
            return map;
        }, new Map());

    if (!sections.length || !navLinks.size) return;

    const defaultLink = navLinks.get('#home');
    if (defaultLink) defaultLink.classList.add('active');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetId = `#${entry.target.id}`;
                navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === targetId));
            }
        });
    }, {
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));
}

function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (!toggle || !navLinks) return;

    const closeMenu = () => {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => closeMenu());
    });
}

function initExpandAll() {
    const btn = document.getElementById('expand-all');
    if (!btn) return;
    let expanded = false;
    btn.addEventListener('click', () => {
        expanded = !expanded;
        document.querySelectorAll('.timeline-node').forEach(node => setNodeExpanded(node, expanded));
        btn.textContent = expanded ? 'Collapse all' : 'Expand all';
    });
}

// Filter switches change document height; re-anchor to the timeline top
// so freshly-filtered content does not jump under the viewport.
function scrollTimelineIntoView() {
    const section = document.getElementById('timeline');
    if (section) section.scrollIntoView({ block: 'start' });
}

// Honor a URL hash only after async content has rendered, so the target
// section is at its final height.
function restoreScrollPosition() {
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initThemeToggle();
    if (document.body.classList.contains('project-page')) return;

    initScrollAnimations();
    animateLogo();
    initScrollHint();
    initNavHighlight();
    initExpandAll();
    Promise.all([loadProfile(), loadTimeline()]).then(restoreScrollPosition);
});

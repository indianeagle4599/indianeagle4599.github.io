const THEME_STORAGE_KEY = 'portfolio-theme';
const THEME_ICONS = {
    light: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.07-7.07-1.41 1.41M6.34 17.66l-1.41 1.41m14.14 0-1.41-1.41M6.34 6.34 4.93 4.93"></path></svg>',
    dark: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>'
};
const SITE_ORIGIN = 'https://hiteshgoyal.me';
const PROJECT_SLUG_RE = /^[a-z0-9-]+$/i;
const SAFE_HREF_RE = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;
const CERT_KIND_LABELS = {
    course: 'Course',
    internship: 'Internship',
    achievement: 'Achievement'
};
const CHEVRON_HTML = `<span class="stack-chevron" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;
const PROJECTS_CAROUSEL_MS = 12000;

let filtersInitialized = false;
let certificatesLoaded = false;
let stackUid = 0;
let projectsCarouselTimer = null;
let projectsCarouselIndex = 1;
let projectsCarouselCount = 0;
let projectsCarouselAnimating = false;
let projectsCarouselHovered = false;
let projectsCarouselPointerActive = false;

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function dataUrl(file) {
    return document.body.classList.contains('project-page') ? `../data/${file}` : `./data/${file}`;
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

function getPreferredTheme() {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    if (activeTheme === 'light' || activeTheme === 'dark') return activeTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
}

function setTheme(theme, persist = false) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nextTheme === 'light' ? '#e9eef5' : '#080d18');

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
    const cleaned = src.replace(/^\.\//, '');
    return document.body.classList.contains('project-page') ? '../' + cleaned : './' + cleaned;
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

function renderTags(tags) {
    return (tags || []).map(tag => `<span class="tech-tag">${escapeHtml(tag)}</span>`).join('');
}

function renderLinks(links) {
    return (links || [])
        .filter(link => link && safeHref(link.url) && link.label)
        .map(link => {
            const href = safeHref(link.url);
            const kind = String(link.kind || '').toLowerCase();
            const cls = kind === 'demo' ? 'btn btn-primary btn-tiny' : 'btn btn-outline btn-tiny';
            const external = /^https?:\/\//i.test(href);
            const target = external ? ' target="_blank" rel="noopener"' : '';
            return `<a href="${escapeHtml(href)}"${target} class="${cls}">${escapeHtml(link.label)}</a>`;
        })
        .join('');
}

function renderCredentialButtons(credentials) {
    return (credentials || [])
        .filter(url => typeof url === 'string' && safeHref(url))
        .map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn-outline btn-tiny">View Credentials</a>`)
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

function setNodeExpanded(nodeEl, expanded) {
    nodeEl.setAttribute('data-expanded', String(expanded));
    const hit = nodeEl.querySelector('.stack-hit');
    if (hit) hit.setAttribute('aria-expanded', String(expanded));
}

function toggleNode(nodeEl) {
    setNodeExpanded(nodeEl, nodeEl.getAttribute('data-expanded') !== 'true');
    syncExpandAllButton();
}

function visibleTimelineNodes() {
    return Array.from(document.querySelectorAll('.timeline-node'))
        .filter(node => node.style.display !== 'none');
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

function renderCertificateCard(cert, isCore = false) {
    const classes = ['cert-card', 'fade-in'];
    if (isCore) classes.push('cert-card-core');
    const kind = getCertificateKind(cert);
    classes.push(`cert-card--${kind}`);
    const meta = cert.issuer ? `<div class="cert-meta">${escapeHtml(cert.issuer)}</div>` : '';
    const description = cert.description ? `<p>${escapeHtml(cert.description)}</p>` : '';
    const href = safeHref(cert.link);
    const link = href ? `
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="cert-link btn btn-outline">
            View Credentials
        </a>
    ` : '';

    return `
        <article class="${classes.join(' ')}">
            <div>
                <div class="cert-kind">${CERT_KIND_LABELS[kind]}</div>
                <h3>${escapeHtml(cert.title)}</h3>
                ${meta}
            </div>
            ${description}
            ${link}
        </article>
    `;
}

function renderCertificateSections(categories, container, include, highlight = false) {
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
                    ${items.map(cert => renderCertificateCard(cert, highlight && cert.importance === 'core')).join('')}
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
    return {
        slug: project.slug,
        title: project.title,
        logo: project.logo || '',
        logoTone: project.logoTone || '',
        featured: Boolean(project.featured),
        summary: project.summary || '',
        highlights: project.highlights || [],
        tags: project.tags || [],
        links: project.links || [],
        writeup: project.writeup || '',
        media: project.media || []
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
            const li = document.createElement('li');
            li.textContent = item;
            highlightsEl.appendChild(li);
        });
    }

    const focusEl = document.getElementById('about-focus');
    if (focusEl) {
        focusEl.replaceChildren();
        (aboutData.focus || []).forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'about-chip';
            chip.textContent = item;
            focusEl.appendChild(chip);
        });
    }

    const stackEl = document.getElementById('about-stack');
    if (stackEl) {
        stackEl.replaceChildren();
        (aboutData.stack || []).forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'about-chip';
            chip.textContent = item;
            stackEl.appendChild(chip);
        });
    }

    const availabilityEl = document.getElementById('about-availability');
    if (availabilityEl) {
        availabilityEl.textContent = [
            profile.location ? `Based in ${profile.location}.` : '',
            aboutData.availability || ''
        ].filter(Boolean).join(' ');
    }

    const contactBtn = document.getElementById('about-contact');
    if (contactBtn && profile.email) {
        contactBtn.href = `mailto:${profile.email}`;
    }
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

async function loadProfile() {
    try {
        const profile = await fetchJson(dataUrl('profile.json'));
        requireFields(profile, ['name'], 'profile');
        const nameEl = document.getElementById('introduction-name');
        const summaryEl = document.getElementById('introduction-summary');
        if (nameEl) nameEl.textContent = profile.name;
        if (summaryEl) summaryEl.textContent = profile.summary || '';
        setExternalHref('introduction-resume', profile.resume_url);
        setExternalHref('introduction-github', profile.socials && profile.socials.github);
        setExternalHref('introduction-linkedin', profile.socials && profile.socials.linkedin);
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
    const summaryDesc = firstRole.description ? `<p class="stack-summary">${escapeHtml(firstRole.description)}</p>` : '';
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
    const detailsInner = firstSubtitle + firstPoints + extraHTML;
    const footerHTML = renderStackFooter(tagsHTML, renderCredentialButtons(node.credentials) + renderLinks(node.links));
    const hasBody = Boolean(detailsInner.trim());
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
            ${summaryDesc}
        ${hitClose}
        ${hasBody ? `<div class="stack-body" id="${panelId}"><div class="stack-body-inner">${detailsInner}</div></div>` : ''}
        ${footerHTML}
    `;

    const hit = nodeDiv.querySelector('button.stack-hit');
    if (hit) hit.addEventListener('click', () => toggleNode(nodeDiv));
    return nodeDiv;
}

async function loadTimeline() {
    const container = document.getElementById('timeline-grid');
    if (!container) return;
    try {
        const timelineData = await fetchJson(dataUrl('timeline.json'));
        if (!Array.isArray(timelineData)) throw new Error('timeline.json must be an array');
        timelineData.forEach((node, index) => requireFields(node, ['type', 'entity', 'startDate'], `timeline[${index}]`));
        timelineData.sort(sortByRecency);
        container.replaceChildren();
        timelineData.forEach(node => container.appendChild(renderTimelineNode(node)));
        setupFilters('work');
        initScrollAnimations();
        syncExpandAllButton();
    } catch (error) {
        console.error('Error loading timeline:', error);
        container.innerHTML = '<p class="cert-status">Unable to load timeline right now.</p>';
    }
}

function renderProjectCard(project) {
    const logoHTML = logoImg(project.logo, 'project-card-logo', project.logoTone);
    const highlights = (project.highlights || []).slice(0, 3);
    const highlightsHTML = highlights.length
        ? `<ul class="project-card-highlights">${highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
    const detailsHref = `./projects/?slug=${encodeURIComponent(project.slug)}`;
    const detailsBtn = `<a href="${detailsHref}" class="btn btn-primary btn-tiny">Details</a>`;

    return `
        <article class="project-card">
            <div class="project-card-title-row">
                ${logoHTML}
                <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
            </div>
            ${project.summary ? `<p class="project-card-desc">${escapeHtml(project.summary)}</p>` : ''}
            ${highlightsHTML}
            <div class="node-tags">${renderTags(project.tags)}</div>
            <div class="node-links-bar">${renderLinks(project.links)}${detailsBtn}</div>
        </article>
    `;
}

function renderOtherProject(project) {
    const logoHTML = logoImg(project.logo, 'node-logo', project.logoTone);
    const highlights = (project.highlights || []).slice(0, 3);
    const highlightsHTML = highlights.length
        ? `<ul>${highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';
    const detailsHref = `./projects/?slug=${encodeURIComponent(project.slug)}`;
    const pageLink = `<a href="${detailsHref}" class="btn btn-outline btn-tiny">Project page</a>`;
    const footerHTML = renderStackFooter(renderTags(project.tags), renderLinks(project.links) + pageLink);
    const hasBody = Boolean(highlightsHTML);
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
                ${project.summary ? `<p class="stack-summary">${escapeHtml(project.summary)}</p>` : ''}
            ${hitClose}
            ${hasBody ? `<div class="stack-body" id="${panelId}"><div class="stack-body-inner">${highlightsHTML}</div></div>` : ''}
            ${footerHTML}
        </article>
    `;
}

function carouselStrip() {
    return document.querySelector('.projects-strip');
}

function carouselGap() {
    const strip = carouselStrip();
    if (!strip) return 0;
    return parseFloat(getComputedStyle(strip).columnGap) || 0;
}

function setCarouselOffset(animate) {
    const strip = carouselStrip();
    const track = document.getElementById('projects-track');
    if (!strip || !track) return;
    const offset = -(projectsCarouselIndex * (track.clientWidth + carouselGap()));
    strip.classList.toggle('is-jumping', !animate);
    strip.style.transform = `translate3d(${offset}px, 0, 0)`;
    if (!animate) {
        strip.offsetHeight;
        strip.classList.remove('is-jumping');
    }
}

function realCarouselIndex() {
    if (projectsCarouselCount < 1) return 0;
    if (projectsCarouselIndex === 0) return projectsCarouselCount - 1;
    if (projectsCarouselIndex === projectsCarouselCount + 1) return 0;
    return projectsCarouselIndex - 1;
}

function updateCarouselStatus() {
    const carousel = document.querySelector('.projects-carousel');
    const dots = document.getElementById('projects-dots');
    const active = realCarouselIndex();
    if (dots) {
        dots.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            const isActive = i === active;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    }
    if (carousel && projectsCarouselCount) {
        carousel.setAttribute('aria-label', `Showcase, slide ${active + 1} of ${projectsCarouselCount}`);
    }
}

function updateSlideInert() {
    const strip = carouselStrip();
    if (!strip) return;
    strip.querySelectorAll('.project-card').forEach((card, i) => {
        const visible = i === projectsCarouselIndex;
        card.setAttribute('aria-hidden', String(!visible));
        card.toggleAttribute('inert', !visible);
    });
}

function settleCarouselWrap() {
    if (!projectsCarouselCount) return;
    if (projectsCarouselIndex === projectsCarouselCount + 1) {
        projectsCarouselIndex = 1;
        setCarouselOffset(false);
    } else if (projectsCarouselIndex === 0) {
        projectsCarouselIndex = projectsCarouselCount;
        setCarouselOffset(false);
    }
    updateSlideInert();
    projectsCarouselAnimating = false;
}

function goCarousel(delta) {
    if (projectsCarouselAnimating || projectsCarouselCount < 2) return false;
    const reduceMotion = prefersReducedMotion();
    projectsCarouselAnimating = !reduceMotion;
    projectsCarouselIndex += delta;
    setCarouselOffset(!reduceMotion);
    updateCarouselStatus();
    if (reduceMotion) {
        settleCarouselWrap();
        return true;
    }
    window.setTimeout(() => {
        if (projectsCarouselAnimating) settleCarouselWrap();
    }, 500);
    return true;
}

function stopProjectsCarousel() {
    if (projectsCarouselTimer) {
        clearTimeout(projectsCarouselTimer);
        projectsCarouselTimer = null;
    }
}

function canAutoplayProjectsCarousel() {
    const carousel = document.querySelector('.projects-carousel');
    return Boolean(
        carousel
        && projectsCarouselCount > 1
        && !prefersReducedMotion()
        && !projectsCarouselHovered
        && !projectsCarouselPointerActive
        && !document.hidden
        && !carousel.contains(document.activeElement)
    );
}

function startProjectsCarousel() {
    stopProjectsCarousel();
    if (!canAutoplayProjectsCarousel()) return;
    projectsCarouselTimer = window.setTimeout(() => {
        projectsCarouselTimer = null;
        if (!canAutoplayProjectsCarousel()) return;
        goCarousel(1);
        startProjectsCarousel();
    }, PROJECTS_CAROUSEL_MS);
}

function navigateProjectsCarousel(delta) {
    if (!goCarousel(delta)) return false;
    startProjectsCarousel();
    return true;
}

function initProjectsCarousel(projects) {
    const carousel = document.querySelector('.projects-carousel');
    const controls = carousel?.querySelector('.carousel-controls');
    const track = document.getElementById('projects-track');
    const prev = document.getElementById('projects-prev');
    const next = document.getElementById('projects-next');
    const dots = document.getElementById('projects-dots');
    if (!carousel || !track) return;

    if (!projects.length) {
        track.innerHTML = '<p class="cert-status">No featured projects yet.</p>';
        return;
    }

    projectsCarouselCount = projects.length;
    projectsCarouselAnimating = false;
    if (controls) controls.hidden = projectsCarouselCount < 2;

    if (projectsCarouselCount > 1) {
        const first = renderProjectCard(projects[0]);
        const last = renderProjectCard(projects[projectsCarouselCount - 1]);
        const middle = projects.map(renderProjectCard).join('');
        track.innerHTML = `<div class="projects-strip">${last}${middle}${first}</div>`;
        projectsCarouselIndex = 1;
    } else {
        track.innerHTML = `<div class="projects-strip">${projects.map(renderProjectCard).join('')}</div>`;
        projectsCarouselIndex = 0;
    }
    track.querySelectorAll('a, img').forEach(element => {
        element.draggable = false;
    });
    setCarouselOffset(false);
    updateSlideInert();

    if (dots && projectsCarouselCount > 1) {
        dots.innerHTML = projects.map((project, i) => (
            `<button type="button" class="carousel-dot" aria-label="Show ${escapeHtml(project.title)}" aria-controls="projects-track"></button>`
        )).join('');
        dots.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.addEventListener('click', () => {
                if (projectsCarouselAnimating) return;
                const target = i + 1;
                if (target === projectsCarouselIndex) return;
                navigateProjectsCarousel(target - projectsCarouselIndex);
            });
        });
    }

    const strip = carouselStrip();
    if (strip) {
        strip.addEventListener('transitionend', event => {
            if (event.target !== strip || event.propertyName !== 'transform') return;
            settleCarouselWrap();
            updateCarouselStatus();
        });
    }

    if (prev) prev.addEventListener('click', () => navigateProjectsCarousel(-1));
    if (next) next.addEventListener('click', () => navigateProjectsCarousel(1));

    let pointerId = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerCaptureTarget = null;
    let suppressClick = false;

    const finishPointerGesture = (event, allowNavigation) => {
        if (event.pointerId !== pointerId) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        const dx = pointerX - pointerStartX;
        const dy = pointerY - pointerStartY;
        const isSwipe = allowNavigation && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy);

        if (pointerCaptureTarget?.hasPointerCapture(pointerId)) pointerCaptureTarget.releasePointerCapture(pointerId);
        pointerId = null;
        pointerCaptureTarget = null;
        projectsCarouselPointerActive = false;

        if (isSwipe && navigateProjectsCarousel(dx < 0 ? 1 : -1)) {
            suppressClick = true;
            window.setTimeout(() => {
                suppressClick = false;
            }, 500);
            return;
        }
        startProjectsCarousel();
    };

    track.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
        pointerId = event.pointerId;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        pointerX = event.clientX;
        pointerY = event.clientY;
        pointerCaptureTarget = event.target.closest?.('a, button') || track;
        projectsCarouselPointerActive = true;
        stopProjectsCarousel();
        pointerCaptureTarget.setPointerCapture(pointerId);
    });
    track.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerId) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
    });
    track.addEventListener('pointerup', event => {
        finishPointerGesture(event, true);
    });
    track.addEventListener('pointercancel', event => {
        finishPointerGesture(event, false);
    });
    track.addEventListener('dragstart', event => {
        event.preventDefault();
    });
    track.addEventListener('click', event => {
        if (!suppressClick) return;
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
    }, true);

    carousel.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        projectsCarouselHovered = true;
        stopProjectsCarousel();
    });
    carousel.addEventListener('pointerleave', event => {
        if (event.pointerType === 'touch') return;
        projectsCarouselHovered = false;
        startProjectsCarousel();
    });
    carousel.addEventListener('focusin', stopProjectsCarousel);
    carousel.addEventListener('focusout', event => {
        if (carousel.contains(event.relatedTarget)) return;
        startProjectsCarousel();
    });
    carousel.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            navigateProjectsCarousel(-1);
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            navigateProjectsCarousel(1);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopProjectsCarousel();
        else startProjectsCarousel();
    });
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', startProjectsCarousel);
    window.addEventListener('resize', () => setCarouselOffset(false));
    updateCarouselStatus();
    startProjectsCarousel();
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
            otherList.querySelectorAll('button.stack-hit').forEach(hit => {
                hit.addEventListener('click', () => toggleNode(hit.closest('.stack-item')));
            });
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

function youtubeEmbedUrl(url) {
    const match = String(url || '').match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{6,})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : '';
}

function renderProjectMedia(project) {
    const items = (project.media || []).filter(item => item && item.src);
    const section = document.getElementById('project-media');
    const grid = document.getElementById('project-media-grid');
    if (!section || !grid || !items.length) return false;

    grid.innerHTML = items.map(item => {
        const src = assetUrl(item.src || '');
        const caption = item.caption || '';
        const alt = caption || project.title;
        let body = '';
        if (item.type === 'video') {
            const embed = youtubeEmbedUrl(item.src);
            body = embed
                ? `<iframe class="project-demo-frame" src="${escapeHtml(embed)}" title="${escapeHtml(alt)}" allowfullscreen loading="lazy"></iframe>`
                : `<video class="project-demo-frame" src="${escapeHtml(src)}" controls preload="metadata"></video>`;
        } else {
            body = `<img class="project-demo-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
        }
        return `
            <figure class="project-demo-figure${item.type === 'video' ? ' project-demo-figure--frame' : ''}">
                ${body}
                ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
            </figure>
        `;
    }).join('');

    section.hidden = false;
    return true;
}

function updateProjectSeo(project, slug) {
    const title = `${project.title} | Hitesh Goyal`;
    const description = project.summary || 'Project detail page for Hitesh Goyal.';
    const url = `${SITE_ORIGIN}/projects/?slug=${slug}`;
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', url);
    const firstMedia = (project.media || []).find(item => item && item.src);
    const ogImageSrc = (firstMedia && firstMedia.src) || project.logo || 'assets/hg-logo.svg';
    let ogImage = document.head.querySelector('meta[property="og:image"]');
    if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', absoluteUrl(ogImageSrc));
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
        tagsEl.innerHTML = renderTags(project.tags);
        tagsEl.hidden = !tagsEl.innerHTML;
    }

    const linksEl = document.getElementById('project-links');
    if (linksEl) {
        linksEl.innerHTML = renderLinks(project.links);
        linksEl.hidden = !linksEl.innerHTML;
    }
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

async function initProjectPage() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug || !PROJECT_SLUG_RE.test(slug)) {
        window.location.replace('../index.html#projects');
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
        window.location.replace('../index.html#projects');
        return;
    }

    updateProjectSeo(project, slug);
    renderProjectIntroduction(project);

    const hasWriteup = Boolean(project.writeup.trim());
    const hasMedia = renderProjectMedia(project);
    const writeupSection = document.getElementById('project-writeup-section');
    if (hasWriteup) {
        document.getElementById('project-writeup').innerHTML = renderMarkdown(project.writeup);
        writeupSection.hidden = false;
    } else if (writeupSection) {
        writeupSection.hidden = true;
    }

    if (!hasWriteup && !hasMedia) {
        document.getElementById('project-coming-soon').hidden = false;
    }
}

async function loadCertificates() {
    const timelineGrid = document.getElementById('timeline-grid');
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
            <div id="certificate-archive" class="cert-archive" hidden></div>
        `;
        timelineGrid.appendChild(panel);
    }

    const primaryGrid = document.getElementById('certificate-grid');
    const controls = document.getElementById('cert-controls');
    const toggleBtn = document.getElementById('cert-toggle');
    const archiveGrid = document.getElementById('certificate-archive');

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

        renderCertificateSections(categories, primaryGrid, isFeatured, true);
        revealCertificateCards(primaryGrid);

        if (certificates.some(isArchived)) {
            renderCertificateSections(categories, archiveGrid, isArchived, false);
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.textContent = 'Show additional certificates';
            archiveGrid.hidden = true;
            controls.style.display = 'block';
            toggleBtn.onclick = () => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', String(!expanded));
                archiveGrid.hidden = expanded;
                if (!expanded) revealCertificateCards(archiveGrid);
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

function updateFilterButtons(activeFilter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-filter') === activeFilter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

function applyTimelineFilter(filterValue) {
    document.querySelectorAll('.timeline-node').forEach(node => {
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
                const panel = document.getElementById('cert-panel');
                const expandAll = document.getElementById('expand-all');
                updateFilterButtons(filterValue);
                if (filterValue === 'certificates') {
                    applyTimelineFilter(null);
                    if (panel) panel.hidden = false;
                    if (expandAll) expandAll.hidden = true;
                    loadCertificates();
                } else {
                    if (panel) panel.hidden = true;
                    applyTimelineFilter(filterValue);
                    if (expandAll) expandAll.hidden = false;
                    syncExpandAllButton();
                }
            });
        });
        filtersInitialized = true;
    }

    updateFilterButtons(defaultFilter);
    applyTimelineFilter(defaultFilter);
}

function renderIntroductionTitle(text) {
    const element = document.getElementById('introduction-title');
    if (!element) return;
    if (prefersReducedMotion()) {
        element.textContent = `> ${text}`;
        return;
    }
    const cursor = element.querySelector('.cursor');
    if (!cursor) {
        element.textContent = `> ${text}`;
        return;
    }
    let i = 0;
    const type = () => {
        if (i < text.length) {
            cursor.insertAdjacentText('beforebegin', text.charAt(i));
            i += 1;
            setTimeout(type, 40);
        }
    };
    setTimeout(type, 500);
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

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
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

function initScrollHint() {
    const scrollHint = document.querySelector('.scroll-hint');
    if (!scrollHint) return;
    const target = document.getElementById('about');

    window.addEventListener('scroll', () => {
        scrollHint.classList.toggle('hidden', window.scrollY > 50);
    }, { passive: true });

    scrollHint.addEventListener('click', () => {
        if (!target) return;
        target.scrollIntoView({
            behavior: prefersReducedMotion() ? 'instant' : 'smooth',
            block: 'start'
        });
    });
}

function initNavHighlight() {
    const sections = ['home', 'about', 'projects', 'timeline']
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

function isDesktopNav() {
    return window.matchMedia('(min-width: 769px)').matches;
}

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
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initThemeToggle();
    if (document.body.classList.contains('project-page')) {
        initProjectPage();
        return;
    }

    initScrollAnimations();
    animateLogo();
    initScrollHint();
    initNavHighlight();
    initExpandAll();
    Promise.all([loadProfile(), loadProjects(), loadTimeline()]).then(restoreScrollPosition);
});

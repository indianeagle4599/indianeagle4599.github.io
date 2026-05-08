// --- Core Utilities ---

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
    return `
        <div class="node-credentials">
            ${urls.map(url => `
                <a href="${url}" target="_blank" rel="noopener" class="btn btn-outline btn-tiny" title="Opens credential proof in a new tab">
                    View Credentials
                </a>
            `).join('')}
        </div>
    `;
}

// Helper to generate dynamic content blocks (Description, Subtitle, Points)
function generateContentHTML(item) {
    let html = '';
    if (item.description) {
        html += `<p style="margin-bottom: 12px; font-size: 0.95rem; color: var(--text-main);">${item.description}</p>`;
    }
    if (item.subtitle) {
        html += `<h5 style="color: var(--text-main); margin-top: 15px; margin-bottom: 8px; font-size: 1rem; font-weight: 600;">${item.subtitle}</h5>`;
    }
    if (item.points && item.points.length > 0) {
        html += `<ul>${item.points.map(p => `<li>${p}</li>`).join('')}</ul>`;
    }
    return html;
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
        }
    }
}

async function loadProfile() {
    try {
        const response = await fetch('./data/profile.json');
        if (!response.ok) throw new Error(`Profile fetch failed: ${response.status}`);

        const profile = await response.json();

        document.title = `${profile.name || 'My Portfolio'} | Portfolio`;
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

            const tagsHTML = node.tags ? node.tags.map(tech => `<span class="tech-tag">${tech}</span>`).join('') : '';
            const tagsBlock = tagsHTML ? `<div style="margin-top: 10px;">${tagsHTML}</div>` : '';
            const period = getPeriodMeta(node.startDate, node.endDate);
            const credentialHTML = renderCredentialButtons(node.credentials);

            if (node.type === 'project') {
                let mediaLinks = '';
                if (node.media) {
                    if (node.media.github) mediaLinks += `<a href="${node.media.github}" target="_blank" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem;">GitHub</a>`;
                    if (node.media.demo) mediaLinks += `<a href="${node.media.demo}" target="_blank" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;">Live Demo</a>`;
                    if (node.media.medium) mediaLinks += `<a href="${node.media.medium}" target="_blank" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem;">Blog</a>`;
                }

                // Pass the node directly to the content generator
                const contentHTML = generateContentHTML(node);

                nodeDiv.innerHTML = `
                    <div class="node-header">
                        <div class="node-entity" style="color: var(--proj-color);">${node.title}</div>
                        <div class="node-period ${period.className}">${period.text}</div>
                    </div>
                    <div class="sub-item">
                        ${contentHTML}
                        ${credentialHTML}
                        ${mediaLinks ? `<div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">${mediaLinks}</div>` : ''}
                    </div>
                    ${tagsBlock}
                `;
            } else {
                const logoHTML = node.logo ? `<img src="${node.logo}" alt="${node.entity} logo" class="node-logo" loading="lazy">` : '';

                // Pass each role to the content generator
                const rolesHTML = node.roles.map((role, index) => `
                    <div class="sub-item">
                        <h4 class="sub-title">${role.title}</h4>
                        ${generateContentHTML(role)}
                        ${index === 0 ? `${credentialHTML}` : ''}
                    </div>
                `).join('');

                nodeDiv.innerHTML = `
                    <div class="node-header" style="align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            ${logoHTML}
                            <div class="node-entity">${node.entity}</div>
                        </div>
                        <div class="node-period ${period.className}">${period.text}</div>
                    </div>
                    <div class="node-items-container">
                        ${rolesHTML}
                    </div>
                    ${tagsBlock}
                `;
            }
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
    const primaryGrid = document.getElementById('certificate-grid');
    const archiveGrid = document.getElementById('certificate-archive');
    const toggleBtn = document.getElementById('cert-toggle');
    const controls = document.getElementById('cert-controls');
    if (!primaryGrid) return;
    try {
        const response = await fetch('./data/certificates.json');
        if (!response.ok) throw new Error(`Certificates fetch failed: ${response.status}`);
        const certificates = await response.json();

        if (!certificates.length) {
            primaryGrid.innerHTML = '<p style="color: var(--text-muted);">Certificates coming soon.</p>';
            return;
        }

        let featured = certificates.filter(cert => cert.importance === 'core');
        let archive = certificates.filter(cert => cert.importance !== 'core');

        if (!featured.length) {
            featured = certificates;
            archive = [];
        }

        renderCertificateSections(featured, primaryGrid, true);

        if (archive.length && archiveGrid && toggleBtn) {
            renderCertificateSections(archive, archiveGrid, false);
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.textContent = 'Show additional certificates';
            toggleBtn.setAttribute('aria-expanded', 'false');
            archiveGrid.hidden = true;
            if (controls) controls.style.display = 'block';

            toggleBtn.addEventListener('click', () => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', String(!expanded));
                archiveGrid.hidden = expanded;
                toggleBtn.textContent = expanded ? 'Show additional certificates' : 'Hide additional certificates';
            });
        } else {
            if (toggleBtn) toggleBtn.style.display = 'none';
            if (controls) controls.style.display = 'none';
        }

        initScrollAnimations();
    } catch (error) {
        console.error('Error loading certificates:', error);
        primaryGrid.innerHTML = '<p style="color: var(--text-muted);">Unable to load certificates right now.</p>';
    }
}

function initCertificateLoader() {
    const certificatesSection = document.getElementById('certificates');
    if (!certificatesSection) return;

    if (!('IntersectionObserver' in window)) {
        loadCertificates();
        return;
    }

    const certObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadCertificates();
                observer.disconnect();
            }
        });
    }, { rootMargin: '0px 0px -20% 0px' });

    certObserver.observe(certificatesSection);
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
        node.style.display = node.getAttribute('data-type') === filterValue ? 'block' : 'none';
    });
}

function setupFilters(defaultFilter = 'work') {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;

    if (!filtersInitialized) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterValue = btn.getAttribute('data-filter');
                updateFilterButtons(filterValue);
                applyTimelineFilter(filterValue);
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

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el => observer.observe(el));
}

function initAutoScroll() {
    const sections = Array.from(document.querySelectorAll('header[id], section[id]'));
    const scrollHint = document.querySelector('.scroll-hint');
    let isAutoScrolling = false;
    const NAV_OFFSET = 90;
    let lastScrollY = window.scrollY;
    let scrollDirection = 'down';

    if (!sections.length) return;

    window.addEventListener('scroll', () => {
        if (scrollHint) {
            if (window.scrollY > 50) {
                scrollHint.classList.add('hidden');
            } else {
                scrollHint.classList.remove('hidden');
            }
        }
        const current = window.scrollY;
        if (current > lastScrollY + 5) {
            scrollDirection = 'down';
        } else if (current < lastScrollY - 5) {
            scrollDirection = 'up';
        }
        lastScrollY = current;
    }, { passive: true });

    if (!window.matchMedia('(max-width: 768px)').matches) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isAutoScrolling) {
                    const targetTop = entry.target.offsetTop - NAV_OFFSET;
                    const distance = Math.abs(window.scrollY - targetTop);
                    if (distance < 5) return;
                    const desiredDirection = targetTop > window.scrollY ? 'down' : 'up';
                    if (desiredDirection !== scrollDirection) return;
                    isAutoScrolling = true;
                    window.scrollTo({
                        top: targetTop,
                        behavior: 'smooth'
                    });
                    setTimeout(() => {
                        isAutoScrolling = false;
                    }, 800);
                }
            });
        }, { threshold: 0.4 });

        sections.forEach(section => observer.observe(section));
    }

    if (scrollHint) {
        const timelineSection = document.getElementById('timeline');
        scrollHint.addEventListener('click', () => {
            if (!timelineSection) return;
            window.scrollTo({
                top: timelineSection.offsetTop - NAV_OFFSET,
                behavior: 'smooth'
            });
        });
    }
}

function initNavHighlight() {
    const sections = ['home', 'about', 'timeline', 'certificates']
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

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    loadProfile();
    loadTimeline();
    animateLogo();
    initAutoScroll();
    initNavHighlight();
    initMobileNav();
    initCertificateLoader();
});

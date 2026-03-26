// --- Core Utilities ---

function parseDateObj(dateStr) {
    if (!dateStr || dateStr.toLowerCase() === 'present') return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
    return new Date(0);
}

function formatMonthYear(dateStr) {
    if (!dateStr || dateStr.toLowerCase() === 'present') return 'Present';
    const d = parseDateObj(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getPeriodString(startStr, endStr) {
    const startFmt = formatMonthYear(startStr);
    const endFmt = formatMonthYear(endStr);
    if (startFmt === endFmt && startFmt !== 'Present') return startFmt;
    return `${startFmt} — ${endFmt}`;
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

// --- Data Fetching & Rendering ---

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
            const periodString = getPeriodString(node.startDate, node.endDate);

            if (node.type === 'project') {
                let mediaLinks = '';
                if (node.media) {
                    if (node.media.github) mediaLinks += `<a href="${node.media.github}" target="_blank" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem;">GitHub</a>`;
                    if (node.media.demo) mediaLinks += `<a href="${node.media.demo}" target="_blank" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;">Live Demo</a>`;
                }

                // Pass the node directly to the content generator
                const contentHTML = generateContentHTML(node);

                nodeDiv.innerHTML = `
                    <div class="node-header">
                        <div class="node-entity" style="color: var(--proj-color);">${node.title}</div>
                        <div class="node-period">${periodString}</div>
                    </div>
                    <div class="sub-item">
                        ${contentHTML}
                        <div style="margin-top: 10px;">${tagsHTML}</div>
                        ${mediaLinks ? `<div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">${mediaLinks}</div>` : ''}
                    </div>
                `;
            } else {
                const logoHTML = node.logo ? `<img src="${node.logo}" alt="${node.entity} logo" class="node-logo">` : '';

                // Pass each role to the content generator
                const rolesHTML = node.roles.map(role => `
                    <div class="sub-item">
                        <h4 class="sub-title">${role.title}</h4>
                        ${generateContentHTML(role)}
                    </div>
                `).join('');

                nodeDiv.innerHTML = `
                    <div class="node-header" style="align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            ${logoHTML}
                            <div class="node-entity">${node.entity}</div>
                        </div>
                        <div class="node-period">${periodString}</div>
                    </div>
                    <div class="node-items-container">
                        ${rolesHTML}
                        ${tagsHTML ? `<div style="margin-top: 10px;">${tagsHTML}</div>` : ''}
                    </div>
                `;
            }
            container.appendChild(nodeDiv);
        });

        setupFilters();
        initScrollAnimations();

    } catch (error) {
        console.error("Error loading timeline:", error);
    }
}

// --- Interaction Logic ---

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const nodes = document.querySelectorAll('.timeline-node');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            nodes.forEach(n => {
                n.style.display = (filterValue === 'all' || n.getAttribute('data-type') === filterValue) ? 'block' : 'none';
            });
        });
    });
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
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

function initAutoScroll() {
    const timelineSection = document.getElementById('timeline');
    const scrollHint = document.querySelector('.scroll-hint');
    let isAutoScrolling = false;

    // Fade out the arrow immediately upon gentle scroll
    window.addEventListener('scroll', () => {
        if (scrollHint) {
            if (window.scrollY > 50) {
                scrollHint.classList.add('hidden');
            } else {
                scrollHint.classList.remove('hidden');
            }
        }
    }, { passive: true });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Trigger native smooth scroll if we scroll into view and aren't locked
            if (entry.isIntersecting && !isAutoScrolling) {
                isAutoScrolling = true;

                window.scrollTo({
                    top: timelineSection.offsetTop - 90, // Navbar offset
                    behavior: 'smooth'
                });

                // Release the scroll lock after standard smooth scroll duration (~800ms)
                setTimeout(() => {
                    isAutoScrolling = false;
                }, 800);
            }
        });
    }, { threshold: 0.1 });

    if (timelineSection) observer.observe(timelineSection);

    // Make scroll hint clickable to manually trigger
    if (scrollHint) {
        scrollHint.addEventListener('click', () => {
            window.scrollTo({
                top: timelineSection.offsetTop - 90,
                behavior: 'smooth'
            });
        });
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadTimeline();
    animateLogo();
    initAutoScroll();
});
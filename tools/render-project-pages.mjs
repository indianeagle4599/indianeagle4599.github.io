import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ProjectSeo = require('../scripts/project-seo.js');

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const shellPath = join(root, 'projects', 'index.html');
const homePath = join(root, 'index.html');
const LASTMOD = '2026-10-30';
const HUB_TITLE = 'AI, speech and computer vision projects | Hitesh Goyal';
const HUB_DESCRIPTION = 'AI and machine learning projects by Hitesh Goyal across speech recognition, computer vision, LLM pipelines, retrieval, research and developer tools.';

const HUB_TOPICS = [
    { id: 'speech-asr', title: 'Speech & ASR', linkLabel: 'More Speech & ASR projects' },
    { id: 'computer-vision', title: 'Computer vision', linkLabel: 'More computer vision projects' },
    { id: 'llm-retrieval', title: 'LLM & retrieval', linkLabel: 'More LLM & retrieval projects' },
    { id: 'research', title: 'Research', linkLabel: 'More research projects' },
    { id: 'tools-apps', title: 'Tools & apps', linkLabel: 'More tools & apps' }
];

const PRIORITY = {
    audiobench: '0.8',
    'ask-krishna': '0.7',
    'media-search-engine': '0.7',
    flodoro: '0.7',
    'lazy-resume': '0.6',
    'ai-generated-image-classifier': '0.6',
    pixtyle: '0.6',
    'fuzzy-hybrid-stock-trading': '0.6',
    'os-toolkit': '0.6'
};

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function jsonForScript(value) {
    return JSON.stringify(value, null, 4).replace(/</g, '\\u003c');
}

function relatedHtml(project, projectMap) {
    const related = (Array.isArray(project.relatedProjects) ? project.relatedProjects : [])
        .map(slug => projectMap.get(slug))
        .filter(Boolean);
    const topic = HUB_TOPICS.find(item => item.id === project.hubTopic);
    if (!related.length || !topic) return '';
    const links = related
        .map(item => `                <a href="/projects/${escapeHtml(item.slug)}/" class="btn btn-outline btn-tiny">${escapeHtml(item.title)}</a>`)
        .concat(`                <a href="/projects/#${topic.id}" class="btn btn-outline btn-tiny">${escapeHtml(topic.linkLabel)}</a>`)
        .join('\n');
    return `
        <section class="section project-writeup-section" aria-labelledby="related-projects-title">
            <div class="project-writeup">
                <h2 id="related-projects-title">Related projects</h2>
                <div class="node-links-bar">
${links}
                </div>
            </div>
        </section>
`;
}

function pageHtml(project, seo, projectMap) {
    const summary = escapeHtml(project.summary || '');
    const imageDimensions = seo.imageWidth
        ? `    <meta property="og:image:width" content="${seo.imageWidth}">\n    <meta property="og:image:height" content="${seo.imageHeight}">\n`
        : '';
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}">
    <meta name="author" content="Hitesh Goyal">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#000000">
    <link rel="canonical" href="${escapeHtml(seo.url)}">

    <link rel="icon" type="image/svg+xml" href="/assets/hg-logo.svg">
    <link rel="apple-touch-icon" href="/assets/hg-logo.svg">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Hitesh Goyal">
    <meta property="og:title" content="${escapeHtml(seo.title)}">
    <meta property="og:description" content="${escapeHtml(seo.description)}">
    <meta property="og:url" content="${escapeHtml(seo.url)}">
    <meta property="og:image" content="${escapeHtml(seo.image)}">
${imageDimensions}    <meta property="og:image:alt" content="${escapeHtml(seo.imageAlt)}">

    <meta name="twitter:card" content="${escapeHtml(seo.twitterCard)}">
    <meta name="twitter:title" content="${escapeHtml(seo.title)}">
    <meta name="twitter:description" content="${escapeHtml(seo.description)}">
    <meta name="twitter:image" content="${escapeHtml(seo.image)}">
    <meta name="twitter:image:alt" content="${escapeHtml(seo.imageAlt)}">

    <script>
        (function () {
            let stored = null;
            try {
                stored = localStorage.getItem('portfolio-theme');
            } catch (error) {}
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = stored === 'light' || stored === 'dark'
                ? stored
                : prefersDark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            /* Keep #f4f4f2 / #000000 equal to --bg-page in style.css. */
            document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'light' ? '#f4f4f2' : '#000000');
            try {
                if (sessionStorage.getItem('portfolio-page-motion') === '1') {
                    document.documentElement.classList.add('is-page-entering');
                    sessionStorage.removeItem('portfolio-page-motion');
                }
            } catch (error) {}
        }());
    </script>
    <link rel="stylesheet" href="/style.css">

    <script type="application/ld+json" id="project-jsonld">
    ${jsonForScript(seo.jsonLd)}
    </script>
</head>

<body class="project-page">
    <nav id="navbar" aria-label="Primary">
        <div class="nav-content">
            <a id="nav-logo" class="logo" href="/">HG :)</a>
            <button id="nav-toggle" class="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <div id="nav-links" class="nav-links">
                <a href="/#home">Home</a>
                <a href="/#about">About</a>
                <a href="/#projects">Projects</a>
                <a href="/#timeline">Timeline</a>
            </div>
        </div>
    </nav>

    <main>
        <section class="section project-introduction">
            <a class="back-button" href="/#projects" aria-label="Back">← Back</a>
            <div class="project-introduction-heading">
                <img id="project-logo" class="project-logo" alt="" hidden>
                <h1 id="project-title">${escapeHtml(project.title)}</h1>
            </div>
            <p id="project-description" class="project-summary">${summary}</p>
            <div id="project-tags" class="node-tags" hidden></div>
            <div id="project-links" class="node-links-bar" hidden></div>
        </section>

        <section id="project-media" class="section project-demos" hidden>
            <div id="project-media-grid" class="project-demo-grid"></div>
        </section>

        <section id="project-results" class="section project-results" hidden></section>

        <section id="project-writeup-section" class="section project-writeup-section" hidden>
            <div id="project-writeup" class="project-writeup"></div>
        </section>

        <section id="project-writeup-after-section" class="section project-writeup-section" hidden>
            <div id="project-writeup-after" class="project-writeup"></div>
        </section>

        <section id="project-writeup-mid-section" class="section project-writeup-section" hidden>
            <div id="project-writeup-mid" class="project-writeup"></div>
        </section>

        <section id="project-media-after" class="section project-demos" hidden>
            <div id="project-media-after-grid" class="project-demo-grid"></div>
        </section>

        <section id="project-coming-soon" class="section project-coming-soon" hidden>
            <p>More info coming soon</p>
        </section>

${relatedHtml(project, projectMap)}

        <footer class="section project-footer">
            <div id="project-footer-links" class="node-links-bar" hidden></div>
            <a class="back-button" href="/#projects" aria-label="Back">← Back</a>
        </footer>
    </main>

    <script src="/scripts/project-seo.js"></script>
    <script src="/scripts/lenis.min.js"></script>
    <script src="/scripts/main.js"></script>
    <script data-goatcounter="https://hiteshgoyal.goatcounter.com/count"
        data-goatcounter-settings='{"allow_local": false}'
        async src="//gc.zgo.at/count.js"></script>
</body>

</html>
`;
}

function bootstrap(entries) {
    const payload = JSON.stringify(entries).replace(/</g, '\\u003c');
    return `<script>
        (function () {
            var host = location.hostname;
            var local = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
            var slug = new URLSearchParams(location.search).get('slug') || '';
            var known = ${payload};
            var entry = known[slug];
            if (!entry) return;
            document.title = entry.t;
            var set = function (selector, value) {
                var el = document.head.querySelector(selector);
                if (el && value) el.setAttribute('content', value);
            };
            set('meta[name="description"]', entry.d);
            set('meta[property="og:title"]', entry.t);
            set('meta[property="og:description"]', entry.d);
            set('meta[property="og:url"]', entry.u);
            set('meta[property="og:image"]', entry.i);
            set('meta[property="og:image:alt"]', entry.a);
            set('meta[name="twitter:card"]', entry.c);
            set('meta[name="twitter:title"]', entry.t);
            set('meta[name="twitter:description"]', entry.d);
            set('meta[name="twitter:image"]', entry.i);
            set('meta[name="twitter:image:alt"]', entry.a);
            var link = document.head.querySelector('link[rel="canonical"]');
            if (!link) {
                link = document.createElement('link');
                link.rel = 'canonical';
                document.head.appendChild(link);
            }
            link.href = entry.u;
            if (!local) location.replace('/projects/' + slug + '/' + location.hash);
        }());
    </script>`;
}

function homeFallback(projects) {
    const cards = projects.map(project => `                <article class="stack-item">
                    <div class="stack-hit stack-hit--static">
                        <div class="stack-header">
                            <div class="node-entity-group">
                                <img src="${escapeHtml(project.logo || './assets/hg-logo.svg')}" alt="" class="node-logo${project.logoTone === 'on-dark' ? ' node-logo--on-dark' : ''}" width="36" height="36" loading="lazy">
                                <div class="node-entity">${escapeHtml(project.title)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="stack-body"><div class="stack-body-inner"><p class="stack-summary">${escapeHtml(project.summary)}</p></div></div>
                    <div class="stack-footer"><div class="node-links-bar"><a href="/projects/${escapeHtml(project.slug)}/" class="btn btn-primary btn-tiny" aria-label="${escapeHtml(project.title)} details">${escapeHtml(project.title)} details</a></div></div>
                </article>`).join('\n');
    return `            <div class="other-projects">
                <h3 class="other-projects-title">All projects</h3>
                <div class="stack-list">
${cards}
                </div>
            </div>`;
}

function recommendationFallback(recommendations) {
    const spans = ['wide', 'medium', 'small', 'small', 'small', 'small'];
    const cards = recommendations.map((entry, index) => `                    <article class="recommendation-card recommendation-card--${spans[index] || 'small'}">
                        <blockquote class="recommendation-quote"><span class="recommendation-mark" aria-hidden="true">“</span><p>${escapeHtml(entry.quote)}</p></blockquote>
                        <footer class="recommendation-attribution">
                            <cite class="recommendation-name">${escapeHtml(entry.name)}</cite>
                            <p class="recommendation-role">${escapeHtml(entry.role)}</p>
                            <p class="recommendation-org">${escapeHtml(entry.organization)}</p>
                        </footer>
                    </article>`).join('\n');
    return `                <div class="recommendations-mosaic">
${cards}
                </div>`;
}

function hubJsonLd(projects) {
    const url = `${ProjectSeo.ORIGIN}/projects/`;
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                '@id': `${url}#collection`,
                url,
                name: HUB_TITLE,
                description: HUB_DESCRIPTION,
                inLanguage: 'en',
                isPartOf: { '@id': `${ProjectSeo.ORIGIN}/#website` },
                about: { '@id': `${ProjectSeo.ORIGIN}/#hitesh-goyal` },
                breadcrumb: { '@id': `${url}#breadcrumbs` },
                mainEntity: { '@id': `${url}#projects` }
            },
            {
                '@type': 'ItemList',
                '@id': `${url}#projects`,
                name: 'Hitesh Goyal projects',
                numberOfItems: projects.length,
                itemListElement: projects.map((project, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: project.title,
                    url: ProjectSeo.pageUrl(project.slug)
                }))
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumbs`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Hitesh Goyal',
                        item: `${ProjectSeo.ORIGIN}/`
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Projects',
                        item: url
                    }
                ]
            }
        ]
    };
}

function hubHtml(projects, entries) {
    const topics = HUB_TOPICS.map(topic => {
        const items = projects.filter(project => project.hubTopic === topic.id).map(project => `                    <article>
                        <h3><a href="/projects/${escapeHtml(project.slug)}/">${escapeHtml(project.title)}</a></h3>
                        <p>${escapeHtml(project.summary)}</p>
                    </article>`).join('\n');
        return `        <section id="${topic.id}" class="section project-writeup-section" aria-labelledby="${topic.id}-title">
            <div class="project-writeup">
                <h2 id="${topic.id}-title">${escapeHtml(topic.title)}</h2>
${items}
            </div>
        </section>`;
    }).join('\n\n');
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${HUB_TITLE}</title>
    <meta name="description" content="${HUB_DESCRIPTION}">
    <meta name="author" content="Hitesh Goyal">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#000000">
    <link rel="canonical" href="${ProjectSeo.ORIGIN}/projects/">

    <link rel="icon" type="image/svg+xml" href="/assets/hg-logo.svg">
    <link rel="apple-touch-icon" href="/assets/hg-logo.svg">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Hitesh Goyal">
    <meta property="og:title" content="${HUB_TITLE}">
    <meta property="og:description" content="${HUB_DESCRIPTION}">
    <meta property="og:url" content="${ProjectSeo.ORIGIN}/projects/">
    <meta property="og:image" content="${ProjectSeo.ORIGIN}/assets/hg-logo-4k.png">
    <meta property="og:image:alt" content="Hitesh Goyal">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${HUB_TITLE}">
    <meta name="twitter:description" content="${HUB_DESCRIPTION}">
    <meta name="twitter:image" content="${ProjectSeo.ORIGIN}/assets/hg-logo-4k.png">
    <meta name="twitter:image:alt" content="Hitesh Goyal">

    <!-- project-seo-bootstrap:start -->
${bootstrap(entries)}
    <!-- project-seo-bootstrap:end -->

    <script>
        (function () {
            let stored = null;
            try {
                stored = localStorage.getItem('portfolio-theme');
            } catch (error) {}
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = stored === 'light' || stored === 'dark'
                ? stored
                : prefersDark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'light' ? '#f4f4f2' : '#000000');
        }());
    </script>
    <link rel="stylesheet" href="/style.css">

    <script type="application/ld+json" id="projects-jsonld">
    ${jsonForScript(hubJsonLd(projects))}
    </script>
</head>

<body class="project-page projects-hub">
    <nav id="navbar" aria-label="Primary">
        <div class="nav-content">
            <a id="nav-logo" class="logo" href="/">HG :)</a>
            <button id="nav-toggle" class="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">
                <span></span><span></span><span></span>
            </button>
            <div id="nav-links" class="nav-links">
                <a href="/#home">Home</a>
                <a href="/#about">About</a>
                <a href="/#projects">Projects</a>
                <a href="/#timeline">Timeline</a>
            </div>
        </div>
    </nav>

    <main>
        <section class="section project-introduction">
            <a class="back-button" href="/#projects">← Back</a>
            <h1>AI and machine learning projects</h1>
        </section>

${topics}

        <footer class="section project-footer">
            <a class="back-button" href="/#projects">← Back</a>
        </footer>
    </main>

    <script src="/scripts/lenis.min.js"></script>
    <script src="/scripts/main.js"></script>
    <script data-goatcounter="https://hiteshgoyal.goatcounter.com/count"
        data-goatcounter-settings='{"allow_local": false}'
        async src="//gc.zgo.at/count.js"></script>
</body>

</html>
`;
}

// Live apps deployed from other repos. Confirmed 200 on 2026-10-30.
// Ask Krishna's reader canonical is pages/read.html (also listed in that app's sitemap).
const EXTERNAL_APPS = [
    { loc: 'https://hiteshgoyal.me/ask-krishna/', lastmod: '2026-05-25', priority: '0.7' },
    { loc: 'https://hiteshgoyal.me/ask-krishna/pages/read.html', lastmod: '2026-05-25', priority: '0.6' },
    { loc: 'https://hiteshgoyal.me/flodoro/', lastmod: '2026-05-25', priority: '0.7' },
    { loc: 'https://hiteshgoyal.me/msi-web/', lastmod: '2026-05-20', priority: '0.6' }
];

function sitemap(projects) {
    const urls = [
        `    <url>
        <loc>https://hiteshgoyal.me/</loc>
        <lastmod>${LASTMOD}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>1.0</priority>
    </url>`
    ];
    urls.push(`    <url>
        <loc>https://hiteshgoyal.me/projects/</loc>
        <lastmod>${LASTMOD}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
    </url>`);
    projects.forEach(project => {
        const priority = PRIORITY[project.slug] || '0.6';
        urls.push(`    <url>
        <loc>${ProjectSeo.pageUrl(project.slug)}</loc>
        <lastmod>${LASTMOD}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>${priority}</priority>
    </url>`);
    });
    EXTERNAL_APPS.forEach(app => {
        urls.push(`    <url>
        <loc>${app.loc}</loc>
        <lastmod>${app.lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>${app.priority}</priority>
    </url>`);
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

const projects = JSON.parse(await readFile(join(root, 'data', 'projects.json'), 'utf8'));
if (!Array.isArray(projects)) throw new Error('projects.json must be an array');
const recommendations = JSON.parse(await readFile(join(root, 'data', 'recommendations.json'), 'utf8'));
if (!Array.isArray(recommendations)) throw new Error('recommendations.json must be an array');

const projectMap = new Map(projects.map(project => [project.slug, project]));
const entries = {};
for (const project of projects) {
    const seo = ProjectSeo.forProject(project);
    if (!seo.slug) throw new Error('Project is missing a slug');
    const dir = join(root, 'projects', seo.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), pageHtml(project, seo, projectMap));
    entries[seo.slug] = {
        t: seo.title,
        d: seo.description,
        u: seo.url,
        i: seo.image,
        a: seo.imageAlt,
        c: seo.twitterCard
    };
    console.log(`${seo.title.length.toString().padStart(3)}  ${seo.url}`);
}

await writeFile(shellPath, hubHtml(projects, entries));

let home = await readFile(homePath, 'utf8');
const fallbackStart = '<!-- project-fallback:start -->';
const fallbackEnd = '<!-- project-fallback:end -->';
if (!home.includes(fallbackStart) || !home.includes(fallbackEnd)) {
    throw new Error('index.html is missing project fallback markers');
}
home = home.replace(
    new RegExp(`${fallbackStart}[\\s\\S]*?${fallbackEnd}`),
    `${fallbackStart}\n${homeFallback(projects)}\n            ${fallbackEnd}`
);
const recommendationStart = '<!-- recommendation-fallback:start -->';
const recommendationEnd = '<!-- recommendation-fallback:end -->';
if (!home.includes(recommendationStart) || !home.includes(recommendationEnd)) {
    throw new Error('index.html is missing recommendation fallback markers');
}
home = home.replace(
    new RegExp(`${recommendationStart}[\\s\\S]*?${recommendationEnd}`),
    `${recommendationStart}\n${recommendationFallback(recommendations)}\n            ${recommendationEnd}`
);
await writeFile(homePath, home);
await writeFile(join(root, 'sitemap.xml'), sitemap(projects));
console.log(`Wrote ${projects.length} project pages, project hub, homepage fallbacks, and sitemap.xml`);

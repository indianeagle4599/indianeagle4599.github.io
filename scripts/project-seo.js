(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.ProjectSeo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const ORIGIN = 'https://hiteshgoyal.me';

    const DESCRIPTORS = {
        audiobench: 'ASR evaluation workbench',
        'ask-krishna': 'Gita reflection',
        'media-search-engine': 'Photo library search',
        pixtyle: 'Computer vision stylizer',
        flodoro: 'Local Pomodoro workspace',
        'os-toolkit': 'Python filesystem toolkit',
        'lazy-resume': 'LLM resume pipeline',
        'ai-generated-image-classifier': 'Computer vision'
    };

    const SCHEMA = {
        audiobench: { type: 'SoftwareApplication', applicationCategory: 'DeveloperApplication' },
        'ask-krishna': { type: 'SoftwareApplication', applicationCategory: 'ReferenceApplication' },
        'media-search-engine': { type: 'SoftwareApplication', applicationCategory: 'MultimediaApplication' },
        pixtyle: { type: 'SoftwareApplication', applicationCategory: 'MultimediaApplication' },
        flodoro: { type: 'SoftwareApplication', applicationCategory: 'LifestyleApplication' },
        'os-toolkit': { type: 'SoftwareApplication', applicationCategory: 'DeveloperApplication' },
        'lazy-resume': { type: 'SoftwareApplication', applicationCategory: 'BusinessApplication' },
        'fuzzy-hybrid-stock-trading': { type: 'CreativeWork' },
        'ai-generated-image-classifier': { type: 'CreativeWork' }
    };

    function pageUrl(slug) {
        return `${ORIGIN}/projects/${slug}/`;
    }

    function absolute(src) {
        const path = String(src || '').trim().replace(/^\.\//, '').replace(/^\//, '');
        return path ? `${ORIGIN}/${path}` : '';
    }

    function leaves(project) {
        const blocks = project.media && Array.isArray(project.media.blocks) ? project.media.blocks : [];
        return blocks.flatMap(block => {
            if (!block || typeof block !== 'object') return [];
            if (block.presentation === 'gallery' || block.presentation === 'grid') {
                return Array.isArray(block.items) ? block.items : [];
            }
            if (block.presentation === 'comparison') {
                return (Array.isArray(block.groups) ? block.groups : []).flatMap(group => [
                    group && group.source,
                    ...(group && Array.isArray(group.variants) ? group.variants : [])
                ].filter(Boolean));
            }
            return [];
        });
    }

    function pickImage(project) {
        const items = leaves(project);
        const image = items.find(item => item
            && item.type === 'image'
            && typeof item.src === 'string' && item.src.trim()
            && typeof item.alt === 'string' && item.alt.trim());
        if (image) return { src: image.src.trim(), alt: image.alt.trim(), large: true };
        const video = items.find(item => item
            && item.type === 'video'
            && typeof item.poster === 'string' && item.poster.trim());
        if (video) {
            const alt = typeof video.title === 'string' && video.title.trim()
                ? video.title.trim()
                : `${project.title} preview`;
            return { src: video.poster.trim(), alt, large: true };
        }
        if (typeof project.logo === 'string' && /\.(png|jpe?g|webp|gif)$/i.test(project.logo)) {
            return { src: project.logo, alt: `${project.title} logo`, large: false };
        }
        return { src: 'assets/hg-logo-4k.png', alt: 'Hitesh Goyal', large: false };
    }

    function keywords(project) {
        const tags = Array.isArray(project.displayTags) && project.displayTags.length
            ? project.displayTags
            : (Array.isArray(project.tags) ? project.tags : []);
        return tags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim());
    }

    function httpsLinks(project) {
        return (Array.isArray(project.links) ? project.links : [])
            .map(link => link && typeof link.url === 'string' ? link.url.trim() : '')
            .filter(url => /^https:\/\//i.test(url));
    }

    function forProject(project) {
        const slug = String(project.slug || '').trim();
        const name = String(project.title || slug).trim();
        const descriptor = DESCRIPTORS[slug] || '';
        const title = descriptor
            ? `${name} | ${descriptor} | Hitesh Goyal`
            : `${name} | Hitesh Goyal`;
        const description = String(project.summary || '').trim()
            || `${name}, a project by Hitesh Goyal, Applied AI Engineer.`;
        const url = pageUrl(slug);
        const image = pickImage(project);
        const imageUrl = absolute(image.src);
        const schema = SCHEMA[slug] || { type: 'CreativeWork' };
        const linkUrls = httpsLinks(project);
        const repository = linkUrls.find(link => /github\.com\//i.test(link)) || '';
        const sameAs = linkUrls.filter(link => link !== url);
        const work = {
            '@type': schema.type,
            '@id': `${url}#work`,
            name,
            description,
            url,
            image: imageUrl,
            inLanguage: 'en',
            author: {
                '@type': 'Person',
                '@id': `${ORIGIN}/#hitesh-goyal`,
                name: 'Hitesh Goyal',
                url: `${ORIGIN}/`
            },
            keywords: keywords(project).join(', ')
        };
        if (schema.applicationCategory) work.applicationCategory = schema.applicationCategory;
        if (typeof project.license === 'string' && project.license.trim()) work.license = project.license.trim();
        if (repository && schema.type === 'SoftwareApplication') work.codeRepository = repository;
        if (sameAs.length) work.sameAs = sameAs;

        const jsonLd = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'WebPage',
                    '@id': `${url}#webpage`,
                    url,
                    name: title,
                    description,
                    inLanguage: 'en',
                    isPartOf: { '@id': `${ORIGIN}/#website` },
                    about: { '@id': `${ORIGIN}/#hitesh-goyal` },
                    mainEntity: { '@id': `${url}#work` },
                    primaryImageOfPage: imageUrl
                },
                work,
                {
                    '@type': 'BreadcrumbList',
                    '@id': `${url}#breadcrumbs`,
                    itemListElement: [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            name: 'Hitesh Goyal',
                            item: `${ORIGIN}/`
                        },
                        {
                            '@type': 'ListItem',
                            position: 2,
                            name,
                            item: url
                        }
                    ]
                }
            ]
        };

        return {
            slug,
            title,
            description,
            url,
            image: imageUrl,
            imageAlt: image.alt,
            twitterCard: image.large ? 'summary_large_image' : 'summary',
            jsonLd
        };
    }

    return { ORIGIN, pageUrl, forProject };
});

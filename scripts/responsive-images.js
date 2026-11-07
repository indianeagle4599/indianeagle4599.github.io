(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.ResponsiveImages = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const CANDIDATE_WIDTHS = [260, 320, 480, 640, 800, 960, 1200, 1600, 1920];

    const PROJECT_MEDIA_SIZES = '(min-width: 900px) min(1100px, calc(100vw - 5rem)), calc(100vw - 2.5rem)';
    const PORTRAIT_SIZES = '(max-width: 640px) min(72vw, 14.5rem), 16.5rem';

    function normalizeKey(src) {
        return String(src || '').trim().replace(/^\.\//, '').replace(/^\//, '');
    }

    function variantWidths(intrinsicWidth) {
        const max = Math.max(1, Math.round(intrinsicWidth));
        const widths = CANDIDATE_WIDTHS.filter(w => w < max);
        if (!widths.includes(max)) widths.push(max);
        return [...new Set(widths)].sort((a, b) => a - b);
    }

    function srcsetForFormat(variants, format) {
        return variants
            .filter(v => v[format])
            .map(v => `${v[format]} ${v.width}w`)
            .join(', ');
    }

    function buildPicture(entry, options) {
        if (!entry || !Array.isArray(entry.variants) || !entry.variants.length) {
            return null;
        }
        const alt = options?.alt ?? '';
        const className = options?.className ?? '';
        const sizes = options?.sizes || entry.sizes || PROJECT_MEDIA_SIZES;
        const width = options?.width ?? entry.width;
        const height = options?.height ?? entry.height;
        const loading = options?.loading;
        const fetchPriority = options?.fetchPriority;
        const decoding = options?.decoding ?? 'async';
        const draggable = options?.draggable;

        const avif = srcsetForFormat(entry.variants, 'avif');
        const webp = srcsetForFormat(entry.variants, 'webp');
        const jpeg = srcsetForFormat(entry.variants, 'jpeg');

        let sources = '';
        if (avif) {
            sources += `<source type="image/avif" srcset="${avif}" sizes="${sizes}">`;
        }
        if (webp) {
            sources += `<source type="image/webp" srcset="${webp}" sizes="${sizes}">`;
        }

        const fallbackSrcset = jpeg || srcsetForFormat(entry.variants, 'jpeg');
        const imgSrc = entry.fallback || (fallbackSrcset ? fallbackSrcset.split(',')[0].trim().split(/\s+/)[0] : '');
        if (!imgSrc) return null;

        const attrs = [
            `src="${imgSrc}"`,
            `alt="${String(alt).replace(/"/g, '&quot;')}"`,
            className ? `class="${className}"` : '',
            width ? `width="${width}"` : '',
            height ? `height="${height}"` : '',
            `sizes="${sizes}"`,
            fallbackSrcset ? `srcset="${fallbackSrcset}"` : '',
            decoding ? `decoding="${decoding}"` : '',
            loading ? `loading="${loading}"` : '',
            fetchPriority ? `fetchpriority="${fetchPriority}"` : '',
            draggable === false ? 'draggable="false"' : ''
        ].filter(Boolean).join(' ');

        return `<picture>${sources}<img ${attrs}></picture>`;
    }

    function mountPicture(container, entry, options) {
        const html = buildPicture(entry, options);
        if (!html) return false;
        container.innerHTML = html;
        return true;
    }

    return {
        CANDIDATE_WIDTHS,
        PROJECT_MEDIA_SIZES,
        PORTRAIT_SIZES,
        normalizeKey,
        variantWidths,
        buildPicture,
        mountPicture
    };
});

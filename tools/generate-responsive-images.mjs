import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(root, 'data', 'responsive-images.json');
const portraitPath = 'assets/hitesh-goyal-portrait.jpg';

const STANDARD_WIDTHS = [260, 320, 480, 640, 800, 960, 1200, 1600, 1920];
const PROJECT_MEDIA_SIZES = '(min-width: 900px) min(1100px, calc(100vw - 5rem)), calc(100vw - 2.5rem)';
const PORTRAIT_SIZES = '(max-width: 640px) min(72vw, 14.5rem), 16.5rem';

function responsiveDirFor(key) {
    const base = key.replace(/^assets\//, '').replace(/\.[^.]+$/, '');
    return join(root, 'assets', '_responsive', base);
}

function widthsFor(intrinsicWidth) {
    const max = Math.max(1, Math.round(intrinsicWidth));
    const list = STANDARD_WIDTHS.filter(w => w <= max);
    if (list[list.length - 1] !== max) list.push(max);
    return [...new Set(list)];
}

function collectProjectImages(projects) {
    const keys = new Set();
    function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'image' && typeof node.src === 'string') {
            const key = node.src.replace(/^\.\//, '');
            if (/\.(png|jpe?g|webp)$/i.test(key) && !/\.gif$/i.test(key)) keys.add(key);
        }
        for (const value of Object.values(node)) walk(value);
    }
    projects.forEach(walk);
    keys.add(portraitPath);
    return [...keys].sort();
}

async function encodeVariant(sharpImage, width, outDir) {
    await mkdir(outDir, { recursive: true });
    const { data, info } = await sharpImage
        .clone()
        .resize({ width, withoutEnlargement: true })
        .toBuffer({ resolveWithObject: true });
    const actualWidth = info.width || width;
    const avifPath = join(outDir, `w${actualWidth}.avif`);
    const webpPath = join(outDir, `w${actualWidth}.webp`);
    const jpegPath = join(outDir, `w${actualWidth}.jpg`);

    await sharp(data).avif({ quality: 70, effort: 4 }).toFile(avifPath);
    await sharp(data).webp({ quality: 82 }).toFile(webpPath);
    await sharp(data).jpeg({ quality: 82, mozjpeg: true }).toFile(jpegPath);

    const rel = (path) => relative(root, path).replace(/\\/g, '/');
    return {
        width: actualWidth,
        avif: rel(avifPath),
        webp: rel(webpPath),
        jpeg: rel(jpegPath)
    };
}

async function buildEntry(key, sizes) {
    const abs = join(root, key);
    try {
        await stat(abs);
    } catch {
        console.warn(`skip missing: ${key}`);
        return null;
    }
    const image = sharp(abs, { failOn: 'none' });
    const meta = await image.metadata();
    const intrinsicWidth = meta.width || 0;
    const intrinsicHeight = meta.height || 0;
    if (!intrinsicWidth || !intrinsicHeight) return null;

    const outDir = responsiveDirFor(key);
    const variantWidths = widthsFor(intrinsicWidth);
    const variants = [];
    for (const width of variantWidths) {
        const variant = await encodeVariant(image, width, outDir);
        variants.push(variant);
        console.log(`  ${key} → ${variant.width}w`);
    }

    return {
        id: key,
        width: intrinsicWidth,
        height: intrinsicHeight,
        sizes,
        fallback: key,
        variants: dedupeVariants(variants)
    };
}

function dedupeVariants(variants) {
    return [...new Map(variants.map(variant => [variant.width, variant])).values()]
        .sort((a, b) => a.width - b.width);
}

function portraitMarkup(entry) {
    const variants = dedupeVariants(entry.variants);
    const avif = variants.map(v => `${v.avif} ${v.width}w`).join(', ');
    const webp = variants.map(v => `${v.webp} ${v.width}w`).join(', ');
    const jpeg = variants.map(v => `${v.jpeg} ${v.width}w`).join(', ');
    return `                <picture>
                    <source type="image/avif" srcset="${avif}" sizes="${PORTRAIT_SIZES}">
                    <source type="image/webp" srcset="${webp}" sizes="${PORTRAIT_SIZES}">
                    <img src="${entry.fallback}" srcset="${jpeg}" sizes="${PORTRAIT_SIZES}" alt="Portrait of Hitesh Goyal, Applied AI Engineer" width="${entry.width}" height="${entry.height}" decoding="async">
                </picture>`;
}

async function patchHomePortrait(entry) {
    const homePath = join(root, 'index.html');
    const start = '<!-- portrait-responsive:start -->';
    const end = '<!-- portrait-responsive:end -->';
    let html = await readFile(homePath, 'utf8');
    if (!html.includes(start) || !html.includes(end)) {
        throw new Error('index.html is missing portrait-responsive markers');
    }
    html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n${portraitMarkup(entry)}\n                ${end}`);
    html = html.replace(
        /<link rel="preload" as="image"[^>]*hitesh-goyal-portrait[^>]*>\s*/i,
        ''
    );
    await writeFile(homePath, html);
}

const projects = JSON.parse(await readFile(join(root, 'data', 'projects.json'), 'utf8'));
const keys = collectProjectImages(projects);
const manifest = { generatedAt: new Date().toISOString().slice(0, 10), images: {} };

for (const key of keys) {
    const sizes = key === portraitPath ? PORTRAIT_SIZES : PROJECT_MEDIA_SIZES;
    const entry = await buildEntry(key, sizes);
    if (entry) manifest.images[key] = entry;
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await patchHomePortrait(manifest.images[portraitPath]);

const variantCount = Object.values(manifest.images).reduce((sum, item) => sum + item.variants.length, 0);
console.log(`Wrote ${Object.keys(manifest.images).length} manifests (${variantCount} width variants) to ${relative(root, manifestPath)}`);

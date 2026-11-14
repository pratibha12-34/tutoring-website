import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(scriptDirectory, '../dist');
const frontendDirectory = path.resolve(scriptDirectory, '..');
const buildEnv = loadEnv('production', frontendDirectory, '');
const configuredUrl = (process.env.VITE_SITE_URL || buildEnv.VITE_SITE_URL || '').trim();
const apiBaseUrl = (process.env.VITE_API_BASE || buildEnv.VITE_API_BASE || '').trim();
const sitemapRoutes = [
    { path: '/', priority: '1.0', changeFrequency: 'weekly' },
    { path: '/about', priority: '0.6', changeFrequency: 'monthly' },
    { path: '/contact', priority: '0.5', changeFrequency: 'monthly' },
    { path: '/allcourses', priority: '0.9', changeFrequency: 'weekly' },
    { path: '/allbatches', priority: '0.8', changeFrequency: 'weekly' }
];

function escapeXml(value) {
    return value.replace(/[<>&'"]/g, (character) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;'
    })[character]);
}

function escapeAttribute(value) {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

let siteOrigin;
if (configuredUrl) {
    try {
        const parsedUrl = new URL(configuredUrl);
        if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password || parsedUrl.hostname.endsWith('.example')) {
            throw new Error('VITE_SITE_URL must be your public HTTPS origin, not a placeholder or URL with credentials.');
        }
        siteOrigin = parsedUrl.origin;
    } catch (error) {
        throw new Error(`Invalid VITE_SITE_URL: ${error.message}`);
    }
}

await writeFile(
    path.join(distDirectory, 'robots.txt'),
    `User-agent: *\nAllow: /\n${siteOrigin ? `Sitemap: ${siteOrigin}/sitemap.xml\n` : ''}`,
    'utf8'
);

if (!siteOrigin) {
    try {
        await unlink(path.join(distDirectory, 'sitemap.xml'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    const indexPath = path.join(distDirectory, 'index.html');
    let indexHtml = await readFile(indexPath, 'utf8');
    indexHtml = indexHtml
        .replace(/content="[^"]*" data-seo="og-url"/, 'content="" data-seo="og-url"')
        .replace(/content="[^"]*" data-seo="og-image"/, 'content="" data-seo="og-image"')
        .replace(/content="[^"]*" data-seo="twitter-image"/, 'content="" data-seo="twitter-image"')
        .replace(/href="[^"]*" data-seo="canonical"/, 'href="" data-seo="canonical"');
    await writeFile(indexPath, indexHtml, 'utf8');
    console.warn('VITE_SITE_URL is not set; sitemap.xml was not generated. Set the production site URL before deploying.');
    process.exit(0);
}

const dynamicRoutes = [];
if (apiBaseUrl && !apiBaseUrl.includes('.example') && !/localhost|127\.0\.0\.1/i.test(apiBaseUrl)) {
    for (const [endpoint, routePrefix, priority] of [
        ['/allcourses', '/courses', '0.7'],
        ['/allbatches', '/batches', '0.6']
    ]) {
        try {
            const response = await fetch(new URL(endpoint, `${apiBaseUrl.replace(/\/+$/, '')}/`));
            if (!response.ok) {
                console.warn(`Could not add ${endpoint} pages to sitemap (HTTP ${response.status}).`);
                continue;
            }
            const items = await response.json();
            if (!Array.isArray(items)) {
                console.warn(`Could not add ${endpoint} pages to sitemap (unexpected API response).`);
                continue;
            }
            items.forEach((item) => {
                if (typeof item?._id === 'string' && /^[a-f0-9]{24}$/i.test(item._id)) {
                    dynamicRoutes.push({
                        path: `${routePrefix}/${item._id}`,
                        priority,
                        changeFrequency: 'weekly'
                    });
                }
            });
        } catch (error) {
            console.warn(`Could not add ${endpoint} pages to sitemap: ${error.message}`);
        }
    }
} else {
    console.warn('VITE_API_BASE is not configured for production; dynamic course and batch URLs are not in the sitemap.');
}

const routes = [...sitemapRoutes, ...dynamicRoutes];
const urlEntries = routes.map((route) => `  <url>
    <loc>${escapeXml(`${siteOrigin}${route.path}`)}</loc>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

await writeFile(path.join(distDirectory, 'sitemap.xml'), sitemap, 'utf8');

const indexPath = path.join(distDirectory, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');
const siteUrl = escapeAttribute(siteOrigin);
const socialImage = escapeAttribute(`${siteOrigin}/assests/logo1.jpeg`);
indexHtml = indexHtml
    .replace('content="" data-seo="og-url"', `content="${siteUrl}/" data-seo="og-url"`)
    .replace('content="" data-seo="og-image"', `content="${socialImage}" data-seo="og-image"`)
    .replace('content="" data-seo="twitter-image"', `content="${socialImage}" data-seo="twitter-image"`)
    .replace('href="" data-seo="canonical"', `href="${siteUrl}/" data-seo="canonical"`);
await writeFile(indexPath, indexHtml, 'utf8');

console.log(`Generated sitemap.xml (${routes.length} URLs) and canonical homepage metadata for ${siteOrigin}.`);

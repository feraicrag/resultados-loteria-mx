import { SITE } from './config';
export const urlset = (urls: { loc: string; lastmod: string }[]) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml' } });

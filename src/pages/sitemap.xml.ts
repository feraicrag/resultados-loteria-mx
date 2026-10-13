import { juegos, sorteos } from '../lib/data';
import { SITE } from '../lib/config';
// Índice de sitemaps: uno de páginas generales y uno por juego con todos sus sorteos.
export const GET = () => {
  const last = sorteos.map((s) => s.fecha).sort().pop();
  const maps = ['/sitemap-paginas.xml', ...juegos.map((j) => `/sitemap-${j.slug}.xml`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps.map((m) => `  <sitemap><loc>${SITE}${m}</loc><lastmod>${last}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`, { headers: { 'Content-Type': 'application/xml' } });
};

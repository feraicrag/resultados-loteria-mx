import type { APIRoute } from 'astro';
import { juegos, getSorteosByJuego } from '../lib/data';

export const GET: APIRoute = () => {
  const base = 'https://resultados-loteria-mx.vercel.app';
  const today = new Date().toISOString().slice(0, 10);
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [];

  const add = (loc: string, lastmod: string, changefreq: string, priority: string) =>
    urls.push({ loc: base + loc, lastmod, changefreq, priority });

  add('/', today, 'daily', '1.0');
  add('/calendario/', today, 'weekly', '0.8');
  add('/pronosticos/', today, 'weekly', '0.7');

  for (const j of juegos) {
    add(`/${j.slug}/`, today, 'daily', '0.9');
    add(`/${j.slug}/resultados/`, today, 'daily', '0.8');
    add(`/${j.slug}/estadisticas/`, today, 'daily', '0.7');
    for (const s of getSorteosByJuego(j.slug).slice(0, 30)) {
      add(`/${j.slug}/sorteo-${s.numero}/`, s.fecha, 'monthly', '0.6');
    }
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

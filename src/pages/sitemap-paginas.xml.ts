import { juegos, sorteos } from '../lib/data';
import { urlset } from '../lib/sitemap';
export const GET = () => {
  const last = sorteos.map((s) => s.fecha).sort().pop()!;
  const locs = ['/', '/calendario/', '/pronosticos/', '/verificador/'];
  for (const j of juegos) locs.push(`/${j.slug}/`, `/${j.slug}/resultados/`, `/${j.slug}/estadisticas/`);
  return urlset(locs.map((loc) => ({ loc, lastmod: last })));
};

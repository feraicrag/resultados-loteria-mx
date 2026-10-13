import { juegos, getSorteosByJuego } from '../lib/data';
import { urlset } from '../lib/sitemap';
export const getStaticPaths = () => juegos.map((j) => ({ params: { juego: j.slug } }));
export const GET = ({ params }: { params: { juego: string } }) =>
  urlset(getSorteosByJuego(params.juego).map((s) => ({ loc: `/${params.juego}/sorteo-${s.numero}/`, lastmod: s.fecha })));

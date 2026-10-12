/**
 * Scraper: downloads official historical CSVs published by Lotería Nacional / Pronósticos
 * (https://www.loterianacional.gob.mx/DatosAbiertos/NumerosGanadores) and rebuilds
 * src/data/resultados.json with the last MONTHS months of draws per game.
 * Exits non-zero if any source fails or returns zero draws.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('src/data/resultados.json');
const BASE = 'https://www.loterianacional.gob.mx/Documentos/Historicos/';
const MONTHS = Number(process.env.MONTHS || 12);

// file, slug, number of result columns, has adicional (last result column), has BOLSA
const SOURCES = [
  { file: 'Melate.csv', slug: 'melate', n: 6, adicional: true },
  { file: 'Revancha.csv', slug: 'melate-revancha', n: 6 },
  { file: 'Revanchita.csv', slug: 'melate-revanchita', n: 6 },
  { file: 'Melate-Retro.csv', slug: 'melate-retro', n: 6, adicional: true },
  { file: 'Chispazo.csv', slug: 'chispazo', n: 5 },
  { file: 'Tris.csv', slug: 'tris', n: 5 },
  { file: 'GanaGato.csv', slug: 'gana-gato', n: 8 },
];

async function fetchText(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 resultados-loteria-mx' } });
      const txt = await res.text();
      if (res.ok && !txt.trimStart().startsWith('<')) return txt;
      console.error(`bad response ${res.status} from ${url}`);
    } catch (e) {
      console.error(`fetch error ${url}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

function toIso(d) {
  const [dd, mm, yyyy] = d.trim().split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function parse(src, txt, cutoff) {
  const lines = txt.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',').map((h) => h.trim().toUpperCase());
  const iC = head.indexOf('CONCURSO');
  const iF = head.indexOf('FECHA');
  const iB = head.indexOf('BOLSA');
  const iR = head.findIndex((h) => /^[RF]1$/.test(h));
  if (iC < 0 || iF < 0 || iR < 0) throw new Error(`unexpected header in ${src.file}: ${lines[0]}`);
  const out = [];
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const fecha = toIso(c[iF]);
    if (fecha < cutoff) continue;
    const vals = c.slice(iR, iR + src.n + (src.adicional ? 1 : 0)).map(Number);
    if (vals.some((v) => !Number.isFinite(v))) continue;
    const s = { juego: src.slug, numero: Number(c[iC]), fecha, numeros: vals.slice(0, src.n) };
    if (src.adicional) s.adicional = vals[src.n];
    if (iB >= 0 && Number(c[iB]) > 0) s.bolsa_mxn = Number(c[iB]);
    out.push(s);
  }
  return out;
}

// Chispazo.csv mixes both daily draws. When a date has two draws, the lower
// concurso is the earlier one (Chispazo de las Tres) and the higher is the Clásico.
function splitChispazo(list) {
  const byDate = new Map();
  for (const s of list) (byDate.get(s.fecha) || byDate.set(s.fecha, []).get(s.fecha)).push(s);
  for (const arr of byDate.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.numero - b.numero);
    arr[0].juego = 'chispazo-de-las-tres';
  }
  return list;
}

async function main() {
  const d = new Date();
  d.setMonth(d.getMonth() - MONTHS);
  const cutoff = d.toISOString().slice(0, 10);
  const all = [];
  const failed = [];
  for (const src of SOURCES) {
    const txt = await fetchText(BASE + src.file);
    let rows = txt ? parse(src, txt, cutoff) : [];
    if (src.slug === 'chispazo') rows = splitChispazo(rows);
    console.log(`${src.file}: ${rows.length} sorteos`);
    if (rows.length === 0) failed.push(src.file);
    all.push(...rows);
  }
  if (failed.length) {
    console.error(`FAIL: no data from ${failed.join(', ')}`);
    process.exit(1);
  }
  all.sort((a, b) => (a.juego === b.juego ? b.numero - a.numero : a.juego.localeCompare(b.juego)));
  await fs.writeFile(OUT, JSON.stringify({ fuente: BASE, sorteos: all }) + '\n', 'utf8');
  console.log(`Wrote ${all.length} sorteos since ${cutoff}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

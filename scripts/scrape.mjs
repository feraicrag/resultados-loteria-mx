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

// Chispazo mixes both daily draws in one sequence. De las Tres (15:00) and Clásico (21:15)
// alternate, so the concurso parity of De las Tres is learned from any date with two draws
// (lower concurso = earlier draw = De las Tres) and applied to every Chispazo draw.
function splitChispazo(list) {
  const byDate = new Map();
  for (const s of list) (byDate.get(s.fecha) || byDate.set(s.fecha, []).get(s.fecha)).push(s);
  const pair = [...byDate.values()].find((a) => a.length === 2);
  if (!pair) return list;
  const tresParity = Math.min(...pair.map((s) => s.numero)) % 2;
  for (const s of list) s.juego = s.numero % 2 === tresParity ? 'chispazo-de-las-tres' : 'chispazo';
  return list;
}

// ---------- Same-day source: official "Resultados" pages ----------
const PAGES_BASE = 'https://www.loterianacional.gob.mx/';
const UA = 'resultados-loteria-mx/1.0 (+https://resultados-loteria-mx.vercel.app; datos publicos, 1 req por pagina)';
const strip = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16))).replace(/\s+/g, ' ').trim();

async function fetchPage(path) {
  try {
    const res = await fetch(PAGES_BASE + path, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
    if (!res.ok) { console.error(`page ${path}: HTTP ${res.status}`); return null; }
    return await res.text();
  } catch (e) {
    console.error(`page ${path}: ${e.message}`);
    return null;
  }
}

// Top blocks: "Sorteo: N <br/> Fecha dd/mm/yyyy ... <h3>combinación</h3>", in page order.
function topBlocks(html) {
  const re = /Sorteo:\s*(\d+)\s*<br\s*\/?>\s*Fecha\s*(\d{2}\/\d{2}\/\d{4})[\s\S]*?<h3>([^<]+)<\/h3>/g;
  return [...html.matchAll(re)].map((m) => ({ numero: Number(m[1]), fecha: toIso(m[2]), comb: m[3].trim() }));
}
// "Últimos 15" table: rows of <td>sorteo</td><td>fecha</td><td>combinación</td>[<td>mult</td>]
function lastTable(html) {
  const i = html.indexOf('id="tblResultados"');
  if (i < 0) return [];
  const body = html.slice(i, html.indexOf('</table>', i));
  return [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1])))
    .filter((c) => c.length >= 3 && /^\d+$/.test(c[0]) && /^\d{2}\/\d{2}\/\d{4}$/.test(c[1]))
    .map((c) => ({ numero: Number(c[0]), fecha: toIso(c[1]), comb: c[2] }));
}
function lotto(slug, b, n, adicional) {
  const [main, ad] = b.comb.split('-');
  const nums = main.trim().split(/\s+/).map(Number);
  if (nums.length !== n || nums.some((v) => !Number.isFinite(v))) return null;
  const s = { juego: slug, numero: b.numero, fecha: b.fecha, numeros: nums };
  if (adicional) { if (ad == null || !Number.isFinite(Number(ad))) return null; s.adicional = Number(ad); }
  return s;
}

const PAGES = [
  { path: 'Melate/Resultados', parse: (h) => {
    // Page shows Melate, Revancha and Revanchita blocks for the latest draw, in that order.
    const [m, r, rr] = topBlocks(h);
    const out = lastTable(h).map((b) => lotto('melate', b, 6, true));
    if (r) out.push(lotto('melate-revancha', r, 6));
    if (rr) out.push(lotto('melate-revanchita', rr, 6));
    if (m && !out.some((x) => x && x.juego === 'melate' && x.numero === m.numero)) out.push(lotto('melate', m, 6, true));
    return out;
  } },
  { path: 'MelateRetro/Resultados', parse: (h) => lastTable(h).map((b) => lotto('melate-retro', b, 6, true)) },
  { path: 'Chispazo/Resultados', parse: (h) => splitChispazo(lastTable(h).map((b) => lotto('chispazo', b, 5)).filter(Boolean)) },
  { path: 'Tris/Resultados', parse: (h) => lastTable(h).map((b) => {
    if (!/^\d{5}$/.test(b.comb)) return null;
    return { juego: 'tris', numero: b.numero, fecha: b.fecha, numeros: [...b.comb].map(Number) };
  }) },
  { path: 'GanaGato/Resultados', parse: (h) => lastTable(h).map((b) => lotto('gana-gato', b, 8)) },
];

async function main() {
  const d = new Date();
  d.setMonth(d.getMonth() - MONTHS);
  const cutoff = d.toISOString().slice(0, 10);
  let existing = [];
  try { existing = JSON.parse(await fs.readFile(OUT, 'utf8')).sorteos || []; } catch {}
  const key = (s) => s.juego + '#' + s.numero;

  // 1) CSV (source of truth for history)
  const csvOk = new Set();
  const csvRows = [];
  for (const src of SOURCES) {
    const txt = await fetchText(BASE + src.file);
    let rows = txt ? parse(src, txt, cutoff) : [];
    if (src.slug === 'chispazo') rows = splitChispazo(rows);
    console.log(`CSV ${src.file}: ${rows.length} sorteos`);
    if (rows.length) {
      csvOk.add(src.slug);
      if (src.slug === 'chispazo') csvOk.add('chispazo-de-las-tres');
      csvRows.push(...rows);
    }
  }

  // 2) Official results pages (same-day latest draws)
  const pageOk = new Set();
  const pageRows = [];
  for (const p of PAGES) {
    const html = await fetchPage(p.path);
    let rows = [];
    try { rows = html ? p.parse(html).filter(Boolean) : []; } catch (e) { console.error(`parse ${p.path}: ${e.message}`); }
    console.log(`PAGE ${p.path}: ${rows.length} sorteos` + (rows[0] ? ` (último ${rows.reduce((a, b) => (b.numero > a.numero ? b : a)).numero})` : ''));
    for (const r of rows) pageOk.add(r.juego);
    pageRows.push(...rows);
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 3) Merge: CSV wins; page draws only fill what CSV does not have yet.
  const merged = new Map();
  const slugs = [...new Set(SOURCES.map((s) => s.slug).concat('chispazo-de-las-tres'))];
  const failed = slugs.filter((g) => !csvOk.has(g) && !pageOk.has(g));
  for (const s of existing) if (!csvOk.has(s.juego)) merged.set(key(s), s); // keep old data for games whose CSV failed
  for (const s of pageRows) if (!merged.has(key(s))) merged.set(key(s), s);
  for (const s of csvRows) merged.set(key(s), s);
  let added = 0;
  const csvByKey = new Map(csvRows.map((c) => [key(c), c]));
  for (const s of pageRows) {
    const c = csvByKey.get(key(s));
    if (!c) added++;
    else if (c.numeros.join() !== s.numeros.join() || (c.adicional ?? null) !== (s.adicional ?? null)) console.warn(`AVISO: página y CSV difieren en ${key(s)}; se usa CSV`);
  }
  console.log(`Página aporta ${added} sorteos que el CSV aún no tiene`);

  if (failed.length) {
    console.error(`FAIL: sin datos de CSV ni de página para: ${failed.join(', ')}`);
    process.exit(1);
  }
  const all = [...merged.values()].filter((s) => s.fecha >= cutoff);
  all.sort((a, b) => (a.juego === b.juego ? b.numero - a.numero : a.juego.localeCompare(b.juego)));
  await fs.writeFile(OUT, JSON.stringify({ fuente: BASE, sorteos: all }) + '\n', 'utf8');
  console.log(`Wrote ${all.length} sorteos since ${cutoff}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

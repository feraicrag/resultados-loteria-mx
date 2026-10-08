/**
 * Daily scraper: fetches latest draw results and merges into src/data/resultados.json.
 * If live endpoints fail, keeps seed data and exits 0 so the workflow does not fail.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('src/data/resultados.json');

const ENDPOINTS = [
  'https://www.loterianacional.gob.mx/api/resultados/ultimos',
  'https://www.pronosticos.gob.mx/api/resultados/ultimos',
];

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'resultados-loteria-mx/1.0 (+https://github.com/feraicrag/resultados-loteria-mx)',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function normalize(raw) {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : raw.sorteos || raw.resultados || [];
  if (!Array.isArray(list) || list.length === 0) return null;
  return list
    .map((s) => ({
      juego: String(s.juego || s.game || '').toLowerCase().replace(/\s+/g, '-'),
      numero: Number(s.numero || s.draw || s.sorteo),
      fecha: String(s.fecha || s.date || '').slice(0, 10),
      hora: s.hora || s.time || undefined,
      nombre: s.nombre || s.name || undefined,
      numeros: (s.numeros || s.numbers || []).map(Number),
      adicional: s.adicional != null ? Number(s.adicional) : undefined,
      bolsa_mxn: s.bolsa_mxn != null ? Number(s.bolsa_mxn) : undefined,
      ganadores_6: s.ganadores_6 != null ? Number(s.ganadores_6) : undefined,
      ganadores_5: s.ganadores_5 != null ? Number(s.ganadores_5) : undefined,
      ganadores_8: s.ganadores_8 != null ? Number(s.ganadores_8) : undefined,
    }))
    .filter((s) => s.juego && s.numero && s.fecha && s.numeros.length > 0)
    .sort((a, b) => b.numero - a.numero);
}

async function main() {
  let incoming = null;
  for (const url of ENDPOINTS) {
    const raw = await fetchJson(url);
    incoming = normalize(raw);
    if (incoming) {
      console.log(`OK: ${url} -> ${incoming.length} sorteos`);
      break;
    }
    console.log(`miss: ${url}`);
  }

  const existing = JSON.parse(await fs.readFile(OUT, 'utf8'));
  const prev = existing.sorteos || [];

  if (!incoming) {
    console.log('No live data; keeping seed. Nothing to commit.');
    return;
  }

  const byKey = new Map(prev.map((s) => [s.juego + '#' + s.numero, s]));
  for (const s of incoming) byKey.set(s.juego + '#' + s.numero, s);
  const merged = [...byKey.values()].sort((a, b) => b.numero - a.numero).slice(0, 200);

  await fs.writeFile(OUT, JSON.stringify({ sorteos: merged }, null, 2) + '\n', 'utf8');
  console.log(`Merged: ${prev.length} -> ${merged.length} sorteos`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

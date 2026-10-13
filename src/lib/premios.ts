// Categorías tomadas de las páginas oficiales de resultados de loterianacional.gob.mx (oct 2026).
// Solo se listan juegos cuyas categorías se pudieron verificar.
export type Regla = { aciertos: number; adicional?: boolean; lugar: string };
export const CATEGORIAS: Record<string, Regla[]> = {
  melate: [
    { aciertos: 6, lugar: '1er lugar: 6 números naturales' },
    { aciertos: 5, adicional: true, lugar: '2do lugar: 5 números naturales y el adicional' },
    { aciertos: 5, lugar: '3er lugar: 5 números naturales' },
    { aciertos: 4, adicional: true, lugar: '4to lugar: 4 números naturales y el adicional' },
    { aciertos: 4, lugar: '5to lugar: 4 números naturales' },
    { aciertos: 3, adicional: true, lugar: '6to lugar: 3 números naturales y el adicional' },
    { aciertos: 3, lugar: '7mo lugar: 3 números naturales' },
    { aciertos: 2, adicional: true, lugar: '8vo lugar: 2 números naturales y el adicional' },
    { aciertos: 2, lugar: '9no lugar: 2 números naturales' },
  ],
  'melate-revancha': [
    { aciertos: 6, lugar: '1er lugar: 6 números naturales' },
    { aciertos: 5, lugar: '2do lugar: 5 números naturales' },
    { aciertos: 4, lugar: '3er lugar: 4 números naturales' },
    { aciertos: 3, lugar: '4to lugar: 3 números naturales' },
    { aciertos: 2, lugar: '5to lugar: 2 números naturales' },
  ],
  'melate-revanchita': [{ aciertos: 6, lugar: '1er lugar: 6 números naturales' }],
  'melate-retro': [
    { aciertos: 6, lugar: '1er lugar: 6 números naturales' },
    { aciertos: 5, adicional: true, lugar: '2do lugar: 5 números naturales y el adicional' },
    { aciertos: 5, lugar: '3er lugar: 5 números naturales' },
    { aciertos: 4, lugar: '4to lugar: 4 números naturales' },
    { aciertos: 3, lugar: '5to lugar: 3 números naturales' },
    { aciertos: 2, adicional: true, lugar: '6to lugar: 2 números naturales y el adicional' },
    { aciertos: 1, adicional: true, lugar: '7mo lugar: 1 número natural y el adicional' },
  ],
  chispazo: [
    { aciertos: 5, lugar: '1er lugar: 5 números' },
    { aciertos: 4, lugar: '2do lugar: 4 números' },
    { aciertos: 3, lugar: '3er lugar: 3 números' },
    { aciertos: 2, lugar: '4to lugar: 2 números' },
  ],
};
CATEGORIAS['chispazo-de-las-tres'] = CATEGORIAS.chispazo;
// Juegos posicionales: se compara posición por posición, sin categoría (reglas por modalidad no verificadas).
export const POSICIONALES = ['tris', 'gana-gato'];

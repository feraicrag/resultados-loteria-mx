import juegosData from '../data/juegos.json';
import resultadosData from '../data/resultados.json';

export interface Juego {
  slug: string;
  nombre: string;
  operador: string;
  formato: string;
  probabilidad_mayor: string;
  premio_minimo_mxn: number;
  dias: string[];
  hora: string;
  precio_boleto_mxn: number;
  descripcion: string;
}

export interface Sorteo {
  juego: string;
  numero: number;
  fecha: string;
  hora?: string;
  nombre?: string;
  numeros: number[];
  adicional?: number;
  bolsa_mxn?: number;
  ganadores_6?: number;
  ganadores_5?: number;
  ganadores_8?: number;
}

export const juegos: Juego[] = juegosData.juegos;
export const sorteos: Sorteo[] = resultadosData.sorteos;

export function getJuego(slug: string): Juego | undefined {
  return juegos.find((j) => j.slug === slug);
}

export function getSorteosByJuego(slug: string): Sorteo[] {
  return sorteos.filter((s) => s.juego === slug).sort((a, b) => b.numero - a.numero);
}

export function getSorteo(slug: string, numero: number): Sorteo | undefined {
  return sorteos.find((s) => s.juego === slug && s.numero === numero);
}

export function getUltimoSorteo(slug: string): Sorteo | undefined {
  return getSorteosByJuego(slug)[0];
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);
}

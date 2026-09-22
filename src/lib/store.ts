// Datos del conteo: se guardan en el navegador (localStorage).
import { LOCALES_FERRENAFE, numerosDeMesa } from '../data/locales-ferrenafe';
import { COLUMNAS_POR_DEFECTO } from '../data/partidos';

export interface Partido {
  id: string;
  nombre: string;
}

export interface Columna {
  id: string;
  titulo: string;
  corto: string;
  partidos: Partido[];
}

/** votos[columnaId][partidoId] = cantidad de votos */
export type Votos = Record<string, Record<string, number>>;

export interface Mesa {
  id: string;
  numero: string;
  /** Electores hábiles según la ONPE (si se conoce). */
  electores?: number;
  votos: Votos;
}

export interface Aula {
  id: string;
  nombre: string;
  mesas: Mesa[];
}

export interface Colegio {
  id: string;
  /** Código del local de votación en la ONPE (si se conoce). */
  codigo?: string;
  nombre: string;
  aulas: Aula[];
}

export interface Datos {
  version: number;
  distrito: string;
  provincia: string;
  columnas: Columna[];
  colegios: Colegio[];
}

export interface Ubicada {
  colegio: Colegio;
  aula: Aula;
  mesa: Mesa;
}

export interface Filtro {
  colegio?: string;
  aula?: string;
  mesa?: string;
}

export interface Resumen {
  columna: Columna;
  filas: { partido: Partido; votos: number }[];
  validos: number;
  blanco: number;
  nulo: number;
  emitidos: number;
}

// Claves especiales dentro de votos[columnaId].
export const BLANCO = '_blanco';
export const NULO = '_nulo';

/** La ONPE arma cada mesa con 300 electores como máximo. */
export const MAX_ELECTORES_MESA = 300;

const VERSION = 2;

const CLAVE = 'conteo-votos:datos';

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const columnasPorDefecto = (): Columna[] => structuredClone(COLUMNAS_POR_DEFECTO);

/** Locales de votación con un aula por mesa (la ONPE no publica las aulas; se pueden renombrar). */
export const colegiosIniciales = (): Colegio[] =>
  LOCALES_FERRENAFE.map((local) => ({
    id: uid(),
    codigo: local.codigo,
    nombre: local.nombre,
    aulas: numerosDeMesa(local.desde, local.mesas).map((numero, i) => ({
      id: uid(),
      nombre: `Aula ${i + 1}`,
      mesas: [{ id: uid(), numero, votos: {} }],
    })),
  }));

export const datosIniciales = (): Datos => ({
  version: VERSION,
  distrito: 'Ferreñafe',
  provincia: 'Ferreñafe',
  columnas: columnasPorDefecto(),
  colegios: colegiosIniciales(),
});

/**
 * Pone al día datos guardados con una versión anterior. La versión 1 usaba los números
 * de mesa de junio: se cambian por los de octubre, manteniendo aulas y votos.
 */
export function normalizar(d: Datos): Datos {
  if ((d.version ?? 1) < 2) {
    const nuevos = new Map<string, string>();
    for (const l of LOCALES_FERRENAFE) {
      const ahora = numerosDeMesa(l.desde, l.mesas);
      numerosDeMesa(l.desdeJunio, l.mesas).forEach((n, i) => nuevos.set(`${l.codigo}:${n}`, ahora[i]));
    }
    for (const c of d.colegios) {
      const local = LOCALES_FERRENAFE.find((l) => l.codigo === c.codigo);
      if (!local) continue;
      if (local.nombreJunio && c.nombre === local.nombreJunio) c.nombre = local.nombre;
      for (const a of c.aulas) {
        for (const m of a.mesas) {
          const numero = nuevos.get(`${c.codigo}:${m.numero}`);
          if (!numero) continue;
          m.numero = numero;
          // Los electores de junio no corresponden a las mesas nuevas.
          delete m.electores;
        }
      }
    }
    const primera = (c: Colegio) =>
      Math.min(...c.aulas.flatMap((a) => a.mesas.map((m) => parseInt(m.numero, 10) || Infinity)));
    d.colegios.sort((a, b) => primera(a) - primera(b));
    d.version = 2;
  }
  return d;
}

export function esDatos(x: unknown): x is Datos {
  const d = x as Datos;
  return !!d && typeof d === 'object' && Array.isArray(d.columnas) && Array.isArray(d.colegios);
}

export function cargar(): Datos {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      const d = JSON.parse(raw);
      if (esDatos(d)) {
        const anterior = d.version;
        normalizar(d);
        if (d.version !== anterior) guardar(d);
        return d;
      }
    }
  } catch {
    // Almacenamiento no disponible o datos dañados: se empieza de cero.
  }
  return datosIniciales();
}

export function guardar(d: Datos): boolean {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

/** Convierte cualquier valor en un entero >= 0. */
export function entero(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const votosDe = (m: Mesa, col: string, p: string) => m.votos?.[col]?.[p] ?? 0;

export function ponerVotos(m: Mesa, col: string, p: string, n: number) {
  m.votos ??= {};
  (m.votos[col] ??= {})[p] = entero(n);
}

export function mesas(d: Datos, f: Filtro = {}): Ubicada[] {
  const out: Ubicada[] = [];
  for (const colegio of d.colegios) {
    if (f.colegio && colegio.id !== f.colegio) continue;
    for (const aula of colegio.aulas) {
      if (f.aula && aula.id !== f.aula) continue;
      for (const mesa of aula.mesas) {
        if (f.mesa && mesa.id !== f.mesa) continue;
        out.push({ colegio, aula, mesa });
      }
    }
  }
  return out;
}

export function resumen(columna: Columna, lista: Mesa[]): Resumen {
  const suma = (p: string) => lista.reduce((t, m) => t + votosDe(m, columna.id, p), 0);
  const filas = columna.partidos.map((partido) => ({ partido, votos: suma(partido.id) }));
  const validos = filas.reduce((t, f) => t + f.votos, 0);
  const blanco = suma(BLANCO);
  const nulo = suma(NULO);
  return { columna, filas, validos, blanco, nulo, emitidos: validos + blanco + nulo };
}

/** Nombre del colegio; si hay otro con el mismo nombre, se agrega el código del local. */
export function nombreColegio(d: Datos, c: Colegio): string {
  const repetido = d.colegios.some((x) => x !== c && x.nombre === c.nombre);
  return repetido && c.codigo ? `${c.nombre} (local ${c.codigo})` : c.nombre;
}

export const electoresDe = (lista: Mesa[]) => lista.reduce((t, m) => t + (m.electores ?? 0), 0);

export const mesaContada = (d: Datos, m: Mesa) =>
  d.columnas.some((c) => resumen(c, [m]).emitidos > 0);

/** Devuelve una función que genera el siguiente número de mesa libre. */
export function numeradorMesas(d: Datos): () => string {
  let max = 0;
  let largo = 0;
  for (const { mesa } of mesas(d)) {
    if (/^\d+$/.test(mesa.numero)) {
      max = Math.max(max, parseInt(mesa.numero, 10));
      largo = Math.max(largo, mesa.numero.length);
    }
  }
  return () => String(++max).padStart(largo, '0');
}

export const nuevaMesa = (numero: string): Mesa => ({ id: uid(), numero, votos: {} });

/** Quita votos de partidos o columnas que ya no existen. */
export function limpiarVotos(d: Datos) {
  for (const { mesa } of mesas(d)) {
    for (const colId of Object.keys(mesa.votos ?? {})) {
      const col = d.columnas.find((c) => c.id === colId);
      if (!col) {
        delete mesa.votos[colId];
        continue;
      }
      for (const pid of Object.keys(mesa.votos[colId])) {
        if (pid !== BLANCO && pid !== NULO && !col.partidos.some((p) => p.id === pid)) {
          delete mesa.votos[colId][pid];
        }
      }
    }
  }
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export const fmt = (n: number) => n.toLocaleString('es-PE');

export const pct = (n: number, total: number) =>
  total
    ? `${((n / total) * 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
    : '—';

export function opciones(
  sel: HTMLSelectElement,
  items: { id: string; nombre: string }[],
  valor = '',
) {
  sel.innerHTML = items.map((i) => `<option value="${esc(i.id)}">${esc(i.nombre)}</option>`).join('');
  sel.value = valor;
  if (sel.selectedIndex < 0) sel.selectedIndex = 0;
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

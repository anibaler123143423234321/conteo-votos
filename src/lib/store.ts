// Datos del conteo: se guardan en el navegador (localStorage).
import { COLUMNAS_POR_DEFECTO } from '../data/partidos';
import { DISTRITOS } from '../data/provincia-ferrenafe';

export interface Partido {
  id: string;
  nombre: string;
}

export interface Columna {
  id: string;
  titulo: string;
  corto: string;
  /** Si está, la columna solo va en la cédula de ese distrito (alcalde distrital). */
  distrito?: string;
  partidos: Partido[];
}

/** votos[columnaId][partidoId] = cantidad de votos */
export type Votos = Record<string, Record<string, number>>;

export interface Mesa {
  id: string;
  numero: string;
  /** Electores hábiles (si se conoce). */
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

export interface Distrito {
  id: string;
  nombre: string;
  /** Nombre corto para listas y botones. */
  corto?: string;
  /** Capital de provincia: su cédula no tiene columna de alcalde distrital. */
  capital?: boolean;
  /** Los números de mesa ya son los del 4 de octubre. */
  confirmado?: boolean;
  colegios: Colegio[];
}

export interface Datos {
  version: number;
  provincia: string;
  columnas: Columna[];
  distritos: Distrito[];
}

export interface Ubicada {
  distrito: Distrito;
  colegio: Colegio;
  aula: Aula;
  mesa: Mesa;
}

export interface Filtro {
  distrito?: string;
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

const VERSION = 3;
const CLAVE = 'conteo-votos:datos';

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

const columnaDistrital = (x: { id: string; nombre: string }): Columna => ({
  id: `distrital-${x.id}`,
  titulo: `Distrito de ${x.nombre}`,
  corto: 'Distrito',
  distrito: x.id,
  partidos: [],
});

/** Columnas de la provincia y una de alcalde distrital por cada distrito que no es capital. */
export const columnasPorDefecto = (): Columna[] => [
  ...structuredClone(COLUMNAS_POR_DEFECTO),
  ...DISTRITOS.filter((x) => !x.capital).map(columnaDistrital),
];

/** Colegios de un distrito, con un aula por mesa (la ONPE no publica las aulas). */
export const colegiosDe = (distritoId: string): Colegio[] =>
  (DISTRITOS.find((x) => x.id === distritoId)?.locales ?? []).map((local) => ({
    id: uid(),
    codigo: local.codigo,
    nombre: local.nombre,
    aulas: local.mesas.map((numero, i) => ({
      id: uid(),
      nombre: `Aula ${i + 1}`,
      mesas: [{ id: uid(), numero, votos: {} }],
    })),
  }));

const distritosIniciales = (): Distrito[] =>
  DISTRITOS.map((x) => ({
    id: x.id,
    nombre: x.nombre,
    corto: x.corto,
    capital: x.capital,
    confirmado: x.confirmado,
    colegios: colegiosDe(x.id),
  }));

export const datosIniciales = (): Datos => ({
  version: VERSION,
  provincia: 'Ferreñafe',
  columnas: columnasPorDefecto(),
  distritos: distritosIniciales(),
});

/** Columnas que lleva la cédula de un distrito. */
export const columnasDe = (d: Datos, distritoId?: string) =>
  d.columnas.filter((c) => !c.distrito || c.distrito === distritoId);

/** Forma de los datos guardados por versiones anteriores (un solo distrito). */
type DatosAnteriores = Datos & { distrito?: string; colegios?: Colegio[] };

export function esDatos(x: unknown): x is Datos {
  const d = x as DatosAnteriores;
  return (
    !!d &&
    typeof d === 'object' &&
    Array.isArray(d.columnas) &&
    (Array.isArray(d.distritos) || Array.isArray(d.colegios))
  );
}

/** Pone al día datos guardados con una versión anterior, sin perder aulas ni votos. */
export function normalizar(datos: Datos): Datos {
  const d = datos as DatosAnteriores;
  const capital = DISTRITOS.find((x) => x.capital)!;

  // Versión 1: Ferreñafe con los números de mesa de junio → los del 4 de octubre.
  if ((d.version ?? 1) < 2 && d.colegios) {
    const nuevos = new Map<string, string>();
    for (const l of capital.locales) {
      l.mesasJunio?.forEach((n, i) => nuevos.set(`${l.codigo}:${n}`, l.mesas[i]));
    }
    for (const c of d.colegios) {
      const local = capital.locales.find((l) => l.codigo === c.codigo);
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

  // Versión 2: solo el distrito de Ferreñafe → los 6 distritos de la provincia.
  if ((d.version ?? 1) < 3) {
    const distritos = distritosIniciales();
    if (d.colegios) distritos.find((x) => x.id === capital.id)!.colegios = d.colegios;
    d.distritos = distritos;
    for (const col of columnasPorDefecto()) {
      if (!d.columnas.some((c) => c.id === col.id)) d.columnas.push(col);
    }
    d.provincia ||= 'Ferreñafe';
    delete d.colegios;
    delete d.distrito;
    d.version = 3;
  }
  return d;
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
  for (const distrito of d.distritos) {
    if (f.distrito && distrito.id !== f.distrito) continue;
    for (const colegio of distrito.colegios) {
      if (f.colegio && colegio.id !== f.colegio) continue;
      for (const aula of colegio.aulas) {
        if (f.aula && aula.id !== f.aula) continue;
        for (const mesa of aula.mesas) {
          if (f.mesa && mesa.id !== f.mesa) continue;
          out.push({ distrito, colegio, aula, mesa });
        }
      }
    }
  }
  return out;
}

/** Busca un colegio con su distrito. */
export function ubicarColegio(d: Datos, id: string) {
  for (const distrito of d.distritos) {
    const colegio = distrito.colegios.find((c) => c.id === id);
    if (colegio) return { distrito, colegio };
  }
  return undefined;
}

export const ubicarMesa = (d: Datos, id: string) => mesas(d).find((u) => u.mesa.id === id);

/** ¿Otra mesa de la provincia ya usa ese número? */
export const numeroOcupado = (d: Datos, numero: string, exceptoId?: string) =>
  mesas(d).some((u) => u.mesa.numero === numero && u.mesa.id !== exceptoId);

/** Quita las aulas que se quedaron sin mesas. */
export function quitarAulasVacias(c: Colegio) {
  c.aulas = c.aulas.filter((a) => a.mesas.length);
}

export function resumen(columna: Columna, lista: Mesa[]): Resumen {
  const suma = (p: string) => lista.reduce((t, m) => t + votosDe(m, columna.id, p), 0);
  const filas = columna.partidos.map((partido) => ({ partido, votos: suma(partido.id) }));
  const validos = filas.reduce((t, f) => t + f.votos, 0);
  const blanco = suma(BLANCO);
  const nulo = suma(NULO);
  return { columna, filas, validos, blanco, nulo, emitidos: validos + blanco + nulo };
}

/** Nombre del colegio; si otro de la lista se llama igual, se agrega el código del local. */
export function nombreColegio(lista: Colegio[], c: Colegio): string {
  const repetido = lista.some((x) => x !== c && x.nombre === c.nombre);
  return repetido && c.codigo ? `${c.nombre} (local ${c.codigo})` : c.nombre;
}

export const electoresDe = (lista: Mesa[]) => lista.reduce((t, m) => t + (m.electores ?? 0), 0);

export const mesaContada = (d: Datos, m: Mesa) =>
  d.columnas.some((c) => resumen(c, [m]).emitidos > 0);

/** Devuelve una función que genera el siguiente número de mesa libre del distrito. */
export function numeradorMesas(d: Datos, distritoId?: string): () => string {
  let max = 0;
  let largo = 0;
  for (const { mesa } of mesas(d, { distrito: distritoId })) {
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

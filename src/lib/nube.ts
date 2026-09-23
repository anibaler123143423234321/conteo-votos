// Conexión con Supabase: los datos se comparten entre todos los celulares y computadoras.
// Sin PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY la web funciona solo en este navegador.
//
// Cada navegador guarda una copia local y la "base": lo último que sabe que está en la
// nube. Al guardar se suben solo las filas que cambiaron respecto de esa base, así dos
// personas que cuentan mesas distintas no se pisan, y lo hecho sin conexión se sube al volver.
// Un solo "trabajador" sube y trae, una cosa a la vez: nunca se traen datos encima de
// cambios que todavía no se subieron.
//
// Roles (tabla usuarios de esquema.sql): el administrador cambia todo; los personeros solo
// anotan votos. Una cuenta sin rol no ve nada (lo impide Supabase, no solo la web).
import type { SupabaseClient } from '@supabase/supabase-js';
import { guardarCopia, VERSION_DATOS } from './copia';
import type { Aula, Colegio, Columna, Datos, Distrito, Mesa, Votos } from './store';

export const URL_NUBE = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
export const CLAVE_NUBE = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** ¿Esta publicación de la web se conecta con Supabase? */
export const nubeActiva = Boolean(URL_NUBE && CLAVE_NUBE);

let clientePromesa: Promise<SupabaseClient> | null = null;

/** Con mala señal un pedido puede quedar colgado: a los 45 s se da por fallido y se reintenta. */
export function fetchConLimite(url: RequestInfo | URL, opciones: RequestInit = {}) {
  if (typeof AbortSignal.timeout !== 'function') return fetch(url, opciones);
  const limite = AbortSignal.timeout(45000);
  let signal: AbortSignal = limite;
  if (opciones.signal) signal = typeof AbortSignal.any === 'function' ? AbortSignal.any([opciones.signal, limite]) : opciones.signal;
  return fetch(url, { ...opciones, signal });
}

/** Cliente de Supabase; la librería solo se descarga si hace falta. */
export function cliente(): Promise<SupabaseClient> {
  clientePromesa ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_NUBE!, CLAVE_NUBE!, { global: { fetch: fetchConLimite } }),
  );
  return clientePromesa;
}

// ================= Estado (para mostrarlo en pantalla) =================

export type EstadoNube =
  | 'local'
  | 'sin-sesion'
  | 'conectando'
  | 'sincronizado'
  | 'guardando'
  | 'pendiente'
  | 'vacia'
  | 'sin-acceso'
  | 'sin-esquema'
  | 'error';

let estado: EstadoNube = nubeActiva ? 'conectando' : 'local';
let detalle = '';
const oyentes = new Set<(estado: EstadoNube, detalle: string) => void>();

export function alEstado(fn: (estado: EstadoNube, detalle: string) => void) {
  oyentes.add(fn);
  fn(estado, detalle);
}

function cambiar(nuevo: EstadoNube, texto = '') {
  estado = nuevo;
  detalle = texto;
  for (const fn of oyentes) fn(nuevo, texto);
}

const mensaje = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);

const falla = (e: unknown) => cambiar(navigator.onLine ? 'error' : 'pendiente', mensaje(e));

// ================= Sesión =================

// Error de red de Supabase Auth (sin conexión o sin respuesta del servidor).
const sinRed = (e: unknown) => e instanceof Error && e.name === 'AuthRetryableFetchError';

/**
 * Correo del usuario con sesión, o null si no la hay. Sin conexión no se puede renovar
 * una sesión vencida, pero sigue guardada: entonces falla (y se reintenta) en vez de
 * devolver null, para no pedir la contraseña a quien está trabajando sin señal.
 */
export async function usuario(): Promise<string | null> {
  const { data, error } = await (await cliente()).auth.getSession();
  if (!data.session && sinRed(error)) throw error;
  return data.session ? (data.session.user.email ?? 'usuario') : null;
}

/** Devuelve el error para mostrar, o null si entró. */
export async function iniciarSesion(correo: string, clave: string): Promise<string | null> {
  const { error } = await (await cliente()).auth.signInWithPassword({ email: correo, password: clave });
  if (!error) return null;
  if (sinRed(error)) return 'No hay conexión con el servidor. Revisa tu internet.';
  return /invalid login/i.test(error.message) ? 'Correo o contraseña incorrectos.' : error.message;
}

export async function cerrarSesion() {
  await (await cliente()).auth.signOut();
  try {
    localStorage.removeItem(CLAVE_ROL);
  } catch {
    // Nada que borrar.
  }
}

// ================= Rol =================

export type Rol = 'admin' | 'personero';

const CLAVE_ROL = 'conteo-votos:rol';
/** Rol de quien entró: undefined mientras no se sabe; null si su cuenta no tiene acceso. */
let rolActual: Rol | null | undefined;
/** No se pudo preguntar el rol (sin señal): se pregunta al volver la conexión. */
let rolPorAveriguar = false;
const oyentesRol = new Set<(rol: Rol | null | undefined) => void>();

export function alRol(fn: (rol: Rol | null | undefined) => void) {
  oyentesRol.add(fn);
  fn(rolActual);
}

function ponerRol(rol: Rol | null | undefined) {
  rolActual = rol;
  for (const fn of oyentesRol) fn(rol);
}

/** Lo último que se supo del rol en este navegador (sirve sin señal). */
function rolGuardado(id?: string): Rol | null | undefined {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_ROL) ?? 'null');
    if (g && (!id || g.id === id)) return g.rol ?? null;
  } catch {
    // Nada guardado.
  }
  return undefined;
}

/** Falta correr (o volver a correr) supabase/esquema.sql: no existe la tabla o la función. */
const sinEsquema = (e: unknown) =>
  ['PGRST202', 'PGRST205', '42P01', '42883'].includes(String((e as { code?: unknown } | null)?.code ?? ''));
const AVISO_ESQUEMA = 'Falta correr supabase/esquema.sql en Supabase › SQL Editor (la versión nueva, con usuarios).';

/** Pregunta a Supabase qué puede hacer esta cuenta y lo recuerda para cuando no haya señal. */
async function averiguarRol(): Promise<Rol | null> {
  const sb = await cliente();
  const { data, error } = await sb.rpc('mi_rol');
  if (error) throw error;
  const rol: Rol | null = data === 'admin' || data === 'personero' ? data : null;
  rolPorAveriguar = false;
  const id = (await sb.auth.getSession()).data.session?.user.id;
  try {
    localStorage.setItem(CLAVE_ROL, JSON.stringify({ id, rol }));
  } catch {
    // Sin espacio: se vuelve a preguntar la próxima vez.
  }
  ponerRol(rol);
  if (rol === null) cambiar('sin-acceso');
  return rol;
}

// ================= Datos ↔ filas de las tablas =================

const TABLAS = ['distritos', 'colegios', 'aulas', 'mesas', 'columnas', 'partidos', 'votos_mesa'] as const;
type Tabla = (typeof TABLAS)[number];
type Fila = Record<string, unknown>;
type Filas = Record<Tabla, Fila[]>;
/** clave de la fila → fila en JSON canónico */
type Indice = Record<Tabla, Map<string, string>>;

const claveDe = (t: Tabla) => (t === 'votos_mesa' ? 'mesa_id' : 'id');
const vacio = (): Indice => Object.fromEntries(TABLAS.map((t) => [t, new Map()])) as Indice;

/** JSON con las claves ordenadas, para comparar filas sin importar el orden. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

function aFilas(d: Datos): Filas {
  const f = Object.fromEntries(TABLAS.map((t) => [t, []])) as unknown as Filas;
  d.distritos.forEach((x, i) => {
    f.distritos.push({
      id: x.id,
      nombre: x.nombre,
      corto: x.corto ?? null,
      capital: Boolean(x.capital),
      confirmado: Boolean(x.confirmado),
      orden: i,
    });
    x.colegios.forEach((c, j) => {
      f.colegios.push({ id: c.id, distrito_id: x.id, codigo: c.codigo ?? null, nombre: c.nombre, orden: j });
      c.aulas.forEach((a, k) => {
        f.aulas.push({ id: a.id, colegio_id: c.id, nombre: a.nombre, orden: k });
        a.mesas.forEach((m, l) => {
          f.mesas.push({ id: m.id, aula_id: a.id, numero: m.numero, electores: m.electores ?? null, orden: l });
          if (m.votos && Object.keys(m.votos).length) f.votos_mesa.push({ mesa_id: m.id, votos: m.votos });
        });
      });
    });
  });
  d.columnas.forEach((col, i) => {
    f.columnas.push({ id: col.id, titulo: col.titulo, corto: col.corto, distrito_id: col.distrito ?? null, orden: i });
    // Un mismo partido (p. ej. "juntos-por-el-peru") aparece en varias columnas: la fila usa
    // "columna:partido" como clave.
    col.partidos.forEach((p, j) =>
      f.partidos.push({ id: `${col.id}:${p.id}`, columna_id: col.id, partido_id: p.id, nombre: p.nombre, orden: j }),
    );
  });
  return f;
}

function deFilas(f: Filas, provincia: string): Datos {
  const porOrden = (a: Fila, b: Fila) => Number(a.orden ?? 0) - Number(b.orden ?? 0);
  const texto = (v: unknown) => (v == null ? undefined : String(v));

  const distritos = new Map<string, Distrito>();
  for (const r of [...f.distritos].sort(porOrden)) {
    distritos.set(String(r.id), {
      id: String(r.id),
      nombre: String(r.nombre),
      corto: texto(r.corto),
      capital: Boolean(r.capital),
      confirmado: Boolean(r.confirmado),
      colegios: [],
    });
  }
  const colegios = new Map<string, Colegio>();
  for (const r of [...f.colegios].sort(porOrden)) {
    const c: Colegio = { id: String(r.id), codigo: texto(r.codigo), nombre: String(r.nombre), aulas: [] };
    distritos.get(String(r.distrito_id))?.colegios.push(c);
    colegios.set(c.id, c);
  }
  const aulas = new Map<string, Aula>();
  for (const r of [...f.aulas].sort(porOrden)) {
    const a: Aula = { id: String(r.id), nombre: String(r.nombre), mesas: [] };
    colegios.get(String(r.colegio_id))?.aulas.push(a);
    aulas.set(a.id, a);
  }
  const votos = new Map(f.votos_mesa.map((r) => [String(r.mesa_id), (r.votos ?? {}) as Votos]));
  for (const r of [...f.mesas].sort(porOrden)) {
    const m: Mesa = { id: String(r.id), numero: String(r.numero), votos: structuredClone(votos.get(String(r.id)) ?? {}) };
    if (r.electores != null) m.electores = Number(r.electores);
    aulas.get(String(r.aula_id))?.mesas.push(m);
  }
  const columnas: Columna[] = [];
  const porId = new Map<string, Columna>();
  for (const r of [...f.columnas].sort(porOrden)) {
    const c: Columna = { id: String(r.id), titulo: String(r.titulo), corto: String(r.corto ?? r.titulo), partidos: [] };
    if (r.distrito_id) c.distrito = String(r.distrito_id);
    columnas.push(c);
    porId.set(c.id, c);
  }
  for (const r of [...f.partidos].sort(porOrden)) {
    porId.get(String(r.columna_id))?.partidos.push({ id: String(r.partido_id ?? r.id), nombre: String(r.nombre) });
  }
  return { version: VERSION_DATOS, provincia, columnas, distritos: [...distritos.values()] };
}

function indexar(f: Filas): Indice {
  const i = vacio();
  for (const t of TABLAS) for (const fila of f[t]) i[t].set(String(fila[claveDe(t)]), canon(fila));
  return i;
}

// ================= Base: lo último que está en la nube =================

const CLAVE_BASE = 'conteo-votos:nube-base';
let base: Indice | null = null;

function leerBase(): Indice | null {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_BASE) ?? 'null');
    // Otra base de datos (se cambiaron las credenciales): no sirve.
    if (!guardada || guardada.url !== URL_NUBE) return null;
    return Object.fromEntries(TABLAS.map((t) => [t, new Map(guardada.tablas?.[t] ?? [])])) as Indice;
  } catch {
    return null;
  }
}

function guardarBase() {
  try {
    if (!base) localStorage.removeItem(CLAVE_BASE);
    else {
      const tablas = Object.fromEntries(TABLAS.map((t) => [t, [...base![t]]]));
      localStorage.setItem(CLAVE_BASE, JSON.stringify({ url: URL_NUBE, tablas }));
    }
  } catch {
    // Sin espacio: se vuelve a calcular al conectar.
  }
}

// ================= Subir cambios =================

const lotes = <T>(lista: T[], n: number) =>
  Array.from({ length: Math.ceil(lista.length / n) }, (_, i) => lista.slice(i * n, i * n + n));

/** Sube solo lo que cambió respecto de la base: primero altas (de padres a hijos), luego bajas. */
async function subir(d: Datos) {
  const sb = await cliente();
  const nuevo = indexar(aFilas(d));
  const actual = base!;
  // Los personeros solo anotan votos: colegios, mesas y partidos los cambia el administrador.
  const tablas: readonly Tabla[] = rolActual === 'admin' ? TABLAS : ['votos_mesa'];
  try {
    for (const t of tablas) {
      const cambios = [...nuevo[t]].filter(([k, v]) => actual[t].get(k) !== v);
      for (const lote of lotes(cambios, 500)) {
        const { error } = await sb.from(t).upsert(
          lote.map(([, v]) => JSON.parse(v)),
          { onConflict: claveDe(t) },
        );
        if (error) throw error;
        for (const [k, v] of lote) actual[t].set(k, v);
      }
    }
    for (const t of [...tablas].reverse()) {
      const bajas = [...actual[t].keys()].filter((k) => !nuevo[t].has(k));
      for (const lote of lotes(bajas, 200)) {
        const { error } = await sb.from(t).delete().in(claveDe(t), lote);
        if (error) throw error;
        for (const k of lote) actual[t].delete(k);
      }
    }
  } finally {
    // Lo que alcanzó a subir queda anotado aunque algo falle.
    guardarBase();
  }
}

// ================= Traer datos =================

async function traerTabla(sb: SupabaseClient, t: Tabla): Promise<Fila[]> {
  const filas: Fila[] = [];
  // Supabase entrega hasta 1000 filas por consulta.
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb.from(t).select('*').order(claveDe(t)).range(desde, desde + 999);
    if (error) throw error;
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) return filas;
  }
}

async function traer(): Promise<Filas> {
  const sb = await cliente();
  const pares = await Promise.all(TABLAS.map(async (t) => [t, await traerTabla(sb, t)] as const));
  return Object.fromEntries(pares) as Filas;
}

// ================= Sincronizar =================

/** Los datos de la página (siempre el mismo objeto) y cómo repintarla. */
let datos: Datos | null = null;
let repintar: () => void = () => {};
/** Hay cambios hechos aquí que todavía no están en la nube. */
let sucio = false;
/** Hay que traer los datos de la nube. */
let porTraer = false;
let trabajando = false;
let espera: ReturnType<typeof setTimeout> | undefined;
let reintento: ReturnType<typeof setTimeout> | undefined;

const hayCambios = () => sucio && base !== null;

/** Supabase rechazó el pedido por la sesión (la seguridad RLS o un token vencido), no por la red. */
const porSesion = (e: unknown) => {
  const codigo = String((e as { code?: unknown } | null)?.code ?? '');
  return codigo === '42501' || codigo.startsWith('PGRST3');
};

/** Se llama en cada guardar(): junta los cambios y los sube al rato. */
export function programarSubida(d: Datos) {
  if (!nubeActiva || !base || rolActual === null) return;
  datos = d;
  sucio = true;
  cambiar(navigator.onLine ? 'guardando' : 'pendiente');
  clearTimeout(espera);
  espera = setTimeout(trabajar, 500);
}

/** Reemplaza los datos (en el mismo objeto) por los de la nube y repinta. */
function aplicar(remoto: Filas) {
  const d = datos!;
  if (!base) {
    // Primera vez con la nube en este navegador: se guarda lo local por si acaso.
    try {
      localStorage.setItem('conteo-votos:antes-de-la-nube', JSON.stringify(d));
    } catch {
      // Sin espacio: no pasa nada.
    }
  }
  Object.assign(d, deFilas(remoto, d.provincia || 'Ferreñafe'));
  base = indexar(aFilas(d));
  guardarBase();
  guardarCopia(d);
  document.body.classList.remove('cargando-nube');
  repintar();
}

/** Sube lo cambiado aquí y trae lo de la nube, una cosa a la vez, hasta que no quede nada. */
async function trabajar() {
  if (trabajando || !datos || rolActual === null || !(hayCambios() || porTraer)) return;
  trabajando = true;
  clearTimeout(reintento);
  try {
    while (hayCambios() || porTraer) {
      if (hayCambios()) {
        sucio = false;
        try {
          await subir(datos);
        } catch (e) {
          sucio = true;
          throw e;
        }
        continue;
      }
      porTraer = false;
      let remoto: Filas;
      try {
        remoto = await traer();
      } catch (e) {
        porTraer = true;
        throw e;
      }
      // Ya hay señal: si no se pudo antes, se pregunta qué puede hacer esta cuenta.
      if (rolPorAveriguar && (await averiguarRol()) === null) return;
      // Algo cambió aquí mientras se traían los datos: se sube primero y se vuelve a traer.
      if (hayCambios()) {
        porTraer = true;
        continue;
      }
      if (!remoto.distritos.length) {
        // Sin sesión o sin acceso, la seguridad de Supabase devuelve las tablas vacías.
        if (!(await usuario())) return cambiar('sin-sesion');
        if ((await averiguarRol()) === null) return;
        base = null;
        sucio = false;
        guardarBase();
        document.body.classList.remove('cargando-nube');
        return cambiar(
          'vacia',
          rolActual === 'admin'
            ? 'Entra a Administración › Resumen para subir los datos iniciales.'
            : 'El administrador todavía no subió los colegios y mesas.',
        );
      }
      aplicar(remoto);
    }
    cambiar('sincronizado');
  } catch (e) {
    // Se cerró la sesión (venció o la borraron en Supabase) o le quitaron el acceso.
    // (Solo se revisa si Supabase rechazó el pedido: sin red, revisarlo tarda y no hace falta.)
    if (porSesion(e)) {
      const correo = await usuario().catch(() => '');
      if (correo === null) return cambiar('sin-sesion');
      if (correo && (await averiguarRol().catch(() => rolActual)) === null) return;
    }
    if (sinEsquema(e)) {
      cambiar('sin-esquema', AVISO_ESQUEMA);
      reintento = setTimeout(trabajar, 8000);
      return;
    }
    falla(e);
    // Lo anotado queda en este navegador y se reintenta solo.
    reintento = setTimeout(trabajar, 8000);
  } finally {
    trabajando = false;
  }
}

if (nubeActiva && typeof window !== 'undefined') {
  // Sin señal se avisa de inmediato; al volver se sube lo pendiente y se trae lo nuevo.
  window.addEventListener('offline', () => {
    if (['sincronizado', 'guardando', 'conectando', 'error'].includes(estado)) cambiar('pendiente');
  });
  window.addEventListener('online', () => {
    refrescarSiQuieto();
    if (!trabajando && !hayCambios() && !porTraer && estado === 'pendiente') cambiar('sincronizado');
    else trabajar();
  });
}

/** Sube todos los datos de este navegador a una base de datos vacía. */
export async function sembrar(d: Datos) {
  datos = d;
  base = vacio();
  sucio = true;
  cambiar('guardando');
  await trabajar();
}

/** Trae lo nuevo de la nube si no se está escribiendo ni editando (para no repintar encima). */
function refrescarSiQuieto() {
  const activo = document.activeElement;
  const escribiendo = activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement;
  if (!base || escribiendo || document.querySelector('dialog[open]')) return;
  porTraer = true;
  trabajar();
}

/**
 * Conecta la página con la nube: sube lo pendiente, trae los datos y repinta.
 * Con enVivo, además se actualiza sola cuando alguien cambia algo (resultados en vivo).
 */
export async function conectar(d: Datos, repintarPagina: () => void, opciones: { enVivo?: boolean } = {}) {
  if (!nubeActiva) return;
  datos = d;
  repintar = repintarPagina;
  base = leerBase();
  // La primera vez hay que esperar los datos de la nube: lo anotado antes se perdería al
  // traerlos. Si ya se conectó antes, se puede trabajar desde el primer momento.
  if (!base) document.body.classList.add('cargando-nube');
  let id: string | undefined;
  try {
    const { data, error } = await (await cliente()).auth.getSession();
    if (!data.session && sinRed(error)) throw error;
    if (!data.session) return cambiar('sin-sesion');
    id = data.session.user.id;
  } catch {
    // Sin conexión: se sigue con la sesión guardada y la copia de este navegador.
  }
  // Qué puede hacer esta cuenta. Sin señal vale lo último que se supo; si nunca se supo, o
  // si lo último fue «sin acceso» (quizá el administrador ya se lo dio), se espera a Supabase.
  ponerRol(rolGuardado(id));
  const pregunta = averiguarRol().catch((e) => {
    rolPorAveriguar = true;
    if (sinEsquema(e)) cambiar('sin-esquema', AVISO_ESQUEMA);
  });
  if (!rolActual) await pregunta;
  if (rolActual === null) return cambiar('sin-acceso');
  if (estado !== 'sin-esquema') cambiar(navigator.onLine ? 'conectando' : 'pendiente');
  // Primero se sube lo anotado aquí sin conexión (si no hay nada, no se sube nada).
  sucio = base !== null;
  porTraer = true;
  await trabajar();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refrescarSiQuieto();
  });
  if (opciones.enVivo) {
    let pausa: ReturnType<typeof setTimeout> | undefined;
    (await cliente())
      .channel('conteo-votos')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(pausa);
        pausa = setTimeout(refrescarSiQuieto, 800);
      })
      .subscribe();
  }
}

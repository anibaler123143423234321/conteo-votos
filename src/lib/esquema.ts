// El SQL de Supabase viaja dentro de la web (es el mismo archivo del repositorio), para que el
// administrador lo copie con un botón y la web avise cuándo hay que volver a correrlo.
import sql from '../../supabase/esquema.sql?raw';
import { cliente } from './nube';

export const SQL_ESQUEMA: string = sql;

/** Versión que espera esta web: sale del mismo archivo (conteo_version() … select N). */
export const VERSION_ESQUEMA = Number(sql.match(/conteo_version\(\)[\s\S]*?select (\d+)/)?.[1] ?? 0);

export const LINEAS_ESQUEMA = sql.trimEnd().split('\n').length;

/** Versión instalada en Supabase: 0 si es de antes de que existiera el número; null si no se pudo saber. */
export async function versionEnSupabase(): Promise<number | null> {
  const { data, error } = await (await cliente()).rpc('conteo_version');
  if (!error) return Number(data);
  return ['PGRST202', '42883'].includes(String(error.code ?? '')) ? 0 : null;
}

/** Copia el SQL al portapapeles. Devuelve false si el navegador no lo permite. */
export async function copiarEsquema(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(SQL_ESQUEMA);
    return true;
  } catch {
    return false;
  }
}

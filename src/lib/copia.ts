// Copia de los datos en este navegador (localStorage).

export const CLAVE_DATOS = 'conteo-votos:datos';

/** Versión del formato de los datos (ver normalizar() en store.ts). */
export const VERSION_DATOS = 3;

export function leerCopia(): unknown {
  try {
    const raw = localStorage.getItem(CLAVE_DATOS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Almacenamiento no disponible o datos dañados.
    return null;
  }
}

export function guardarCopia(datos: unknown): boolean {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
    return true;
  } catch {
    return false;
  }
}

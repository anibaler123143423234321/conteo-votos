// Íconos de trazo simple para los botones de las tablas.
const svg = (trazos: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazos}</svg>`;

export const ICONO_EDITAR = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
export const ICONO_ELIMINAR = svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>');
export const ICONO_SUBIR = svg('<path d="M12 19V5M5 12l7-7 7 7"/>');
export const ICONO_BAJAR = svg('<path d="M12 5v14M19 12l-7 7-7-7"/>');

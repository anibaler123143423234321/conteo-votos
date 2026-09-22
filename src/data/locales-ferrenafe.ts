// Locales de votación del distrito de Ferreñafe (ubigeo RENIEC 130201) para las
// Elecciones Regionales y Municipales 2026: 12 locales y 101 mesas (034611 a 034711).
//
// Números de mesa: lista de mesas por local para el 4 de octubre de 2026.
// Nombres y códigos de local: ONPE, Segunda Elección Presidencial 2026, recopilado en
// https://github.com/oscarzamora/onpe-scraper-2026-2 (cada local tiene la misma cantidad
// de mesas en ambas listas).

export interface LocalVotacion {
  codigo: string;
  nombre: string;
  /** Primer número de mesa; las mesas de cada local son correlativas. */
  desde: string;
  mesas: number;
  /** Primer número de mesa en la segunda vuelta de junio, para actualizar datos guardados. */
  desdeJunio: string;
  /** Nombre usado antes, si cambió. */
  nombreJunio?: string;
}

export const FUENTE_LOCALES = 'mesas de las ERM 2026; nombres y códigos de local de la ONPE';

export const LOCALES_FERRENAFE: LocalVotacion[] = [
  { codigo: '12302', nombre: 'IEI 106 VIRGEN DE FATIMA', desde: '034611', mesas: 2, desdeJunio: '034985' },
  {
    codigo: '12305',
    nombre: 'IE MANUEL ANTONIO MESONES MURO - SECUNDARIA',
    desde: '034613',
    mesas: 15,
    desdeJunio: '034987',
    nombreJunio: 'IE MANUEL ANTONIO MESONES MURO',
  },
  { codigo: '2570', nombre: 'IE 10057 JOSE MERCEDES ESTEVES CHICOMA', desde: '034628', mesas: 4, desdeJunio: '034947' },
  { codigo: '2571', nombre: 'IE 10059 JUAN GALO MUÑOZ PALACIOS', desde: '034632', mesas: 13, desdeJunio: '034951' },
  { codigo: '2572', nombre: 'IE 10056 HECTOR RENE LA NEGRA ROMERO', desde: '034645', mesas: 8, desdeJunio: '034964' },
  { codigo: '26675', nombre: 'IE 10058 MEDALLA MILAGROSA', desde: '034653', mesas: 9, desdeJunio: '035002' },
  { codigo: '26677', nombre: 'IE 11033 MARIO SAMAME BOGGIO', desde: '034662', mesas: 6, desdeJunio: '035011' },
  {
    codigo: '31686',
    nombre: 'IES ESCUELA DE EDUCACION SUPERIOR FRANCISCO GONZALES BURGA',
    desde: '034668',
    mesas: 4,
    desdeJunio: '035017',
  },
  { codigo: '31690', nombre: 'CEP PEDRO RUIZ GALLO', desde: '034672', mesas: 5, desdeJunio: '035021' },
  { codigo: '40448', nombre: 'IEI 101 NIÑO JESUS DE PRAGA', desde: '034677', mesas: 6, desdeJunio: '035026' },
  {
    codigo: '50661',
    nombre: 'IE MANUEL ANTONIO MESONES MURO - PRIMARIA',
    desde: '034683',
    mesas: 16,
    desdeJunio: '035032',
    nombreJunio: 'IE MANUEL ANTONIO MESONES MURO',
  },
  { codigo: '7539', nombre: 'IE 10626 JOSE CESAR SOLIS CELIS', desde: '034699', mesas: 13, desdeJunio: '034972' },
];

/** Números correlativos: numerosDeMesa('034611', 3) → ['034611', '034612', '034613']. */
export const numerosDeMesa = (desde: string, cantidad: number) =>
  Array.from({ length: cantidad }, (_, i) =>
    String(parseInt(desde, 10) + i).padStart(desde.length, '0'),
  );

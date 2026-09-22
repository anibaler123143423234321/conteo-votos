// Locales de votación y mesas de la provincia de Ferreñafe (Lambayeque) para las
// Elecciones Regionales y Municipales del 4 de octubre de 2026: 6 distritos, 53 locales
// y 305 mesas.
//
// - Distrito de Ferreñafe: números de mesa de la lista de mesas por local para el 4 de
//   octubre (034611 a 034711).
// - Demás distritos: números de mesa de la segunda vuelta de junio de 2026 (ONPE), por
//   confirmar: en Ferreñafe cambiaron para octubre y aquí también podrían cambiar.
// Nombres y códigos de local: ONPE, Segunda Elección Presidencial 2026, recopilado en
// https://github.com/oscarzamora/onpe-scraper-2026-2 (output/mesas_data.txt).

export interface LocalVotacion {
  codigo: string;
  nombre: string;
  mesas: string[];
  /** Números de mesa de junio, para actualizar datos guardados con la versión anterior. */
  mesasJunio?: string[];
  /** Nombre usado antes, si cambió. */
  nombreJunio?: string;
}

export interface DistritoBase {
  id: string;
  nombre: string;
  /** Nombre corto para listas y botones. */
  corto?: string;
  /** Ubigeo de RENIEC. */
  ubigeo: string;
  /** Capital de provincia: su cédula no tiene columna de alcalde distrital. */
  capital?: boolean;
  /** Los números de mesa ya son los del 4 de octubre. */
  confirmado: boolean;
  locales: LocalVotacion[];
}

/** Números correlativos: numerosDeMesa('034611', 3) → ['034611', '034612', '034613']. */
export const numerosDeMesa = (desde: string, cantidad: number) =>
  Array.from({ length: cantidad }, (_, i) =>
    String(parseInt(desde, 10) + i).padStart(desde.length, '0'),
  );

export const FUENTE_MESAS_OCTUBRE = 'mesas del 4 de octubre';
export const FUENTE_MESAS_JUNIO = 'números de mesa de junio (ONPE), por confirmar';

export const DISTRITOS: DistritoBase[] = [
  {
    id: 'ferrenafe',
    nombre: 'Ferreñafe',
    ubigeo: '130201',
    capital: true,
    confirmado: true,
    locales: [
      {
        codigo: '12302',
        nombre: 'IEI 106 VIRGEN DE FATIMA',
        mesas: numerosDeMesa('034611', 2),
        mesasJunio: numerosDeMesa('034985', 2),
      },
      {
        codigo: '12305',
        nombre: 'IE MANUEL ANTONIO MESONES MURO - SECUNDARIA',
        mesas: numerosDeMesa('034613', 15),
        mesasJunio: numerosDeMesa('034987', 15),
        nombreJunio: 'IE MANUEL ANTONIO MESONES MURO',
      },
      {
        codigo: '2570',
        nombre: 'IE 10057 JOSE MERCEDES ESTEVES CHICOMA',
        mesas: numerosDeMesa('034628', 4),
        mesasJunio: numerosDeMesa('034947', 4),
      },
      {
        codigo: '2571',
        nombre: 'IE 10059 JUAN GALO MUÑOZ PALACIOS',
        mesas: numerosDeMesa('034632', 13),
        mesasJunio: numerosDeMesa('034951', 13),
      },
      {
        codigo: '2572',
        nombre: 'IE 10056 HECTOR RENE LA NEGRA ROMERO',
        mesas: numerosDeMesa('034645', 8),
        mesasJunio: numerosDeMesa('034964', 8),
      },
      {
        codigo: '26675',
        nombre: 'IE 10058 MEDALLA MILAGROSA',
        mesas: numerosDeMesa('034653', 9),
        mesasJunio: numerosDeMesa('035002', 9),
      },
      {
        codigo: '26677',
        nombre: 'IE 11033 MARIO SAMAME BOGGIO',
        mesas: numerosDeMesa('034662', 6),
        mesasJunio: numerosDeMesa('035011', 6),
      },
      {
        codigo: '31686',
        nombre: 'IES ESCUELA DE EDUCACION SUPERIOR FRANCISCO GONZALES BURGA',
        mesas: numerosDeMesa('034668', 4),
        mesasJunio: numerosDeMesa('035017', 4),
      },
      {
        codigo: '31690',
        nombre: 'CEP PEDRO RUIZ GALLO',
        mesas: numerosDeMesa('034672', 5),
        mesasJunio: numerosDeMesa('035021', 5),
      },
      {
        codigo: '40448',
        nombre: 'IEI 101 NIÑO JESUS DE PRAGA',
        mesas: numerosDeMesa('034677', 6),
        mesasJunio: numerosDeMesa('035026', 6),
      },
      {
        codigo: '50661',
        nombre: 'IE MANUEL ANTONIO MESONES MURO - PRIMARIA',
        mesas: numerosDeMesa('034683', 16),
        mesasJunio: numerosDeMesa('035032', 16),
        nombreJunio: 'IE MANUEL ANTONIO MESONES MURO',
      },
      {
        codigo: '7539',
        nombre: 'IE 10626 JOSE CESAR SOLIS CELIS',
        mesas: numerosDeMesa('034699', 13),
        mesasJunio: numerosDeMesa('034972', 13),
      },
    ],
  },
  {
    id: 'pitipo',
    nombre: 'Pitipo',
    ubigeo: '130204',
    confirmado: false,
    locales: [
      { codigo: '2585', nombre: 'IE 11034', mesas: numerosDeMesa('035091', 3) },
      { codigo: '2586', nombre: 'IE AMALIA CAMPOS DE BELEVAN', mesas: numerosDeMesa('035094', 6) },
      { codigo: '2587', nombre: 'IE JUAN AURICH PASTOR', mesas: numerosDeMesa('035100', 16) },
      { codigo: '12311', nombre: 'IE 10100 DAGMAR CASTAÑEDA SANTOYO', mesas: numerosDeMesa('035116', 1) },
      { codigo: '12318', nombre: 'IE 11534 JOSE E CAMPOS PERALTA', mesas: numerosDeMesa('035117', 17) },
      { codigo: '40453', nombre: 'IE 11536 LOS ALGARROBOS', mesas: numerosDeMesa('035134', 8) },
      { codigo: '40454', nombre: 'IESM LUIS ALBERTO SANCHEZ', mesas: numerosDeMesa('035142', 7) },
      { codigo: '18194', nombre: 'IE LUIS FELIPE DE LAS CASAS GRIEVE', mesas: numerosDeMesa('902949', 2) },
    ],
  },
  {
    id: 'incahuasi',
    nombre: 'Incahuasi',
    ubigeo: '130202',
    confirmado: false,
    locales: [
      {
        codigo: '2580',
        nombre: 'IE 10084 VIRGEN DE LAS MERCEDES SECUNDARIA',
        mesas: ['035048', '035049', '035050', '035060', '035061', '035062'],
      },
      {
        codigo: '51481',
        nombre: 'IEPSM 10084 VIRGEN DE LAS MERCEDES PRIMARIA',
        mesas: ['035051', '035071', '035072', '035073', '035074', '035075', '035076'],
      },
      { codigo: '35409', nombre: 'IE 10090', mesas: numerosDeMesa('035052', 8) },
      { codigo: '51308', nombre: 'IE 10859 SAN PABLO DE HUASICAJ', mesas: numerosDeMesa('035063', 8) },
      { codigo: '2576', nombre: 'IE 10083 INDOAMERICA', mesas: numerosDeMesa('902901', 2) },
      { codigo: '2577', nombre: 'IE 10907', mesas: numerosDeMesa('902903', 2) },
      { codigo: '2579', nombre: 'IE 10080', mesas: numerosDeMesa('902905', 4) },
      { codigo: '7316', nombre: 'IE 10817', mesas: numerosDeMesa('902909', 1) },
      {
        codigo: '50159',
        nombre: 'IE 10081 ALEJANDRO AUSBERTO CORONEL SAAVEDRA',
        mesas: numerosDeMesa('902910', 1),
      },
      { codigo: '53397', nombre: 'IE 10791', mesas: numerosDeMesa('902911', 1) },
      { codigo: '53551', nombre: 'IE 10082 SAGRADO CORAZON DE JESUS', mesas: numerosDeMesa('902912', 4) },
      {
        codigo: '55084',
        nombre: 'IE 10087 NUESTRA SEÑORA VIRGEN DEL CARMEN',
        mesas: numerosDeMesa('902916', 1),
      },
    ],
  },
  {
    id: 'canaris',
    nombre: 'Cañaris',
    ubigeo: '130203',
    confirmado: false,
    locales: [
      { codigo: '2581', nombre: 'IE 10062 SAN JUAN DE KAÑARIS', mesas: numerosDeMesa('035077', 12) },
      { codigo: '2582', nombre: 'IEI 105', mesas: numerosDeMesa('035089', 2) },
      { codigo: '2583', nombre: 'IE 10068', mesas: numerosDeMesa('902917', 4) },
      { codigo: '2584', nombre: 'IE 10078 TUPAC AMARU II', mesas: numerosDeMesa('902921', 5) },
      { codigo: '7163', nombre: 'IEPS 10191 IEPS MARIA ELENA MOYANO', mesas: numerosDeMesa('902926', 4) },
      { codigo: '7317', nombre: 'IEIPSM 10776 JUAN VELASCO ALVARADO', mesas: numerosDeMesa('902930', 4) },
      { codigo: '7318', nombre: 'IE 11048 MAMAGPAMPA', mesas: numerosDeMesa('902934', 2) },
      { codigo: '50158', nombre: 'IE 10624 INTEGRADA', mesas: numerosDeMesa('902936', 2) },
      { codigo: '53409', nombre: 'IE 10875', mesas: numerosDeMesa('902938', 2) },
      { codigo: '53412', nombre: 'IE 10065', mesas: numerosDeMesa('902940', 4) },
      { codigo: '53655', nombre: 'IE 10073 VIRGEN DE FATIMA', mesas: numerosDeMesa('902944', 3) },
      { codigo: '53692', nombre: 'IE INTEGRADO 10067', mesas: numerosDeMesa('902947', 2) },
    ],
  },
  {
    id: 'pueblo-nuevo',
    nombre: 'Pueblo Nuevo',
    ubigeo: '130205',
    confirmado: false,
    locales: [
      { codigo: '2588', nombre: 'IE 11035 SANTO DOMINGO SAVIO', mesas: numerosDeMesa('035149', 13) },
      { codigo: '2589', nombre: 'IE PERU BIRF', mesas: numerosDeMesa('035162', 13) },
      { codigo: '26731', nombre: 'CETPRO JAVIER PEREZ DE CUELLAR', mesas: numerosDeMesa('035175', 1) },
      { codigo: '50850', nombre: 'IEI 102 AUGUSTO SALCEDO PASTOR', mesas: numerosDeMesa('035176', 5) },
      { codigo: '51317', nombre: 'IEI 314 NUESTRA SEÑORA DE GUADALUPE', mesas: numerosDeMesa('035181', 4) },
      { codigo: '51318', nombre: 'IEI 310 JESUS DIVINO TESORO', mesas: numerosDeMesa('035185', 4) },
    ],
  },
  {
    id: 'mesones-muro',
    nombre: 'Manuel Antonio Mesones Muro',
    corto: 'Mesones Muro',
    ubigeo: '130206',
    confirmado: false,
    locales: [
      { codigo: '2590', nombre: 'IE 10094 ROSA MURO GUEVARA DE BARRAGAN', mesas: numerosDeMesa('035189', 6) },
      { codigo: '2591', nombre: 'IE ROSA MURO GUEVARA DE BARRAGAN', mesas: numerosDeMesa('035195', 4) },
      { codigo: '53156', nombre: 'IEI 107', mesas: numerosDeMesa('035199', 3) },
    ],
  },
];

// Locales de votación del distrito de Ferreñafe (ubigeo RENIEC 130201): 12 locales,
// 101 mesas y 29 751 electores hábiles.
// Fuente: ONPE, Segunda Elección Presidencial 2026 (junio de 2026), recopilado en
// https://github.com/oscarzamora/onpe-scraper-2026-2 (output/mesas_data.txt).
// Para las Elecciones Regionales y Municipales 2026 los números de mesa pueden cambiar.

export interface LocalOnpe {
  codigo: string;
  nombre: string;
  /** [número de mesa, electores hábiles] */
  mesas: [string, number][];
}

export const FUENTE_LOCALES = 'ONPE · Segunda Elección Presidencial 2026';

export const LOCALES_FERRENAFE: LocalOnpe[] = [
  {
    codigo: '2570',
    nombre: 'IE 10057 JOSE MERCEDES ESTEVES CHICOMA',
    mesas: [
      ['034947', 267], ['034948', 300], ['034949', 300], ['034950', 300],
    ],
  },
  {
    codigo: '2571',
    nombre: 'IE 10059 JUAN GALO MUÑOZ PALACIOS',
    mesas: [
      ['034951', 231], ['034952', 300], ['034953', 300], ['034954', 300], ['034955', 300],
      ['034956', 300], ['034957', 300], ['034958', 300], ['034959', 300], ['034960', 300],
      ['034961', 300], ['034962', 300], ['034963', 300],
    ],
  },
  {
    codigo: '2572',
    nombre: 'IE 10056 HECTOR RENE LA NEGRA ROMERO',
    mesas: [
      ['034964', 272], ['034965', 300], ['034966', 300], ['034967', 300], ['034968', 300],
      ['034969', 300], ['034970', 300], ['034971', 300],
    ],
  },
  {
    codigo: '7539',
    nombre: 'IE 10626 JOSE CESAR SOLIS CELIS',
    mesas: [
      ['034972', 230], ['034973', 300], ['034974', 300], ['034975', 300], ['034976', 300],
      ['034977', 300], ['034978', 300], ['034979', 300], ['034980', 300], ['034981', 300],
      ['034982', 300], ['034983', 300], ['034984', 300],
    ],
  },
  {
    codigo: '12302',
    nombre: 'IEI 106 VIRGEN DE FATIMA',
    mesas: [
      ['034985', 230], ['034986', 300],
    ],
  },
  {
    codigo: '12305',
    nombre: 'IE MANUEL ANTONIO MESONES MURO',
    mesas: [
      ['034987', 272], ['034988', 300], ['034989', 300], ['034990', 300], ['034991', 300],
      ['034992', 300], ['034993', 300], ['034994', 300], ['034995', 300], ['034996', 300],
      ['034997', 300], ['034998', 300], ['034999', 300], ['035000', 300], ['035001', 300],
    ],
  },
  {
    codigo: '26675',
    nombre: 'IE 10058 MEDALLA MILAGROSA',
    mesas: [
      ['035002', 285], ['035003', 300], ['035004', 300], ['035005', 300], ['035006', 300],
      ['035007', 300], ['035008', 300], ['035009', 300], ['035010', 300],
    ],
  },
  {
    codigo: '26677',
    nombre: 'IE 11033 MARIO SAMAME BOGGIO',
    mesas: [
      ['035011', 230], ['035012', 300], ['035013', 300], ['035014', 300], ['035015', 300],
      ['035016', 300],
    ],
  },
  {
    codigo: '31686',
    nombre: 'IES ESCUELA DE EDUCACION SUPERIOR FRANCISCO GONZALES BURGA',
    mesas: [
      ['035017', 290], ['035018', 300], ['035019', 300], ['035020', 300],
    ],
  },
  {
    codigo: '31690',
    nombre: 'CEP PEDRO RUIZ GALLO',
    mesas: [
      ['035021', 246], ['035022', 300], ['035023', 300], ['035024', 300], ['035025', 300],
    ],
  },
  {
    codigo: '40448',
    nombre: 'IEI 101 NIÑO JESUS DE PRAGA',
    mesas: [
      ['035026', 279], ['035027', 300], ['035028', 300], ['035029', 300], ['035030', 300],
      ['035031', 300],
    ],
  },
  {
    codigo: '50661',
    nombre: 'IE MANUEL ANTONIO MESONES MURO',
    mesas: [
      ['035032', 293], ['035033', 296], ['035034', 295], ['035035', 295], ['035036', 295],
      ['035037', 295], ['035038', 295], ['035039', 295], ['035040', 295], ['035041', 295],
      ['035042', 295], ['035043', 295], ['035044', 295], ['035045', 295], ['035046', 295],
      ['035047', 295],
    ],
  },
];

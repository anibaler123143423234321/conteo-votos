// Partidos de cada columna de la cédula, en el orden en que aparecen.

export interface PartidoBase {
  id: string;
  nombre: string;
}

export interface ColumnaBase {
  id: string;
  /** Título completo de la columna. */
  titulo: string;
  /** Nombre corto para las pestañas. */
  corto: string;
  partidos: PartidoBase[];
}

const slug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const lista = (nombres: string[]): PartidoBase[] =>
  nombres.map((nombre) => ({ id: slug(nombre), nombre }));

export const COLUMNAS_POR_DEFECTO: ColumnaBase[] = [
  {
    id: 'gobernador',
    titulo: 'Gobernador y Vicegobernador Regional',
    corto: 'Gobernador',
    partidos: lista([
      'JUNTOS POR EL PERÚ',
      'ACCIÓN POPULAR',
      'PARTIDO POLÍTICO TODO CON EL PUEBLO',
      'RENOVACIÓN POPULAR PERÚ',
      'FE EN EL PERÚ',
      'PARTIDO POPULAR CRISTIANO - PPC',
      'FRENTE POPULAR AGRÍCOLA FIA DEL PERÚ',
      'FUERZA POPULAR',
      'AVANZA PAÍS - PARTIDO DE INTEGRACIÓN SOCIAL',
      'PARTIDO POLÍTICO PERÚ PRIMERO',
      'AHORA NACIÓN - AN',
      'PARTIDO POLÍTICO PUEBLO CONSCIENTE',
      'PARTIDO DEMOCRÁTICO SOMOS PERÚ',
      'PARTIDO APRISTA PERUANO',
      'ALIANZA ELECTORAL VENCEREMOS',
    ]),
  },
  {
    id: 'consejo',
    titulo: 'Consejo Regional de la Provincia de Ferreñafe',
    corto: 'Consejero',
    partidos: lista([
      'JUNTOS POR EL PERÚ',
      'ACCIÓN POPULAR',
      'RENOVACIÓN POPULAR PERÚ',
      'FE EN EL PERÚ',
      'PARTIDO POPULAR CRISTIANO - PPC',
      'FRENTE POPULAR AGRÍCOLA FIA DEL PERÚ',
      'FUERZA POPULAR',
      'AVANZA PAÍS - PARTIDO DE INTEGRACIÓN SOCIAL',
      'PARTIDO POLÍTICO PERÚ PRIMERO',
      'AHORA NACIÓN - AN',
      'PARTIDO POLÍTICO PUEBLO CONSCIENTE',
      'PARTIDO DEMOCRÁTICO SOMOS PERÚ',
      'PARTIDO APRISTA PERUANO',
      'ALIANZA ELECTORAL VENCEREMOS',
    ]),
  },
  {
    id: 'provincial',
    titulo: 'Provincia de Ferreñafe',
    corto: 'Provincia',
    partidos: lista([
      'ALIANZA PARA EL PROGRESO',
      'JUNTOS POR EL PERÚ',
      'ACCIÓN POPULAR',
      'RENOVACIÓN POPULAR PERÚ',
      'PARTIDO POPULAR CRISTIANO - PPC',
      'FUERZA POPULAR',
      'PARTIDO POLÍTICO PERÚ PRIMERO',
      'PARTIDO DEMOCRÁTICO SOMOS PERÚ',
    ]),
  },
];

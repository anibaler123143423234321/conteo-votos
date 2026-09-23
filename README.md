# Conteo de votos

Web simple hecha con [Astro](https://astro.build) para contar votos por mesa
(Elecciones Regionales y Municipales — Provincia de Ferreñafe).

## Cómo funciona

La web tiene dos partes:

### Conteo — `/`

La pantalla para los personeros: elige distrito → colegio → aula → mesa y anota los votos
de cada partido (con − / + o escribiendo el número), más votos en blanco y nulos. Se guarda
solo. Avisa si los totales de las columnas no coinciden o si hay más de 300 votos. Con
teclado, <kbd>Enter</kbd> pasa al siguiente partido. En computadora todas las columnas (3 o 4)
entran en una sola pantalla; en celular se cambia de columna con las pestañas.

### Administración — `/admin`

| Ruta | Qué hay |
|---|---|
| `/admin` | Resumen: mesas contadas, avance por distrito, respaldo (descargar / cargar) y borrar datos. |
| `/admin/resultados` | Resultados de toda la provincia o por distrito, colegio, aula o mesa; CSV para Excel. |
| `/admin/colegios` | CRUD de colegios: crear (con cantidad de aulas y mesas), editar, eliminar, buscar. |
| `/admin/mesas` | CRUD de mesas: crear, editar (número, aula, electores), eliminar, ir a contarla. |
| `/admin/partidos` | CRUD de partidos por columna de la cédula: crear, editar, ordenar, eliminar. |

Las rutas viejas (`/resultados`, `/colegios`, `/partidos`) redirigen a las nuevas.

**Datos incluidos** (`src/data/provincia-ferrenafe.ts`): los 6 distritos de la provincia de
Ferreñafe con sus locales de votación y mesas (53 locales, 305 mesas):

| Distrito | Locales | Mesas | Números de mesa |
|---|---:|---:|---|
| Ferreñafe | 12 | 101 | del 4 de octubre (034611 al 034711) |
| Pitipo | 8 | 60 | de junio, por confirmar |
| Incahuasi | 12 | 45 | de junio, por confirmar |
| Cañaris | 12 | 46 | de junio, por confirmar |
| Pueblo Nuevo | 6 | 40 | de junio, por confirmar |
| Manuel Antonio Mesones Muro | 3 | 13 | de junio, por confirmar |

Nombres y códigos de local: ONPE (segunda vuelta de junio 2026). La ONPE no publica las
aulas: cada mesa va en su propia aula ("Aula 1", "Aula 2"…) y se pueden renombrar.

Partidos: las 3 columnas que comparten todos los distritos (Gobernador y Vicegobernador
Regional, Consejo Regional y Provincia de Ferreñafe) ya vienen cargadas. Los distritos que
no son la capital tienen una 4ª columna de alcalde distrital ("Distrito de Pitipo", etc.)
cuyos partidos se agregan en `/admin/partidos`.

La web abre en modo claro; el botón de la luna activa el modo oscuro para quien lo prefiera.

Los datos se guardan en el navegador (`localStorage`), no hay servidor ni base de datos.
Descarga un respaldo de vez en cuando desde `/admin`.

## Comandos

```sh
npm install      # instalar dependencias
npm run dev      # servidor local en http://localhost:4321
npm run build    # genera el sitio estático en ./dist
npm run preview  # previsualiza el build
```

Requiere Node 22.12 o superior. El sitio es estático: `dist/` se puede publicar en
Netlify, Vercel, GitHub Pages o cualquier hosting de archivos.

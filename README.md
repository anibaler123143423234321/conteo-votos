# Conteo de votos

Web simple hecha con [Astro](https://astro.build) para contar votos por mesa
(Elecciones Regionales y Municipales — Provincia de Ferreñafe).

## Cómo funciona

1. **Colegios** — ya vienen cargados los 6 distritos de la provincia de Ferreñafe con sus
   locales de votación y mesas (53 locales, 305 mesas; ver `src/data/provincia-ferrenafe.ts`):

   | Distrito | Locales | Mesas | Números de mesa |
   |---|---:|---:|---|
   | Ferreñafe | 12 | 101 | del 4 de octubre (034611 al 034711) |
   | Pitipo | 8 | 60 | de junio, por confirmar |
   | Incahuasi | 12 | 45 | de junio, por confirmar |
   | Cañaris | 12 | 46 | de junio, por confirmar |
   | Pueblo Nuevo | 6 | 40 | de junio, por confirmar |
   | Manuel Antonio Mesones Muro | 3 | 13 | de junio, por confirmar |

   Nombres y códigos de local: ONPE (segunda vuelta de junio 2026). La ONPE no publica las
   aulas: cada mesa va en su propia aula ("Aula 1", "Aula 2"…) y se pueden renombrar,
   corregir números de mesa o agregar más colegios con su cantidad de aulas y mesas.
2. **Partidos** — ya vienen cargados los partidos de las 3 columnas que comparten todos los
   distritos (Gobernador y Vicegobernador Regional, Consejo Regional y Provincia de
   Ferreñafe). Los distritos que no son la capital tienen una 4ª columna de alcalde
   distrital ("Distrito de Pitipo", etc.) cuyos partidos se agregan en esta página.
3. **Conteo** — elige distrito → colegio → aula → mesa y anota la cantidad de votos de cada partido
   (con los botones − / + o escribiendo el número), además de votos en blanco y nulos.
   Se guarda solo. Si los totales de las columnas no coinciden, aparece un aviso.
   Con teclado, <kbd>Enter</kbd> pasa al siguiente partido. En computadora todas las columnas (3 o 4)
   entran en una sola pantalla; en celular se cambia de columna con las pestañas.
4. **Resultados** — totales y porcentajes por columna de toda la provincia o filtrando por
   distrito, colegio, aula o mesa.
   Desde ahí puedes descargar un CSV para Excel o un respaldo en JSON (y cargarlo en otra
   computadora).

El botón de la luna/sol (arriba a la derecha) cambia entre modo claro y oscuro.

Los datos se guardan en el navegador (`localStorage`), no hay servidor ni base de datos.
Descarga un respaldo de vez en cuando.

## Comandos

```sh
npm install      # instalar dependencias
npm run dev      # servidor local en http://localhost:4321
npm run build    # genera el sitio estático en ./dist
npm run preview  # previsualiza el build
```

Requiere Node 22.12 o superior. El sitio es estático: `dist/` se puede publicar en
Netlify, Vercel, GitHub Pages o cualquier hosting de archivos.

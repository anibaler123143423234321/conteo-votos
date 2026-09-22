# Conteo de votos

Web simple hecha con [Astro](https://astro.build) para contar votos por mesa
(Elecciones Regionales y Municipales — Provincia de Ferreñafe).

## Cómo funciona

1. **Colegios** — ya vienen cargados los 12 locales de votación del distrito de Ferreñafe
   con sus 101 mesas y electores hábiles (datos de la ONPE, segunda vuelta de junio 2026,
   ver `src/data/locales-ferrenafe.ts`). Cada mesa va en su propia aula; puedes renombrar
   aulas, corregir números de mesa o agregar más colegios con su cantidad de aulas y mesas.
2. **Partidos** — ya vienen cargados los partidos de las 3 columnas de la cédula
   (Gobernador y Vicegobernador Regional, Consejo Regional y Provincia de Ferreñafe).
   Puedes crear, renombrar, ordenar o quitar partidos.
3. **Conteo** — elige colegio → aula → mesa y anota la cantidad de votos de cada partido
   (con los botones − / + o escribiendo el número), además de votos en blanco y nulos.
   Se guarda solo. Si los totales de las columnas no coinciden, aparece un aviso.
   Con teclado, <kbd>Enter</kbd> pasa al siguiente partido. En computadora las 3 columnas
   entran en una sola pantalla; en celular se cambia de columna con las pestañas.
4. **Resultados** — totales y porcentajes por columna, filtrando por colegio, aula o mesa.
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

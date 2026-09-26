// @ts-check
import { defineConfig } from 'astro/config';

// Solo hacen falta si la web se publica en una subcarpeta, por ejemplo en GitHub Pages
// (https://usuario.github.io/conteo-votos/). En Vercel no se usan.
const base = process.env.BASE_PATH || '/';
const prefijo = base.replace(/\/$/, '');

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE || undefined,
  base,
  // Las páginas de administración ahora están bajo /admin.
  redirects: {
    '/resultados': `${prefijo}/admin/resultados`,
    '/colegios': `${prefijo}/admin/colegios`,
    '/partidos': `${prefijo}/admin/partidos`,
    '/admin/personeros': `${prefijo}/admin/usuarios`,
  },
});

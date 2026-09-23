// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Las páginas de administración ahora están bajo /admin.
  redirects: {
    '/resultados': '/admin/resultados',
    '/colegios': '/admin/colegios',
    '/partidos': '/admin/partidos',
  },
});

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

Sin Supabase, los datos se guardan solo en el navegador (`localStorage`). Con Supabase se
comparten entre todos los celulares y computadoras (ver abajo). En los dos casos se puede
descargar un respaldo desde `/admin`.

## Conectar con Supabase

Con Supabase, todos los personeros ven y guardan en la misma base de datos, cada mesa se
guarda por separado (dos personas contando mesas distintas no se pisan), lo que se anota
sin internet se sube al volver la conexión, y Resumen y Resultados se actualizan solos.
Para entrar hace falta usuario y contraseña.

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratis alcanza).
2. **SQL Editor → New query**: pega todo [`supabase/esquema.sql`](supabase/esquema.sql) y
   dale **Run**. Crea las tablas, la seguridad (solo usuarios con sesión) y el tiempo real.
3. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*, así
   nadie más puede crearse una cuenta.
4. **Authentication → Users → Add user → Create new user**: crea un usuario (correo y
   contraseña, con *Auto Confirm User*) para cada administrador y personero.
5. Botón **Connect** del proyecto (o *Project Settings → Data API* y *API Keys*): copia la
   *Project URL* y la clave pública (*publishable*, o *anon public* en *Legacy API Keys*).
   **Nunca** uses la clave *secret* / *service_role*.
6. Pon esas dos variables donde se publica la web:

   | Variable | Valor |
   |---|---|
   | `PUBLIC_SUPABASE_URL` | la Project URL, p. ej. `https://abcd1234.supabase.co` |
   | `PUBLIC_SUPABASE_ANON_KEY` | la clave pública |

   - **Vercel** (conteo-votos.vercel.app): *Project → Settings → Environment Variables*,
     agrégalas y luego *Deployments → Redeploy*. Vercel no lee los secretos de GitHub.
   - **GitHub Pages**: *Settings → Secrets and variables → Actions → New repository secret*
     (los mismos nombres); *Settings → Pages → Source: GitHub Actions*; y en *Actions →
     Publicar en GitHub Pages → Run workflow*. Queda en
     `https://anibaler123143423234321.github.io/conteo-votos/`.
   - **En tu computadora**: copia `.env.example` como `.env` y complétalo.
7. Entra a la web con tu usuario, ve a **Administración → Resumen** y pulsa
   **Subir datos a Supabase** (solo la primera vez). Desde ahí todos trabajan con esos datos.

## Comandos

```sh
npm install      # instalar dependencias
npm run dev      # servidor local en http://localhost:4321
npm run build    # genera el sitio estático en ./dist
npm run preview  # previsualiza el build
```

Requiere Node 22.12 o superior. El sitio es estático: `dist/` se puede publicar en
Netlify, Vercel, GitHub Pages o cualquier hosting de archivos.

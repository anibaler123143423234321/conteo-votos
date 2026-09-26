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
entran en una sola pantalla; en celular se cambia de columna con las pestañas. El enlace
**Total del distrito** abre la suma de todas las mesas del distrito elegido. Arriba, el botón
**Administración** lleva al panel. Con Supabase, ese botón, el enlace al total y los avisos
que mandan a Administración solo los ve el administrador; el personero ve solo el conteo.

### Administración — `/admin`

| Ruta | Qué hay |
|---|---|
| `/admin` | Resumen: mesas contadas, avance por distrito, respaldo (descargar / cargar) y borrar datos. |
| `/admin/resultados` | Total de la provincia, de un distrito, colegio, aula o mesa (el título dice cuál), tabla **Total por distrito** con todos los distritos lado a lado y CSV para Excel. Se puede abrir filtrado: `/admin/resultados?distrito=pitipo`. |
| `/admin/colegios` | CRUD de colegios: crear (con cantidad de aulas y mesas), editar, eliminar, buscar. |
| `/admin/mesas` | CRUD de mesas: crear, editar (número, aula, electores), eliminar, ir a contarla. |
| `/admin/partidos` | CRUD de partidos por columna de la cédula: crear, editar, ordenar, eliminar. |
| `/admin/usuarios` | Solo con Supabase: crear personeros y administradores, cambiarles el rol o la contraseña, quitarles o devolverles el acceso y ver cuántas mesas anotó cada uno. |

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

Con Supabase, todos ven y guardan en la misma base de datos, cada mesa se guarda por
separado (dos personas contando mesas distintas no se pisan), lo que se anota sin internet
se sube al volver la conexión, y Resumen y Resultados se actualizan solos.

Los **administradores** manejan todo y crean a los demás desde la web (**Administración →
Usuarios**), eligiendo el rol: personero o administrador. Los **personeros** solo anotan
votos: no ven Administración ni pueden cambiar colegios, mesas o partidos. Una cuenta que no
está en esa lista no ve nada. Siempre queda al menos un administrador con acceso, y nadie se
puede quitar a sí mismo el rol. Esto lo hace cumplir Supabase (`esquema.sql`), no solo la web.

Se puede usar un proyecto de Supabase que ya tiene otra aplicación: lo nuevo se llama
`conteo_…` y `esquema.sql` revisa antes que sus tablas no choquen con las de la otra
aplicación (si chocan, se detiene sin cambiar nada). Pero las cuentas de los personeros
quedan en ese mismo proyecto: si la otra aplicación deja entrar a cualquier cuenta, también
podrían entrar ahí. Lo más limpio es un proyecto solo para el conteo. Por lo mismo, la web
solo cambia contraseñas de cuentas que creó el conteo: si alguien ya tenía cuenta en el
proyecto, recibe acceso pero entra con su contraseña de siempre.

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratis alcanza).
2. **Authentication → Users → Add user → Create new user**: crea **tu** cuenta de
   administrador (correo y contraseña, con *Auto Confirm User*). Es la única que se crea ahí.
3. **Authentication → Sign In / Providers → Email**: desactiva **Confirm email**, para que
   los personeros que crees puedan entrar al momento. Deja activado *Allow new users to sign
   up*: la web lo usa para crear a los personeros, y una cuenta que alguien se cree por su
   cuenta no puede ver ni cambiar nada.
4. **SQL Editor → New query**: pega todo [`supabase/esquema.sql`](supabase/esquema.sql) y
   dale **Run**. Si ya habías corrido una versión anterior, córrelo igual: se actualiza sin
   perder datos. Con la web ya conectada, el SQL se copia desde **Administración → Resumen →
   Copiar SQL de Supabase**, y Resumen avisa «Hay que actualizar Supabase» cuando la web
   necesita una versión nueva.
5. **SQL Editor → New query**: corre esta línea con **tu** correo:

   ```sql
   select public.conteo_hacer_admin('tu-correo@gmail.com');
   ```

   Tiene que responder «Listo: … es el administrador».
6. Botón **Connect** del proyecto (o *Project Settings → Data API* y *API Keys*): copia la
   *Project URL* y la clave pública (*publishable*, o *anon public* en *Legacy API Keys*).
   **Nunca** uses la clave *secret* / *service_role*.
7. Pon esas dos variables donde se publica la web:

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
8. Entra a la web con tu cuenta, ve a **Administración → Resumen** y pulsa **Subir datos a
   Supabase** (solo la primera vez).
9. **Administración → Usuarios → + Nuevo usuario**: nombre, correo, rol (**Personero** o
   **Administrador**) y contraseña (la web propone una fácil de dictar). Al crearlo te muestra
   los datos para copiarlos o mandarlos por WhatsApp. Ahí mismo les cambias el rol o la
   contraseña, o les quitas el acceso. En tu propia fila puedes cambiar tu contraseña.

## Comandos

```sh
npm install      # instalar dependencias
npm run dev      # servidor local en http://localhost:4321
npm run build    # genera el sitio estático en ./dist
npm run preview  # previsualiza el build
```

Requiere Node 22.12 o superior. El sitio es estático: `dist/` se puede publicar en
Netlify, Vercel, GitHub Pages o cualquier hosting de archivos.

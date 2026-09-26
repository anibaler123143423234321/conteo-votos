-- Conteo de votos · tablas para Supabase.
-- Pégalo en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.
-- Después deja tu cuenta como administrador: está explicado al final de este archivo.
--
-- Sirve también en un proyecto que ya usa otra aplicación: lo nuevo se llama conteo_… y,
-- antes de cambiar nada, se revisa que las tablas con estos nombres sean del conteo.

-- ================= Revisión previa =================
-- Si ya existe una de estas tablas y es de otra aplicación, se detiene aquí sin cambiar nada.
do $$
declare
  t record;
  faltan text;
begin
  for t in
    select *
    from (values
      ('distritos', array['id', 'nombre', 'corto', 'capital', 'confirmado', 'orden']),
      ('colegios', array['id', 'distrito_id', 'codigo', 'nombre', 'orden']),
      ('aulas', array['id', 'colegio_id', 'nombre', 'orden']),
      ('mesas', array['id', 'aula_id', 'numero', 'electores', 'orden']),
      ('columnas', array['id', 'titulo', 'corto', 'distrito_id', 'orden']),
      ('partidos', array['id', 'columna_id', 'partido_id', 'nombre', 'orden']),
      ('votos_mesa', array['mesa_id', 'votos', 'actualizado', 'actualizado_por']),
      ('conteo_usuarios', array['id', 'correo', 'nombre', 'rol', 'activo', 'creado'])
    ) as x (tabla, columnas)
  loop
    continue when to_regclass('public.' || t.tabla) is null;
    select string_agg(c, ', ') into faltan
    from unnest(t.columnas) as c
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.tabla and column_name = c
    );
    if faltan is not null then
      raise exception 'Ya existe la tabla public.% y no es del conteo (no tiene: %). No se cambió nada. Usa un proyecto de Supabase aparte para el conteo.', t.tabla, faltan;
    end if;
  end loop;
end;
$$;


create table if not exists public.distritos (
  id text primary key,
  nombre text not null,
  corto text,
  capital boolean not null default false,  -- la capital de provincia no tiene columna distrital
  confirmado boolean not null default false,  -- números de mesa ya confirmados para el 4 de octubre
  orden int not null default 0
);

create table if not exists public.colegios (
  id text primary key,
  distrito_id text not null references public.distritos (id) on delete cascade,
  codigo text,  -- código del local de votación en la ONPE
  nombre text not null,
  orden int not null default 0
);

create table if not exists public.aulas (
  id text primary key,
  colegio_id text not null references public.colegios (id) on delete cascade,
  nombre text not null,
  orden int not null default 0
);

create table if not exists public.mesas (
  id text primary key,
  aula_id text not null references public.aulas (id) on delete cascade,
  numero text not null,
  electores int,
  orden int not null default 0
);

-- Columnas de la cédula; las de alcalde distrital tienen distrito_id.
create table if not exists public.columnas (
  id text primary key,
  titulo text not null,
  corto text not null,
  distrito_id text references public.distritos (id) on delete cascade,
  orden int not null default 0
);

-- Un mismo partido puede estar en varias columnas: id = '<columna_id>:<partido_id>'.
create table if not exists public.partidos (
  id text primary key,
  columna_id text not null references public.columnas (id) on delete cascade,
  partido_id text not null,
  nombre text not null,
  orden int not null default 0
);

-- Votos de cada mesa: { "<columna>": { "<partido>" | "_blanco" | "_nulo": cantidad } }.
-- Una fila por mesa, así quienes cuentan mesas distintas no se pisan.
create table if not exists public.votos_mesa (
  mesa_id text primary key references public.mesas (id) on delete cascade,
  votos jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now(),
  actualizado_por uuid default auth.uid()
);

create index if not exists colegios_distrito on public.colegios (distrito_id);
create index if not exists aulas_colegio on public.aulas (colegio_id);
create index if not exists mesas_aula on public.mesas (aula_id);
create index if not exists columnas_distrito on public.columnas (distrito_id);
create index if not exists partidos_columna on public.partidos (columna_id);

-- Quién y cuándo cambió por última vez los votos de cada mesa.
create or replace function public.tocar_votos() returns trigger
language plpgsql as $$
begin
  new.actualizado := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists votos_mesa_tocar on public.votos_mesa;
create trigger votos_mesa_tocar
  before insert or update on public.votos_mesa
  for each row execute function public.tocar_votos();

-- ================= Quién puede entrar =================
-- Los administradores lo manejan todo y crean a los demás desde la web (Administración ›
-- Usuarios); los personeros solo anotan votos. Una cuenta que no está en esta tabla, o que
-- está sin acceso, no ve ni cambia nada aunque inicie sesión.
create table if not exists public.conteo_usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  correo text not null,
  nombre text not null default '',
  rol text not null default 'personero' check (rol in ('admin', 'personero')),
  activo boolean not null default true,
  creado timestamptz not null default now()
);

-- ¿La cuenta la creó el conteo? Solo a esas se les cambia la contraseña desde la web: así un
-- administrador del conteo no puede quedarse con cuentas de otra aplicación del mismo proyecto.
alter table public.conteo_usuarios add column if not exists creada_por_conteo boolean not null default false;

-- Personeros creados desde la web antes de que existiera esa columna: su cuenta se creó junto
-- con su fila (y solo tiene correo).
update public.conteo_usuarios c
set creada_por_conteo = true
from auth.users u
where u.id = c.id
  and c.rol = 'personero'
  and not c.creada_por_conteo
  and coalesce(u.raw_app_meta_data -> 'providers', '["email"]'::jsonb) = '["email"]'::jsonb
  and abs(extract(epoch from (c.creado - u.created_at))) < 600;

-- Rol de quien hace el pedido: 'admin', 'personero' o null (sin acceso).
create or replace function public.conteo_rol() returns text
language sql stable security definer set search_path = ''
as $$
  select rol from public.conteo_usuarios where id = auth.uid() and activo
$$;

-- Seguridad (RLS).
do $$
declare t text;
begin
  foreach t in array array['distritos', 'colegios', 'aulas', 'mesas', 'columnas', 'partidos', 'votos_mesa', 'conteo_usuarios'] loop
    execute format('alter table public.%I enable row level security', t);
    -- «con sesion» es de la versión anterior, en la que cualquiera con sesión podía todo.
    execute format('drop policy if exists "con sesion" on public.%I', t);
    execute format('drop policy if exists "leer" on public.%I', t);
    execute format('drop policy if exists "escribir" on public.%I', t);
  end loop;

  -- Colegios, mesas, partidos…: los leen todos los que tienen acceso; solo el administrador los cambia.
  foreach t in array array['distritos', 'colegios', 'aulas', 'mesas', 'columnas', 'partidos'] loop
    execute format(
      'create policy "leer" on public.%I for select to authenticated using ((select public.conteo_rol()) is not null)', t
    );
    execute format(
      'create policy "escribir" on public.%I for all to authenticated ' ||
      'using ((select public.conteo_rol()) = ''admin'') with check ((select public.conteo_rol()) = ''admin'')', t
    );
  end loop;
end;
$$;

-- Votos: los anotan los personeros y el administrador.
create policy "escribir" on public.votos_mesa for all to authenticated
  using ((select public.conteo_rol()) is not null) with check ((select public.conteo_rol()) is not null);

-- Usuarios: cada uno ve su propia fila; el administrador ve y cambia todas.
create policy "leer" on public.conteo_usuarios for select to authenticated
  using (id = (select auth.uid()) or (select public.conteo_rol()) = 'admin');
create policy "escribir" on public.conteo_usuarios for all to authenticated
  using ((select public.conteo_rol()) = 'admin') with check ((select public.conteo_rol()) = 'admin');

-- Siempre tiene que quedar al menos un administrador con acceso (si no, nadie podría entrar
-- a Administración): se revisa cuando a un administrador activo se le quita el rol o el acceso.
create or replace function public.conteo_queda_admin() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.rol = 'admin' and old.activo and not (new.rol = 'admin' and new.activo)
     and not exists (select 1 from public.conteo_usuarios x where x.rol = 'admin' and x.activo and x.id <> new.id) then
    raise exception 'Tiene que quedar al menos un administrador con acceso.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

drop trigger if exists conteo_usuarios_queda_admin on public.conteo_usuarios;
create trigger conteo_usuarios_queda_admin
  after update on public.conteo_usuarios
  for each row execute function public.conteo_queda_admin();

-- El administrador da acceso (de personero o de administrador) a una cuenta, buscándola por su
-- correo. La web la usa justo después de crear la cuenta; también sirve para devolverle el
-- acceso a alguien. Nunca le quita a nadie el rol de administrador.
drop function if exists public.conteo_dar_acceso(text, text);
create or replace function public.conteo_dar_acceso(
  correo_personero text,
  nombre_personero text default '',
  rol_nuevo text default 'personero'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  cuenta uuid;
  proveedores jsonb;
  creada timestamptz;
begin
  if (select public.conteo_rol()) is distinct from 'admin' then
    raise exception 'Solo el administrador puede dar acceso.' using errcode = '42501';
  end if;
  if rol_nuevo is null or rol_nuevo not in ('admin', 'personero') then
    raise exception 'El rol tiene que ser admin o personero.' using errcode = '22023';
  end if;
  select u.id, u.raw_app_meta_data -> 'providers', u.created_at into cuenta, proveedores, creada
  from auth.users u where lower(u.email) = lower(trim(correo_personero));
  if cuenta is null then
    raise exception 'No hay ninguna cuenta con el correo %.', correo_personero using errcode = 'P0002';
  end if;
  insert into public.conteo_usuarios (id, correo, nombre, rol, activo, creada_por_conteo)
  values (
    cuenta, lower(trim(correo_personero)), coalesce(trim(nombre_personero), ''), rol_nuevo, true,
    -- Recién creada desde la web y solo con correo: su contraseña la maneja el conteo.
    coalesce(proveedores, '["email"]'::jsonb) = '["email"]'::jsonb and creada > now() - interval '10 minutes'
  )
  on conflict (id) do update
    set activo = true,
        nombre = case when excluded.nombre <> '' then excluded.nombre else public.conteo_usuarios.nombre end,
        rol = case when excluded.rol = 'admin' then 'admin' else public.conteo_usuarios.rol end;
  return cuenta;
end;
$$;

-- El administrador le pone una contraseña nueva a alguien del conteo (por si la olvidó). Solo a
-- cuentas que creó el conteo: las que ya existían (quizá de otra aplicación) no se tocan.
create or replace function public.conteo_cambiar_clave(personero uuid, clave text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select public.conteo_rol()) is distinct from 'admin' then
    raise exception 'Solo el administrador puede cambiar contraseñas.' using errcode = '42501';
  end if;
  if length(coalesce(clave, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.conteo_usuarios x where x.id = personero) then
    raise exception 'Esa cuenta no está en el conteo.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.conteo_usuarios x where x.id = personero and x.creada_por_conteo) then
    raise exception 'La contraseña de esta cuenta no se cambia desde aquí: la cuenta ya existía (quizá es de otra aplicación). Esa persona entra con su contraseña de siempre.'
      using errcode = 'P0001';
  end if;
  update auth.users
    set encrypted_password = extensions.crypt(clave, extensions.gen_salt('bf', 10)), updated_at = now()
    where id = personero;
end;
$$;

-- Deja como administrador la cuenta con ese correo. Solo se puede usar aquí, en el SQL Editor.
create or replace function public.conteo_hacer_admin(correo_admin text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  cuenta uuid;
  correo_cuenta text;
begin
  select u.id, u.email into cuenta, correo_cuenta from auth.users u where lower(u.email) = lower(trim(correo_admin));
  if cuenta is null then
    return format(
      'No hay ninguna cuenta con el correo %s. Créala en Authentication → Users → Add user y vuelve a correr esta línea.',
      correo_admin
    );
  end if;
  insert into public.conteo_usuarios (id, correo, nombre, rol, activo)
  values (cuenta, lower(correo_cuenta), 'Administrador', 'admin', true)
  on conflict (id) do update set rol = 'admin', activo = true;
  return format('Listo: %s es el administrador.', correo_cuenta);
end;
$$;

-- Versión de este archivo. La web la compara con la suya y, si la de Supabase es más vieja,
-- avisa en Administración › Resumen que hay que volver a correrlo (con un botón para copiarlo).
create or replace function public.conteo_version() returns int
language sql immutable as $$ select 3 $$;

-- Nadie las llama sin sesión; conteo_hacer_admin tampoco se puede llamar desde la web.
revoke execute on function public.conteo_rol() from public, anon;
revoke execute on function public.conteo_dar_acceso(text, text, text) from public, anon;
revoke execute on function public.conteo_cambiar_clave(uuid, text) from public, anon;
revoke execute on function public.conteo_hacer_admin(text) from public, anon, authenticated;
revoke execute on function public.conteo_queda_admin() from public, anon, authenticated;
revoke execute on function public.conteo_version() from public, anon;
grant execute on function public.conteo_version() to authenticated;
grant execute on function public.conteo_rol() to authenticated;
grant execute on function public.conteo_dar_acceso(text, text, text) to authenticated;
grant execute on function public.conteo_cambiar_clave(uuid, text) to authenticated;

-- Tiempo real: las pantallas de Resumen y Resultados se actualizan solas.
do $$
declare t text;
begin
  foreach t in array array['distritos', 'colegios', 'aulas', 'mesas', 'columnas', 'partidos', 'votos_mesa'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- ================= Tu cuenta de administrador =================
-- 1. Crea tu cuenta en Authentication → Users → Add user → Create new user (con Auto Confirm User).
-- 2. Abre otra consulta (New query), pega esta línea con TU correo y dale Run:
--
--      select public.conteo_hacer_admin('tu-correo@gmail.com');
--
--    Tiene que responder «Listo: … es el administrador».
-- Los personeros (y otros administradores) los creas después desde la web: Administración › Usuarios.

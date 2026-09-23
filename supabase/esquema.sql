-- Conteo de votos · tablas para Supabase.
-- Pégalo en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.
-- Después deja tu cuenta como administrador: está explicado al final de este archivo.

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
-- Un administrador lo maneja todo y crea a los personeros desde la web
-- (Administración › Personeros); los personeros solo anotan votos. Una cuenta que no está
-- en esta tabla, o que está sin acceso, no ve ni cambia nada aunque inicie sesión.
create table if not exists public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  correo text not null,
  nombre text not null default '',
  rol text not null default 'personero' check (rol in ('admin', 'personero')),
  activo boolean not null default true,
  creado timestamptz not null default now()
);

-- Rol de quien hace el pedido: 'admin', 'personero' o null (sin acceso).
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = ''
as $$
  select rol from public.usuarios where id = auth.uid() and activo
$$;

-- Seguridad (RLS).
do $$
declare t text;
begin
  foreach t in array array['distritos', 'colegios', 'aulas', 'mesas', 'columnas', 'partidos', 'votos_mesa', 'usuarios'] loop
    execute format('alter table public.%I enable row level security', t);
    -- «con sesion» es de la versión anterior, en la que cualquiera con sesión podía todo.
    execute format('drop policy if exists "con sesion" on public.%I', t);
    execute format('drop policy if exists "leer" on public.%I', t);
    execute format('drop policy if exists "escribir" on public.%I', t);
  end loop;

  -- Colegios, mesas, partidos…: los leen todos los que tienen acceso; solo el administrador los cambia.
  foreach t in array array['distritos', 'colegios', 'aulas', 'mesas', 'columnas', 'partidos'] loop
    execute format(
      'create policy "leer" on public.%I for select to authenticated using ((select public.mi_rol()) is not null)', t
    );
    execute format(
      'create policy "escribir" on public.%I for all to authenticated ' ||
      'using ((select public.mi_rol()) = ''admin'') with check ((select public.mi_rol()) = ''admin'')', t
    );
  end loop;
end;
$$;

-- Votos: los anotan los personeros y el administrador.
create policy "escribir" on public.votos_mesa for all to authenticated
  using ((select public.mi_rol()) is not null) with check ((select public.mi_rol()) is not null);

-- Usuarios: cada uno ve su propia fila; el administrador ve y cambia todas.
create policy "leer" on public.usuarios for select to authenticated
  using (id = (select auth.uid()) or (select public.mi_rol()) = 'admin');
create policy "escribir" on public.usuarios for all to authenticated
  using ((select public.mi_rol()) = 'admin') with check ((select public.mi_rol()) = 'admin');

-- El administrador da acceso de personero a una cuenta, buscándola por su correo. La web la usa
-- justo después de crear la cuenta; también sirve para devolverle el acceso a alguien.
create or replace function public.dar_acceso(correo_personero text, nombre_personero text default '')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  cuenta uuid;
begin
  if (select public.mi_rol()) is distinct from 'admin' then
    raise exception 'Solo el administrador puede dar acceso.' using errcode = '42501';
  end if;
  select u.id into cuenta from auth.users u where lower(u.email) = lower(trim(correo_personero));
  if cuenta is null then
    raise exception 'No hay ninguna cuenta con el correo %.', correo_personero using errcode = 'P0002';
  end if;
  insert into public.usuarios (id, correo, nombre, rol, activo)
  values (cuenta, lower(trim(correo_personero)), coalesce(trim(nombre_personero), ''), 'personero', true)
  on conflict (id) do update
    set activo = true,
        nombre = case when excluded.nombre <> '' then excluded.nombre else public.usuarios.nombre end;
  return cuenta;
end;
$$;

-- El administrador le pone una contraseña nueva a un personero (por si la olvidó).
create or replace function public.cambiar_clave(personero uuid, clave text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select public.mi_rol()) is distinct from 'admin' then
    raise exception 'Solo el administrador puede cambiar contraseñas.' using errcode = '42501';
  end if;
  if length(coalesce(clave, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.' using errcode = '22023';
  end if;
  update auth.users
    set encrypted_password = extensions.crypt(clave, extensions.gen_salt('bf', 10)), updated_at = now()
    where id = personero
      and exists (select 1 from public.usuarios x where x.id = personero and x.rol = 'personero');
  if not found then
    raise exception 'No se encontró ese personero.' using errcode = 'P0002';
  end if;
end;
$$;

-- Deja como administrador la cuenta con ese correo. Solo se puede usar aquí, en el SQL Editor.
create or replace function public.hacer_admin(correo_admin text)
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
  insert into public.usuarios (id, correo, nombre, rol, activo)
  values (cuenta, lower(correo_cuenta), 'Administrador', 'admin', true)
  on conflict (id) do update set rol = 'admin', activo = true;
  return format('Listo: %s es el administrador.', correo_cuenta);
end;
$$;

-- Nadie las llama sin sesión; hacer_admin tampoco se puede llamar desde la web.
revoke execute on function public.mi_rol() from public, anon;
revoke execute on function public.dar_acceso(text, text) from public, anon;
revoke execute on function public.cambiar_clave(uuid, text) from public, anon;
revoke execute on function public.hacer_admin(text) from public, anon, authenticated;
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.dar_acceso(text, text) to authenticated;
grant execute on function public.cambiar_clave(uuid, text) to authenticated;

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
--      select public.hacer_admin('tu-correo@gmail.com');
--
--    Tiene que responder «Listo: … es el administrador».
-- Los personeros los creas después desde la web: Administración › Personeros.

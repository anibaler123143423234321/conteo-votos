-- Conteo de votos · tablas para Supabase.
-- Pégalo en Supabase → SQL Editor → New query → Run. Se puede volver a correr sin problema.

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

-- Seguridad: solo leen y escriben los usuarios con sesión (los que crees en
-- Authentication → Users). Sin sesión no se ve ni se cambia nada.
do $$
declare t text;
begin
  foreach t in array array['distritos', 'colegios', 'aulas', 'mesas', 'columnas', 'partidos', 'votos_mesa'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "con sesion" on public.%I', t);
    execute format(
      'create policy "con sesion" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end;
$$;

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

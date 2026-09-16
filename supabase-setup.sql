-- ============================================================
-- EVOLUCIONA PENSIONAL PRO — Configuración de base de datos
-- Copia y pega TODO este archivo en Supabase → SQL Editor → Run
-- Se ejecuta una sola vez.
-- ============================================================

-- 1. Tabla de licencias
create table if not exists licencias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  plan text check (plan in ('individual','firma')),
  firma_id uuid,
  activo boolean default true,
  fecha_expiracion date
);

alter table licencias enable row level security;

create policy "usuario puede ver su propia licencia"
  on licencias for select
  using (auth.uid() = user_id);

-- 2. Tabla de sesiones activas (controla el límite de 1 sesión por usuario)
create table if not exists sesiones_activas (
  token uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

alter table sesiones_activas enable row level security;

-- El usuario solo puede ver, actualizar o borrar SU PROPIA sesión.
-- Nota: a propósito NO existe policy de INSERT para el cliente —
-- la única forma de crear una fila es a través de la función
-- intentar_abrir_sesion() de abajo, que aplica el límite.
create policy "usuario puede ver su sesion"
  on sesiones_activas for select
  using (auth.uid() = user_id);

create policy "usuario puede actualizar su heartbeat"
  on sesiones_activas for update
  using (auth.uid() = user_id);

create policy "usuario puede cerrar su propia sesion"
  on sesiones_activas for delete
  using (auth.uid() = user_id);

-- 3. Función: intenta abrir una sesión nueva, respetando el límite de 1
create or replace function intentar_abrir_sesion()
returns uuid
language plpgsql
security definer
as $$
declare
  nuevo_token uuid;
  sesiones_vivas int;
begin
  -- Limpia sesiones abandonadas (sin heartbeat hace más de 3 minutos)
  delete from sesiones_activas
    where user_id = auth.uid() and last_seen < now() - interval '3 minutes';

  select count(*) into sesiones_vivas
    from sesiones_activas
    where user_id = auth.uid();

  if sesiones_vivas >= 1 then
    raise exception 'SESION_ACTIVA_EXISTENTE';
  end if;

  insert into sesiones_activas (user_id) values (auth.uid())
    returning token into nuevo_token;

  return nuevo_token;
end;
$$;

-- 4. Función: actualiza el "sigo aquí" de una sesión (heartbeat)
create or replace function actualizar_heartbeat(mi_token uuid)
returns void
language sql
security definer
as $$
  update sesiones_activas set last_seen = now()
  where token = mi_token and user_id = auth.uid();
$$;

-- ============================================================
-- Cómo dar de alta a un abogado (manual, por ahora):
-- 1. Authentication → Users → Add user (correo + contraseña)
-- 2. Copia el "User UID" que te genera
-- 3. Table Editor → licencias → Insert row:
--    user_id = el UID que copiaste
--    nombre = nombre del abogado o de la firma
--    plan = 'individual' o 'firma'
--    firma_id = (mismo UUID compartido para todos los de una misma firma; déjalo vacío si es individual)
--    activo = true
--    fecha_expiracion = la fecha en que vence su licencia
-- ============================================================

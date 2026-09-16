-- ============================================================
-- EVOLUCIONA PENSIONAL PRO — Sistema de demo de 24 horas
-- Corre esto DESPUÉS de supabase-setup.sql, en el SQL Editor.
-- ============================================================

-- 1. Ampliar el plan permitido para incluir 'demo'
alter table licencias drop constraint if exists licencias_plan_check;
alter table licencias add constraint licencias_plan_check
  check (plan in ('individual','firma','demo'));

-- 2. Tabla de demos ya otorgados (para bloquear repetidos)
create table if not exists demos_otorgados (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  whatsapp text not null,
  cedula text not null,
  nombre text,
  fecha_solicitud timestamptz default now()
);

alter table demos_otorgados enable row level security;
-- A propósito, sin policies de select/insert para el cliente:
-- solo la función de abajo (con permisos elevados) puede tocar esta tabla.

-- 3. Función: otorga el demo de 24h, si esa persona no lo ha usado antes
--    (revisa coincidencia por correo, WhatsApp o cédula, ignorando
--    espacios y guiones para que no se burle con formato distinto)
create or replace function solicitar_demo(mi_nombre text, mi_whatsapp text, mi_cedula text)
returns void
language plpgsql
security definer
as $$
declare
  mi_email text;
  whatsapp_limpio text := regexp_replace(mi_whatsapp, '[^0-9]', '', 'g');
  cedula_limpia text := regexp_replace(mi_cedula, '[^0-9]', '', 'g');
  ya_existe int;
begin
  select email into mi_email from auth.users where id = auth.uid();

  select count(*) into ya_existe
    from demos_otorgados
    where email = mi_email
       or regexp_replace(whatsapp, '[^0-9]', '', 'g') = whatsapp_limpio
       or regexp_replace(cedula, '[^0-9]', '', 'g') = cedula_limpia;

  if ya_existe > 0 then
    raise exception 'DEMO_YA_USADO';
  end if;

  insert into demos_otorgados (email, whatsapp, cedula, nombre)
    values (mi_email, mi_whatsapp, mi_cedula, mi_nombre);

  insert into licencias (user_id, nombre, plan, activo, fecha_expiracion)
    values (auth.uid(), mi_nombre, 'demo', true, now() + interval '24 hours')
    on conflict (user_id) do update
      set plan = 'demo', activo = true, fecha_expiracion = now() + interval '24 hours';
end;
$$;

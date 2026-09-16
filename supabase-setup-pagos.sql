-- ============================================================
-- EVOLUCIONA PENSIONAL PRO — Pagos con Wompi
-- Corre esto DESPUÉS de los dos scripts anteriores.
-- ============================================================

-- 1. Tabla de planes y precios (edítala libremente desde Table Editor)
create table if not exists planes (
  id uuid primary key default gen_random_uuid(),
  plan text check (plan in ('individual','firma')) not null,
  periodo text check (periodo in ('mensual','anual')) not null,
  monto_cop integer not null,
  activo boolean default true,
  unique(plan, periodo)
);

-- Precios de ejemplo — CÁMBIALOS por los tuyos en Table Editor
insert into planes (plan, periodo, monto_cop) values
  ('individual','mensual', 150000),
  ('individual','anual', 1500000),
  ('firma','mensual', 900000),
  ('firma','anual', 9000000)
on conflict (plan, periodo) do nothing;

alter table planes enable row level security;
create policy "cualquiera con sesión puede ver los planes"
  on planes for select
  using (auth.role() = 'authenticated');

-- 2. Tabla de pagos (historial, y evita procesar el mismo pago dos veces)
create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  plan text not null,
  periodo text not null,
  monto_cop integer not null,
  wompi_transaction_id text unique not null,
  estado text not null,
  fecha timestamptz default now()
);

alter table pagos enable row level security;
create policy "usuario puede ver sus propios pagos"
  on pagos for select
  using (auth.uid() = user_id);
-- Sin policy de insert para el cliente: solo la función del webhook
-- (que usa permisos elevados) puede escribir aquí.

-- 3. Recordatorio de vencimiento: evita mandar el correo más de una vez por día
alter table licencias add column if not exists recordatorio_enviado date;

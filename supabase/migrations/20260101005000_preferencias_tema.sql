-- =============================================================================
-- 20260101005000_preferencias_tema.sql
-- Preferencia de apariencia (paleta de color) por usuario. Se guarda en
-- app_users para que viaje entre dispositivos. La política UPDATE existente
-- (app_users_self_upd) ya permite que cada usuario edite su propia fila.
-- =============================================================================

alter table app_users
  add column if not exists tema text not null default 'hielo';

alter table app_users
  drop constraint if exists app_users_tema_check;

alter table app_users
  add constraint app_users_tema_check
  check (tema in ('hielo', 'menta', 'durazno', 'lila', 'cielo'));

comment on column app_users.tema is 'Paleta de color elegida por el usuario para su panel.';

-- =============================================================================
-- 20260101000300_temporadas_niveles.sql
-- Catálogo FEMEPASHIDI colgado de temporada_id. El reglamento cambia cada
-- temporada; NUNCA se hardcodea. Todo nivel/duración/elemento pertenece a una
-- temporada específica.
-- =============================================================================

-- Temporada federativa: 1 de julio – 30 de junio.
create table temporadas (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null unique,          -- p. ej. '2026/2027'
  fecha_inicio     date not null,                 -- 1-jul
  fecha_fin        date not null,                 -- 30-jun
  -- Fecha configurable de entrada en vigor de las reglas. Resuelve la
  -- discrepancia del PDF (portada 2026 vs encabezados 2025). Ver PENDIENTES.md.
  vigencia_reglas  date not null,
  activa           boolean not null default false,
  created_at       timestamptz not null default now()
);

comment on column temporadas.vigencia_reglas is
  'Entrada en vigor configurable de las reglas (discrepancia PDF 2025/2026).';

create type rama_nivel as enum ('infantil', 'adulto', 'parejas');
create type tipo_programa as enum ('corto', 'libre', 'artistico');

-- Catálogo de niveles por temporada y rama.
create table niveles (
  id                    uuid primary key default gen_random_uuid(),
  temporada_id          uuid not null references temporadas (id) on delete cascade,
  rama                  rama_nivel not null,
  clave                 text not null,        -- p. ej. 'debutantes_1'
  nombre                text not null,        -- p. ej. 'Debutantes 1'
  orden                 int not null,         -- orden de progresión dentro de la rama
  grupo_permanencia     text,                 -- p. ej. 'debutantes' (regla §6.5)
  requiere_corto        boolean not null default false,
  created_at            timestamptz not null default now(),
  unique (temporada_id, rama, clave)
);

comment on table niveles is 'Niveles FEMEPASHIDI por temporada (nunca hardcodeados).';
comment on column niveles.grupo_permanencia is
  'Agrupa niveles para la regla de permanencia (§6.5).';

-- Duraciones/tolerancias por tipo de programa de cada nivel.
create table niveles_programa (
  id                    uuid primary key default gen_random_uuid(),
  nivel_id              uuid not null references niveles (id) on delete cascade,
  tipo                  tipo_programa not null,
  duracion_seg          int not null,
  tolerancia_seg        int not null default 0,   -- ±10s se guarda como 10
  factor_componentes    numeric(4,2),             -- p. ej. 1.25 (Debutantes 1)
  unique (nivel_id, tipo)
);

comment on table niveles_programa is 'Duraciones y factores por programa (corto/libre/artístico).';

-- Elementos exigidos en examen (pp.40-48). El flag fuera_de_programa modela
-- los intentos posteriores a la rutina (Intermedios 2 g, Novicios g, Avanzados 1 h).
create table elementos_examen (
  id                    uuid primary key default gen_random_uuid(),
  nivel_id              uuid not null references niveles (id) on delete cascade,
  tipo                  tipo_programa,            -- a qué programa aplica (si aplica)
  orden                 int not null,
  clave                 text,                     -- p. ej. '1A', 'CCoSp'
  descripcion           text not null,
  min_revoluciones      int,
  min_nivel_stsq        int,                      -- nivel mínimo de secuencia de pasos
  fuera_de_programa     boolean not null default false,
  created_at            timestamptz not null default now()
);

comment on column elementos_examen.fuera_de_programa is
  'true = intento posterior a la rutina, no forma parte del programa (g/h del PDF).';

-- Clases de edad para categoría adulto (fronteras 1-jul).
create table clases_edad_adulto (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references temporadas (id) on delete cascade,
  clave         text not null,        -- 'I'..'V'
  anio_desde    int,                  -- año de nacimiento (límite inferior)
  anio_hasta    int,                  -- año de nacimiento (límite superior)
  unique (temporada_id, clave)
);

comment on table clases_edad_adulto is 'Clases I–V de la categoría adulto por año de nacimiento.';

-- Reglas de permanencia por grupo (§6.5).
create table reglas_permanencia (
  id                 uuid primary key default gen_random_uuid(),
  temporada_id       uuid not null references temporadas (id) on delete cascade,
  grupo_permanencia  text not null,
  max_temporadas     int not null,          -- máx. temporadas en el grupo
  por_nivel          boolean not null default false, -- true = límite por nivel; false = combinado
  aplica_especial    boolean not null default false, -- ¿aplica a categoría Especial?
  notas              text,
  unique (temporada_id, grupo_permanencia)
);

comment on table reglas_permanencia is 'Parámetros de la regla de permanencia por grupo (§6.5).';

-- FKs diferidas desde identidad hacia niveles (evita dependencia circular).
alter table personas
  add constraint personas_nivel_actual_fk
  foreign key (nivel_actual_id) references niveles (id) on delete set null;

alter table logros
  add constraint logros_nivel_fk
  foreign key (nivel_id) references niveles (id) on delete restrict;

alter table logros
  add constraint logros_temporada_fk
  foreign key (temporada_id) references temporadas (id) on delete restrict;

create index niveles_temporada_idx on niveles (temporada_id, rama, orden);
create index elementos_examen_nivel_idx on elementos_examen (nivel_id, orden);

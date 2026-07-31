# CoachDeskmx

SaaS multi-tenant para maestras de patinaje artístico sobre hielo en México.
Cada maestra es un *tenant* que administra alumnas, agenda, cobranza,
competencias y progresión de niveles federativos (FEMEPASHIDI).

> **Fase 1 (este entregable):** esquema completo + RLS + pruebas de aislamiento
> cross-tenant (pgTAP) + auth/roles + seeds. Sin conexión a un Supabase real:
> listo para aplicar migraciones.

---

## Stack

- **Next.js 14** (App Router) · **TypeScript** `strict`
- **Tailwind CSS** + **shadcn/ui** · **Recharts**
- **Supabase** (Postgres + Auth + Storage + RLS)
- **PWA** offline-first (IndexedDB) — placeholder en Fase 1
- UI en español de México · MXN · fechas dd/mm/aaaa

## Decisión arquitectónica central

La alumna se divide en dos capas:

| Capa | Alcance | Contenido | Aislamiento |
|------|---------|-----------|-------------|
| **Identidad** (`personas`, `tutores`, `logros`) | Global (sin tenant) | Nombre, nacimiento, nivel, tutores, logros | Compartible entre maestras |
| **Inscripción** (`inscripciones`, tarifas, cargos, pagos, notas) | Por tenant | Todo lo privado de la maestra | **RLS estricto** |

**Coach A nunca ve tarifas, cargos, pagos ni notas de Coach B.** Se garantiza a
nivel de Postgres con Row-Level Security, no en la capa de aplicación, y se
prueba intentando lecturas cross-tenant que deben fallar.

## Estructura

```
src/                       App Next.js (layout, páginas, lib, tipos)
supabase/
  migrations/              Esquema en orden (extensiones → tablas → RLS)
  seeds/                   Catálogo FEMEPASHIDI + demo (conceptos, sedes)
  seed.sql                 Agregador de seeds
  tests/                   Pruebas pgTAP
PENDIENTES.md              Discrepancias y datos por confirmar
```

### Migraciones (orden)

1. `…000000_extensions` — pgcrypto, citext, esquema `app`
2. `…000100_tenancy` — tenants, app_users, memberships, roles
3. `…000200_identidad` — personas, tutores, logros (global)
4. `…000300_temporadas_niveles` — catálogo FEMEPASHIDI por temporada
5. `…000400_inscripciones` — inscripción + tarifas (por tenant)
6. `…000500_sedes_bloques` — sedes y bloques de hielo
7. `…000600_conceptos_precios` — conceptos + precios versionados
8. `…000700_eventos` — eventos, recurrencia, ocurrencias, asistencia
9. `…000800_cancelacion` — motor de políticas de cancelación
10. `…000900_creditos` — créditos FIFO + expiración
11. `…001000_facturacion` — cargos + estados_cuenta (corte inmutable)
12. `…001100_pagos` — pagos + aplicaciones
13. `…001200_tokens_publicos` — tokens para `/e/[token]`
14. `…001300_calendario` — conexiones ICS/OAuth
15. `…001400_competencias` — competencias + inscripciones
16. `…001500_gastos` — gastos de la maestra
17. `…001600_consentimientos` — consentimientos + incidentes
18. `…002000_rls_helpers` — funciones de contexto (tenant/rol)
19. `…002100_rls_policies` — RLS en todas las tablas

## Puesta en marcha

```bash
npm install

# Base de datos local (requiere Supabase CLI + Docker)
supabase start
supabase db reset          # aplica migraciones + seeds
supabase test db           # ejecuta las pruebas pgTAP

# App
npm run dev
```

## Pruebas (pgTAP)

| Archivo | Verifica |
|---------|----------|
| `01_aislamiento_cross_tenant` | Coach A no lee datos privados de Coach B; identidad global sí compartible |
| `02_motor_cancelacion` | Sellado de timestamp + snapshot de política + resultado |
| `03_corte_inmutable` | `estados_cuenta` rechaza UPDATE/DELETE |
| `04_permanencia` | Reglas §6.5 (Debutantes combinado, Pre-Básicos por nivel, no aplica a Especial) |
| `05_timezones` | Almacenamiento UTC y resolución por sede (CDMX/Tijuana) |

## Datos FEMEPASHIDI sembrados (Temporada 2026/2027)

- **Infantil:** 11 niveles (Debutantes 1 → Avanzados 2) con duraciones,
  factores y elementos de examen (pp.40–48).
- **Adulto:** 5 niveles (Bronce → Masters Elite) + clases de edad I–V.
- **Parejas:** Master/Master Elite, Intermediate, Adult.
- **Permanencia:** reglas §6.5 con grupo combinado de Debutantes.

Ver **[PENDIENTES.md](./PENDIENTES.md)** para discrepancias detectadas
(vigencia 2025 vs 2026, elementos fuera de programa, etc.).

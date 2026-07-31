# PENDIENTES — CoachDeskmx

Registro de decisiones abiertas, datos faltantes y discrepancias detectadas al
extraer el reglamento FEMEPASHIDI (Temporada 2026/2027) hacia los seeds.

---

## 1. Discrepancia de vigencia de las reglas (2025 vs 2026)

**Estado:** RESUELTO como campo configurable; requiere confirmación oficial.

- La **portada** y las páginas **1–37** del PDF indican vigencia **1 de julio de 2026**.
- Los **encabezados** de las páginas **38–50** dicen **1 de julio de 2025**.
- El **cuerpo** de la regla de permanencia (p.38, resaltado en amarillo) afirma
  textualmente: *"Estas reglas ENTRAN EN VIGOR a partir del 1 de JULIO de 2026"*.

**Decisión:** No se hardcodea. Se modela como `temporadas.vigencia_reglas`
(default `2026-07-01`, tomado del cuerpo del reglamento). Si la federación
confirma otra fecha, se cambia el valor del seed sin tocar código ni esquema.

**Acción pendiente:** confirmar con la maestra/federación la fecha oficial.

---

## 2. Elementos de examen "fuera de programa" (intentos posteriores a la rutina)

**Estado:** MODELADO.

El PDF (pp.44–47) define, para ciertos niveles, un intento adicional que **NO
forma parte del programa** y se ejecuta **al terminar** la rutina:

- **Intermedios 2** — elemento *g)*: 1 intento de 2A (bajado de rotación) o triple.
- **Novicios** — elemento *g)*: 1 intento de cualquier triple.
- **Avanzados 1** — elemento *h)*: 1 intento de cualquier triple (sub-rotado).

**Decisión:** se modela en `elementos_examen.fuera_de_programa = true`. El resto
de elementos del examen llevan `fuera_de_programa = false`.

---

## 3. Datos de examen incompletos / a verificar

Algunos elementos se sembraron con `clave`/`descripcion` de alto nivel donde el
PDF usa lenguaje descriptivo sin nomenclatura ISU exacta. Revisar con la maestra:

- **Debutantes 1**: "2 saltos no listados" — no hay lista cerrada; queda como
  descripción genérica (correcto según PDF).
- **Novicios / Avanzados 1–2**: nombres de molinetes específicos (sit/layback vs
  combinación) tomados del texto; confirmar nomenclatura de tabla técnica.
- **Deducciones** (música ±5s = -0.5; nivel incorrecto -2 por panel hasta -4):
  documentadas aquí, **aún NO modeladas como tabla** (se agregarán al motor de
  evaluación en fase posterior; no son parte del esquema base Fase 1).

---

## 4. Factores de componentes

Solo se sembraron los factores explícitos del PDF:
- Debutantes 1 = 1.25, Debutantes 2 = 1.50, Pre-Básicos = 1.75.

Para niveles superiores el PDF no fija un factor único de componentes en la
sección leída → `factor_componentes = null`. Verificar si aplica factor por
nivel en las tablas de puntuación.

---

## 5. Parejas — duraciones artísticas

Las duraciones de programa **Artístico** de parejas se infirieron de la tabla
general (Master/Master Elite 2:10, Intermediate/Adult 1:40). Confirmar contra la
sección específica de parejas si existe una variación por subnivel.

---

## 6. Pendientes de arquitectura (fuera de Fase 1)

- Motor de evaluación/deducciones (música, nivel incorrecto).
- Materialización real de ocurrencias desde `rrule` (job/función).
- Consumo FIFO de créditos como función transaccional con bloqueo.
- Generación de folio de `estados_cuenta` (secuencia por tenant).
- PWA offline real (Workbox + IndexedDB, last-write-wins; servidor gana en
  cargos/pagos).
- Resolución de `tokens_publicos` en `/e/[token]`.

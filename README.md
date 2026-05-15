# Bitácora del Supervisor · Bigticket

Portal independiente para que los supervisores de Service Center consulten la información operacional de las rutas, en vivo y de días anteriores, filtrada automáticamente por su SC.

Se conecta al mismo Supabase del Brain pero corre como app separada con su propio deploy.

## Stack

- React 18 + Vite
- Supabase JS v2
- Fuente Geist (Bunny Fonts)
- Sin librerías de UI: replica el design system del Brain con CSS plano

## Las 6 pestañas

| # | Pestaña | Fuente principal | Qué muestra |
|---|---|---|---|
| 1 | **Dashboard Hoy** | último snapshot `logistic_ayudantes_snapshots` | Resumen ejecutivo en vivo: totales, % entregado, alertas activas, top problemas |
| 2 | **Rutas en Vivo** | snapshot más reciente por ruta | Tabla completa con todos los campos del Nivel 1, expandible al raw_json |
| 3 | **No Entregados** | `meli_paquetes_fallidos` | Paquetes fallidos del día con motivo, destinatario, dirección |
| 4 | **Suplantación / Helpers** | `meli_paquetes_entregados` + snapshots | Matriz CASO 1-5, CASO 4 resaltado (recuperable $350 MXN) |
| 5 | **Ranking Choferes** | snapshots agregados | NS%, performance, loyalty, claims, productividad por chofer |
| 6 | **Cierre del día** | `maestro_jornada_mx` | Histórico de jornadas cerradas (se rediseñará como "KPIs Día Anterior") |

## Filtro por SC

**Todas las queries** filtran por `service_center_id = usuario.sc_id` directamente en Supabase (no en cliente). El supervisor SMX8 solo ve datos de SMX8.

## Cómo correr en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Cómo deployar en Vercel

1. Subí este repo a GitHub.
2. En Vercel: **Add New Project → Import** ese repo.
3. Vercel detecta Vite automáticamente. Dejá los settings por defecto:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Deploy. Listo.

No requiere variables de entorno: las credenciales de Supabase están hardcoded (mismas que el Brain, key `anon` pública).

## Usuario de prueba

```
Email: supervisor.smx8@bigticket.mx
Pass:  smx8.2026
SC:    SMX8
```

Para agregar más supervisores editá `USUARIOS_SUPERVISOR` en `src/shared.js`:

```js
export const USUARIOS_SUPERVISOR = {
  "supervisor.smx8@bigticket.mx": { pass: "smx8.2026", nombre: "Supervisor SMX8", sc_id: "SMX8" },
  "supervisor.smx9@bigticket.mx": { pass: "...", nombre: "...", sc_id: "SMX9" },
};
```

## Estructura del proyecto

```
bitacora-supervisor/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx              ← entry point
    ├── App.jsx               ← layout + switch de pestañas
    ├── Login.jsx             ← login con validación contra USUARIOS_SUPERVISOR
    ├── shared.js             ← cliente Supabase, usuarios, helpers, CSS, colores
    ├── ui.jsx                ← componentes UI: Topbar, KPI, Badge, Th, EmptyState
    ├── useSnapshots.js       ← hook + extractor del raw_json del Nivel 1
    ├── biggy-img.js          ← logo Biggy en base64
    │
    ├── DashboardHoy.jsx      ← Pestaña 1
    ├── RutasEnVivo.jsx       ← Pestaña 2
    ├── NoEntregados.jsx      ← Pestaña 3
    ├── Suplantacion.jsx      ← Pestaña 4 (matriz CASO 1-5)
    ├── RankingChoferes.jsx   ← Pestaña 5
    └── DiaAnterior.jsx       ← Pestaña 6 (cierre del día)
```

## Cómo agregar nuevas pestañas

1. Crear archivo nuevo en `src/`, ejemplo `MiNuevaPestana.jsx`:

```jsx
export default function MiNuevaPestana({ usuario }) {
  return <div className="pg">contenido…</div>;
}
```

2. Sumarla al array `TABS` en `App.jsx`:

```jsx
const TABS = [
  // ...existentes...
  { id: "mi_nueva", label: "Mi Nueva Pestaña", Comp: MiNuevaPestana },
];
```

Todos los componentes reciben `usuario` con `{ email, nombre, sc_id }` y deben filtrar siempre las queries de Supabase por `usuario.sc_id`.

## Tablas Supabase utilizadas

| Tabla | Uso |
|---|---|
| `logistic_ayudantes_snapshots` | Vista en vivo (Dashboard, Rutas en Vivo, Ranking, Suplantación) — incluye `raw_json` con Nivel 1 completo |
| `meli_paquetes_fallidos` | Pestaña No Entregados |
| `meli_paquetes_entregados` | Pestaña Suplantación / Helpers (CASO 4) |
| `maestro_jornada_mx` | Pestaña Cierre del día |

## Notas

- Filtro de SC es **siempre por servidor** (`.eq("service_center_id", usuario.sc_id)`) — no por cliente. Para producción real conviene activar Row Level Security en Supabase y migrar a Supabase Auth en vez del diccionario hardcoded.
- El logout limpia `localStorage`. La sesión persiste entre recargas.
- Los snapshots Nivel 1 corren 7×/día (cada 3h). La pestaña "Dashboard Hoy" muestra siempre el último snapshot disponible.
- Los datos de `meli_paquetes_entregados` (Suplantación) dependen de que se haya corrido el scraper del día. Por defecto la pestaña Suplantación abre con la fecha de ayer porque suele tener data más completa.

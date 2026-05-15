import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG SUPABASE — mismas credenciales que el Brain
// ═══════════════════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://psvdtgjvognbmxfvqbaa.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzdmR0Z2p2b2duYm14ZnZxYmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzAwMTQsImV4cCI6MjA4NzYwNjAxNH0.zEBcFOT8u9BViQ1YVMm-QYsPKy1TZCKU2nJXqJR1Em0";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════════════════════════════════════════
// USUARIOS SUPERVISORES (hardcoded, mismo patrón que Brain)
// ═══════════════════════════════════════════════════════════════════════════
export const USUARIOS_SUPERVISOR = {
  "supervisor.smx8@bigticket.mx": {
    pass: "smx8.2026",
    nombre: "Supervisor SMX8",
    sc_id: "SMX8",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE FECHA (zona México)
// ═══════════════════════════════════════════════════════════════════════════
export function fechaHoyOperativa() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function fechaOperativaOffset(diasOffset) {
  const ahora = new Date();
  ahora.setDate(ahora.getDate() + diasOffset);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function fmtHoraMX(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function fmtHoraSoloMX(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function fmtDuracion(mins) {
  if (mins == null || mins === 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function fmtPct(n) {
  return `${Number(n || 0).toFixed(2)}%`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLORES SEMÁFORO (mismas reglas que el Brain)
// ═══════════════════════════════════════════════════════════════════════════
export const colorDuracion = (mins) => {
  if (mins == null) return "#94a3b8";
  if (mins > 720) return "#dc2626";
  if (mins > 480) return "#d97706";
  return "#16a34a";
};

export const colorNS = (ns) => {
  const n = Number(ns) || 0;
  if (n >= 99.5) return "#16a34a";
  if (n >= 95) return "#d97706";
  return "#dc2626";
};

export const colorStemOut = (m) => {
  if (m == null) return "#94a3b8";
  if (m > 90) return "#dc2626";
  if (m > 30) return "#d97706";
  return "#16a34a";
};

export const colorLoyalty = (tier) => {
  const t = String(tier || "").toLowerCase();
  if (t.includes("platino") || t.includes("platinum")) return "#0891b2";
  if (t.includes("oro") || t.includes("gold")) return "#ca8a04";
  if (t.includes("plata") || t.includes("silver")) return "#64748b";
  if (t.includes("bronce") || t.includes("bronze")) return "#9a3412";
  return "#94a3b8";
};

export const colorStatus = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("finished") || s.includes("delivered")) return "#16a34a";
  if (s.includes("active") || s.includes("started")) return "#0891b2";
  if (s.includes("planned")) return "#64748b";
  if (s.includes("cancel")) return "#dc2626";
  return "#475569";
};

// ═══════════════════════════════════════════════════════════════════════════
// CSS GLOBAL — replicando el design system del Brain
// ═══════════════════════════════════════════════════════════════════════════
export const css = `
  @import url('https://fonts.bunny.net/css?family=geist:400,500,600,700,800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Geist',sans-serif;background:#f0f2f5;min-height:100vh;}
  .topbar{background:#1a3a6b;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .btn-gw{background:transparent;color:#fff;border:0.5px solid rgba(255,255,255,0.3);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:'Geist',sans-serif;}
  .admin-nav{display:flex;gap:6px;padding:12px 20px;background:#fff;border-bottom:0.5px solid #e4e7ec;overflow-x:auto;}
  .nav-btn{padding:7px 14px;font-size:13px;border-radius:8px;border:none;cursor:pointer;background:transparent;color:#666;font-family:'Geist',sans-serif;white-space:nowrap;}
  .nav-btn.active{background:#eef2ff;color:#1a3a6b;font-weight:600;}
  .pg{padding:20px;max-width:1700px;margin:0 auto;padding-bottom:40px;}
  .sec-title{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:4px;}
  .sec-sub{font-size:13px;color:#666;margin-bottom:20px;}
  .form-card{background:#fff;border:0.5px solid #e4e7ec;border-radius:14px;padding:20px;margin-bottom:16px;}
  .field-row{margin-bottom:14px;}
  .field-label{font-size:12px;color:#555;margin-bottom:4px;display:block;font-weight:500;}
  input,select,textarea{width:100%;padding:9px 12px;border:0.5px solid #d0d5dd;border-radius:8px;font-size:13px;background:#fff;color:#1a1a1a;font-family:'Geist',sans-serif;outline:none;}
  .btn-blue{background:#1a3a6b;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;}
  .btn-blue:disabled{background:#ccc;cursor:not-allowed;}
  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f0f2f5;padding:20px;}
  .login-card{background:#fff;border-radius:16px;padding:40px 32px;width:100%;max-width:400px;border:0.5px solid #e4e7ec;}
  .kpi-card{background:#fff;border:1px solid #e4e7ec;border-radius:6px;padding:12px 14px;}
  .kpi-label{font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}
  .kpi-value{font-size:22px;font-weight:700;color:#1a3a6b;margin-top:2px;}
  .card{background:#fff;border:1px solid #e4e7ec;border-radius:8px;padding:14px;margin-bottom:14px;}
  .badge{font-size:10px;padding:2px 8px;border-radius:3px;font-weight:600;display:inline-block;}
`;

// ═══════════════════════════════════════════════════════════════════════════
// LABELS de alertas activas del raw_json
// (campos del Nivel 1 según informe Helper Detection)
// ═══════════════════════════════════════════════════════════════════════════
export const ALERT_LABELS = {
  delayedRoute: "Ruta atrasada",
  inactivityVehicle: "Vehículo inactivo",
  pendingSackDelivery: "Sack pendiente",
  odRouteDispatchDelayed: "Despacho atrasado",
  commercialStopPending: "Parada comercial pendiente",
  delayedStemout: "StemOut atrasado",
};

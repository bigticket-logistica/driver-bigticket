import { BIGGY_IMG } from "./biggy-img.js";

export function Topbar({ usuario, onLogout, ultimoSnap }) {
  return (
    <div className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src={BIGGY_IMG}
          alt="Biggy"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1.5px solid #F47B20",
          }}
        />
        <span style={{ fontSize: 16, fontWeight: 700 }}>
          <span style={{ color: "#F47B20" }}>Big</span>
          <span style={{ color: "#fff" }}>ticket</span>
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#aac3e8",
            marginLeft: 8,
            paddingLeft: 12,
            borderLeft: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          Bitácora del Supervisor · {usuario.sc_id}
        </span>
        {ultimoSnap && (
          <span style={{ fontSize: 10, color: "#aac3e8", marginLeft: 8 }}>
            · último snapshot:{" "}
            {new Intl.DateTimeFormat("es-MX", {
              timeZone: "America/Mexico_City",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(ultimoSnap))}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: "#aac3e8" }}>👤 {usuario.nombre}</span>
        <button className="btn-gw" onClick={onLogout}>
          Salir
        </button>
      </div>
    </div>
  );
}

export function KPI({ label, value, sub, color = "#1a3a6b" }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

export function Badge({ children, bg, color }) {
  return (
    <span
      className="badge"
      style={{
        background: bg || "#f1f5f9",
        color: color || "#475569",
      }}
    >
      {children}
    </span>
  );
}

export function Th({ children, onClick, right, center, width }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: "10px 8px",
        textAlign: right ? "right" : center ? "center" : "left",
        fontSize: 10,
        fontWeight: 700,
        color: "#475569",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        width,
      }}
    >
      {children}
    </th>
  );
}

export const tdStyle = (bold) => ({
  padding: "9px 8px",
  fontSize: 11,
  color: "#1a1a1a",
  fontWeight: bold ? 600 : 400,
});

export function EmptyState({ title, msg }) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        color: "#94a3b8",
        background: "#fff",
        border: "1px dashed #e4e7ec",
        borderRadius: 8,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#475569" }}>{title}</div>
      {msg && <div style={{ fontSize: 11 }}>{msg}</div>}
    </div>
  );
}

export function LoadingState({ msg = "Cargando..." }) {
  return (
    <div
      style={{
        padding: 30,
        textAlign: "center",
        color: "#94a3b8",
        background: "#fff",
        border: "1px solid #e4e7ec",
        borderRadius: 8,
      }}
    >
      {msg}
    </div>
  );
}

import { useState } from "react";
import { css } from "./shared.js";
import { Topbar } from "./ui.jsx";
import Login from "./Login.jsx";
import DashboardHoy from "./DashboardHoy.jsx";
import RutasEnVivo from "./RutasEnVivo.jsx";
import NoEntregados from "./NoEntregados.jsx";
import Suplantacion from "./Suplantacion.jsx";
import RankingChoferes from "./RankingChoferes.jsx";
import DiaAnterior from "./DiaAnterior.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑAS — orden pensado para flujo del supervisor:
//   1. Vista rápida del día → 2. detalle ruta → 3. problemas operativos →
//   4. fraude/helpers → 5. choferes → 6. histórico cerrado
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "dashboard", label: "Dashboard Hoy", Comp: DashboardHoy },
  { id: "rutas_vivo", label: "Rutas en Vivo", Comp: RutasEnVivo },
  { id: "no_entregados", label: "No Entregados", Comp: NoEntregados },
  { id: "suplantacion", label: "Suplantación / Helpers", Comp: Suplantacion },
  { id: "ranking", label: "Ranking Choferes", Comp: RankingChoferes },
  { id: "dia_anterior", label: "Cierre del día", Comp: DiaAnterior },
];

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem("bt_supervisor_usuario");
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });
  const [tabId, setTabId] = useState("dashboard");

  const handleLogin = (u) => {
    localStorage.setItem("bt_supervisor_usuario", JSON.stringify(u));
    setUsuario(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("bt_supervisor_usuario");
    setUsuario(null);
  };

  if (!usuario) {
    return (
      <>
        <style>{css}</style>
        <Login onLogin={handleLogin} />
      </>
    );
  }

  const TabComp = TABS.find((t) => t.id === tabId)?.Comp || DashboardHoy;

  return (
    <>
      <style>{css}</style>
      <div>
        <Topbar usuario={usuario} onLogout={handleLogout} />
        <div className="admin-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-btn ${tabId === t.id ? "active" : ""}`}
              onClick={() => setTabId(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <TabComp usuario={usuario} />
      </div>
    </>
  );
}

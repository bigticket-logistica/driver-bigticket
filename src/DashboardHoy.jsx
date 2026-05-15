import { useMemo } from "react";
import { useSnapshotsHoy, extraerCamposRuta } from "./useSnapshots.js";
import { KPI, EmptyState, LoadingState, Badge } from "./ui.jsx";
import { colorNS, fmtHoraSoloMX, ALERT_LABELS } from "./shared.js";

export default function DashboardHoy({ usuario }) {
  const { rutas: rawRutas, loading, error, ultimoSnap, refresh, fecha } =
    useSnapshotsHoy(usuario.sc_id);

  const rutas = useMemo(() => rawRutas.map(extraerCamposRuta), [rawRutas]);

  // ── Métricas agregadas ───────────────────────────────────────────────
  const stats = useMemo(() => {
    if (rutas.length === 0) return null;

    const activas = rutas.filter((r) => /active|started/i.test(r.status || ""));
    const finalizadas = rutas.filter((r) => /finished|delivered/i.test(r.status || ""));
    const planificadas = rutas.filter((r) => /planned/i.test(r.status || ""));

    const totalDespachados = rutas.reduce((s, r) => s + (r.total || 0), 0);
    const totalEntregados = rutas.reduce((s, r) => s + (r.delivered || 0), 0);
    const totalNoEntregados = rutas.reduce((s, r) => s + (r.notDelivered || 0), 0);
    const totalPendientes = rutas.reduce((s, r) => s + (r.pending || 0), 0);

    const conAlerta = rutas.filter((r) => r.alertas_count > 0);
    const conHelper = rutas.filter((r) => r.hasHelper);
    const conIncidentes = rutas.filter((r) => r.incident_types.length > 0);
    const conClaims = rutas.filter((r) => r.claims_count > 0);
    const conRetrasoIni = rutas.filter((r) => r._raw?.flags?.hasInitialDelay);

    // Conteo de alertas por tipo
    const alertasPorTipo = {};
    for (const r of rutas) {
      for (const a of r.alertas) {
        alertasPorTipo[a] = (alertasPorTipo[a] || 0) + 1;
      }
    }

    // Performance
    const perfOk = rutas.filter((r) => r.performance_score === "OK").length;
    const perfNotOk = rutas.filter((r) => r.performance_score === "NOT_OK").length;
    const perfRegular = rutas.filter((r) => r.performance_score === "REGULAR").length;

    const pctEntregado =
      totalDespachados > 0 ? (totalEntregados / totalDespachados) * 100 : 0;

    return {
      total: rutas.length,
      activas: activas.length,
      finalizadas: finalizadas.length,
      planificadas: planificadas.length,
      totalDespachados,
      totalEntregados,
      totalNoEntregados,
      totalPendientes,
      pctEntregado,
      conAlerta: conAlerta.length,
      conHelper: conHelper.length,
      conIncidentes: conIncidentes.length,
      conClaims: conClaims.length,
      conRetrasoIni: conRetrasoIni.length,
      alertasPorTipo,
      perfOk,
      perfNotOk,
      perfRegular,
    };
  }, [rutas]);

  // ── Top problemas (peores rutas para atender ahora) ──────────────────
  const topProblemas = useMemo(() => {
    return [...rutas]
      .map((r) => ({
        ...r,
        // Score de criticidad: cada alerta = 10, incidente = 5, claim = 3, perfNotOk = 5
        _score:
          r.alertas_count * 10 +
          r.incident_types.length * 5 +
          r.claims_count * 3 +
          (r.performance_score === "NOT_OK" ? 5 : 0),
      }))
      .filter((r) => r._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);
  }, [rutas]);

  if (loading) {
    return (
      <div className="pg">
        <div className="sec-title">Dashboard del día</div>
        <LoadingState msg={`Cargando snapshots de ${fecha}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pg">
        <div className="sec-title">Dashboard del día</div>
        <EmptyState title="Error cargando datos" msg={error} />
      </div>
    );
  }

  if (rutas.length === 0) {
    return (
      <div className="pg">
        <div className="sec-title">Dashboard del día · {fecha}</div>
        <EmptyState
          title={`Sin snapshots para ${usuario.sc_id} hoy`}
          msg="El scraper todavía no corrió o no hay rutas activas para este SC."
        />
      </div>
    );
  }

  return (
    <div className="pg">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div className="sec-title">Dashboard del día · {fecha}</div>
          <div className="sec-sub">
            {usuario.sc_id} · Foto en vivo del último snapshot disponible
          </div>
        </div>
        <button
          onClick={refresh}
          style={{
            padding: "8px 14px",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            color: "#475569",
          }}
        >
          ↻ Refrescar
        </button>
      </div>

      {/* KPIs principales */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <KPI label="Rutas totales" value={stats.total} sub={`${stats.activas} activas · ${stats.finalizadas} fin · ${stats.planificadas} plan`} />
        <KPI
          label="% Entregado"
          value={`${stats.pctEntregado.toFixed(1)}%`}
          sub={`${stats.totalEntregados} de ${stats.totalDespachados}`}
          color={colorNS(stats.pctEntregado)}
        />
        <KPI
          label="Pendientes"
          value={stats.totalPendientes}
          sub="por entregar"
          color={stats.totalPendientes > 0 ? "#d97706" : "#16a34a"}
        />
        <KPI
          label="No entregados"
          value={stats.totalNoEntregados}
          sub="fallidos hoy"
          color={stats.totalNoEntregados > 0 ? "#dc2626" : "#16a34a"}
        />
        <KPI
          label="Rutas con alerta"
          value={stats.conAlerta}
          sub={`${((stats.conAlerta / stats.total) * 100).toFixed(0)}% del total`}
          color={stats.conAlerta > 0 ? "#dc2626" : "#16a34a"}
        />
        <KPI
          label="Con helper MELI"
          value={stats.conHelper}
          sub={`${((stats.conHelper / stats.total) * 100).toFixed(0)}% marcadas`}
          color="#7c3aed"
        />
      </div>

      {/* Desglose de alertas */}
      {Object.keys(stats.alertasPorTipo).length > 0 && (
        <div className="card">
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#9a3412",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Alertas activas por tipo
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {Object.entries(stats.alertasPorTipo)
              .sort((a, b) => b[1] - a[1])
              .map(([tipo, count]) => (
                <div
                  key={tipo}
                  style={{
                    background: "#fef9f3",
                    border: "1px solid #fed7aa",
                    borderRadius: 6,
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#9a3412", fontWeight: 600 }}>
                    {ALERT_LABELS[tipo] || tipo}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Performance distribución */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div className="card" style={{ marginBottom: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1a3a6b",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Performance Score
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Badge bg="#dcfce7" color="#166534">
              OK: {stats.perfOk}
            </Badge>
            <Badge bg="#fef3c7" color="#92400e">
              Regular: {stats.perfRegular}
            </Badge>
            <Badge bg="#fee2e2" color="#991b1b">
              NOT_OK: {stats.perfNotOk}
            </Badge>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1a3a6b",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Atención inmediata
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Badge bg={stats.conIncidentes > 0 ? "#fee2e2" : "#f1f5f9"} color={stats.conIncidentes > 0 ? "#991b1b" : "#475569"}>
              Incidentes: {stats.conIncidentes}
            </Badge>
            <Badge bg={stats.conClaims > 0 ? "#fee2e2" : "#f1f5f9"} color={stats.conClaims > 0 ? "#991b1b" : "#475569"}>
              Reclamos: {stats.conClaims}
            </Badge>
            <Badge bg={stats.conRetrasoIni > 0 ? "#fef3c7" : "#f1f5f9"} color={stats.conRetrasoIni > 0 ? "#92400e" : "#475569"}>
              Retraso inicial: {stats.conRetrasoIni}
            </Badge>
          </div>
        </div>
      </div>

      {/* Top problemas */}
      {topProblemas.length > 0 && (
        <div className="card">
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#dc2626",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            🔥 Top 5 rutas que requieren atención
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e7ec" }}>
                <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.3 }}>Ruta</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.3 }}>Chofer</th>
                <th style={{ padding: "8px", textAlign: "center", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.3 }}>Progreso</th>
                <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.3 }}>Problemas</th>
              </tr>
            </thead>
            <tbody>
              {topProblemas.map((r) => (
                <tr key={r.id_ruta} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 10 }}>
                    {r.id_ruta}
                  </td>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{r.driver_name}</td>
                  <td style={{ padding: "8px", textAlign: "center", fontSize: 10 }}>
                    {r.delivered}/{r.total} ({r.progresoPct.toFixed(0)}%)
                  </td>
                  <td style={{ padding: "8px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {r.alertas.map((a) => (
                        <Badge key={a} bg="#fee2e2" color="#991b1b">
                          {ALERT_LABELS[a] || a}
                        </Badge>
                      ))}
                      {r.performance_score === "NOT_OK" && (
                        <Badge bg="#fee2e2" color="#991b1b">
                          Perf NOT_OK
                        </Badge>
                      )}
                      {r.incident_types.length > 0 && (
                        <Badge bg="#fef3c7" color="#92400e">
                          {r.incident_types.length} incid.
                        </Badge>
                      )}
                      {r.claims_count > 0 && (
                        <Badge bg="#fef3c7" color="#92400e">
                          {r.claims_count} reclamos
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

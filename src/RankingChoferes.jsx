import { useMemo, useState } from "react";
import { useSnapshotsHoy, extraerCamposRuta } from "./useSnapshots.js";
import { KPI, Th, tdStyle, Badge, EmptyState, LoadingState } from "./ui.jsx";
import { colorNS, colorLoyalty } from "./shared.js";

export default function RankingChoferes({ usuario }) {
  const { rutas: rawRutas, loading, error, refresh, fecha } = useSnapshotsHoy(usuario.sc_id);
  const rutas = useMemo(() => rawRutas.map(extraerCamposRuta), [rawRutas]);

  const [orderBy, setOrderBy] = useState("score");
  const [orderDir, setOrderDir] = useState("desc");
  const toggleOrder = (col) => {
    if (orderBy === col) setOrderDir(orderDir === "asc" ? "desc" : "asc");
    else {
      setOrderBy(col);
      setOrderDir("desc");
    }
  };
  const ordIcon = (col) => (orderBy === col ? (orderDir === "asc" ? " ↑" : " ↓") : "");

  // ── Construir ranking ────────────────────────────────────────────────
  const choferes = useMemo(() => {
    // Un chofer puede tener varias rutas hoy. Agregamos por driver_id.
    const map = new Map();
    for (const r of rutas) {
      const key = r.driver_id || r.driver_name;
      if (!map.has(key)) {
        map.set(key, {
          driver_id: r.driver_id,
          driver_name: r.driver_name,
          loyalty: r.loyalty,
          contact_rate: r.contact_rate,
          rutas_count: 0,
          total_despachados: 0,
          total_entregados: 0,
          total_no_entregados: 0,
          alertas_total: 0,
          incidentes_total: 0,
          claims_total: 0,
          perf_ok: 0,
          perf_not_ok: 0,
          perf_regular: 0,
          stem_out_max: 0,
          has_helper_rutas: 0,
          rutas: [],
        });
      }
      const ch = map.get(key);
      ch.rutas_count++;
      ch.total_despachados += r.total || 0;
      ch.total_entregados += r.delivered || 0;
      ch.total_no_entregados += r.notDelivered || 0;
      ch.alertas_total += r.alertas_count;
      ch.incidentes_total += r.incident_types.length;
      ch.claims_total += r.claims_count;
      if (r.performance_score === "OK") ch.perf_ok++;
      else if (r.performance_score === "NOT_OK") ch.perf_not_ok++;
      else if (r.performance_score === "REGULAR") ch.perf_regular++;
      ch.stem_out_max = Math.max(ch.stem_out_max, r.stem_out || 0);
      if (r.hasHelper) ch.has_helper_rutas++;
      ch.rutas.push(r);
    }

    // Score compuesto del chofer del día
    // (mayor = mejor)
    const arr = Array.from(map.values()).map((ch) => {
      const ns = ch.total_despachados > 0 ? (ch.total_entregados / ch.total_despachados) * 100 : 0;
      // Score: 60% NS + 20% performance + penaliza alertas/incidentes/claims
      const perfScore =
        ch.rutas_count > 0
          ? (ch.perf_ok * 100 + ch.perf_regular * 50) / ch.rutas_count
          : 50;
      const penalty = ch.alertas_total * 3 + ch.incidentes_total * 5 + ch.claims_total * 4;
      const score = Math.max(0, Math.min(100, ns * 0.6 + perfScore * 0.2 - penalty + 20));
      return {
        ...ch,
        ns,
        perfScore,
        score: Number(score.toFixed(1)),
      };
    });

    return arr;
  }, [rutas]);

  // ── Stats globales ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (choferes.length === 0) return null;
    const conLoyalty = choferes.filter((c) => c.loyalty);
    const oroOPlatino = choferes.filter((c) =>
      /oro|gold|platino|platinum/i.test(c.loyalty || "")
    );
    const bronce = choferes.filter((c) => /bronce|bronze/i.test(c.loyalty || ""));
    return {
      total: choferes.length,
      conLoyalty: conLoyalty.length,
      oroOPlatino: oroOPlatino.length,
      bronce: bronce.length,
      scorePromedio: choferes.reduce((s, c) => s + c.score, 0) / choferes.length,
      nsPromedio: choferes.reduce((s, c) => s + c.ns, 0) / choferes.length,
    };
  }, [choferes]);

  const ordenados = useMemo(() => {
    const arr = [...choferes];
    arr.sort((a, b) => {
      const va = a[orderBy],
        vb = b[orderBy];
      const numA = typeof va === "number" || (!isNaN(parseFloat(va)) && va !== null);
      const numB = typeof vb === "number" || (!isNaN(parseFloat(vb)) && vb !== null);
      let cmp = 0;
      if (numA && numB) cmp = Number(va) - Number(vb);
      else cmp = String(va || "").localeCompare(String(vb || ""));
      return orderDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [choferes, orderBy, orderDir]);

  if (loading) {
    return (
      <div className="pg">
        <div className="sec-title">Ranking de Choferes</div>
        <LoadingState msg={`Cargando snapshots de ${fecha}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pg">
        <div className="sec-title">Ranking de Choferes</div>
        <EmptyState title="Error cargando datos" msg={error} />
      </div>
    );
  }

  if (choferes.length === 0) {
    return (
      <div className="pg">
        <div className="sec-title">Ranking de Choferes · {fecha}</div>
        <EmptyState
          title={`Sin choferes activos hoy en ${usuario.sc_id}`}
          msg="No hay snapshots disponibles."
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
          <div className="sec-title">Ranking de Choferes · {fecha}</div>
          <div className="sec-sub">
            {usuario.sc_id} · {choferes.length} choferes activos · ordenados por score compuesto
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

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <KPI label="Choferes activos" value={stats.total} />
        <KPI
          label="Score promedio"
          value={stats.scorePromedio.toFixed(1)}
          sub="de 100"
          color={colorNS(stats.scorePromedio)}
        />
        <KPI
          label="NS promedio"
          value={`${stats.nsPromedio.toFixed(1)}%`}
          color={colorNS(stats.nsPromedio)}
        />
        <KPI
          label="Oro / Platino"
          value={stats.oroOPlatino}
          sub={`${((stats.oroOPlatino / stats.total) * 100).toFixed(0)}%`}
          color="#ca8a04"
        />
        <KPI
          label="Bronce"
          value={stats.bronce}
          sub={stats.bronce > 0 ? "necesita seguimiento" : "—"}
          color={stats.bronce > 0 ? "#9a3412" : "#475569"}
        />
      </div>

      {/* Tabla ranking */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e4e7ec",
          borderRadius: 6,
          overflow: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 1200 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e7ec" }}>
              <Th center>#</Th>
              <Th onClick={() => toggleOrder("driver_name")}>Chofer{ordIcon("driver_name")}</Th>
              <Th onClick={() => toggleOrder("loyalty")} center>Loyalty{ordIcon("loyalty")}</Th>
              <Th onClick={() => toggleOrder("rutas_count")} right>Rutas{ordIcon("rutas_count")}</Th>
              <Th onClick={() => toggleOrder("total_entregados")} right>Entregados{ordIcon("total_entregados")}</Th>
              <Th onClick={() => toggleOrder("ns")} right>NS%{ordIcon("ns")}</Th>
              <Th onClick={() => toggleOrder("perf_ok")} center>Perf OK / Total{ordIcon("perf_ok")}</Th>
              <Th onClick={() => toggleOrder("alertas_total")} right>Alertas{ordIcon("alertas_total")}</Th>
              <Th onClick={() => toggleOrder("incidentes_total")} right>Incid.{ordIcon("incidentes_total")}</Th>
              <Th onClick={() => toggleOrder("claims_total")} right>Reclamos{ordIcon("claims_total")}</Th>
              <Th onClick={() => toggleOrder("has_helper_rutas")} center>Helper{ordIcon("has_helper_rutas")}</Th>
              <Th onClick={() => toggleOrder("score")} right>Score{ordIcon("score")}</Th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((c, i) => (
              <tr key={c.driver_id || c.driver_name} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ ...tdStyle(), textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                  {i + 1}
                </td>
                <td style={tdStyle(true)}>
                  <div>{c.driver_name}</div>
                  {c.driver_id && (
                    <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>
                      ID {c.driver_id}
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle(), textAlign: "center" }}>
                  {c.loyalty ? (
                    <Badge bg={colorLoyalty(c.loyalty) + "22"} color={colorLoyalty(c.loyalty)}>
                      {c.loyalty}
                    </Badge>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>
                <td style={{ ...tdStyle(), textAlign: "right" }}>{c.rutas_count}</td>
                <td style={{ ...tdStyle(), textAlign: "right" }}>
                  {c.total_entregados}/{c.total_despachados}
                </td>
                <td
                  style={{
                    ...tdStyle(),
                    textAlign: "right",
                    color: colorNS(c.ns),
                    fontWeight: 700,
                  }}
                >
                  {c.ns.toFixed(1)}%
                </td>
                <td style={{ ...tdStyle(), textAlign: "center", fontSize: 10 }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>{c.perf_ok}</span>
                  <span style={{ color: "#94a3b8" }}> / </span>
                  <span style={{ color: "#d97706", fontWeight: 700 }}>{c.perf_regular}</span>
                  <span style={{ color: "#94a3b8" }}> / </span>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>{c.perf_not_ok}</span>
                </td>
                <td
                  style={{
                    ...tdStyle(),
                    textAlign: "right",
                    color: c.alertas_total > 0 ? "#dc2626" : "#94a3b8",
                    fontWeight: c.alertas_total > 0 ? 700 : 400,
                  }}
                >
                  {c.alertas_total}
                </td>
                <td
                  style={{
                    ...tdStyle(),
                    textAlign: "right",
                    color: c.incidentes_total > 0 ? "#dc2626" : "#94a3b8",
                    fontWeight: c.incidentes_total > 0 ? 700 : 400,
                  }}
                >
                  {c.incidentes_total}
                </td>
                <td
                  style={{
                    ...tdStyle(),
                    textAlign: "right",
                    color: c.claims_total > 0 ? "#dc2626" : "#94a3b8",
                    fontWeight: c.claims_total > 0 ? 700 : 400,
                  }}
                >
                  {c.claims_total}
                </td>
                <td style={{ ...tdStyle(), textAlign: "center" }}>
                  {c.has_helper_rutas > 0 ? (
                    <Badge bg="#ede9fe" color="#6d28d9">
                      {c.has_helper_rutas}/{c.rutas_count}
                    </Badge>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>
                <td
                  style={{
                    ...tdStyle(),
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 13,
                    color: colorNS(c.score),
                  }}
                >
                  {c.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: "#94a3b8" }}>
        <strong>Score:</strong> compuesto por NS% (60%) + Performance (20%) - penalización por
        alertas/incidentes/reclamos. Máximo 100.
      </div>
    </div>
  );
}

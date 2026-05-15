import { useState, useEffect, useMemo, Fragment } from "react";
import {
  sb,
  fechaHoyOperativa,
  fechaOperativaOffset,
  fmtHoraMX,
  fmtDuracion,
  fmtPct,
  colorDuracion,
  colorNS,
  colorStemOut,
  colorLoyalty,
} from "./shared.js";
import { KPI, Th, tdStyle, Badge, EmptyState, LoadingState } from "./ui.jsx";

/**
 * Pestaña basada en `maestro_jornada_mx` — el cierre del día.
 * (Lo que ya teníamos como "Información de Ruta")
 *
 * Por default abre con el día de ayer, que es donde la tabla está completa.
 */
export default function DiaAnterior({ usuario }) {
  const [fecha, setFecha] = useState(fechaOperativaOffset(-1));
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("todas");
  const [orderBy, setOrderBy] = useState("driver_name");
  const [orderDir, setOrderDir] = useState("asc");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await sb
          .from("maestro_jornada_mx")
          .select("*")
          .eq("fecha", fecha)
          .eq("service_center_id", usuario.sc_id)
          .order("driver_name")
          .limit(5000);
        if (cancel) return;
        if (err) throw err;
        setRutas(data || []);
      } catch (e) {
        console.error(e);
        if (!cancel) {
          setError(e.message);
          setRutas([]);
        }
      }
      if (!cancel) setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [fecha, usuario.sc_id]);

  const filtradas = useMemo(() => {
    let res = [...rutas];
    if (busqueda) {
      const q = busqueda.toLowerCase();
      res = res.filter(
        (r) =>
          (r.driver_name || "").toLowerCase().includes(q) ||
          (r.placa || "").toLowerCase().includes(q) ||
          (r.id_ruta || "").toLowerCase().includes(q)
      );
    }
    if (filtroAlerta === "rutas_largas")
      res = res.filter((r) => (r.duracion_minutos || 0) > 720);
    else if (filtroAlerta === "cruces") res = res.filter((r) => r.cruza_medianoche);
    else if (filtroAlerta === "ns_bajo")
      res = res.filter((r) => Number(r.ns_pct || 0) < 95);
    else if (filtroAlerta === "performance_not_ok")
      res = res.filter((r) => r.performance_score === "NOT_OK");
    else if (filtroAlerta === "retraso_inicial")
      res = res.filter((r) => r.tiene_retraso_inicial);
    else if (filtroAlerta === "incidentes")
      res = res.filter((r) => (r.cantidad_incidentes || 0) > 0);

    res.sort((a, b) => {
      const va = a[orderBy],
        vb = b[orderBy];
      const numA = typeof va === "number" || (!isNaN(parseFloat(va)) && va !== null);
      const numB = typeof vb === "number" || (!isNaN(parseFloat(vb)) && vb !== null);
      let cmp = 0;
      if (numA && numB) cmp = Number(va) - Number(vb);
      else cmp = String(va || "").localeCompare(String(vb || ""));
      return orderDir === "asc" ? cmp : -cmp;
    });
    return res;
  }, [rutas, busqueda, filtroAlerta, orderBy, orderDir]);

  const toggleOrder = (col) => {
    if (orderBy === col) setOrderDir(orderDir === "asc" ? "desc" : "asc");
    else {
      setOrderBy(col);
      setOrderDir("asc");
    }
  };
  const ordIcon = (col) => (orderBy === col ? (orderDir === "asc" ? " ↑" : " ↓") : "");

  const kpis = useMemo(() => {
    const conDur = rutas.filter((r) => r.duracion_minutos != null);
    const durProm =
      conDur.length > 0 ? conDur.reduce((s, r) => s + r.duracion_minutos, 0) / conDur.length : 0;
    const kmProm =
      rutas.length > 0
        ? rutas.reduce((s, r) => s + Number(r.km_recorridos || 0), 0) / rutas.length
        : 0;
    const nsProm =
      rutas.length > 0
        ? rutas.reduce((s, r) => s + Number(r.ns_pct || 0), 0) / rutas.length
        : 0;
    return {
      total: rutas.length,
      durProm,
      kmProm,
      nsProm,
      rutasLargas: rutas.filter((r) => (r.duracion_minutos || 0) > 720).length,
      cruces: rutas.filter((r) => r.cruza_medianoche).length,
      nsBajo: rutas.filter((r) => Number(r.ns_pct || 0) < 95).length,
      perfNotOk: rutas.filter((r) => r.performance_score === "NOT_OK").length,
      retrasoInicial: rutas.filter((r) => r.tiene_retraso_inicial).length,
      conIncidentes: rutas.filter((r) => (r.cantidad_incidentes || 0) > 0).length,
    };
  }, [rutas]);

  const exportarCSV = () => {
    if (filtradas.length === 0) {
      alert("No hay datos para exportar");
      return;
    }
    const headers = [
      "Fecha", "Chofer", "Patente", "Vehículo", "Tipología", "SC", "Zona", "ID Ruta", "Ciclo",
      "Hora inicio MX", "Hora fin MX", "Duración min", "Cruzó medianoche",
      "Km", "NS%", "No visitado %", "Categoría NS",
      "Loyalty", "Performance", "Retraso inicial", "Incidentes", "Stem out min",
    ];
    const rows = filtradas.map((r) => [
      r.fecha, r.driver_name, r.placa, r.vehiculo_raw, r.tipologia, r.service_center_id, r.zona,
      r.id_ruta, r.ciclo, fmtHoraMX(r.hora_inicio_ruta), fmtHoraMX(r.hora_fin_ruta),
      r.duracion_minutos, r.cruza_medianoche ? "SI" : "NO",
      r.km_recorridos, r.ns_pct, r.ns_no_visitado, r.ns_categoria,
      r.loyalty_tier, r.performance_score, r.tiene_retraso_inicial ? "SI" : "NO",
      r.cantidad_incidentes, r.stem_out_minutos,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((v) => {
            if (v === null || v === undefined) return "";
            const s = String(v);
            return s.includes(",") || s.includes('"') || s.includes("\n")
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cierre_${usuario.sc_id}_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="pg">
        <div className="sec-title">Cierre del día</div>
        <LoadingState msg={`Cargando datos del ${fecha}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pg">
        <div className="sec-title">Cierre del día</div>
        <EmptyState title="Error cargando datos" msg={error} />
      </div>
    );
  }

  return (
    <div className="pg">
      <div className="sec-title">Cierre del día · {fecha}</div>
      <div className="sec-sub">
        {usuario.sc_id} · KPIs y detalle final de la jornada (`maestro_jornada_mx`)
      </div>

      {/* Selector fecha */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { l: "Ayer", fn: () => setFecha(fechaOperativaOffset(-1)) },
            { l: "-2 días", fn: () => setFecha(fechaOperativaOffset(-2)) },
            { l: "-3 días", fn: () => setFecha(fechaOperativaOffset(-3)) },
            { l: "-7 días", fn: () => setFecha(fechaOperativaOffset(-7)) },
          ].map(({ l, fn }) => (
            <button
              key={l}
              onClick={fn}
              style={{
                padding: "5px 12px",
                borderRadius: 4,
                border: "1px solid #e4e7ec",
                background: "#f8fafc",
                color: "#475569",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {l}
            </button>
          ))}
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{
              background: "#f8fafc",
              border: "1px solid #e4e7ec",
              borderRadius: 4,
              padding: "6px 10px",
              fontSize: 12,
              width: "auto",
            }}
          />
          <input
            type="text"
            placeholder="Buscar chofer / patente / id ruta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              background: "#f8fafc",
              border: "1px solid #e4e7ec",
              borderRadius: 4,
              padding: "6px 10px",
              fontSize: 12,
              flex: 1,
              minWidth: 220,
            }}
          />
          <button
            onClick={exportarCSV}
            disabled={filtradas.length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: 4,
              border: "1px solid #e4e7ec",
              background: "#fff",
              color: "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: filtradas.length === 0 ? "not-allowed" : "pointer",
              opacity: filtradas.length === 0 ? 0.5 : 1,
            }}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {rutas.length === 0 ? (
        <EmptyState
          title={`Sin cierre para ${fecha} en ${usuario.sc_id}`}
          msg="El proceso de cierre del día aún no se ejecutó para esta fecha, o no hubo rutas."
        />
      ) : (
        <>
          {/* Panel alertas */}
          <div
            style={{
              background: "#fef9f3",
              border: "1px solid #fed7aa",
              borderRadius: 8,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412", marginBottom: 10 }}>
              Alertas del día
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 8,
              }}
            >
              {[
                { id: "rutas_largas", label: "Rutas largas (>12h)", count: kpis.rutasLargas, col: "#dc2626" },
                { id: "cruces", label: "Cruzaron medianoche", count: kpis.cruces, col: "#7c3aed" },
                { id: "ns_bajo", label: "NS < 95%", count: kpis.nsBajo, col: "#dc2626" },
                { id: "performance_not_ok", label: "Performance NOT_OK", count: kpis.perfNotOk, col: "#dc2626" },
                { id: "retraso_inicial", label: "Con retraso inicial", count: kpis.retrasoInicial, col: "#d97706" },
                { id: "incidentes", label: "Con incidentes", count: kpis.conIncidentes, col: "#d97706" },
              ]
                .filter((a) => a.count > 0)
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setFiltroAlerta(filtroAlerta === a.id ? "todas" : a.id)}
                    style={{
                      background: filtroAlerta === a.id ? a.col : "#fff",
                      color: filtroAlerta === a.id ? "#fff" : a.col,
                      border: `1px solid ${a.col}`,
                      borderRadius: 4,
                      padding: "8px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{a.label}</span>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{a.count}</span>
                    </div>
                  </button>
                ))}
              {kpis.rutasLargas +
                kpis.cruces +
                kpis.nsBajo +
                kpis.perfNotOk +
                kpis.retrasoInicial +
                kpis.conIncidentes ===
                0 && (
                <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>
                  Sin alertas — todo en orden ✓
                </div>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <KPI label="Rutas" value={kpis.total} />
            <KPI label="Duración prom." value={fmtDuracion(Math.round(kpis.durProm))} />
            <KPI label="Km prom." value={kpis.kmProm.toFixed(1)} />
            <KPI label="NS prom." value={fmtPct(kpis.nsProm)} color={colorNS(kpis.nsProm)} />
          </div>

          {/* Tabla */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e4e7ec",
              borderRadius: 6,
              overflow: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 1300 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e7ec" }}>
                  <Th onClick={() => toggleOrder("driver_name")}>Chofer{ordIcon("driver_name")}</Th>
                  <Th onClick={() => toggleOrder("placa")}>Patente · Vehíc.{ordIcon("placa")}</Th>
                  <Th onClick={() => toggleOrder("id_ruta")}>ID Ruta{ordIcon("id_ruta")}</Th>
                  <Th onClick={() => toggleOrder("zona")} center>Zona{ordIcon("zona")}</Th>
                  <Th onClick={() => toggleOrder("hora_inicio_ruta")} center>Inicio MX{ordIcon("hora_inicio_ruta")}</Th>
                  <Th onClick={() => toggleOrder("hora_fin_ruta")} center>Fin MX{ordIcon("hora_fin_ruta")}</Th>
                  <Th onClick={() => toggleOrder("duracion_minutos")} right>Dur.{ordIcon("duracion_minutos")}</Th>
                  <Th onClick={() => toggleOrder("km_recorridos")} right>Km{ordIcon("km_recorridos")}</Th>
                  <Th onClick={() => toggleOrder("ns_pct")} right>NS%{ordIcon("ns_pct")}</Th>
                  <Th onClick={() => toggleOrder("loyalty_tier")} center>Loyalty{ordIcon("loyalty_tier")}</Th>
                  <Th onClick={() => toggleOrder("performance_score")} center>Perf.{ordIcon("performance_score")}</Th>
                  <Th onClick={() => toggleOrder("stem_out_minutos")} right>StemOut{ordIcon("stem_out_minutos")}</Th>
                  <Th onClick={() => toggleOrder("cantidad_incidentes")} right>Incid.{ordIcon("cantidad_incidentes")}</Th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r, i) => (
                  <Fragment key={r.id || i}>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={tdStyle(true)}>{r.driver_name || "—"}</td>
                      <td style={tdStyle()}>
                        <div style={{ fontFamily: "monospace", fontSize: 10 }}>{r.placa || "—"}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>
                          {r.tipologia || "?"}
                        </div>
                      </td>
                      <td style={{ ...tdStyle(), fontFamily: "monospace", fontSize: 10 }}>
                        {r.id_ruta}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        <Badge bg="#e0e7ff" color="#3730a3">
                          {r.zona || "?"}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center", fontSize: 10 }}>
                        {fmtHoraMX(r.hora_inicio_ruta)}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center", fontSize: 10 }}>
                        {fmtHoraMX(r.hora_fin_ruta)}
                        {r.cruza_medianoche && (
                          <div style={{ fontSize: 9, color: "#7c3aed", fontWeight: 700 }}>
                            ★ cruzó 0h
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          fontWeight: 700,
                          color: colorDuracion(r.duracion_minutos),
                        }}
                      >
                        {fmtDuracion(r.duracion_minutos)}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "right" }}>
                        {Number(r.km_recorridos || 0).toFixed(1)}
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          color: colorNS(r.ns_pct),
                          fontWeight: 600,
                        }}
                      >
                        <div>{fmtPct(r.ns_pct)}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 400 }}>
                          {r.ns_categoria}
                        </div>
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        {r.loyalty_tier ? (
                          <Badge
                            bg={colorLoyalty(r.loyalty_tier) + "22"}
                            color={colorLoyalty(r.loyalty_tier)}
                          >
                            {r.loyalty_tier}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center", fontSize: 10 }}>
                        {r.performance_score ? (
                          <Badge
                            bg={r.performance_score === "OK" ? "#dcfce7" : "#fee2e2"}
                            color={r.performance_score === "OK" ? "#166534" : "#991b1b"}
                          >
                            {r.performance_score}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          color: colorStemOut(r.stem_out_minutos),
                          fontWeight: 600,
                        }}
                      >
                        {r.stem_out_minutos != null ? `${r.stem_out_minutos}m` : "—"}
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          color: r.cantidad_incidentes > 0 ? "#dc2626" : "#94a3b8",
                          fontWeight: r.cantidad_incidentes > 0 ? 700 : 400,
                        }}
                      >
                        {r.cantidad_incidentes || 0}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

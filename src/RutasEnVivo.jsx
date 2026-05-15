import { useMemo, useState, Fragment } from "react";
import { useSnapshotsHoy, extraerCamposRuta } from "./useSnapshots.js";
import { Th, tdStyle, Badge, EmptyState, LoadingState } from "./ui.jsx";
import {
  colorNS,
  colorStemOut,
  colorLoyalty,
  colorStatus,
  fmtHoraSoloMX,
  fmtHoraMX,
  ALERT_LABELS,
} from "./shared.js";

export default function RutasEnVivo({ usuario }) {
  const { rutas: rawRutas, loading, error, ultimoSnap, refresh, fecha } =
    useSnapshotsHoy(usuario.sc_id);

  const rutas = useMemo(() => rawRutas.map(extraerCamposRuta), [rawRutas]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [orderBy, setOrderBy] = useState("progresoPct");
  const [orderDir, setOrderDir] = useState("desc");
  const [expandida, setExpandida] = useState(null);

  const toggleOrder = (col) => {
    if (orderBy === col) setOrderDir(orderDir === "asc" ? "desc" : "asc");
    else {
      setOrderBy(col);
      setOrderDir("asc");
    }
  };
  const ordIcon = (col) => (orderBy === col ? (orderDir === "asc" ? " ↑" : " ↓") : "");

  const filtradas = useMemo(() => {
    let res = [...rutas];
    if (busqueda) {
      const q = busqueda.toLowerCase();
      res = res.filter(
        (r) =>
          (r.driver_name || "").toLowerCase().includes(q) ||
          (r.placa || "").toLowerCase().includes(q) ||
          String(r.id_ruta).includes(q)
      );
    }
    if (filtroEstado === "activas") res = res.filter((r) => /active|started/i.test(r.status));
    else if (filtroEstado === "finalizadas")
      res = res.filter((r) => /finished|delivered/i.test(r.status));
    else if (filtroEstado === "planificadas")
      res = res.filter((r) => /planned/i.test(r.status));
    else if (filtroEstado === "con_alertas") res = res.filter((r) => r.alertas_count > 0);

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
  }, [rutas, busqueda, filtroEstado, orderBy, orderDir]);

  if (loading) {
    return (
      <div className="pg">
        <div className="sec-title">Rutas en Vivo</div>
        <LoadingState msg={`Cargando snapshots de ${fecha}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pg">
        <div className="sec-title">Rutas en Vivo</div>
        <EmptyState title="Error cargando datos" msg={error} />
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
          <div className="sec-title">Rutas en Vivo · {fecha}</div>
          <div className="sec-sub">
            {usuario.sc_id} · Último snapshot por ruta · {filtradas.length} de {rutas.length} rutas
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

      {/* Filtros */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
              minWidth: 240,
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "todas", l: "Todas" },
              { id: "activas", l: "Activas" },
              { id: "finalizadas", l: "Finalizadas" },
              { id: "planificadas", l: "Planificadas" },
              { id: "con_alertas", l: "Con alertas" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroEstado(f.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 4,
                  border: "1px solid #e4e7ec",
                  background: filtroEstado === f.id ? "#1a3a6b" : "#f8fafc",
                  color: filtroEstado === f.id ? "#fff" : "#475569",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rutas.length === 0 ? (
        <EmptyState
          title={`Sin snapshots para ${usuario.sc_id} hoy`}
          msg="El scraper todavía no corrió o no hay rutas activas para este SC."
        />
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e4e7ec",
            borderRadius: 6,
            overflow: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 1400 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e7ec" }}>
                <Th onClick={() => toggleOrder("driver_name")}>Chofer{ordIcon("driver_name")}</Th>
                <Th onClick={() => toggleOrder("placa")}>Patente · Vehíc.{ordIcon("placa")}</Th>
                <Th onClick={() => toggleOrder("id_ruta")}>Ruta · Ciclo{ordIcon("id_ruta")}</Th>
                <Th onClick={() => toggleOrder("status")} center>Estado{ordIcon("status")}</Th>
                <Th onClick={() => toggleOrder("progresoPct")} center>Progreso{ordIcon("progresoPct")}</Th>
                <Th onClick={() => toggleOrder("pending")} right>Pend.{ordIcon("pending")}</Th>
                <Th onClick={() => toggleOrder("notDelivered")} right>No Entr.{ordIcon("notDelivered")}</Th>
                <Th onClick={() => toggleOrder("loyalty")} center>Loyalty{ordIcon("loyalty")}</Th>
                <Th onClick={() => toggleOrder("performance_score")} center>Perf.{ordIcon("performance_score")}</Th>
                <Th onClick={() => toggleOrder("stem_out")} right>StemOut{ordIcon("stem_out")}</Th>
                <Th onClick={() => toggleOrder("hasHelper")} center>Helper{ordIcon("hasHelper")}</Th>
                <Th onClick={() => toggleOrder("alertas_count")} center>Alertas{ordIcon("alertas_count")}</Th>
                <Th center>Detalle</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => {
                const isExp = expandida === r.id_ruta;
                return (
                  <Fragment key={r.id_ruta}>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={tdStyle(true)}>{r.driver_name}</td>
                      <td style={tdStyle()}>
                        <div style={{ fontFamily: "monospace", fontSize: 10 }}>{r.placa}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>
                          {r.vehiculo_desc}
                        </div>
                      </td>
                      <td style={{ ...tdStyle(), fontFamily: "monospace", fontSize: 10 }}>
                        <div>{r.id_ruta}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8" }}>{r.cycle}</div>
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        <Badge bg={colorStatus(r.status) + "22"} color={colorStatus(r.status)}>
                          {r.status}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: colorNS(r.progresoPct) }}>
                          {r.progresoPct.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: 9, color: "#94a3b8" }}>
                          {r.delivered}/{r.total}
                        </div>
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          color: r.pending > 20 ? "#dc2626" : r.pending > 5 ? "#d97706" : "#475569",
                          fontWeight: r.pending > 5 ? 700 : 400,
                        }}
                      >
                        {r.pending}
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          color: r.notDelivered > 0 ? "#dc2626" : "#94a3b8",
                          fontWeight: r.notDelivered > 0 ? 700 : 400,
                        }}
                      >
                        {r.notDelivered}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        {r.loyalty ? (
                          <Badge
                            bg={colorLoyalty(r.loyalty) + "22"}
                            color={colorLoyalty(r.loyalty)}
                          >
                            {r.loyalty}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        {r.performance_score ? (
                          <Badge
                            bg={
                              r.performance_score === "OK"
                                ? "#dcfce7"
                                : r.performance_score === "REGULAR"
                                ? "#fef3c7"
                                : "#fee2e2"
                            }
                            color={
                              r.performance_score === "OK"
                                ? "#166534"
                                : r.performance_score === "REGULAR"
                                ? "#92400e"
                                : "#991b1b"
                            }
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
                          color: colorStemOut(r.stem_out),
                          fontWeight: 600,
                        }}
                      >
                        {r.stem_out != null ? `${r.stem_out}m` : "—"}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        {r.hasHelper ? (
                          <Badge bg="#ede9fe" color="#6d28d9">
                            ✓ Sí
                          </Badge>
                        ) : (
                          <Badge bg="#f1f5f9" color="#94a3b8">
                            No
                          </Badge>
                        )}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        {r.alertas_count > 0 ? (
                          <Badge bg="#fee2e2" color="#991b1b">
                            ⚠ {r.alertas_count}
                          </Badge>
                        ) : (
                          <Badge bg="#dcfce7" color="#166534">
                            ✓
                          </Badge>
                        )}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        <button
                          onClick={() => setExpandida(isExp ? null : r.id_ruta)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: "1px solid #e4e7ec",
                            background: isExp ? "#1a3a6b" : "#fff",
                            color: isExp ? "#fff" : "#475569",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {isExp ? "Cerrar" : "Ver"}
                        </button>
                      </td>
                    </tr>
                    {isExp && (
                      <tr>
                        <td colSpan={13} style={{ padding: 0, background: "#f8fafc" }}>
                          <DetalleRutaInline ruta={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────
function DetalleRutaInline({ ruta: r }) {
  const Item = ({ label, value, color }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        borderBottom: "1px dashed #e4e7ec",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: color || "#1a3a6b",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {/* Chofer */}
        <div style={{ background: "#fff", border: "1px solid #e4e7ec", borderRadius: 6, padding: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#7c3aed",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Chofer
          </div>
          <Item label="ID MELI" value={r.driver_id || "—"} />
          <Item label="Nombre" value={r.driver_name} />
          <Item label="Loyalty" value={r.loyalty || "—"} color={colorLoyalty(r.loyalty)} />
          {r.loyalty_stats.map((s, i) => (
            <div key={i} style={{ fontSize: 10, color: "#64748b", padding: "2px 0" }}>
              · {s.label}
            </div>
          ))}
          <Item
            label="Reclamos hoy"
            value={r.driver_claims ?? "—"}
            color={r.driver_claims > 0 ? "#dc2626" : undefined}
          />
          <Item label="Contact rate" value={r.contact_rate || "—"} />
        </div>

        {/* Ruta y vehículo */}
        <div style={{ background: "#fff", border: "1px solid #e4e7ec", borderRadius: 6, padding: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#1a3a6b",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Ruta y Vehículo
          </div>
          <Item label="Patente" value={r.placa} />
          <Item label="Descripción" value={r.vehiculo_desc} />
          <Item label="Cluster" value={r.cluster} />
          <Item label="Cycle" value={r.cycle} />
          <Item label="Distancia plan." value={r.distance ? `${r.distance} km` : "—"} />
          <Item label="Duración plan." value={r.duration_planificada ? `${r.duration_planificada} min` : "—"} />
          <Item label="Status" value={r.status} color={colorStatus(r.status)} />
          {r.substatus && <Item label="Substatus" value={r.substatus} />}
        </div>

        {/* Entregas */}
        <div style={{ background: "#fff", border: "1px solid #e4e7ec", borderRadius: 6, padding: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#16a34a",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Entregas
          </div>
          <Item label="Total despachados" value={r.total} />
          <Item label="Entregados" value={r.delivered} color="#16a34a" />
          <Item label="Pendientes" value={r.pending} color={r.pending > 5 ? "#d97706" : undefined} />
          <Item
            label="No entregados"
            value={r.notDelivered}
            color={r.notDelivered > 0 ? "#dc2626" : undefined}
          />
          <Item label="Bags totales" value={r.totalBags ?? "—"} />
          <Item label="Residencial" value={r.residential ?? "—"} />
          <Item label="Business" value={r.business ?? "—"} />
          <Item label="Failed delivery %" value={r.failed_delivery_pct || "—"} />
        </div>

        {/* Tiempos */}
        <div style={{ background: "#fff", border: "1px solid #e4e7ec", borderRadius: 6, padding: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#0891b2",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Tiempos
          </div>
          <Item label="Init date" value={r.init_date ? fmtHoraMX(new Date(r.init_date * 1000)) : "—"} />
          <Item label="Final date" value={r.final_date ? fmtHoraMX(new Date(r.final_date * 1000)) : "—"} />
          <Item
            label="1ª entrega real"
            value={r.date_first_movement ? fmtHoraMX(new Date(r.date_first_movement * 1000)) : "—"}
          />
          <Item label="ORH (min ruta)" value={r.orh ?? "—"} />
          <Item label="OZH (min zona)" value={r.ozh ?? "—"} />
          <Item label="Stem In" value={r.stem_in != null ? `${r.stem_in} min` : "—"} />
          <Item
            label="Stem Out"
            value={r.stem_out != null ? `${r.stem_out} min` : "—"}
            color={colorStemOut(r.stem_out)}
          />
        </div>

        {/* Incidencias */}
        <div style={{ background: "#fff", border: "1px solid #e4e7ec", borderRadius: 6, padding: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#dc2626",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Incidentes y Notas
          </div>
          <Item
            label="Incidentes"
            value={r.incident_types.length || 0}
            color={r.incident_types.length > 0 ? "#dc2626" : "#16a34a"}
          />
          <Item label="Tipos" value={r.incident_types.join(", ") || "—"} />
          <Item label="Reclamos" value={r.claims_count} color={r.claims_count > 0 ? "#dc2626" : undefined} />
          <Item label="Notas" value={r.notes_quantity} />
          <Item label="Warnings" value={r.warnings_quantity} />
          <Item label="Casos TOC" value={r.toc_total_cases} color={r.toc_total_cases > 0 ? "#d97706" : undefined} />
          <Item label="Tiene comentarios" value={r.has_comments ? "SÍ" : "NO"} />
        </div>

        {/* Alertas activas */}
        <div style={{ background: "#fff", border: "1px solid #e4e7ec", borderRadius: 6, padding: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#dc2626",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Alertas activas ({r.alertas_count})
          </div>
          {r.alertas.length === 0 ? (
            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, padding: "8px 0" }}>
              ✓ Sin alertas activas
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {r.alertas.map((a) => (
                <div
                  key={a}
                  style={{
                    background: "#fee2e2",
                    border: "1px solid #fca5a5",
                    color: "#991b1b",
                    borderRadius: 4,
                    padding: "5px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  ⚠ {ALERT_LABELS[a] || a}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 10,
          color: "#94a3b8",
          textAlign: "right",
        }}
      >
        Snapshot del {fmtHoraSoloMX(r.hora_snapshot)} · {r.momento_dia}
      </div>
    </div>
  );
}

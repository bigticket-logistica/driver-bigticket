import { useState, useEffect, useMemo } from "react";
import { sb, fechaHoyOperativa, fechaOperativaOffset, fmtHoraSoloMX } from "./shared.js";
import { KPI, Th, tdStyle, Badge, EmptyState, LoadingState } from "./ui.jsx";

/**
 * Lee `meli_paquetes_fallidos` filtrado por service_center_id del supervisor.
 * Como la columna de SC podría no estar siempre poblada, cruzamos por id_ruta
 * con los snapshots del día para inferir SC cuando falte.
 */
export default function NoEntregados({ usuario }) {
  const [fecha, setFecha] = useState(fechaHoyOperativa());
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("todos");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Primero: pedir rutas del SC del día para tener el universo válido
        const { data: snaps, error: errSnap } = await sb
          .from("logistic_ayudantes_snapshots")
          .select("id_ruta, driver_name, service_center_id")
          .eq("fecha", fecha)
          .eq("service_center_id", usuario.sc_id)
          .limit(5000);
        if (errSnap) throw errSnap;

        const mapaRutaDriver = new Map();
        for (const s of snaps || []) {
          mapaRutaDriver.set(s.id_ruta, s.driver_name);
        }
        const idsRutaDelSC = Array.from(mapaRutaDriver.keys());

        if (idsRutaDelSC.length === 0) {
          if (!cancel) {
            setPaquetes([]);
            setLoading(false);
          }
          return;
        }

        // Después: traer fallidos solo de esas rutas
        const { data, error: err } = await sb
          .from("meli_paquetes_fallidos")
          .select("*")
          .eq("fecha", fecha)
          .in("id_ruta", idsRutaDelSC)
          .limit(20000);
        if (cancel) return;
        if (err) throw err;

        const enriquecidos = (data || []).map((p) => ({
          ...p,
          driver_name: p.driver_name || mapaRutaDriver.get(p.id_ruta) || "—",
        }));
        setPaquetes(enriquecidos);
      } catch (e) {
        console.error(e);
        if (!cancel) {
          setError(e.message || "Error cargando datos");
          setPaquetes([]);
        }
      }
      if (!cancel) setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [fecha, usuario.sc_id]);

  // Detectar campo de motivo/substatus disponible (la tabla puede tener
  // distintos nombres: substatus, motivo, reason, etc.)
  const getMotivo = (p) =>
    p.substatus || p.motivo || p.reason || p.front_status || p.tu_status || "Sin motivo";

  // Agrupaciones
  const stats = useMemo(() => {
    if (paquetes.length === 0) return null;
    const porMotivo = {};
    const porRuta = {};
    for (const p of paquetes) {
      const m = getMotivo(p);
      porMotivo[m] = (porMotivo[m] || 0) + 1;
      const key = `${p.id_ruta}|${p.driver_name || "—"}`;
      porRuta[key] = (porRuta[key] || 0) + 1;
    }
    return {
      total: paquetes.length,
      motivos: Object.entries(porMotivo).sort((a, b) => b[1] - a[1]),
      rutas: Object.entries(porRuta)
        .map(([k, c]) => {
          const [id_ruta, driver] = k.split("|");
          return { id_ruta, driver, count: c };
        })
        .sort((a, b) => b.count - a.count),
    };
  }, [paquetes]);

  const filtrados = useMemo(() => {
    let res = [...paquetes];
    if (busqueda) {
      const q = busqueda.toLowerCase();
      res = res.filter(
        (p) =>
          String(p.id_ruta).includes(q) ||
          (p.driver_name || "").toLowerCase().includes(q) ||
          String(p.folio_guia || p.shipment_id || "").includes(q) ||
          (p.street_name || "").toLowerCase().includes(q)
      );
    }
    if (filtroMotivo !== "todos") {
      res = res.filter((p) => getMotivo(p) === filtroMotivo);
    }
    return res;
  }, [paquetes, busqueda, filtroMotivo]);

  if (loading) {
    return (
      <div className="pg">
        <div className="sec-title">Paquetes no entregados</div>
        <LoadingState msg={`Cargando paquetes fallidos de ${fecha}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pg">
        <div className="sec-title">Paquetes no entregados</div>
        <EmptyState title="Error cargando datos" msg={error} />
      </div>
    );
  }

  return (
    <div className="pg">
      <div className="sec-title">Paquetes no entregados · {fecha}</div>
      <div className="sec-sub">
        {usuario.sc_id} · {paquetes.length} paquetes fallidos · agrupados por motivo
      </div>

      {/* Selector fecha */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { l: "Hoy", fn: () => setFecha(fechaHoyOperativa()) },
            { l: "Ayer", fn: () => setFecha(fechaOperativaOffset(-1)) },
            { l: "-2 días", fn: () => setFecha(fechaOperativaOffset(-2)) },
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
            placeholder="Buscar ruta / chofer / folio / dirección..."
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
        </div>
      </div>

      {paquetes.length === 0 ? (
        <EmptyState
          title={`Sin paquetes no entregados para ${fecha}`}
          msg="Puede ser que el scraper aún no haya corrido para esta fecha, o que efectivamente no haya fallidos. El scraper de fallidos corre típicamente a las 23:30 MX."
        />
      ) : (
        <>
          {/* KPIs por motivo */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <KPI
              label="Total fallidos"
              value={stats.total}
              sub="del día"
              color={stats.total > 50 ? "#dc2626" : stats.total > 20 ? "#d97706" : "#475569"}
            />
            <KPI
              label="Rutas afectadas"
              value={stats.rutas.length}
              sub={`prom ${(stats.total / stats.rutas.length).toFixed(1)} pkgs/ruta`}
            />
            <KPI label="Motivos distintos" value={stats.motivos.length} />
          </div>

          {/* Desglose por motivo */}
          <div className="card">
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
              Desglose por motivo
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 8,
              }}
            >
              <button
                onClick={() => setFiltroMotivo("todos")}
                style={{
                  background: filtroMotivo === "todos" ? "#1a3a6b" : "#f8fafc",
                  color: filtroMotivo === "todos" ? "#fff" : "#475569",
                  border: "1px solid #e4e7ec",
                  borderRadius: 6,
                  padding: "10px 12px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Todos</span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{stats.total}</span>
                </div>
              </button>
              {stats.motivos.map(([m, c]) => (
                <button
                  key={m}
                  onClick={() => setFiltroMotivo(filtroMotivo === m ? "todos" : m)}
                  style={{
                    background: filtroMotivo === m ? "#fee2e2" : "#f8fafc",
                    color: filtroMotivo === m ? "#991b1b" : "#475569",
                    border: filtroMotivo === m ? "1px solid #fca5a5" : "1px solid #e4e7ec",
                    borderRadius: 6,
                    padding: "10px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{m}</span>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{c}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Top rutas afectadas */}
          {stats.rutas.length > 0 && (
            <div className="card">
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
                Top 10 rutas con más fallidos
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e7ec" }}>
                    <Th>Ruta</Th>
                    <Th>Chofer</Th>
                    <Th right>Fallidos</Th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rutas.slice(0, 10).map((r) => (
                    <tr key={r.id_ruta} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ ...tdStyle(), fontFamily: "monospace", fontSize: 10 }}>
                        {r.id_ruta}
                      </td>
                      <td style={tdStyle(true)}>{r.driver}</td>
                      <td style={{ ...tdStyle(), textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                        {r.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla detalle */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e4e7ec",
              borderRadius: 6,
              overflow: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 1100 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e7ec" }}>
                  <Th>Ruta</Th>
                  <Th>Chofer</Th>
                  <Th>Folio</Th>
                  <Th>Motivo</Th>
                  <Th>Destinatario</Th>
                  <Th>Dirección</Th>
                  <Th center>Hora</Th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 500).map((p, i) => (
                  <tr key={p.id || p.folio_guia || i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ ...tdStyle(), fontFamily: "monospace", fontSize: 10 }}>
                      {p.id_ruta}
                    </td>
                    <td style={tdStyle()}>{p.driver_name || "—"}</td>
                    <td style={{ ...tdStyle(), fontFamily: "monospace", fontSize: 10 }}>
                      {p.folio_guia || p.shipment_id || "—"}
                    </td>
                    <td style={tdStyle()}>
                      <Badge bg="#fee2e2" color="#991b1b">
                        {getMotivo(p)}
                      </Badge>
                    </td>
                    <td style={tdStyle()}>{p.receiver_name || "—"}</td>
                    <td style={{ ...tdStyle(), fontSize: 10, color: "#64748b" }}>
                      {[p.street_name, p.street_number, p.city]
                        .filter(Boolean)
                        .join(" ")}
                    </td>
                    <td style={{ ...tdStyle(), textAlign: "center", fontSize: 10 }}>
                      {p.timestamp ? fmtHoraSoloMX(p.timestamp) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length > 500 && (
              <div
                style={{
                  padding: 10,
                  textAlign: "center",
                  fontSize: 11,
                  color: "#94a3b8",
                  borderTop: "1px solid #e4e7ec",
                }}
              >
                Mostrando primeros 500 de {filtrados.length}. Refiná la búsqueda o el filtro para ver más.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

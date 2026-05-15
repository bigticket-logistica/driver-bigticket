import { useState, useEffect, useMemo } from "react";
import {
  sb,
  fechaHoyOperativa,
  fechaOperativaOffset,
  fmtHoraSoloMX,
} from "./shared.js";
import { KPI, Th, tdStyle, Badge, EmptyState, LoadingState } from "./ui.jsx";

/**
 * Implementa la matriz de 5 casos del informe Helper Detection:
 *
 * CASO 1: helper activo + solo chofer entregó         (¿helper fantasma?)
 * CASO 2: helper activo + chofer + otro               (correcto)
 * CASO 3: helper activo + solo otro entregó           (sospechoso)
 * CASO 4: SIN helper marcado pero hay otro entregando (RECUPERABLE $350) ⭐
 * CASO 5: sin helper + solo chofer                    (correcto)
 *
 * SMX8 está en la lista de SC autorizados → cada CASO 4 = $350 MXN recuperables.
 */

const SC_AUTORIZADOS_HELPER = ["SMX1", "SMX6", "SMX7", "SMX8", "SMX9", "SMX10", "SQR1"];

const CASOS_CONFIG = {
  CASO_1: {
    label: "Helper marcado · solo chofer entregó",
    short: "Caso 1",
    color: "#d97706",
    bg: "#fef3c7",
    desc: "Helper fantasma — MELI marcó pero solo el chofer entregó",
  },
  CASO_2: {
    label: "Helper marcado · chofer + ayudante",
    short: "Caso 2",
    color: "#16a34a",
    bg: "#dcfce7",
    desc: "Correcto — helper activo y se ve trabajando",
  },
  CASO_3: {
    label: "Helper marcado · solo otro entregó",
    short: "Caso 3",
    color: "#d97706",
    bg: "#fef3c7",
    desc: "Sospechoso — chofer asignado no aparece entregando",
  },
  CASO_4: {
    label: "🚨 SIN helper · pero hubo ayudante (RECUPERABLE)",
    short: "Caso 4",
    color: "#dc2626",
    bg: "#fee2e2",
    desc: "Reclamable a MELI: trabajó un ayudante pero el flag está en false",
  },
  CASO_5: {
    label: "Sin helper · solo chofer",
    short: "Caso 5",
    color: "#475569",
    bg: "#f1f5f9",
    desc: "Correcto — ruta de un solo entregador sin helper",
  },
};

export default function Suplantacion({ usuario }) {
  const [fecha, setFecha] = useState(fechaOperativaOffset(-1)); // ayer (la data suele estar más completa)
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCaso, setFiltroCaso] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Snapshots del día para conocer helper_activo (BOOL_OR has_helper) por ruta
        const { data: snaps, error: errSnap } = await sb
          .from("logistic_ayudantes_snapshots")
          .select("id_ruta, has_helper, driver_name, service_center_id")
          .eq("fecha", fecha)
          .eq("service_center_id", usuario.sc_id)
          .limit(50000);
        if (errSnap) throw errSnap;

        const helperPorRuta = new Map();
        const driverPorRuta = new Map();
        for (const s of snaps || []) {
          if (helperPorRuta.has(s.id_ruta)) {
            helperPorRuta.set(s.id_ruta, helperPorRuta.get(s.id_ruta) || s.has_helper);
          } else {
            helperPorRuta.set(s.id_ruta, !!s.has_helper);
          }
          if (!driverPorRuta.has(s.id_ruta)) {
            driverPorRuta.set(s.id_ruta, s.driver_name);
          }
        }
        const rutasDelSC = Array.from(helperPorRuta.keys());

        if (rutasDelSC.length === 0) {
          if (!cancel) {
            setFilas([]);
            setLoading(false);
          }
          return;
        }

        // 2) Paquetes entregados del día del SC
        const { data: pkgs, error: errPkg } = await sb
          .from("meli_paquetes_entregados")
          .select(
            "id_ruta, driver_id, driver_name, user_id_real, user_name_real, entrega_timestamp, suplantacion"
          )
          .eq("fecha", fecha)
          .in("id_ruta", rutasDelSC)
          .not("user_id_real", "is", null)
          .limit(50000);
        if (cancel) return;
        if (errPkg) throw errPkg;

        // 3) Agrupar por ruta y clasificar (lógica idéntica a la query maestra)
        const porRuta = new Map();
        for (const p of pkgs || []) {
          if (!porRuta.has(p.id_ruta)) {
            porRuta.set(p.id_ruta, {
              id_ruta: p.id_ruta,
              chofer: p.driver_name,
              chofer_id: p.driver_id,
              pkgs_total: 0,
              pkgs_por_chofer: 0,
              pkgs_por_otro: 0,
              otros: new Map(), // user_id_real -> { name, count }
              primera_entrega: null,
              ultima_entrega: null,
            });
          }
          const ent = porRuta.get(p.id_ruta);
          ent.pkgs_total++;
          if (p.user_id_real === p.driver_id) ent.pkgs_por_chofer++;
          else {
            ent.pkgs_por_otro++;
            const otro = ent.otros.get(p.user_id_real) || {
              user_id: p.user_id_real,
              name: p.user_name_real,
              count: 0,
            };
            otro.count++;
            ent.otros.set(p.user_id_real, otro);
          }
          if (p.entrega_timestamp) {
            if (!ent.primera_entrega || p.entrega_timestamp < ent.primera_entrega) {
              ent.primera_entrega = p.entrega_timestamp;
            }
            if (!ent.ultima_entrega || p.entrega_timestamp > ent.ultima_entrega) {
              ent.ultima_entrega = p.entrega_timestamp;
            }
          }
        }

        // 4) Clasificar cada ruta en uno de los 5 casos
        const resultado = Array.from(porRuta.values()).map((ent) => {
          const helper_activo = helperPorRuta.get(ent.id_ruta) || false;
          let caso = null;
          if (helper_activo && ent.pkgs_por_otro > 0 && ent.pkgs_por_chofer > 0) caso = "CASO_2";
          else if (helper_activo && ent.pkgs_por_otro === 0) caso = "CASO_1";
          else if (helper_activo && ent.pkgs_por_chofer === 0) caso = "CASO_3";
          else if (!helper_activo && ent.pkgs_por_otro > 0) caso = "CASO_4";
          else if (!helper_activo && ent.pkgs_por_otro === 0) caso = "CASO_5";

          return {
            ...ent,
            chofer: ent.chofer || driverPorRuta.get(ent.id_ruta) || "—",
            helper_activo,
            caso,
            otros_arr: Array.from(ent.otros.values()).sort((a, b) => b.count - a.count),
            pct_otro: ent.pkgs_total > 0 ? (ent.pkgs_por_otro / ent.pkgs_total) * 100 : 0,
            monto_recuperable:
              caso === "CASO_4" && SC_AUTORIZADOS_HELPER.includes(usuario.sc_id) ? 350 : 0,
          };
        });

        // Agregar rutas sin paquetes en entregados pero con snapshot
        for (const id_ruta of rutasDelSC) {
          if (!porRuta.has(id_ruta)) {
            const helper_activo = helperPorRuta.get(id_ruta) || false;
            resultado.push({
              id_ruta,
              chofer: driverPorRuta.get(id_ruta) || "—",
              chofer_id: null,
              helper_activo,
              pkgs_total: 0,
              pkgs_por_chofer: 0,
              pkgs_por_otro: 0,
              otros: new Map(),
              otros_arr: [],
              pct_otro: 0,
              caso: null, // sin clasificar, no hay data de entregas
              primera_entrega: null,
              ultima_entrega: null,
              monto_recuperable: 0,
            });
          }
        }

        setFilas(resultado);
      } catch (e) {
        console.error(e);
        if (!cancel) {
          setError(e.message || "Error cargando datos");
          setFilas([]);
        }
      }
      if (!cancel) setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [fecha, usuario.sc_id]);

  const stats = useMemo(() => {
    const conData = filas.filter((f) => f.caso);
    const sinData = filas.filter((f) => !f.caso);
    const porCaso = {
      CASO_1: 0,
      CASO_2: 0,
      CASO_3: 0,
      CASO_4: 0,
      CASO_5: 0,
    };
    let recuperable = 0;
    for (const f of conData) {
      if (f.caso) porCaso[f.caso]++;
      recuperable += f.monto_recuperable;
    }
    return {
      totalConData: conData.length,
      sinData: sinData.length,
      porCaso,
      recuperable,
    };
  }, [filas]);

  const filtradas = useMemo(() => {
    let res = [...filas];
    if (filtroCaso !== "todos") {
      if (filtroCaso === "sin_data") res = res.filter((f) => !f.caso);
      else res = res.filter((f) => f.caso === filtroCaso);
    }
    if (busqueda) {
      const q = busqueda.toLowerCase();
      res = res.filter(
        (f) =>
          String(f.id_ruta).includes(q) ||
          (f.chofer || "").toLowerCase().includes(q) ||
          f.otros_arr.some((o) => (o.name || "").toLowerCase().includes(q))
      );
    }
    return res.sort((a, b) => {
      // CASO 4 primero (lo más urgente), luego por pct_otro desc
      const order = { CASO_4: 0, CASO_3: 1, CASO_1: 2, CASO_2: 3, CASO_5: 4, null: 5 };
      const oa = order[a.caso] ?? 5;
      const ob = order[b.caso] ?? 5;
      if (oa !== ob) return oa - ob;
      return (b.pct_otro || 0) - (a.pct_otro || 0);
    });
  }, [filas, filtroCaso, busqueda]);

  if (loading) {
    return (
      <div className="pg">
        <div className="sec-title">Suplantación / Helpers</div>
        <LoadingState msg={`Procesando ${fecha}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pg">
        <div className="sec-title">Suplantación / Helpers</div>
        <EmptyState title="Error cargando datos" msg={error} />
      </div>
    );
  }

  const scAutorizado = SC_AUTORIZADOS_HELPER.includes(usuario.sc_id);

  return (
    <div className="pg">
      <div className="sec-title">Suplantación / Helpers · {fecha}</div>
      <div className="sec-sub">
        {usuario.sc_id} · Quién entregó realmente cada paquete vs quién está asignado
        {scAutorizado && (
          <span style={{ color: "#16a34a", fontWeight: 600 }}>
            {" "}
            · Tu SC está autorizado para reclamar helpers
          </span>
        )}
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
            placeholder="Buscar ruta / chofer / ayudante..."
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

      {filas.length === 0 ? (
        <EmptyState
          title={`Sin datos para ${fecha}`}
          msg="No hay snapshots ni paquetes entregados para esta fecha."
        />
      ) : (
        <>
          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <KPI
              label="🚨 Recuperables"
              value={stats.porCaso.CASO_4}
              sub={`$${stats.recuperable.toLocaleString("es-MX")} MXN`}
              color="#dc2626"
            />
            <KPI
              label="Correctos"
              value={stats.porCaso.CASO_2 + stats.porCaso.CASO_5}
              sub={`${stats.porCaso.CASO_2} c/helper · ${stats.porCaso.CASO_5} s/helper`}
              color="#16a34a"
            />
            <KPI
              label="Sospechosos"
              value={stats.porCaso.CASO_1 + stats.porCaso.CASO_3}
              sub="revisar manualmente"
              color="#d97706"
            />
            <KPI
              label="Sin data"
              value={stats.sinData}
              sub="rutas sin entregas registradas"
              color="#94a3b8"
            />
          </div>

          {/* Distribución por caso (clickeable como filtro) */}
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
              Matriz de casos
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 8,
              }}
            >
              <button
                onClick={() => setFiltroCaso("todos")}
                style={{
                  background: filtroCaso === "todos" ? "#1a3a6b" : "#f8fafc",
                  color: filtroCaso === "todos" ? "#fff" : "#475569",
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
                  <span>Todos los casos</span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{filas.length}</span>
                </div>
              </button>
              {Object.entries(CASOS_CONFIG).map(([k, cfg]) => {
                const count = stats.porCaso[k];
                if (count === 0) return null;
                return (
                  <button
                    key={k}
                    onClick={() => setFiltroCaso(filtroCaso === k ? "todos" : k)}
                    style={{
                      background: filtroCaso === k ? cfg.color : cfg.bg,
                      color: filtroCaso === k ? "#fff" : cfg.color,
                      border: `1px solid ${cfg.color}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span>{cfg.short}</span>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ fontSize: 9, marginTop: 3, opacity: 0.85, lineHeight: 1.3 }}>
                      {cfg.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabla detalle */}
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
                  <Th>Ruta</Th>
                  <Th>Chofer asignado</Th>
                  <Th center>Helper MELI</Th>
                  <Th right>Pkgs total</Th>
                  <Th right>Por chofer</Th>
                  <Th right>Por otro</Th>
                  <Th right>% otro</Th>
                  <Th>Ayudante(s) real(es)</Th>
                  <Th center>Caso</Th>
                  <Th right>$ Reclamable</Th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((f) => {
                  const cfg = f.caso ? CASOS_CONFIG[f.caso] : null;
                  return (
                    <tr key={f.id_ruta} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ ...tdStyle(), fontFamily: "monospace", fontSize: 10 }}>
                        {f.id_ruta}
                      </td>
                      <td style={tdStyle(true)}>{f.chofer}</td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        {f.helper_activo ? (
                          <Badge bg="#ede9fe" color="#6d28d9">
                            ✓ SÍ
                          </Badge>
                        ) : (
                          <Badge bg="#f1f5f9" color="#94a3b8">
                            NO
                          </Badge>
                        )}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "right" }}>{f.pkgs_total}</td>
                      <td style={{ ...tdStyle(), textAlign: "right" }}>{f.pkgs_por_chofer}</td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          color: f.pkgs_por_otro > 0 ? "#dc2626" : "#94a3b8",
                          fontWeight: f.pkgs_por_otro > 0 ? 700 : 400,
                        }}
                      >
                        {f.pkgs_por_otro}
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          fontWeight: 600,
                          color: f.pct_otro > 30 ? "#dc2626" : f.pct_otro > 10 ? "#d97706" : "#475569",
                        }}
                      >
                        {f.pct_otro.toFixed(0)}%
                      </td>
                      <td style={{ ...tdStyle(), fontSize: 10 }}>
                        {f.otros_arr.length === 0
                          ? "—"
                          : f.otros_arr.map((o, i) => (
                              <div key={i}>
                                {o.name} <span style={{ color: "#94a3b8" }}>({o.count})</span>
                              </div>
                            ))}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: "center" }}>
                        {cfg ? (
                          <Badge bg={cfg.bg} color={cfg.color}>
                            {cfg.short}
                          </Badge>
                        ) : (
                          <Badge bg="#f1f5f9" color="#94a3b8">
                            sin data
                          </Badge>
                        )}
                      </td>
                      <td
                        style={{
                          ...tdStyle(),
                          textAlign: "right",
                          fontWeight: 700,
                          color: f.monto_recuperable > 0 ? "#dc2626" : "#94a3b8",
                        }}
                      >
                        {f.monto_recuperable > 0 ? `$${f.monto_recuperable}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { sb, fechaHoyOperativa } from "./shared.js";

/**
 * Carga TODOS los snapshots del día actual del SC y deja, por cada id_ruta,
 * el snapshot más reciente con su raw_json.
 *
 * Devuelve: { rutas, loading, error, ultimoSnap, refresh }
 *   rutas = array de objetos del snapshot más reciente por ruta
 *   ultimoSnap = ISO timestamp del snapshot más reciente de cualquier ruta
 */
export function useSnapshotsHoy(sc_id, fecha) {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ultimoSnap, setUltimoSnap] = useState(null);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const fechaUsada = fecha || fechaHoyOperativa();

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await sb
          .from("logistic_ayudantes_snapshots")
          .select("*")
          .eq("fecha", fechaUsada)
          .eq("service_center_id", sc_id)
          .order("hora_snapshot", { ascending: false })
          .limit(10000);

        if (cancel) return;
        if (err) throw err;

        // Dejar el snapshot más reciente por id_ruta
        const mapaMasReciente = new Map();
        let snapMasNuevo = null;
        for (const r of data || []) {
          if (!mapaMasReciente.has(r.id_ruta)) {
            mapaMasReciente.set(r.id_ruta, r);
          }
          if (!snapMasNuevo || r.hora_snapshot > snapMasNuevo) {
            snapMasNuevo = r.hora_snapshot;
          }
        }

        setRutas(Array.from(mapaMasReciente.values()));
        setUltimoSnap(snapMasNuevo);
      } catch (e) {
        console.error("Error cargando snapshots:", e);
        if (!cancel) {
          setError(e.message || "Error cargando datos");
          setRutas([]);
        }
      }
      if (!cancel) setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [sc_id, fechaUsada, tick]);

  return { rutas, loading, error, ultimoSnap, refresh, fecha: fechaUsada };
}

// ═══════════════════════════════════════════════════════════════════════════
// Extractores del raw_json (centralizados para que todas las pestañas
// usen la misma lógica). Basados en la estructura validada en el Brain.
// ═══════════════════════════════════════════════════════════════════════════
export function extraerCamposRuta(snap) {
  const rj = snap.raw_json || {};
  const counters = rj.counters || {};
  const flags = rj.flags || {};
  const timing = rj.timingData || {};
  const driver = rj.driver || {};
  const vehicle = rj.vehicle || {};
  const planned = rj.plannedRoute || {};

  // Alertas activas (las del Nivel 1 del informe)
  const alertas = [];
  if (rj.delayedRoute?.alert) alertas.push("delayedRoute");
  if (rj.inactivityVehicle?.alert) alertas.push("inactivityVehicle");
  if (rj.pendingSackDelivery?.alert) alertas.push("pendingSackDelivery");
  if (rj.odRouteDispatchDelayed?.alert) alertas.push("odRouteDispatchDelayed");
  if (rj.commercialStopPending?.alert) alertas.push("commercialStopPending");
  if (rj.delayedStemout?.alert) alertas.push("delayedStemout");

  // Progreso
  const total = counters.total ?? 0;
  const delivered = counters.delivered ?? 0;
  const pending = counters.pending ?? Math.max(0, total - delivered - (counters.notDelivered ?? 0));
  const notDelivered = counters.notDelivered ?? 0;
  const progresoPct = total > 0 ? (delivered / total) * 100 : 0;

  return {
    // Identificación
    id_ruta: snap.id_ruta,
    service_center_id: snap.service_center_id,
    cluster: rj.cluster || "—",

    // Chofer
    driver_id: driver.driverId || snap.driver_id,
    driver_name: driver.driverName || snap.driver_name || "—",
    loyalty: driver.loyalty?.name || null,
    loyalty_stats: driver.loyalty?.stats || [],
    driver_claims: driver.driverClaims ?? null,
    contact_rate: driver.contactRate || null,

    // Vehículo
    placa: vehicle.license || snap.placa || "—",
    vehiculo_desc: vehicle.description || "—",

    // Planificación
    cycle: planned.cycleName || "—",
    distance: planned.distance || rj.distance || null,
    duration_planificada: planned.duration || rj.duration || null,
    progress_percent: rj.progressPercent ?? progresoPct,
    init_date: rj.initDate || planned.initDate || null,
    final_date: rj.finalDate || planned.finalDate || null,
    init_hour: rj.initHour || planned.initHour || null,

    // Estado
    status: rj.status || "—",
    substatus: rj.substatus || null,

    // Contadores
    total,
    delivered,
    notDelivered,
    pending,
    progresoPct,
    totalBags: counters.totalBags ?? null,
    residential: counters.residential ?? null,
    business: counters.business ?? null,

    // Flags
    hasHelper: flags.hasHelper ?? rj.hasHelper ?? false,
    hasBulky: flags.hasBulky ?? false,
    hasBags: flags.hasBags ?? false,

    // Desempeño
    performance_score: rj.routePerformanceScore || null,
    failed_delivery_pct: flags.failedDeliveryIndex?.percent || null,
    claims_count: rj.claimsCount ?? flags.claimsCount ?? 0,
    incident_types: rj.incidentTypes || [],

    // Timing
    orh: timing.orh ?? null,
    ozh: timing.ozh ?? null,
    stem_in: timing.stemIn ?? null,
    stem_out: timing.stemOut ?? null,
    date_first_movement: rj.dateFirstMovement || null,

    // Alertas
    alertas,
    alertas_count: alertas.length,

    // Notas
    notes_quantity: rj.notesQuantity ?? 0,
    warnings_quantity: rj.warningsQuantity ?? 0,
    has_comments: rj.hasComments ?? false,
    toc_total_cases: rj.tocTotalCases ?? 0,

    // Snapshot metadata
    hora_snapshot: snap.hora_snapshot,
    momento_dia: snap.momento_dia,
    has_helper_snap: snap.has_helper,

    // Raw para si necesitamos más
    _raw: rj,
  };
}

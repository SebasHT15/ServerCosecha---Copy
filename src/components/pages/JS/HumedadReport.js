import React, { useState, useEffect, useMemo, useRef } from "react";
import { db2 } from "../../../firebase-config";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  limit
} from "firebase/firestore";
import "../CSS/ReporteHumedad.css";

export default function ReportesHumedad() {
  // State
  const [campbellDevices, setCampbellDevices] = useState([]);
  const [humedadDevices, setHumedadDevices] = useState([]);
  const [tempDevices, setTempDevices] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState(null); // "campbell"|"humedad"|"temperatura"
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [sensores, setSensores] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);

  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState({
    devices: true,
    sensores: false,
    reportes: false,
  });

  // Helpers UI
  const deviceLabel = (d) => d?.Nombre ?? d?.Name ?? d?.id ?? "";
  const fmtTS = (ts) =>
    ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString() : "Sin fecha";

  // ---- Helpers de datos (detectar si una caja tiene docs en una colección) ----
  const dispositivoRef = (id) => doc(db2, "Dispositivos", id);

  const hasDocsForDevice = async (colName, deviceId) => {
    const colRef = collection(db2, colName);

    // 1) Preferido: DocumentReference en "Dispositivo"
    let snap = await getDocs(
      query(colRef, where("Dispositivo", "==", dispositivoRef(deviceId)), limit(1))
    );
    if (!snap.empty) return true;

    // 2) Legacy: string "id_box"
    snap = await getDocs(
      query(colRef, where("id_box", "==", deviceId), limit(1))
    );
    if (!snap.empty) return true;

    // 3) Legacy: string "Caja"
    snap = await getDocs(query(colRef, where("Caja", "==", deviceId), limit(1)));
    if (!snap.empty) return true;

    return false;
  };

  const hasHumedad = async (deviceId) => {
    const [h1, h2] = await Promise.all([
      hasDocsForDevice("Humedad", deviceId),
      hasDocsForDevice("HumedadSC", deviceId),
    ]);
    return h1 || h2;
  };

  // ---- 1) Cargar dispositivos y determinar en qué grupos tienen datos ----
  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading((s) => ({ ...s, devices: true }));

        // Traer todos los dispositivos (para Nombre / id)
        const devSnap = await getDocs(collection(db2, "Dispositivos"));
        const allDevices = devSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Verificar existencia real de datos por grupo (limit(1) para hacerlo rápido)
        const checks = await Promise.all(
          allDevices.map(async (d) => {
            const [hasCamp, hasHum, hasTemp] = await Promise.all([
              hasDocsForDevice("Campbell", d.id),
              hasHumedad(d.id),
              hasDocsForDevice("Temperatura", d.id),
            ]);
            return { device: d, hasCamp, hasHum, hasTemp };
          })
        );

        setCampbellDevices(checks.filter(c => c.hasCamp).map(c => c.device));
        setHumedadDevices(checks.filter(c => c.hasHum).map(c => c.device));
        setTempDevices(checks.filter(c => c.hasTemp).map(c => c.device));
      } catch (e) {
        console.error("Error cargando grupos de dispositivos:", e);
        setCampbellDevices([]);
        setHumedadDevices([]);
        setTempDevices([]);
      } finally {
        setLoading((s) => ({ ...s, devices: false }));
      }
    };
    bootstrap();
  }, []);

  // ---- 2) Sensores por dispositivo seleccionado ----
  useEffect(() => {
    const run = async () => {
      if (!selectedDevice) {
        setSensores([]);
        setSelectedSensor(null);
        return;
      }
      try {
        setLoading((s) => ({ ...s, sensores: true }));
        const sensoresRef = collection(db2, "Sensores");
        const qSens = query(
          sensoresRef,
          where("Dispositivo", "==", doc(db2, "Dispositivos", selectedDevice.id))
        );
        const s = await getDocs(qSens);
        const list = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSensores(list);
      } catch (e) {
        console.error("Error cargando sensores:", e);
        setSensores([]);
      } finally {
        setLoading((s) => ({ ...s, sensores: false }));
      }
    };
    run();
  }, [selectedDevice]);

  // ---- 3) Reportes por sensor (según grupo seleccionado) ----
  const { colecciones, isCampbell } = useMemo(() => {
    if (selectedGroup === "campbell")
      return { colecciones: ["Campbell"], isCampbell: true };
    if (selectedGroup === "temperatura")
      return { colecciones: ["Temperatura"], isCampbell: false };
    return { colecciones: ["Humedad", "HumedadSC"], isCampbell: false };
  }, [selectedGroup]);

  useEffect(() => {
    const fetchReportes = async () => {
      if (!selectedSensor || !selectedGroup) {
        setReportes([]);
        return;
      }
      try {
        setLoading((s) => ({ ...s, reportes: true }));
        const sensorRef = doc(db2, "Sensores", selectedSensor.id);
        let data = [];
        for (const col of colecciones) {
          const qRep = query(
            collection(db2, col),
            where("idSensor", "==", sensorRef)
          );
          const snap = await getDocs(qRep);
          data = data.concat(
            snap.docs.map((d) => ({ id: d.id, _col: col, ...d.data() }))
          );
        }
        data.sort(
          (a, b) => (b.HoraSubida?.seconds ?? 0) - (a.HoraSubida?.seconds ?? 0)
        );
        setReportes(data);
      } catch (e) {
        console.error("Error cargando reportes:", e);
        setReportes([]);
      } finally {
        setLoading((s) => ({ ...s, reportes: false }));
      }
    };
    fetchReportes();
  }, [selectedSensor, colecciones]);

  // ---- Tabla: columnas Campbell ----
  const campbellCols = [
    "record",
    "VWC_Avg","EC_Avg","T_Avg","P_Avg","PA_Avg","VR_Avg"
  ];

  // ---- Export CSV ----
  const exportToCSV = () => {
    if (!selectedSensor || reportes.length === 0) {
      alert("No hay reportes para exportar.");
      return;
    }

    let headers = [];
    let rows = [];

    if (selectedGroup === "campbell") {
      headers = ["Creado (server)", "Hora Original", ...campbellCols];
      rows = reportes.map((rep) => [
        fmtTS(rep.createdAt),
        rep.timestamp ?? "N/A",
        ...campbellCols.map((c) => rep[c] ?? ""),
      ]);
    } else if (selectedGroup === "temperatura") {
      headers = [
        "Fecha Original",
        "Hora Subida",
        "Temperatura Calibrada",
        "Temperatura Original",
        "Calibración",
        "Nota",
      ];
      rows = reportes.map((rep) => [
        rep.FechaOriginal ?? "N/A",
        fmtTS(rep.HoraSubida),
        rep.TempCal ?? "null",
        rep.TempOrg ?? "N/A",
        rep.isCalibration ? "Sí" : "No",
        rep.nota ?? "",
      ]);
    } else {
      headers = [
        "Fecha Original",
        "Hora Subida",
        "Humedad Calibrada",
        "Humedad Original",
        "Calibración",
        "Nota",
      ];
      rows = reportes.map((rep) => [
        rep.FechaOriginal ?? "N/A",
        fmtTS(rep.HoraSubida),
        rep.HumedadCal ?? "null",
        rep.HumedadOrg ?? "N/A",
        rep.isCalibration ? "Sí" : "No",
        rep.nota ?? "",
      ]);
    }

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `Reportes_${selectedSensor.Nombre ?? selectedSensor.id}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---- Scroll superior sincronizado (refs + ResizeObserver) ----
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const topTrackRef = useRef(null);

  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    const table = tableRef.current;
    const track = topTrackRef.current;

    if (!top || !bottom || !table || !track) return;

    const setTrackWidth = () => {
      track.style.width = table.scrollWidth + "px";
    };

    const onTopScroll = () => {
      bottom.scrollLeft = top.scrollLeft;
    };
    const onBottomScroll = () => {
      top.scrollLeft = bottom.scrollLeft;
    };

    top.addEventListener("scroll", onTopScroll);
    bottom.addEventListener("scroll", onBottomScroll);

    const ro = new ResizeObserver(setTrackWidth);
    ro.observe(table);

    setTrackWidth();
    window.addEventListener("resize", setTrackWidth);

    return () => {
      top.removeEventListener("scroll", onTopScroll);
      bottom.removeEventListener("scroll", onBottomScroll);
      ro.disconnect();
      window.removeEventListener("resize", setTrackWidth);
    };
  }, [reportes, selectedGroup]);

  // ---- Render helpers ----
  const renderDeviceButton = (device, group) => (
    <li key={device.id}>
      <button
        onClick={() => {
          setSelectedGroup(group);
          setSelectedDevice(device);
          setSelectedSensor(null);
        }}
        className={
          selectedGroup === group && selectedDevice?.id === device.id
            ? "selected"
            : ""
        }
      >
        {deviceLabel(device)}
      </button>
    </li>
  );

  // ---- Return ----
  return (
    <div className="reportes-humedad-container">
      <h1>📊 Reportes</h1>

      {loading.devices ? (
        <p>Cargando nodos...</p>
      ) : (
        <div className="grid grid-3">
          <div>
            <h2>Nodo Campbell</h2>
            <ul className="device-list">
              {campbellDevices.map((d) => renderDeviceButton(d, "campbell"))}
            </ul>
          </div>

          <div>
            <h2>Nodos de Humedad</h2>
            <ul className="device-list">
              {humedadDevices.map((d) => renderDeviceButton(d, "humedad"))}
            </ul>
          </div>

          <div>
            <h2>Nodos de Temperatura</h2>
            <ul className="device-list">
              {tempDevices.map((d) => renderDeviceButton(d, "temperatura"))}
            </ul>
          </div>
        </div>
      )}

      {selectedDevice && (
        <>
          <h2>Sensores de: {deviceLabel(selectedDevice)}</h2>
          {loading.sensores ? (
            <p>Cargando sensores...</p>
          ) : sensores.length === 0 ? (
            <p>No se encontraron sensores para esta caja.</p>
          ) : (
            <ul className="sensor-list">
              {sensores.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedSensor(s)}
                    className={selectedSensor?.id === s.id ? "selected" : ""}
                  >
                    {s.Nombre ?? s.id}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selectedSensor && (
        <>
          <h3>Reportes de: {selectedSensor.Nombre ?? selectedSensor.id}</h3>
          <button onClick={exportToCSV} className="btn-export-csv">
            Exportar a CSV
          </button>

          {loading.reportes ? (
            <p>Cargando reportes...</p>
          ) : reportes.length === 0 ? (
            <p>No se encontraron reportes para este sensor.</p>
          ) : (
            <div className="table-scroll-wrapper">
              {/* Scroll horizontal superior */}
              <div className="table-scroll top-scroll" ref={topScrollRef}>
                <div className="scroll-content" ref={topTrackRef}></div>
              </div>

              {/* Scroll horizontal inferior + tabla */}
              <div className="table-scroll bottom-scroll" ref={bottomScrollRef}>
                <div className="table-wrapper">
                  <table className="report-table" ref={tableRef}>
                    <thead>
                      <tr>
                        {selectedGroup === "campbell" ? (
                          <>
                            <th>Creado (server)</th>
                            <th>Hora Original</th>
                            {campbellCols.map((c) => (
                              <th key={c}>{c}</th>
                            ))}
                          </>
                        ) : (
                          <>
                            <th>Fecha Original</th>
                            <th>Hora Subida</th>
                            <th>
                              {selectedGroup === "temperatura"
                                ? "Temperatura Calibrada"
                                : "Humedad Calibrada"}
                            </th>
                            <th>
                              {selectedGroup === "temperatura"
                                ? "Temperatura Original"
                                : "Humedad Original"}
                            </th>
                            <th>Calibración</th>
                            <th>Nota</th>
                          </>
                        )}
                      </tr>
                    </thead>

                    <tbody>
  {reportes
    .slice()
    .sort((a, b) => {
      // Igual que los otros nodos: orden ascendente
      const t1 = new Date(a.timestamp ?? a.createdAt).getTime();
      const t2 = new Date(b.timestamp ?? b.createdAt).getTime();
      return t2 - t1;
    })
    .map((rep) => (
      <tr key={rep.id}>
        {selectedGroup === "campbell" ? (
          <>
            <td>{fmtTS(rep.createdAt)}</td>
            <td>{rep.timestamp ?? "N/A"}</td>
            {campbellCols.map((c) => (
              <td key={c}>{rep[c] ?? ""}</td>
            ))}
          </>
        ) : (
          <>
            <td>{rep.FechaOriginal ?? "N/A"}</td>
            <td>{fmtTS(rep.HoraSubida)}</td>

            {selectedGroup === "temperatura" ? (
              <>
                <td>{rep.TempCal ?? "null"}</td>
                <td>{rep.TempOrg ?? "N/A"}</td>
              </>
            ) : (
              <>
                <td>{rep.HumedadCal ?? "null"}</td>
                <td>{rep.HumedadOrg ?? "N/A"}</td>
              </>
            )}

            <td>{rep.isCalibration ? "Sí" : "No"}</td>
            <td>{rep.nota ?? ""}</td>
          </>
        )}
      </tr>
    ))}
</tbody>

                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

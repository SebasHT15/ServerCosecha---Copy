import React, { useState, useEffect } from "react";
import { db2 } from "../../../firebase-config"; // Firestore SmartIoT-BioCarbon
import {
  collection,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";
import "../CSS/ReporteHumedad.css";

export default function ReportesHumedad() {
  const [dispositivos, setDispositivos] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [sensores, setSensores] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingSensores, setLoadingSensores] = useState(false);
  const [loadingReportes, setLoadingReportes] = useState(false);

  // 1. Cargar cajas (dispositivos)
  useEffect(() => {
    const fetchDispositivos = async () => {
      try {
        setLoadingDevices(true);
        const snapshot = await getDocs(collection(db2, "Dispositivos"));
        const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDispositivos(devices);
      } catch (error) {
        console.error("Error cargando dispositivos:", error);
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchDispositivos();
  }, []);

  // 2. Cargar sensores de la caja seleccionada
  useEffect(() => {
    if (!selectedDevice) {
      setSensores([]);
      setSelectedSensor(null);
      return;
    }
    const fetchSensores = async () => {
      try {
        setLoadingSensores(true);
        const sensoresRef = collection(db2, "Sensores");
        const q = query(
          sensoresRef,
          where("Dispositivo", "==", doc(db2, "Dispositivos", selectedDevice.id))
        );
        const snapshot = await getDocs(q);
        const sensoresList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSensores(sensoresList);
      } catch (error) {
        console.error("Error cargando sensores:", error);
        setSensores([]);
      } finally {
        setLoadingSensores(false);
      }
    };
    fetchSensores();
  }, [selectedDevice]);

  // 3. Cargar reportes del sensor seleccionado (de dos colecciones)
  useEffect(() => {
    if (!selectedSensor) {
      setReportes([]);
      return;
    }
    const fetchReportes = async () => {
      try {
        setLoadingReportes(true);

        const sensorRef = doc(db2, "Sensores", selectedSensor.id);
        const colecciones = ["Humedad", "HumedadSC"];
        let todosReportes = [];

        for (const col of colecciones) {
          const q = query(collection(db2, col), where("idSensor", "==", sensorRef));
          const snapshot = await getDocs(q);
          const reportes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          todosReportes = todosReportes.concat(reportes);
        }

        // Ordenar reportes por fecha (HoraSubida) descendente
        todosReportes.sort((a, b) => {
          const fechaA = a.HoraSubida ? a.HoraSubida.seconds : 0;
          const fechaB = b.HoraSubida ? b.HoraSubida.seconds : 0;
          return fechaB - fechaA;
        });

        setReportes(todosReportes);
      } catch (error) {
        console.error("Error cargando reportes:", error);
        setReportes([]);
      } finally {
        setLoadingReportes(false);
      }
    };
    fetchReportes();
  }, [selectedSensor]);

  // Función para exportar reportes a CSV
  const exportToCSV = () => {
  if (!selectedSensor || reportes.length === 0) {
    alert("No hay reportes para exportar.");
    return;
  }

  const headers = [
    "Fecha Subida",
    "Hora Original",
    "Humedad Calibrada",
    "Humedad Original",
    "Nota",
    "Calibración"
  ];

  // Función para escapear comillas dobles y envolver en comillas dobles
  const escapeCSV = (text) => {
    if (text === null || text === undefined) return '""';
    const str = text.toString();
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = reportes.map(rep => [
    rep.HoraSubida?.seconds
      ? new Date(rep.HoraSubida.seconds * 1000).toLocaleString()
      : "Sin fecha",
    rep.FechaOriginal ?? "N/A",
    rep.HumedadCal ?? rep.valor ?? "N/A",
    rep.HumedadOrg ?? "N/A",
    rep.nota ?? "Sin nota",
    rep.isCalibration ? "Sí" : "No"
  ].map(escapeCSV)); // Aplicamos escapeCSV a cada campo

  const csvContent = [headers.map(escapeCSV), ...rows]
    .map(row => row.join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `ReportesHumedad_${selectedSensor.Nombre ?? selectedSensor.id}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


  return (
    <div className="reportes-humedad-container">
      <h1>📊 Reportes de Humedad</h1>

      {/* Lista de cajas */}
      {loadingDevices ? (
        <p>Cargando cajas...</p>
      ) : dispositivos.length === 0 ? (
        <p>No hay dispositivos disponibles.</p>
      ) : (
        <ul className="device-list">
          {dispositivos.map(device => (
            <li key={device.id}>
              <button
                onClick={() => {
                  setSelectedDevice(device);
                  setSelectedSensor(null);
                }}
                className={selectedDevice?.id === device.id ? "selected" : ""}
              >
                {device.Nombre ?? device.Name ?? device.id}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Lista de sensores */}
      {selectedDevice && (
        <>
          <h2>Sensores de: {selectedDevice.Nombre ?? selectedDevice.Name ?? selectedDevice.id}</h2>
          {loadingSensores ? (
            <p>Cargando sensores...</p>
          ) : sensores.length === 0 ? (
            <p>No se encontraron sensores para esta caja.</p>
          ) : (
            <ul className="sensor-list">
              {sensores.map(sensor => (
                <li key={sensor.id}>
                  <button
                    onClick={() => setSelectedSensor(sensor)}
                    className={selectedSensor?.id === sensor.id ? "selected" : ""}
                  >
                    {sensor.Nombre ?? sensor.id}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Lista de reportes */}
      {selectedSensor && (
        <>
          <h3>Reportes de: {selectedSensor.Nombre ?? selectedSensor.id}</h3>
          <button onClick={exportToCSV} className="btn-export-csv">Exportar a CSV</button>
          {loadingReportes ? (
            <p>Cargando reportes...</p>
          ) : reportes.length === 0 ? (
            <p>No se encontraron reportes para este sensor.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Fecha Subida</th>
                  <th>Hora Original</th>
                  <th>Humedad Calibrada</th>
                  <th>Humedad Original</th>
                  <th>Nota</th>
                  <th>Calibración</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map(rep => (
                  <tr key={rep.id}>
                    <td>
                      {rep.HoraSubida?.seconds
                        ? new Date(rep.HoraSubida.seconds * 1000).toLocaleString()
                        : "Sin fecha"}
                    </td>
                    <td>{rep.FechaOriginal ?? "N/A"}</td>
                    <td>{rep.HumedadCal ?? rep.valor ?? "N/A"}</td>
                    <td>{rep.HumedadOrg ?? "N/A"}</td>
                    <td>{rep.nota ?? "Sin nota"}</td>
                    <td>{rep.isCalibration ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}


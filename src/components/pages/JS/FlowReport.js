import React, { useState, useEffect } from "react";
import { db } from "../../../firebase-config";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  orderBy,
} from "firebase/firestore";
import "../CSS/FlowReport.css";

export default function FlowReports() {
  const [dispositivos, setDispositivos] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [search, setSearch] = useState("");

  // Obtener dispositivos tipo "Flow"
  useEffect(() => {
    const dispositivosRef = collection(db, "Devices");
    const q = query(dispositivosRef, where("Type", "==", "Flow"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
  const dispositivosData = snapshot.docs.map(doc => {
    const data = doc.data();
    console.log("📦", doc.id, "| Type:", `"${data.Type}"`);
    return {
      id: doc.id,
      ...data
    };
  });
  setDispositivos(dispositivosData);
  setFilteredDevices(dispositivosData);
});


    return () => unsubscribe();
  }, []);

  // Filtrado por búsqueda
  useEffect(() => {
    const filtered = dispositivos.filter((device) =>
      device.Name?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredDevices(filtered);
  }, [search, dispositivos]);

  // 🔍 Escuchar reportes de un dispositivo específico
  const seleccionarDispositivo = (device) => {
  console.log("🔍 Dispositivo seleccionado:", device.id); // ← ID del dispositivo

  setSelectedDevice(device);
  setReportes([]);

  const deviceRef = doc(db, "Devices", device.id);
  console.log("📌 Referencia creada:", deviceRef.path); // ← referencia Firestore

  const reportesRef = collection(db, "FlowReportsIsla");

  const q = query(
    reportesRef,
    where("idDevice", "==", deviceRef),
    orderBy("clientTimestamp", "desc")
  );

  console.log("🧭 Ejecutando consulta a FlowReportsIsla...");

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log("📦 Reportes recibidos:", snapshot.size); // ← cuántos documentos llegaron

    if (snapshot.empty) {
      console.warn("⚠️ No se encontraron documentos para este dispositivo.");
    }

    const nuevosReportes = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("📄 Documento:", doc.id, data); // ← muestra cada documento
      return { id: doc.id, ...data };
    });

    setReportes(nuevosReportes);
  });

  return () => unsubscribe();
};

    const formatDate24h = (timestamp) => {
  return new Date(timestamp * 1000)
    .toLocaleString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    })
    .replace(",", ""); // 👈 elimina la coma entre fecha y hora
};


  // 📤 Exportar reportes a CSV
  const exportToCSV = () => {
  if (!selectedDevice || reportes.length === 0) {
    alert("No hay reportes para exportar.");
    return;
  }

  const headers = [
    "Fecha Gateway",         // clientTimestamp
    "Fecha Firebase",       // serverTimestamp
    "Flujo Bajo Costo",
    "Flujo Alto Costo",
  ];

  const rows = reportes.map((reporte) => [
    reporte.clientTimestamp?.seconds
      ? formatDate24h(reporte.clientTimestamp.seconds)
      : "Sin hora",
    reporte.serverTimestamp?.seconds
      ? formatDate24h(reporte.serverTimestamp.seconds)
      : "Sin fecha",
    reporte.flowBajoCosto ?? "N/A",
    reporte.flowAltoCosto ?? "N/A",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.join(","))
    .join("\n");

  // 👇 Exportación UTF-8 con BOM para Excel
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `FlowReports_${selectedDevice.Name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


  return (
    <div className="reportes-container">
      <h1>💧 Reportes de Flujo</h1>

      {/* 🔍 Barra de búsqueda */}
      <input
        type="text"
        placeholder="Buscar dispositivo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h2 className="device-list-title">🌊 Dispositivos de Flujo</h2>

      <div className="device-list">
        {filteredDevices.map(device => {
  console.log("🧪 Dispositivo:", device.id, device.Name); // ← agrega esto
  return (
    <div key={device.id} className="device-card" onClick={() => seleccionarDispositivo(device)}>
      {device.Name}
    </div>
  );
})}

      </div>

      {selectedDevice && (
        <div className="reportes">
          <h2>Reportes de {selectedDevice.Name}</h2>

          <button className="btn-excel" onClick={exportToCSV}>
            📥 Exportar a CSV
          </button>

          {reportes.length === 0 ? (
            <p>No se encontraron reportes para este dispositivo.</p>
          ) : (
            <table>
              <thead>
                <tr>
                    <th>Fecha Gateway</th>
                    <th>Fecha Firebase</th>
                    <th>Flujo Bajo Costo</th>
                    <th>Flujo Alto Costo</th>
                </tr>
                </thead>

              <tbody>
  {reportes.map((reporte) => (
    <tr key={reporte.id}>
      <td>
        {reporte.clientTimestamp?.seconds
          ? new Date(
              reporte.clientTimestamp.seconds * 1000
            ).toLocaleString()
          : "Sin hora"}
      </td>
      <td>
        {reporte.serverTimestamp?.seconds
          ? new Date(
              reporte.serverTimestamp.seconds * 1000
            ).toLocaleString()
          : "Sin fecha"}
      </td>
      <td>{reporte.flowBajoCosto ?? "N/A"}</td>
      <td>{reporte.flowAltoCosto ?? "N/A"}</td>
    </tr>
  ))}
</tbody>

            </table>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { db2 } from "../../../firebase-config"; // Firestore SmartIoT-BioCarbon
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import "../CSS/Sensores.css";

export default function Sensores() {
  const [dispositivos, setDispositivos] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [sensores, setSensores] = useState([]);
  const [calibraciones, setCalibraciones] = useState({}); // objeto para almacenar calibración por sensor ID
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingSensores, setLoadingSensores] = useState(false);
  const [editingCalib, setEditingCalib] = useState(null); // sensorId que está editando
  const [formCalib, setFormCalib] = useState({ a: "", b: "", c: "", escaladoPor100: false, tipo: "" });

  // Cargar dispositivos (cajas)
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

  // Cargar sensores asociados al dispositivo seleccionado
  useEffect(() => {
    if (!selectedDevice) {
      setSensores([]);
      setCalibraciones({});
      return;
    }

    const fetchSensores = async () => {
      try {
        setLoadingSensores(true);
        const sensoresRef = collection(db2, "Sensores");
        // Cambiar aquí si el campo que vincula es otro (ejemplo 'Dispositivo' o 'gatewayId')
        const q = query(sensoresRef, where("Dispositivo", "==", doc(db2, "Dispositivos", selectedDevice.id)));
        const snapshot = await getDocs(q);
        const sensoresList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSensores(sensoresList);

        // Cargar calibraciones para esos sensores
        const calibMap = {};
        for (const sensor of sensoresList) {
          const calibQ = query(
            collection(db2, "Calibracion"),
            where("idSensor", "==", doc(db2, "Sensores", sensor.id))
          );
          const calibSnapshot = await getDocs(calibQ);
          if (!calibSnapshot.empty) {
            calibMap[sensor.id] = { id: calibSnapshot.docs[0].id, ...calibSnapshot.docs[0].data() };
          }
        }
        setCalibraciones(calibMap);
      } catch (error) {
        console.error("Error cargando sensores o calibraciones:", error);
        setSensores([]);
        setCalibraciones({});
      } finally {
        setLoadingSensores(false);
      }
    };

    fetchSensores();
  }, [selectedDevice]);

  // Abrir edición de calibración
  const openEditCalib = (sensorId) => {
    setEditingCalib(sensorId);
    const calib = calibraciones[sensorId];
    if (calib) {
      setFormCalib({
        a: calib.a || "",
        b: calib.b || "",
        c: calib.c || "",
        escaladoPor100: calib.escaladoPor100 || false,
        tipo: calib.tipo || ""
      });
    } else {
      setFormCalib({ a: "", b: "", c: "", escaladoPor100: false, tipo: "" });
    }
  };

  // Guardar cambios de calibración
const saveCalibChanges = async () => {
  if (!editingCalib) return;
  try {
    const calibData = {
      a: parseFloat(formCalib.a),
      b: parseFloat(formCalib.b),
      c: parseFloat(formCalib.c),
      escaladoPor100: formCalib.escaladoPor100,
      tipo: formCalib.tipo,
      idSensor: doc(db2, "Sensores", editingCalib)
    };
    
    let calibId = calibraciones[editingCalib]?.id;

    if (calibId) {
      // Actualizar calibración existente
      const calibRef = doc(db2, "Calibracion", calibId);
      await updateDoc(calibRef, calibData);
    } else {
      // Crear nueva calibración
      const newCalibRef = doc(collection(db2, "Calibracion"));
      await setDoc(newCalibRef, calibData);
      calibId = newCalibRef.id;
    }

    alert("Calibración guardada correctamente");
    setEditingCalib(null);

    // Actualizar estado local para reflejar cambios
    setCalibraciones(prev => ({
      ...prev,
      [editingCalib]: { id: calibId, ...calibData }
    }));

  } catch (error) {
    console.error("Error guardando calibración:", error);
    alert("Error al guardar la calibración");
  }
};


  return (
    <div className="sensores-container">
      <h1>📡 Sensores por Caja / Dispositivo</h1>

      {loadingDevices ? (
        <p>Cargando dispositivos...</p>
      ) : dispositivos.length === 0 ? (
        <p>No hay dispositivos disponibles.</p>
      ) : (
        <ul className="device-list">
          {dispositivos.map(device => (
            <li key={device.id}>
              <button
                onClick={() => setSelectedDevice(device)}
                className={selectedDevice?.id === device.id ? "selected" : ""}
              >
                {device.Nombre ?? device.Name ?? device.id}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedDevice && (
        <div className="sensores-list">
          <h2>
            Sensores asociados a: {selectedDevice.Nombre ?? selectedDevice.Name ?? selectedDevice.id}
          </h2>

          {loadingSensores ? (
            <p>Cargando sensores...</p>
          ) : sensores.length === 0 ? (
            <p>No se encontraron sensores para esta caja.</p>
          ) : (
            <ul>
              {sensores.map(sensor => (
                <li key={sensor.id}>
                  {sensor.Nombre ?? sensor.id}{" "}
                  <button onClick={() => openEditCalib(sensor.id)}>Editar Calibración</button>
                  {editingCalib === sensor.id && (
                    <div className="edit-calib-form">
                      <label>
                        a: <input type="number" value={formCalib.a} onChange={e => setFormCalib({...formCalib, a: e.target.value})} />
                      </label>
                      <label>
                        b: <input type="number" value={formCalib.b} onChange={e => setFormCalib({...formCalib, b: e.target.value})} />
                      </label>
                      <label>
                        c: <input type="number" value={formCalib.c} onChange={e => setFormCalib({...formCalib, c: e.target.value})} />
                      </label>
                      <label>
                        Escalado por 100: <input type="checkbox" checked={formCalib.escaladoPor100} onChange={e => setFormCalib({...formCalib, escaladoPor100: e.target.checked})} />
                      </label>
                      <label>
  Tipo:
  <select value={formCalib.tipo} onChange={e => setFormCalib({...formCalib, tipo: e.target.value})}>
    <option value="cuadratica">Cuadrática</option>
    <option value="lineal">Lineal</option>
    <option value="exponencial">Exponencial</option>
    <option value="logaritmica">Logarítmica</option>
  </select>
</label>

                      <button onClick={saveCalibChanges}>Guardar</button>
                      <button onClick={() => setEditingCalib(null)}>Cancelar</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

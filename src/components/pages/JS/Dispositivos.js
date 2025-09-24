import React, { useState, useEffect } from "react";
import { db, db2 } from "../../../firebase-config"; // Importamos las dos bases
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  where
} from "firebase/firestore";
import "../CSS/Dispositivos.css";

export default function Dispositivos() {
  // Estados para dispositivos de ambas bases
  const [dispositivos, setDispositivos] = useState([]); // Aquí juntaremos ambos
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  // Estados para agregar dispositivo (por defecto agregamos solo a db - cosecha)
  const [newIdDevice, setNewIdDevice] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Humedad");
  const [newLocation, setNewLocation] = useState("");
  // Para seleccionar base al agregar (opcional, si quieres)
  const [newOrigin, setNewOrigin] = useState("Cosecha");

  // Estados para editar dispositivo
  const [editingDevice, setEditingDevice] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("Humedad");
  const [editLocation, setEditLocation] = useState("");
  const [editOrigin, setEditOrigin] = useState("Cosecha");

  // Cargar dispositivos de ambas bases y unirlos en un solo array
useEffect(() => {
  const fetchDevices = async () => {
    try {
      // Cosecha
      console.log("🔍 Consultando dispositivos en base Cosecha (db)...");
      const snapshot1 = await getDocs(collection(db, "Devices"));
      console.log(`📦 Documentos encontrados en Cosecha: ${snapshot1.size}`);
      const cosechaDevices = snapshot1.docs.map(doc => {
        console.log(`📄 Documento Cosecha: ID=${doc.id}`, doc.data());
        return {
          id: doc.id,
          origen: "Cosecha",
          ...doc.data()
        };
      });

      // Biocarbon
      console.log("🔍 Consultando dispositivos en base Biocarbon (db2)...");
      const snapshot2 = await getDocs(collection(db2, "Dispositivos"));
      console.log(`📦 Documentos encontrados en Biocarbon: ${snapshot2.size}`);

      if (snapshot2.empty) {
        console.warn("⚠️ La colección 'Dispositivos' en Biocarbon está vacía.");
      }

      const biocarbonDevices = snapshot2.docs.map(doc => {
        console.log(`📄 Documento Biocarbon: ID=${doc.id}`, doc.data());
        return {
          id: doc.id,
          origen: "Biocarbon",
          ...doc.data()
        };
      });

      // Unir y setear
      const allDevices = [...cosechaDevices, ...biocarbonDevices];
      setDispositivos(allDevices);
    } catch (error) {
      console.error("❌ Error cargando dispositivos:", error);
    }
  };
  fetchDevices();
}, []);


  // Filtrar por búsqueda y tipo
  const filteredDevices = dispositivos.filter(device => {
    const matchesSearch = device.Name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType ? device.Type === filterType : true;
    return matchesSearch && matchesType;
  });

  // Función para agregar dispositivo (por defecto agrega a la base Cosecha)
  const addDevice = async () => {
    if (!newIdDevice || !newName || !newLocation) {
      alert("Por favor completa todos los campos.");
      return;
    }
    if (!["Humedad", "Flow"].includes(newType)) {
      alert("El tipo de dispositivo no es válido.");
      return;
    }

    try {
      const targetDb = newOrigin === "Biocarbon" ? db2 : db;
      const devicesCollectionName = newOrigin === "Biocarbon" ? "Dispositivos" : "Devices";

      const deviceRef = doc(targetDb, devicesCollectionName, newIdDevice);
      const existingDevice = await getDoc(deviceRef);

      if (existingDevice.exists()) {
        alert("❌ Ya existe un dispositivo con este ID.");
        return;
      }

      const devicesCollection = collection(targetDb, devicesCollectionName);
      const q = query(devicesCollection, where("Name", "==", newName));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("❌ Ya existe un dispositivo con este nombre.");
        return;
      }

      await setDoc(deviceRef, {
        Name: newName,
        Type: newType,
        Location: newLocation
      });

      alert(`✅ Dispositivo agregado correctamente a ${newOrigin}.`);
      window.location.reload();
    } catch (error) {
      console.error("Error agregando dispositivo:", error);
      alert("❌ Hubo un error al agregar el dispositivo.");
    }
  };

  // Eliminar dispositivo
  const deleteDevice = async (id, origen) => {
    if (!window.confirm("¿Estás seguro de eliminar este dispositivo?")) return;

    try {
      const targetDb = origen === "Biocarbon" ? db2 : db;
      const devicesCollectionName = origen === "Biocarbon" ? "Dispositivos" : "Devices";

      await deleteDoc(doc(targetDb, devicesCollectionName, id));
      alert("✅ Dispositivo eliminado correctamente.");
      window.location.reload();
    } catch (error) {
      console.error("Error eliminando dispositivo:", error);
      alert("❌ Hubo un error al eliminar el dispositivo.");
    }
  };

  // Abrir formulario de edición
  const openEditForm = (device) => {
    setEditingDevice(device.id);
    setEditName(device.Name);
    setEditType(device.Type);
    setEditLocation(device.Location);
    setEditOrigin(device.origen);
  };

  // Guardar cambios
  const saveDeviceChanges = async () => {
    if (!editingDevice) return;

    try {
      const targetDb = editOrigin === "Biocarbon" ? db2 : db;
      const devicesCollectionName = editOrigin === "Biocarbon" ? "Dispositivos" : "Devices";

      const deviceRef = doc(targetDb, devicesCollectionName, editingDevice);
      await updateDoc(deviceRef, {
        Name: editName,
        Type: editType,
        Location: editLocation
      });

      alert("✅ Dispositivo actualizado correctamente.");
      setDispositivos((prevDevices) =>
        prevDevices.map((dev) =>
          dev.id === editingDevice
            ? { ...dev, Name: editName, Type: editType, Location: editLocation }
            : dev
        )
      );
      setEditingDevice(null);
    } catch (error) {
      console.error("Error al actualizar el dispositivo:", error);
      alert("❌ Hubo un error al actualizar el dispositivo.");
    }
  };

  return (
    <div className="dispositivos-container">
      <h1 className="title">📡 Gestión de Dispositivos</h1>

      <div className="panel">
        {/* Agregar Dispositivo */}
        <div className="control-panel">
          <h2>➕ Agregar Dispositivo</h2>
          <input
            type="text"
            placeholder="ID del Dispositivo"
            value={newIdDevice}
            onChange={(e) => setNewIdDevice(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nombre del Dispositivo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="Humedad">Humedad</option>
            <option value="Flow">Flow</option>
            <option value="Temperatura">Temperatura</option>
          </select>
          <input
            type="text"
            placeholder="Ubicación"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
          />
          <select value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)}>
            <option value="Cosecha">Cosecha</option>
            <option value="Biocarbon">Biocarbon</option>
          </select>
          <button onClick={addDevice}>Agregar</button>
        </div>

        {/* Lista de Dispositivos */}
        <div className="device-list-container">
          <div className="filter-section">
            <input
              type="text"
              placeholder="Buscar por Nombre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todos</option>
              <option value="Humedad">Humedad</option>
              <option value="Flow">Flow</option>
              <option value="Temperatura">Temperatura</option>
            </select>
          </div>

          <div className="device-list">
            {filteredDevices.length === 0 ? (
              <p>No hay dispositivos disponibles.</p>
            ) : (
              filteredDevices.map((device) => (
                <div key={device.id} className="device-card">
                  <h3>{device.Name}</h3>
                  <p><strong>ID:</strong> {device.id}</p>
                  <p><strong>Tipo:</strong> {device.Type}</p>
                  <p><strong>Ubicación:</strong> {device.Location}</p>
                  <p><em>Origen: {device.origen}</em></p>
                  <button onClick={() => deleteDevice(device.id, device.origen)} className="btn-delete">Eliminar</button>
                  <button onClick={() => openEditForm(device)} className="btn-edit">Editar</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal de Edición */}
        {editingDevice && (
          <div className="edit-device-modal">
            <h2>✏️ Editar Dispositivo</h2>

            <div className="input-group">
              <label>Nuevo Nombre</label>
              <input
                type="text"
                placeholder="Nuevo Nombre"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Tipo de Dispositivo</label>
              <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                <option value="Humedad">Humedad</option>
                <option value="Flow">Flow</option>
                <option value="Temperatura">Temperatura</option>
              </select>
            </div>

            <div className="input-group">
              <label>Nueva Ubicación</label>
              <input
                type="text"
                placeholder="Nueva Ubicación"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Origen</label>
              <input type="text" value={editOrigin} disabled />
            </div>

            <button onClick={saveDeviceChanges} className="btn-save">GUARDAR CAMBIOS</button>
            <button onClick={() => setEditingDevice(null)} className="btn-cancel">CANCELAR</button>
          </div>
        )}
      </div>
    </div>
  );
}

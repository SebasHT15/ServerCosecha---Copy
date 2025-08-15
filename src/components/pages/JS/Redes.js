import React, { useState, useEffect } from "react";
import { db } from "../../../firebase-config";
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, query, where } from "firebase/firestore";
import "../CSS/Redes.css";

export default function Redes() {
    const [redes, setRedes] = useState([]);
    const [dispositivos, setDispositivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRed, setSelectedRed] = useState("");
    const [selectedDevice, setSelectedDevice] = useState("");

    // Estados para agregar/redes
    const [newNetId, setNewNetId] = useState("");
    const [newNetName, setNewNetName] = useState("");
    
    // Estados para eliminar redes
    const [deleteNetId, setDeleteNetId] = useState("");
    const [selectedDeleteRed, setSelectedDeleteRed] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const redesSnapshot = await getDocs(collection(db, "Nets"));
                const redesData = redesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const dispositivosSnapshot = await getDocs(collection(db, "Devices"));
                const dispositivosData = dispositivosSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const dispositivosEnRedSnapshot = await getDocs(collection(db, "DeviceInNet"));
                const dispositivosEnRedData = dispositivosEnRedSnapshot.docs.map(doc => doc.data());

                const dispositivosPromises = dispositivosEnRedData.map(async (deviceEntry) => {
                    if (deviceEntry.idDevice) {
                        const deviceRef = deviceEntry.idDevice;
                        const deviceDoc = await getDoc(deviceRef);
                        return deviceDoc.exists() ? { id: deviceDoc.id, ...deviceDoc.data(), idNet: deviceEntry.idNet.id } : null;
                    }
                    return null;
                });

                const dispositivosEnRed = (await Promise.all(dispositivosPromises)).filter(device => device !== null);

                const redesConDispositivos = redesData.map(red => ({
                    ...red,
                    dispositivos: dispositivosEnRed.filter(device => device.idNet === red.id)
                }));

                setRedes(redesConDispositivos);
                setDispositivos(dispositivosData);
                setLoading(false);
            } catch (error) {
                console.error("Error obteniendo datos:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Función para añadir una red
    const añadirRed = async () => {
        if (!newNetId || !newNetName) {
            alert("Por favor ingresa un ID y un Nombre para la red.");
            return;
        }

        try {
            const netRef = doc(db, "Nets", newNetId);
            const existingNet = await getDoc(netRef);
            const nameQuery = query(collection(db, "Nets"), where("Name", "==", newNetName));
            const existingNameSnapshot = await getDocs(nameQuery);

            if (existingNet.exists()) {
                alert("❌ Ya existe una red con este ID.");
                return;
            }

            if (!existingNameSnapshot.empty) {
                alert("❌ Ya existe una red con este Nombre.");
                return;
            }

            await setDoc(netRef, { Name: newNetName });
            alert("✅ Red añadida correctamente.");
            window.location.reload();
        } catch (error) {
            console.error("Error añadiendo red:", error);
            alert("❌ Hubo un error al añadir la red.");
        }
    };

    // Función para eliminar una red
    const eliminarRed = async () => {
        if (!selectedDeleteRed || deleteNetId !== selectedDeleteRed) {
            alert("❌ Debes confirmar el ID de la red correctamente.");
            return;
        }

        try {
            const netRef = doc(db, "Nets", selectedDeleteRed);
            const existingNet = await getDoc(netRef);

            if (!existingNet.exists()) {
                alert("❌ La red con este ID no existe.");
                return;
            }

            const dispositivosRef = collection(db, "DeviceInNet");
            const q = query(dispositivosRef, where("idNet", "==", netRef));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert("❌ No puedes eliminar esta red porque tiene dispositivos asociados.");
                return;
            }

            await deleteDoc(netRef);
            alert("✅ Red eliminada correctamente.");
            window.location.reload();
        } catch (error) {
            console.error("Error eliminando red:", error);
            alert("❌ Hubo un error al eliminar la red.");
        }
    };

    // 📌 🔥 Función para asociar un dispositivo a una red
const asociarDispositivo = async () => {
    if (!selectedRed || !selectedDevice) {
        alert("Por favor selecciona una red y un dispositivo.");
        return;
    }

    try {
        const netRef = doc(db, "Nets", selectedRed);
        const deviceRef = doc(db, "Devices", selectedDevice);

        // 🔍 Verificar si el dispositivo ya está asociado a una red
        const q = query(collection(db, "DeviceInNet"), where("idDevice", "==", deviceRef));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const confirmRemove = window.confirm("Este dispositivo ya está asociado a una red. ¿Quieres desasociarlo primero?");
            if (confirmRemove) {
                const docId = querySnapshot.docs[0].id;
                await deleteDoc(doc(db, "DeviceInNet", docId));
                alert("✅ Dispositivo desasociado correctamente.");
                window.location.reload();
                return;
            } else {
                return; // Si el usuario no confirma, no hacer nada
            }
        }

        // 📌 Si el dispositivo NO está asociado, proceder con la asociación normal
        await setDoc(doc(collection(db, "DeviceInNet")), {
            idDevice: deviceRef,
            idNet: netRef
        });

        alert("✅ Dispositivo asociado correctamente a la red.");
        window.location.reload();
    } catch (error) {
        console.error("Error asociando dispositivo:", error);
        alert("❌ Hubo un error en la operación.");
    }
};

// 📌 🔥 Función para desasociar un dispositivo de una red
const desasociarDispositivo = async () => {
    if (!selectedRed || !selectedDevice) {
        alert("Por favor selecciona una red y un dispositivo para desasociar.");
        return;
    }

    try {
        const netRef = doc(db, "Nets", selectedRed);
        const deviceRef = doc(db, "Devices", selectedDevice);

        // Buscar la relación en DeviceInNet
        const dispositivosRef = collection(db, "DeviceInNet");
        const q = query(
            dispositivosRef,
            where("idDevice", "==", deviceRef),
            where("idNet", "==", netRef)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("❌ El dispositivo seleccionado no está asociado a esta red.");
            return;
        }

        // Eliminar la relación encontrada
        for (const docSnap of querySnapshot.docs) {
            await deleteDoc(doc(db, "DeviceInNet", docSnap.id));
        }

        alert("✅ Dispositivo desasociado correctamente.");
        window.location.reload();
    } catch (error) {
        console.error("Error al desasociar dispositivo:", error);
        alert("❌ Hubo un error al desasociar el dispositivo.");
    }
};


return (
    <div className="redes-container">
        <h1 className="title">🌐 Gestión de Redes</h1>

        {/* Panel de control */}
        <div className="panel">
            {/* Sección de agregar, eliminar, asociar y desasociar redes */}
            <div className="control-panel">
                <h2>➕ Añadir Red</h2>
                <input type="text" placeholder="ID de la Red" value={newNetId} onChange={(e) => setNewNetId(e.target.value)} />
                <input type="text" placeholder="Nombre de la Red" value={newNetName} onChange={(e) => setNewNetName(e.target.value)} />
                <button onClick={añadirRed} className="btn-add">Añadir Red</button>

                <h2>❌ Eliminar Red</h2>
                <select value={selectedDeleteRed} onChange={(e) => setSelectedDeleteRed(e.target.value)}>
                    <option value="">Selecciona una Red</option>
                    {redes.map((red) => (
                        <option key={red.id} value={red.id}>{red.Name}</option>
                    ))}
                </select>
                <input type="text" placeholder="Escribe el ID para confirmar" value={deleteNetId} onChange={(e) => setDeleteNetId(e.target.value)} />
                <button onClick={eliminarRed} className="btn-delete">Eliminar Red</button>

                {/* 🔥 Sección de asociar/desasociar dispositivos */}
                <h2>📡 Asociar / Desasociar Dispositivo</h2>
                <select value={selectedRed} onChange={(e) => setSelectedRed(e.target.value)}>
                    <option value="">Selecciona una Red</option>
                    {redes.map((red) => (
                        <option key={red.id} value={red.id}>{red.Name}</option>
                    ))}
                </select>
                <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                    <option value="">Selecciona un Dispositivo</option>
                    {dispositivos.map((device) => (
                        <option key={device.id} value={device.id}>{device.Name}</option>
                    ))}
                </select>
                <button onClick={asociarDispositivo} className="btn-asociar">Asociar</button>
                <button onClick={desasociarDispositivo} className="btn-desasociar">Desasociar</button>
            </div>

            {/* 📌 Lista de Redes - Ahora dentro del Panel */}
            <div className="red-list-container">
                {loading ? (
                    <p>Cargando redes...</p>
                ) : redes.length === 0 ? (
                    <p>No hay redes registradas.</p>
                ) : (
                    redes.map(red => (
                        <div key={red.id} className="red-card">
                            <h2>🔗 {red.Name}</h2>
                            <p><strong>ID:</strong> {red.id}</p>
                            <h3>Dispositivos Asociados:</h3>
                            {red.dispositivos.length > 0 ? (
                                <ul className="device-list">
                                    {red.dispositivos.map((device, index) => (
                                        <li key={index}>📡 {device.Name || "Dispositivo sin nombre"}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-devices">⚠️ No hay dispositivos asociados.</p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
);

    
}

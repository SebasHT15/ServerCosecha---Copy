const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = admin.auth();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 🔐 Registro de Usuario con Firebase Authentication
app.post("/register", async (req, res) => {
    const { email, password, name, firstLastName, secondLastName, phoneNumber } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, nombre y contraseña son requeridos" });
    }

    try {
        // Crear usuario en Firebase Authentication
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
            phoneNumber
        });

        // Guardar usuario en Firestore con UID generado por Firebase Auth
        await db.collection("Users").doc(userRecord.uid).set({
            Email: email,
            Name: name,
            FirstLastName: firstLastName,
            SecondLastName: secondLastName,
            PhoneNumber: phoneNumber
        });

        res.json({ message: "Usuario registrado con éxito", uid: userRecord.uid });

    } catch (error) {
        console.error("Error en registro:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 🔑 Login con Firebase Authentication mediante ID Token
app.post("/login", async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Token no proporcionado" });
    }

    try {
        // Verificar el token de Firebase
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // Obtener información adicional del usuario
        const user = await auth.getUser(userId);

        res.json({
            message: "Login exitoso",
            user: {
                id: user.uid,
                email: user.email,
                name: user.displayName,
                phoneNumber: user.phoneNumber
            }
        });
    } catch (error) {
        console.error("Error en login:", error.message);
        res.status(401).json({ error: "Token inválido o expirado" });
    }
});

app.post("/reports/atmospheric", async (req, res) => {
    try {
        console.log("📡 Recibiendo reporte Atmospheric:", req.body);

        const { idDevice, temperature, humidity, pressure, light, uvradiation, date } = req.body;

        if (!idDevice || !date) {
            return res.status(400).json({ error: "Faltan datos requeridos (idDevice y date)" });
        }

        // 🔗 Crear referencia al dispositivo
        const deviceRef = db.doc(`Devices/${idDevice}`);

        // 📌 Verificar si el dispositivo existe
        const deviceSnapshot = await deviceRef.get();
        if (!deviceSnapshot.exists) {
            console.error("❌ Error: El dispositivo no existe en la base de datos.");
            return res.status(400).json({ error: "El dispositivo no existe en la base de datos." });
        }

        console.log("✅ Dispositivo válido, procediendo a guardar el reporte.");

        // 📤 Subir el reporte
        await db.collection("AtmosphericReport").add({
            idDevice: deviceRef,  // Guarda la referencia al dispositivo
            Temperature: temperature ?? null,
            Humidity: humidity ?? null,
            Pressure: pressure ?? null,
            Light: light ?? null,
            UVRadiation: uvradiation ?? null,
            Date: new Date(date)  // Asegurar que la fecha sea válida
        });

        console.log("✅ Reporte Atmospheric guardado con éxito");
        res.json({ message: "Reporte Atmospheric subido con éxito" });

    } catch (error) {
        console.error("❌ Error al subir reporte Atmospheric:", error);
        res.status(500).json({ error: "Error interno al subir el reporte", details: error.message });
    }
});


// 📌 Subir reporte de tipo Flow
const { Timestamp } = require("firebase-admin/firestore");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/reports/flow", async (req, res) => {
    try {
        console.log("📡 Recibiendo datos:", req.body);

        const { id_device, id_sensor, flowBajoCosto, flowAltoCosto, timestamp } = req.body;

        // ✅ Validaciones mínimas
        if (!id_device || flowBajoCosto === undefined || flowAltoCosto === undefined || !timestamp) {
            return res.status(400).json({ error: "Faltan datos requeridos" });
        }

        // 🔗 Referencia al dispositivo
        const deviceRef = db.doc(`Devices/${id_device}`);
        const deviceSnapshot = await deviceRef.get();
        if (!deviceSnapshot.exists) {
            return res.status(400).json({ error: "El dispositivo no existe en la base de datos." });
        }

        // 📅 Convertir timestamp personalizado (formato 10.MMddhhmm)
        let clientDate;
        if (/^10\.\d{8}$/.test(timestamp)) {
            const MM = parseInt(timestamp.slice(3, 5));
            const dd = parseInt(timestamp.slice(5, 7));
            const hh = parseInt(timestamp.slice(7, 9));
            const min = parseInt(timestamp.slice(9));

            clientDate = new Date(Date.UTC(2025, MM - 1, dd, hh + 6, min));

        }
        else {
            return res.status(400).json({ error: "Formato de timestamp inválido. Debe ser 10.MMddhhmm" });
        }

        // 🔍 Obtener referencias de sensores asociados al dispositivo (Gateway como referencia)
        const sensorsSnapshot = await db.collection("Sensores")
            .where("Gateway", "==", deviceRef)
            .get();

        const sensorRefs = [];
        sensorsSnapshot.forEach(doc => {
            sensorRefs.push(doc.ref); // ✅ Agrega referencia directa al sensor
        });

        // 📤 Subir el reporte
        await db.collection("FlowReportsIsla").add({
            idDevice: deviceRef,
            flowBajoCosto: parseFloat(flowBajoCosto),
            flowAltoCosto: parseFloat(flowAltoCosto),
            clientTimestamp: clientDate,         // Fecha decodificada del formato 10.MMddhhmm
            serverTimestamp: Timestamp.now(),    // Fecha real del servidor
            sensorRefs: sensorRefs.length > 0 ? sensorRefs : null
        });

        console.log("✅ Reporte Flow guardado con éxito");
        res.json({ message: "Reporte Flow subido con éxito" });

    } catch (error) {
        console.error("❌ Error al subir el reporte:", error);
        res.status(500).json({ error: "Error interno al subir el reporte", details: error.message });
    }
});


// 📌 Subir reporte de tipo Flow para laboratorio
app.use(express.urlencoded({ extended: true })); // ✅ Soporta form-data (x-www-form-urlencoded)

app.post("/reports/flow/lab", async (req, res) => {
    try {
        console.log("📡 Recibiendo datos (lab):", req.body);

        const { id_device, flow, id_sensor } = req.body;

        if (!id_device || !flow) {
            return res.status(400).json({ error: "Faltan datos requeridos (id_device y flow)" });
        }

        // 🔗 Crear referencia al dispositivo
        const deviceRef = db.doc(`Devices/${id_device}`);

        // 📌 Verificar si el dispositivo existe
        const deviceSnapshot = await deviceRef.get();
        if (!deviceSnapshot.exists) {
            console.error("❌ Error: El dispositivo no existe en la base de datos.");
            return res.status(400).json({ error: "El dispositivo no existe en la base de datos." });
        }

        // 📅 Generar timestamp si se envía fecha codificada en el campo flow
        let flowValue = null;
        let dateValue = new Date();

        if (/^10\.\d{8}$/.test(flow)) {
            const mm = flow.slice(3, 5);
            const dd = flow.slice(5, 7);
            const hh = flow.slice(7, 9);
            const min = flow.slice(9, 11);

            dateValue = new Date(`2025-${mm}-${dd}T${hh}:${min}:00`);
        } else {
            flowValue = parseFloat(flow);
        }

        // 📤 Subir el reporte a FlowReportsLab
        await db.collection("FlowReportsLab").add({
            idDevice: deviceRef,
            idSensor: id_sensor ?? null,
            Flow: flowValue,
            Date: dateValue
        });

        console.log("✅ Reporte Flow (Lab) guardado con éxito");
        res.json({ message: "Reporte Flow (Lab) subido con éxito" });

    } catch (error) {
        console.error("❌ Error al subir el reporte (Lab):", error);
        res.status(500).json({ error: "Error interno al subir el reporte (Lab)", details: error.message });
    }
});



// 📌 Subir reporte de tipo Quality
app.post("/reports/quality", async (req, res) => {
    try {
        console.log("📡 Recibiendo datos:", req.body); // 👈 Log de entrada

        const { idDevice, conductivity, dissolvedSolids, flow, salinity, temperature, turbidity, waterLevel, pH, date } = req.body;

        if (!idDevice || !date) {
            return res.status(400).json({ error: "Faltan datos requeridos (idDevice y date)" });
        }

        // 🔗 Crear referencia al dispositivo
        const deviceRef = db.doc(`Devices/${idDevice}`);

        // 📌 Verificar si el dispositivo existe antes de guardar el reporte
        const deviceSnapshot = await deviceRef.get();
        if (!deviceSnapshot.exists) {
            console.error("❌ Error: El dispositivo no existe en la base de datos.");
            return res.status(400).json({ error: "El dispositivo no existe en la base de datos." });
        }

        console.log("✅ Dispositivo válido, procediendo a guardar el reporte.");

        // 📤 Subir el reporte
        await db.collection("QualityReport").add({
            idDevice: deviceRef, // 👈 Guarda la referencia al dispositivo
            Conductivity: conductivity,
            DissolvedSolids: dissolvedSolids,
            Flow: flow,
            Salinity: salinity,
            Temperature: temperature,
            Turbidity: turbidity,
            WaterLevel: waterLevel,
            pH: pH,
            Date: new Date(date) // Asegura que la fecha sea válida
        });

        console.log("✅ Reporte guardado exitosamente");
        res.json({ message: "Reporte de calidad subido con éxito" });

    } catch (error) {
        console.error("❌ Error al subir el reporte:", error);
        res.status(500).json({ error: "Error interno al subir el reporte", details: error.message });
    }
});

app.get("/configurations/MeasureFrequency/:idDevice", async (req, res) => {
    try {
        const { idDevice } = req.params;

        console.log("📡 Buscando configuración para el dispositivo:", idDevice);

        // ✅ Crear referencia al dispositivo en Firestore
        const deviceRef = db.doc(`Devices/${idDevice}`);

        // 🔍 Consulta en la colección Configurations buscando por idDevice
        const configQuery = db.collection("Configurations").where("idDevice", "==", deviceRef);
        const querySnapshot = await configQuery.get();

        if (querySnapshot.empty) {
            console.warn(`⚠️ No se encontró configuración para el dispositivo: ${idDevice}`);
            return res.status(404).json({ error: "No se encontró configuración para el dispositivo." });
        }

        // ✅ Obtener el primer documento encontrado
        const configDoc = querySnapshot.docs[0];
        const configData = configDoc.data();

        // 🛠️ Retornar MeasureFrequency si existe, de lo contrario null
        const measureFrequency = configData.MeasureFrequency ?? null;
        console.log("✅ MeasureFrequency obtenido:", measureFrequency);

        res.json({ measureFrequency });

    } catch (error) {
        console.error("❌ Error al obtener MeasureFrequency:", error);
        res.status(500).json({ error: "Error interno al obtener MeasureFrequency" });
    }
});

// Obtener todas las colecciones de Firestore
app.get("/collections", async (req, res) => {
    try {
        const collections = await db.listCollections();
        const collectionNames = collections.map(col => col.id);
        res.json({ collections: collectionNames });
    } catch (error) {
        console.error("Error al obtener colecciones:", error);
        res.status(500).json({ error: "Error al obtener colecciones" });
    }
});

app.post('/campbell-log', async (req, res) => {
  try {
    console.log("📡 Petición recibida en /campbell-log");
    console.log("👉 Headers:", req.headers);
    console.log("👉 Body:", req.body);

    const allow = [
      "timestamp","record","VWC_1_Avg","EC_1_Avg","T_1_Avg","P_1_Avg","PA_1_Avg","VR_1_Avg",
      "VWC_2_Avg","EC_2_Avg","T_2_Avg","P_2_Avg","PA_2_Avg","VR_2_Avg","SEVolt_1_Avg","SEVolt_2_Avg"
    ];

    const doc = Object.fromEntries(
      allow.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]])
    );

    doc.source = req.body.source || "CR300";
    doc.createdAt = admin.firestore.FieldValue.serverTimestamp();

    console.log("✅ Documento que se va a guardar:", doc);

    const ref = await db.collection("crtest").add(doc);
    console.log("✅ Guardado en crtest con ID:", ref.id);

    return res.status(200).json({ ok: true, id: ref.id });
  } catch (error) {
    console.error("❌ Error en /campbell-log:", error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
});



// Exportar la API como una función de Firebase
exports.api = functions.https.onRequest(app);

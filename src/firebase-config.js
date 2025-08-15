import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 🔥 Importamos Firestore
import { getAnalytics } from "firebase/analytics";

// Configuración Firebase Proyecto 1 (cosecha)
const firebaseConfig1 = {
  apiKey: "AIzaSyD9mbJmQ2sOl-d2sF6VvwQWn9rHhht_OZk",
  authDomain: "cosecha-6aadb.firebaseapp.com",
  projectId: "cosecha-6aadb",
  storageBucket: "cosecha-6aadb.appspot.com",
  messagingSenderId: "979140943026",
  appId: "1:979140943026:web:67de30c1c062cc0fb97dab",
  measurementId: "G-VH9ECGRGHG"
};

// Configuración Firebase Proyecto 2 (smartiot-biocarbon)
const firebaseConfig2 = {
  apiKey: "AIzaSyBCW1RfpayfE7j8wxo8MqeDpvlp4ddP_S4",
  authDomain: "smartiot-biocarbon.firebaseapp.com",
  projectId: "smartiot-biocarbon",
  storageBucket: "smartiot-biocarbon.firebasestorage.app",
  messagingSenderId: "805276817662",
  appId: "1:805276817662:web:14e6f0cd26b8cd9daaadaf",
  measurementId: "G-7F2T1BF8GB"
};

// Inicializar app principal (cosecha)
const app1 = !getApps().length ? initializeApp(firebaseConfig1) : getApp();

// Inicializar auth y firestore para app principal
const auth = getAuth(app1);
const db = getFirestore(app1);

// Inicializar segunda app con nombre único
const app2 = !getApps().find(a => a.name === "app2") ? initializeApp(firebaseConfig2, "app2") : getApp("app2");

// Firestore para segunda app
const db2 = getFirestore(app2);

// Exportar para uso en toda la app
export { auth, db, db2 };
export default app1;


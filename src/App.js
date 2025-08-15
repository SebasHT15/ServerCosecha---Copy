import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/pages/JS/Home";
import Login from "./components/pages/JS/Login";
import Registrarse from "./components/pages/JS/Registrarse";
import Perfil from "./components/pages/JS/Perfil";
import Actualizar from './components/pages/JS/Actualizar';
import Redes from "./components/pages/JS/Redes";
import Dispositivos from "./components/pages/JS/Dispositivos";
import FlowReports from "./components/pages/JS/FlowReport";
import HomeProfile from "./components/pages/JS/homeProfile";

// 🔐 Importaciones de autenticación
import { AuthProvider } from "./components/AuthContext";
import PrivateRoute from "./components/context/PrivateRoute";
import Sensores from "./components/pages/JS/Sensores";
import ReportesHumedad from "./components/pages/JS/HumedadReport";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registrarse" element={<Registrarse />} />

          {/* Rutas protegidas */}
          <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/actualizar-datos" element={<PrivateRoute><Actualizar /></PrivateRoute>} />
          <Route path="/homeProfile" element={<PrivateRoute><HomeProfile /></PrivateRoute>} />
          <Route path="/redes" element={<PrivateRoute><Redes /></PrivateRoute>} />
          <Route path="/dispositivos" element={<PrivateRoute><Dispositivos /></PrivateRoute>} />
          <Route path="/reportesFlujo" element={<PrivateRoute><FlowReports /></PrivateRoute>} />
          <Route path="/sensores" element={<PrivateRoute><Sensores /></PrivateRoute>} />
          <Route path="/ReportesHumedad" element={<PrivateRoute><ReportesHumedad /></PrivateRoute>} />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;


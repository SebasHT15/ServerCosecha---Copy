import React from "react";
import { useNavigate } from "react-router-dom"; // Importar useNavigate
import "../CSS/homeProfile.css"; // Estilos personalizados

export default function HomeProfile() {
  const navigate = useNavigate(); // Hook para la navegación

  return (
    <div className="home-profile">
      <div className="home-content">
        <h1 className="home-title">Panel de Control</h1>

        <div className="section-grid">
          <div className="section-card dispositivos" onClick={() => navigate("/dispositivos")} style={{ cursor: "pointer" }}>
            <h2>📡 Dispositivos</h2>
            <p>Gestiona y monitorea todos los dispositivos IoT conectados.</p>
          </div>

          <div className="section-card reportes-atmosfericos" onClick={() => navigate("/ReportesHumedad")} style={{ cursor: "pointer" }}>
            <h2>🌦️ Reportes Humedad</h2>
            <p>Analiza los datos de humedad obtenidos de sensores IoT.</p>
          </div>

          <div className="section-card reportes-flujo" onClick={() => navigate("/reportesFlujo")} style={{ cursor: "pointer" }}>
            <h2>💧 Reportes de Flujo</h2>
            <p>Monitorea el consumo y flujo de recursos hídricos.</p>
          </div>

          {/* 🔗 Tarjeta de Redes con navegación */}
          <div className="section-card redes" onClick={() => navigate("/redes")} style={{ cursor: "pointer" }}>
            <h2>🔗 Redes</h2>
            <p>Gestiona la conectividad y las configuraciones de red.</p>
          </div>

          {/* 🔍 Nueva tarjeta para Sensores */}
          <div className="section-card sensores" onClick={() => navigate("/sensores")} style={{ cursor: "pointer" }}>
            <h2>📟 Sensores</h2>
            <p>Visualiza y administra sensores asociados a cada dispositivo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

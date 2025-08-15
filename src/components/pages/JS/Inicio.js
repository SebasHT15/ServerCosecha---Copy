import React from "react";
import { Link } from "react-router-dom";
import "../CSS/Inicio.css";

function HomePage() {
  // 🔥 Revisar si el usuario está autenticado
  const isLoggedIn = localStorage.getItem("loggedInUser");

  return (
    <div className="home-container">
      <div className="content">
        <h1>Bienvenido a Cosecha-BioCarbón</h1>
        <p>Transforma tu producción agrícola con tecnología IoT.</p>
        <p>Optimiza recursos, monitorea cultivos y toma decisiones inteligentes.</p>

        {/* 🔥 Si está logueado, mostrar botón para ir al perfil */}
        {isLoggedIn ? (
          <Link to="/homeProfile">
            <button className="profile-button">Panel de Control</button>
          </Link>
        ) : (
          <Link to="/registrarse">
            <button className="register-button">Registrarse</button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default HomePage;

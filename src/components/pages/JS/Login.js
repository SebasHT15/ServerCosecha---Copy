import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../../../firebase-config";
import { signInWithEmailAndPassword } from "firebase/auth";
import axios from "axios";
import "../CSS/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      const token = await user.getIdToken();

      const response = await axios.post("https://api-tegv5a7thq-uc.a.run.app/login", { token });

      if (response.data.message) {
        localStorage.setItem("loggedInUser", response.data.user.email);
        localStorage.setItem("userRole", response.data.user.role || "usuario");
        localStorage.setItem("userID", response.data.user.id);
        alert("¡Inicio de sesión exitoso!");
        navigate("/homeProfile");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error en login:", error);
      setError(error.response?.data?.error || "Error en inicio de sesión.");
    }
  };

  return (
    <div className="login-container"> {/* Contenedor General */}
      <div className="iniciar-sesion">
        <h1 className="login">INICIAR SESIÓN</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <label htmlFor="email">Email</label>
            <input id="email" type="text" placeholder="Introduce tu email" value={formData.email} onChange={handleInputChange} />
          </div>
          <div className="input-container">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="Introduce tu contraseña" value={formData.password} onChange={handleInputChange} />
          </div>
          <div className="button-container">
            <button type="submit">Iniciar Sesión</button>
          </div>
        </form>
        <div className="register-link">
          <Link to="/registrarse">O registrarse</Link>
        </div>
        {error && <div className="error-message"><p>{error}</p></div>}
      </div>
    </div>
  );
}

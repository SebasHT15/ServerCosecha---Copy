import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../../firebase-config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "../CSS/Registrarse.css";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    firstLastName: "",
    secondLastName: "",
    phoneNumber: "",
  });

  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Guardar datos del usuario en Firestore
        await setDoc(doc(db, "Users", user.uid), {
            Email: formData.email,
            Name: formData.name,
            FirstLastName: formData.firstLastName,
            SecondLastName: formData.secondLastName,
            PhoneNumber: formData.phoneNumber,
            CreatedAt: new Date(),
        });

        // Obtener token para autenticación
        const token = await user.getIdToken();

        // Guardar información en localStorage
        localStorage.setItem("loggedInUser", formData.email);
        localStorage.setItem("userRole", "usuario"); // Asigna un rol predeterminado si es necesario
        localStorage.setItem("userID", user.uid);
        localStorage.setItem("authToken", token);

        alert("¡Registro exitoso!");

        // Redirigir a HomeProfile y recargar la página
        navigate("/homeProfile");
        window.location.reload(); // ✅ Recarga la página después de la redirección
    } catch (error) {
        console.error("Error en registro:", error);
        setError(error.message);
    }
};


  return (
    <div className="register-container">
      <div className="register-box">
        <h1 className="register-title">Registrarse</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <label htmlFor="name">Nombre</label>
            <input id="name" type="text" placeholder="Nombre" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div className="input-container">
            <label htmlFor="firstLastName">Primer Apellido</label>
            <input id="firstLastName" type="text" placeholder="Primer Apellido" value={formData.firstLastName} onChange={handleInputChange} required />
          </div>
          <div className="input-container">
            <label htmlFor="secondLastName">Segundo Apellido</label>
            <input id="secondLastName" type="text" placeholder="Segundo Apellido" value={formData.secondLastName} onChange={handleInputChange} required />
          </div>
          <div className="input-container">
            <label htmlFor="email">Correo Electrónico</label>
            <input id="email" type="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleInputChange} required />
          </div>
          <div className="input-container">
            <label htmlFor="phoneNumber">Número de Teléfono</label>
            <input id="phoneNumber" type="text" placeholder="Número de Teléfono" value={formData.phoneNumber} onChange={handleInputChange} required />
          </div>
          <div className="input-container">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleInputChange} required />
          </div>
          <div className="button-container">
            <button type="submit">Registrarse</button>
          </div>
        </form>
        <p className="register-link">
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

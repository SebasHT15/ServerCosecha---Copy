import React, { useState, useEffect } from "react";
import { auth, db } from "../../../firebase-config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../CSS/Actualizar.css";

 // Importa los nuevos estilos

export default function ActualizarDatos() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    firstLastName: "",
    secondLastName: "",
    phoneNumber: "",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const userId = localStorage.getItem("userID");
      if (!userId) {
        alert("Usuario no autenticado.");
        navigate("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "Users", userId));
        if (userDoc.exists()) {
          setFormData({
            name: userDoc.data().Name,
            firstLastName: userDoc.data().FirstLastName,
            secondLastName: userDoc.data().SecondLastName,
            phoneNumber: userDoc.data().PhoneNumber,
          });
        } else {
          alert("No se encontraron datos del usuario.");
        }
      } catch (error) {
        console.error("Error obteniendo datos:", error);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem("userID");

    try {
      await updateDoc(doc(db, "Users", userId), {
        Name: formData.name,
        FirstLastName: formData.firstLastName,
        SecondLastName: formData.secondLastName,
        PhoneNumber: formData.phoneNumber,
      });

      alert("¡Datos actualizados correctamente!");
      navigate("/perfil"); // Redirigir a perfil después de actualizar
    } catch (error) {
      console.error("Error actualizando datos:", error);
      alert("Error al actualizar los datos.");
    }
  };

  return (
    <div className="actualizar-datos-container">
      <div className="actualizar-datos-box">
        <h1>Actualizar Datos</h1>
        <form onSubmit={handleUpdate}>
          <label>Nombre</label>
          <input id="name" type="text" value={formData.name} onChange={handleInputChange} required />
          <label>Primer Apellido</label>
          <input id="firstLastName" type="text" value={formData.firstLastName} onChange={handleInputChange} required />
          <label>Segundo Apellido</label>
          <input id="secondLastName" type="text" value={formData.secondLastName} onChange={handleInputChange} required />
          <label>Teléfono</label>
          <input id="phoneNumber" type="text" value={formData.phoneNumber} onChange={handleInputChange} required />
          <button type="submit">Guardar Cambios</button>
        </form>
      </div>
    </div>
  );
}

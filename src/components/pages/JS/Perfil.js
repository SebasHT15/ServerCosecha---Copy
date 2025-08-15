import React, { useState, useEffect } from "react";
import { auth, db } from "../../../firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../CSS/Perfil.css";

export default function Perfil() {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

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
          setUserData(userDoc.data());
        } else {
          alert("No se encontraron datos del usuario.");
        }
      } catch (error) {
        console.error("Error obteniendo datos:", error);
        alert("Error cargando perfil.");
      }
    };

    fetchUserData();
  }, [navigate]);

  if (!userData) return <p>Cargando datos...</p>;

  return (
    <div className="perfil-container">
      <div className="perfil-box">
        <h1>Perfil de Usuario</h1>
        <div className="perfil-info">
          <div><strong>Nombre:</strong> {userData.Name}</div>
          <div><strong>Primer Apellido:</strong> {userData.FirstLastName}</div>
          <div><strong>Segundo Apellido:</strong> {userData.SecondLastName}</div>
          <div><strong>Email:</strong> {userData.Email}</div>
          <div><strong>Teléfono:</strong> {userData.PhoneNumber}</div>
        </div>
      </div>
    </div>
  );
}

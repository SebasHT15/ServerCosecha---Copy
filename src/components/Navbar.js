import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import "./Navbar.css";

function Navbar() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem("loggedInUser");
    if (user) {
      setLoggedInUser(user);
    }
  }, []);


  
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        // 👇 Limpiás tu info local solo después de cerrar sesión en Firebase
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userID");
        setLoggedInUser(null);
        setShowMenu(false);
        navigate("/");
        window.location.reload(); // opcional, según cómo manejes el estado
      })
      .catch((error) => {
        console.error("❌ Error al cerrar sesión en Firebase:", error);
      });
  };
  

  // 🔥 Función para reautenticar antes de eliminar
  const reauthenticateUser = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("No hay usuario autenticado.");
      return false;
    }

    const email = user.email;
    const password = prompt("🔐 Ingresa tu contraseña para confirmar la eliminación:");

    if (!password) {
      alert("Reautenticación cancelada.");
      return false;
    }

    try {
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, credential);
      alert("Reautenticación exitosa. Eliminando cuenta...");
      return true;
    } catch (error) {
      console.error("Error en reautenticación:", error);
      alert("⚠️ Error en reautenticación. Verifica tu contraseña e intenta nuevamente.");
      return false;
    }
  };

  // 🔥 Función para eliminar la cuenta
  const handleDeleteAccount = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("No hay usuario autenticado.");
      return;
    }

    if (!window.confirm("⚠️ ¿Estás seguro de que quieres borrar tu cuenta? Esta acción es irreversible.")) {
      return;
    }

    try {
      const isReauthenticated = await reauthenticateUser();
      if (!isReauthenticated) return;

      await deleteDoc(doc(db, "Users", user.uid));
      console.log("✅ Documento eliminado de Firestore");

      await deleteUser(user);
      console.log("✅ Usuario eliminado de Firebase Authentication");

      alert("Tu cuenta ha sido eliminada correctamente.");
      setShowMenu(false); // ✅ Cierra el dropdown después de borrar la cuenta
      handleLogout();
    } catch (error) {
      console.error("Error al eliminar la cuenta:", error);
      alert("❌ Hubo un error al eliminar la cuenta. Intenta nuevamente.");
    }
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  // ✅ Ocultar "Inicia Sesión" en Login y Registrarse
  const hideLoginButton = location.pathname === "/login" || location.pathname === "/registrarse";

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Cosecha-BioCarbón <i className="fa-solid fa-seedling"></i>
        </Link>

        <div className="nav-right">
          {loggedInUser ? (
            <>
              {/* Icono de usuario con dropdown */}
              <div className="profile-container">
                <div className="profile-icon" onClick={toggleMenu}>
                  <i className="fas fa-user-circle"></i>
                </div>
                {showMenu && (
                  <div className="dropdown-menu">
                    <p className="user-email">{loggedInUser}</p>
                    <Link to="/perfil" onClick={() => setShowMenu(false)}>👤 Ver perfil</Link>
                    <Link to="/actualizar-datos" onClick={() => setShowMenu(false)}>✏️ Actualizar perfil</Link>
                    <button onClick={handleDeleteAccount} className="delete-button">
                      ❌ Borrar cuenta
                    </button>
                    <button onClick={handleLogout} className="logout-button">
                      🚪 Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // ✅ Se oculta el botón en Login y Registrarse
            !hideLoginButton && (
              <Link to="/login">
                <button className="login-button">Inicia Sesión</button>
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;


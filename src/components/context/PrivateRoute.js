// src/components/context/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    console.log("🔐 [PrivateRoute] user:", user, "loading:", loading);

    if (loading) return null; // Podés poner un spinner si querés

    return user ? children : <Navigate to="/login" />;
}

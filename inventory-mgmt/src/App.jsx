// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { getToken, getRole } from "./services/api";
import Login from "./pages/Login";
import Home from "./pages/Home";
import TransferPage from "./pages/Transfer";

function ProtectedRoute({ children, requireRole }) {
  const token = getToken();
  const role = getRole();
  if (!token) return <Navigate to="/login" replace />;
  if (requireRole && role !== requireRole) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    // NOTE: no <BrowserRouter> here — index.js wraps App with the single router
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer"
        element={
          <ProtectedRoute requireRole="WarehouseManager">
            <TransferPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/Home";
import TransferPage from "./pages/Transfer";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/transfer" element={<TransferPage />} />
      {/* Optional: catch-all to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

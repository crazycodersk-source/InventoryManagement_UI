// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(""); // manager / operator
  const [password, setPassword] = useState(""); // manager@123 / operator@123
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(username, password); // saves token+role
      navigate("/", { replace: true }); // go to Home
    } catch (err) {
      const msg = err?.response?.data || "Invalid username or password";
      setError(String(msg));
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f5f7fb",
      }}
    >
      <div
        style={{
          width: 360,
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ textAlign: "center", margin: 0 }}>Inventory Login</h2>
        <p style={{ textAlign: "center", color: "#666", marginTop: 6 }}>
          Sign in to continue
        </p>
        <form
          onSubmit={onSubmit}
          style={{ display: "grid", gap: 12, marginTop: 12 }}
        >
          <label
            style={{
              display: "grid",
              gap: 6,
              fontWeight: 600,
              color: "#1565c0",
            }}
          >
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="manager / operator"
              autoComplete="username"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #90caf9",
              }}
            />
          </label>
          <label
            style={{
              display: "grid",
              gap: 6,
              fontWeight: 600,
              color: "#1565c0",
            }}
          >
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="manager@123 / operator@123"
              autoComplete="current-password"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #90caf9",
              }}
            />
          </label>
          {error && (
            <div
              style={{
                color: "#b00020",
                background: "#fdecea",
                padding: 8,
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              background: "linear-gradient(90deg, #3f51b5, #2196f3)",
              color: "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

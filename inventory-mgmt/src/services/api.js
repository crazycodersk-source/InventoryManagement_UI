// src/services/api.js
import axios from "axios";

// Base URL: use .env REACT_APP_API_BASE_URL if present; else default to local API
const BASE_URL = (
  process.env.REACT_APP_API_BASE_URL ?? "http://localhost:5115"
).trim();

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});
api.defaults.withCredentials = false;

// Attach JWT from sessionStorage to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler -> redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_role");
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---------- AUTH ----------
export async function login(username, password) {
  const { data } = await api.post("/api/Auth/Login", { username, password });
  // Expected from backend: { token, role: "WarehouseManager" | "WarehouseOperator" }
  sessionStorage.setItem("auth_token", data.token);
  sessionStorage.setItem("auth_role", data.role);
  return data;
}

export function logout() {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_role");
}

// ---------- ROLES (UI metadata) ----------
export async function getRoles() {
  return [
    {
      id: "manager",
      label: "Warehouse Manager",
      permissions: { canEdit: true },
    },
    {
      id: "operator",
      label: "Warehouse Operator",
      permissions: { canEdit: false },
    },
  ];
}

// ---------- INVENTORY ----------
export async function getInventory() {
  const res = await api.get("/api/Inventory/GetAllInventory");
  const data = res?.data;
  if (!Array.isArray(data))
    throw new Error("Inventory API did not return an array");
  // Each row: { productId, name, price, stock, warehouseId, location }
  return data;
}

// ---------- TRANSFER (Manager-only) ----------
export async function transferProduct(product) {
  // product: { ProductId, WarehouseId, Name?, Price?, Stock? }
  const { data } = await api.post("/api/Inventory/transfer", product);
  return data;
}

// ---------- EXPORT (Managers only) ----------
export async function exportInventoryReport() {
  const res = await api.get("/api/Inventory/GetInventoryReport", {
    responseType: "blob",
    headers: {
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });

  // Best-effort filename extraction
  let filename = "Inventories.xlsx";
  const dispoHeader =
    res.headers?.["content-disposition"] ||
    (typeof res.headers?.get === "function"
      ? res.headers.get("content-disposition")
      : null);
  if (dispoHeader) {
    const m = /filename="?([^"]+)"?/i.exec(dispoHeader);
    if (m?.[1]) filename = m[1];
  }

  return { blob: res.data, filename };
}

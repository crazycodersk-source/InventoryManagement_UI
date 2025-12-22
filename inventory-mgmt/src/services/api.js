// src/services/api.js
import axios from "axios";

// ---- Local JSON (for USE_LOCAL mode) ----
import rolesLocal from "../data/roles.json";
import productsLocal from "../data/products.json";
import warehousesLocal from "../data/warehouses.json";

// ---- Environment flags ----
const USE_LOCAL =
  String(process.env.REACT_APP_USE_LOCAL || "true").toLowerCase() === "true";
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.trim() || "http://localhost:5115";

// ---- Axios instance ----
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request, if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // <-- critical for authorized endpoints
  }
  return config;
});

// Optional: handle 401 globally (redirect to /login)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Token invalid/expired → clear and redirect
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_role");
      // Use hard redirect to avoid stale app state
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// -----------------------------------------------------------------------------
// Helpers (local mode): attach warehouse objects to products for UI convenience
// -----------------------------------------------------------------------------
function attachWarehouseToProducts(products, warehouses) {
  // Local JSON typically uses PascalCase (ProductId, WarehouseId, Location, etc.)
  const wm = new Map((warehouses ?? []).map((w) => [Number(w.WarehouseId), w]));
  return (products ?? []).map((p) => {
    const wid = Number(p.WarehouseId);
    return {
      ...p,
      Warehouse: wm.get(wid) || { WarehouseId: wid, Location: "—" },
    };
  });
}

// -----------------------------------------------------------------------------
// AUTH
// -----------------------------------------------------------------------------
export async function login(username, password) {
  // Matches [Route("api/[controller]/[action]")] → POST /api/Auth/Login
  const { data } = await api.post("/api/Auth/Login", { username, password });
  // Expected: { token, role }
  localStorage.setItem("auth_token", data.token);
  localStorage.setItem("auth_role", data.role);
  return data;
}

export function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_role");
}

// -----------------------------------------------------------------------------
// INVENTORY (API-first when USE_LOCAL=false)
// -----------------------------------------------------------------------------
export async function getRoles() {
  // Local file shape: { "roles": [ { id, label, permissions? }, ... ] }
  return rolesLocal?.roles ?? [];
}

export async function getWarehouses() {
  if (USE_LOCAL) return warehousesLocal;

  // API mode with safe fallback to local JSON
  try {
    // Matches GET /api/Inventory/GetAllWarehouses
    const { data } = await api.get("/api/Inventory/GetAllWarehouses");
    return Array.isArray(data) ? data : warehousesLocal;
  } catch {
    return warehousesLocal;
  }
}

export async function getInventory() {
  if (USE_LOCAL) {
    // Local mode: fuse product + warehouse data for a richer grid
    return attachWarehouseToProducts(productsLocal, warehousesLocal);
  }

  // API mode with safe fallback to local JSON
  try {
    // Matches GET /api/Inventory/GetAll
    const [{ data: apiInv }, { data: apiWhs }] = await Promise.all([
      api.get("/api/Inventory/GetAll"),
      api.get("/api/Inventory/GetAllWarehouses"),
    ]);

    const inv = attachWarehouseToProducts(apiInv ?? [], apiWhs ?? []);
    return Array.isArray(inv)
      ? inv
      : attachWarehouseToProducts(productsLocal, warehousesLocal);
  } catch {
    return attachWarehouseToProducts(productsLocal, warehousesLocal);
  }
}

// Optional (Manager-only): Update product via API
export async function updateProduct(product) {
  if (USE_LOCAL) {
    // Local mode: simulate success (no persistence)
    return { ok: true, message: "Local update simulated." };
  }
  // Matches POST /api/Inventory/Update with [Authorize(Roles = "WarehouseManager")]
  const { data } = await api.post("/api/Inventory/Update", product);
  return data;
}

// src/services/api.js
import axios from "axios";

// ---- Local JSON (used only when USE_LOCAL=true) ----
import rolesLocal from "../data/roles.json";
import productsLocal from "../data/products.json";
import warehousesLocal from "../data/warehouses.json";

// ---- Environment flags ----
const USE_LOCAL =
  String(process.env.REACT_APP_USE_LOCAL ?? "true").toLowerCase() === "true";
const BASE_URL = (
  process.env.REACT_APP_API_BASE_URL ?? "http://localhost:5115"
).trim();

// ---- Dev logging helper ----
const DEV = process.env.NODE_ENV === "development";
const log = (...args) => DEV && console.debug("[api]", ...args);

// Print effective config once so you know what the app is using
if (DEV) {
  console.info("[api] effective config:", { USE_LOCAL, BASE_URL });
}

// ---- Axios instance ----
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});
api.defaults.withCredentials = false; // keep CORS simple (no cookies)

// Attach JWT token to every request, if present
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (DEV) {
    const method = (config.method || "get").toUpperCase();
    console.debug("[api:req]", method, `${api.defaults.baseURL}${config.url}`);
  }
  return config;
});

// Global 401 handling: clear auth and redirect to login
api.interceptors.response.use(
  (res) => {
    if (DEV) console.debug("[api:res]", res?.status, res?.config?.url);
    return res;
  },
  (err) => {
    const status = err?.response?.status;
    if (DEV) console.debug("[api:err]", status, err?.config?.url, err?.message);
    if (status === 401) {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_role");
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// -----------------------------------------------------------------------------
// Helpers (local mode): attach warehouse objects to products for richer UI join
// -----------------------------------------------------------------------------
function attachWarehouseToProducts(products, warehouses) {
  const wm = new Map((warehouses ?? []).map((w) => [Number(w.WarehouseId), w]));
  return (products ?? []).map((p) => {
    const wid = Number(p.WarehouseId);
    return {
      ...p,
      Warehouse: wm.get(wid) ?? { WarehouseId: wid, Location: "—" },
    };
  });
}

// -----------------------------------------------------------------------------
// AUTH
// -----------------------------------------------------------------------------
export async function login(username, password) {
  log("POST /api/Auth/Login", { username });
  const { data } = await api.post("/api/Auth/Login", { username, password });

  // Expected: { token, role } with role "WarehouseManager" | "WarehouseOperator"
  sessionStorage.setItem("auth_token", data.token);
  sessionStorage.setItem("auth_role", data.role);
  log("login success; role:", data.role);

  return data;
}

export function logout() {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_role");
}

// -----------------------------------------------------------------------------
// ROLES (UI-only)
//  You asked to avoid JSON entirely. Roles are UI metadata in your app; if you
//  want them from API, expose an endpoint and I’ll wire it. Until then, roles.json
//  simply drives the dropdown labels and permissions.
// -----------------------------------------------------------------------------
export async function getRoles() {
  log(
    USE_LOCAL ? "roles from LOCAL" : "roles from LOCAL (roles.json drives UI)"
  );
  return rolesLocal?.roles ?? [];
}

// -----------------------------------------------------------------------------
// WAREHOUSES  (API-only when USE_LOCAL=false; throws on backend issues)
// -----------------------------------------------------------------------------
export async function getWarehouses() {
  if (USE_LOCAL) {
    log("LOCAL warehouses.json");
    return warehousesLocal;
  }
  log("GET /api/Inventory/GetAllWarehouses");
  const res = await api.get("/api/Inventory/GetAllWarehouses");
  if (!Array.isArray(res.data))
    throw new Error("Warehouses API did not return an array");
  return res.data;
}

// -----------------------------------------------------------------------------
// INVENTORY  (API-only when USE_LOCAL=false; **no** local fallback)
// -----------------------------------------------------------------------------
export async function getInventory() {
  if (USE_LOCAL) {
    console.log("LOCAL products.json + warehouses.json");
    return attachWarehouseToProducts(productsLocal, warehousesLocal);
  }

  console.log("GET /api/Inventory/GetAllInventory");
  const { data: apiInv } = await api.get("/api/Inventory/GetAllInventory"); // primary

  console.log("GET /api/Inventory/GetAllWarehouses");
  const { data: apiWhs } = await api.get("/api/Inventory/GetAllWarehouses"); // required

  if (!Array.isArray(apiInv))
    throw new Error("Inventory API did not return an array");
  if (!Array.isArray(apiWhs))
    throw new Error("Warehouses API did not return an array");

  const inv = attachWarehouseToProducts(apiInv, apiWhs);
  console.log("API inventory rows:", inv.length);
  return inv;
}

// -----------------------------------------------------------------------------
// Manager-only actions
// -----------------------------------------------------------------------------
export async function transferProduct(product) {
  console.log(
    "POST /api/Inventory/transfer",
    product?.ProductId ?? product?.productId
  );
  const { data } = await api.post("/api/Inventory/transfer", product);
  return data;
}

// Optional alias: only if your backend exposes /api/Inventory/Update
export async function updateProduct(product) {
  log("POST /api/Inventory/Update", product?.ProductId ?? product?.productId);
  const { data } = await api.post("/api/Inventory/Update", product);
  return data;
}

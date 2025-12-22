
// src/services/api.jsx

/**
 * Local-first service layer with API toggle via .env
 *
 * .env examples:
 *   REACT_APP_USE_LOCAL=true
 *   REACT_APP_API_BASE_URL=http://localhost:5001
 *
 * When REACT_APP_USE_LOCAL=true, all functions read from local JSON.
 * When false, functions call API, but will gracefully fall back to local
 * if the backend is not reachable.
 */

// --- Imports (ESLint: import/first) ---
import rolesLocal from "../data/roles.json";
import productsLocal from "../data/products.json";
import warehousesLocal from "../data/warehouses.json";

// --- Env flags ---
const USE_LOCAL =
  String(process.env.REACT_APP_USE_LOCAL || "true").toLowerCase() === "true";

const BASE =
  process.env.REACT_APP_API_BASE_URL?.trim() || "http://localhost:5001";

// --- Helpers ---
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function attachWarehouseToProducts(products, warehouses) {
  const wm = new Map(warehouses.map((w) => [Number(w.WarehouseId), w]));
  return (products ?? []).map((p) => {
    const wid = Number(p.WarehouseId);
    return {
      ...p,
      Warehouse: wm.get(wid) || { WarehouseId: wid, Location: "—" },
    };
  });
}

// --- API call implementations (used only when USE_LOCAL=false) ---
async function apiGetInventory() {
  const res = await fetch(`${BASE}/inventory`, { method: "GET" });
  if (!res.ok) throw new Error(`GET /inventory failed: ${res.status}`);
  const data = await safeJson(res);
  return Array.isArray(data) ? data : [];
}

async function apiGetWarehouses() {
  const res = await fetch(`${BASE}/warehouses`, { method: "GET" });
  if (!res.ok) throw new Error(`GET /warehouses failed: ${res.status}`);
  const data = await safeJson(res);
  return Array.isArray(data) ? data : [];
}

async function apiTransferProduct({ productId, toWarehouseId }) {
  const res = await fetch(`${BASE}/inventory/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, toWarehouseId }),
  });
  if (!res.ok) {
    const msg = (await res.text().catch(() => "")) || "";
    throw new Error(`Transfer failed: ${res.status} ${msg}`);
  }
  return (await safeJson(res)) ?? { ok: true };
}

// --- Public services (local-first with safe fallbacks) ---
export async function getRoles() {
  // Local file shape: { "roles": [ { id, label, permissions? }, ... ] }
  return rolesLocal?.roles ?? [];
}

export async function getWarehouses() {
  if (USE_LOCAL) return warehousesLocal;

  // API mode with fallback to local
  try {
    const data = await apiGetWarehouses();
    return Array.isArray(data) ? data : warehousesLocal;
  } catch {
    return warehousesLocal;
  }
}

export async function getInventory() {
  if (USE_LOCAL) {
    return attachWarehouseToProducts(productsLocal, warehousesLocal);
  }

  // API mode with fallback to local
  try {
    const [apiInv, apiWhs] = await Promise.all([
      apiGetInventory(),
      apiGetWarehouses(),
    ]);
    const inv = attachWarehouseToProducts(apiInv, apiWhs);
    return Array.isArray(inv) ? inv : attachWarehouseToProducts(productsLocal, warehousesLocal);
  } catch {
    return attachWarehouseToProducts(productsLocal, warehousesLocal);
  }
}

export async function transferProduct(payload) {
  const { productId, toWarehouseId } = payload;

  if (USE_LOCAL) {
    // Simulate success; no persistence (client-side only)
    const target = warehousesLocal.find(
      (w) => Number(w.WarehouseId) === Number(toWarehouseId)
    );
    return {
      ok: true,
      productId: Number(productId),
      toWarehouseId: Number(toWarehouseId),
      Location: target?.Location || "—",
      message: "Local transfer simulated successfully.",
    };
  }

  // API mode
   return apiTransferProduct({ productId, toWarehouseId });
}
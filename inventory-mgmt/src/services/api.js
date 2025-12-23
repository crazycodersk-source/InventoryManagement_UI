// src/services/api.js
import axios from "axios";

const API_BASE = (
  process.env.REACT_APP_API_BASE || "http://localhost:5115/api"
).replace(/\/+$/, "");

// Session keys
const TOK_KEY = "auth_token";
const ROLE_KEY = "auth_role";

// Axios instance
const http = axios.create({ baseURL: API_BASE });

function setAuthHeader(token) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
}

export function getToken() {
  const t = sessionStorage.getItem(TOK_KEY);
  return t && t !== "null" ? t : null;
}
export function getRole() {
  const r = sessionStorage.getItem(ROLE_KEY);
  return r && r !== "null" ? r : null;
}
export function clearAuth() {
  sessionStorage.removeItem(TOK_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  setAuthHeader(null);
}
setAuthHeader(getToken());

// --- Auth ---
export async function login(userName, password) {
  const { data } = await http.post("/Auth/Login", { userName, password });
  const token = data?.token ?? null;
  const role = data?.role ?? null;
  sessionStorage.setItem(TOK_KEY, token);
  sessionStorage.setItem(ROLE_KEY, role);
  setAuthHeader(token);
  return data;
}
export function logout() {
  clearAuth();
}

// --- Inventory ---
export async function getInventory() {
  const { data } = await http.get("/Inventory/GetAllInventory");
  return data;
}
export async function transferProduct(productPayload) {
  const { data } = await http.post("/Inventory/transfer", productPayload);
  return data;
}
export async function exportInventoryReport() {
  const res = await http.get("/Inventory/GetInventoryReport", {
    responseType: "blob",
  });
  let filename = "Inventories.xlsx";
  const disp = res.headers?.["content-disposition"];
  if (disp) {
    const match = String(disp).match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }
  return { blob: res.data, filename };
}

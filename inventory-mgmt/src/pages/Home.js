// src/pages/Home.js
import React, { useEffect, useMemo, useState } from "react";
import {
  getRoles,
  getInventory,
  exportInventoryReport,
  logout,
} from "../services/api";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  IconButton,
  Paper,
  Chip,
  Stack,
  Button,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import LogoutIcon from "@mui/icons-material/Logout";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import PersonIcon from "@mui/icons-material/Person";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  // token & backend role from sessionStorage
  const savedRoleRaw = sessionStorage.getItem("auth_role"); // "WarehouseManager" | "WarehouseOperator"
  const token = sessionStorage.getItem("auth_token");

  // map backend role -> FE ids ("manager" / "operator")
  const roleMap = {
    WarehouseManager: "manager",
    WarehouseOperator: "operator",
  };
  const normalizedSavedRole = roleMap[savedRoleRaw] ?? "";

  // UI state
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(""); // placeholder initially
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false); // grid/data loading
  const [exportBusy, setExportBusy] = useState(false); // disables button during export
  const [error, setError] = useState("");

  // redirect to login if not authenticated
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // load roles; preselect based on backend role and keep Select disabled
  useEffect(() => {
    (async () => {
      try {
        const r = await getRoles();
        setRoles(r);
        if (
          normalizedSavedRole &&
          r.some((role) => role.id === normalizedSavedRole)
        ) {
          setSelectedRoleId(normalizedSavedRole);
        } else {
          setSelectedRoleId(""); // placeholder keeps Select in-range
        }
      } catch (e) {
        setError("Failed to load roles");
        console.log("[Home] roles load error:", e);
      }
    })();
  }, [normalizedSavedRole]);

  // fetch inventory after a valid role and token
  useEffect(() => {
    if (!selectedRoleId) return;
    if (!token) {
      setError("You are not logged in. Please sign in.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const inv = await getInventory();
        const mapped = (inv ?? []).map((p) => ({
          id: p.productId ?? p.ProductId,
          ProductId: p.productId ?? p.ProductId,
          Name: p.name ?? p.Name,
          Price: Number.parseFloat(p.price ?? p.Price ?? 0),
          Stock: Number.parseInt(p.stock ?? p.Stock ?? 0, 10),
          WarehouseId: p.warehouseId ?? p.WarehouseId,
          Location: p.location ?? p.Location,
        }));
        setRows(mapped);
        setError("");
      } catch (err) {
        const msg =
          err?.response?.data ?? err?.message ?? "Failed to load inventory";
        setError(String(msg));
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRoleId, token]);

  // current role object & permissions
  const role = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [selectedRoleId, roles]
  );
  const canEdit = role?.permissions?.canEdit === true; // Manager -> true

  // Role icons
  const roleIconMap = {
    manager: (
      <SupervisorAccountIcon sx={{ color: "#1976d2" }} fontSize="medium" />
    ),
    operator: <PersonIcon sx={{ color: "#388e3c" }} fontSize="medium" />,
  };

  // Export handler (Managers only)
  const handleExport = async () => {
    try {
      setExportBusy(true);
      const { blob, filename } = await exportInventoryReport();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "Inventories.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err?.response?.data ?? err?.message ?? "Export failed";
      setError(String(msg));
    } finally {
      setExportBusy(false);
    }
  };

  // Logout
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Grid columns
  const allColumns = useMemo(
    () => [
      {
        field: "ProductId",
        headerName: "Product Id",
        width: 130,
        headerClassName: "dg-header",
        cellClassName: "dg-cell",
      },
      {
        field: "Name",
        headerName: "Name",
        flex: 1,
        minWidth: 160,
        headerClassName: "dg-header",
        cellClassName: "dg-cell",
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            sx={{ bgcolor: "#e3f2fd", color: "#0d47a1", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "Price",
        headerName: "Price (₹)",
        width: 140,
        type: "number",
        headerClassName: "dg-header",
        cellClassName: "dg-cell",
        valueFormatter: (params) => Number(params.value).toFixed(2),
      },
      {
        field: "Stock",
        headerName: "Stock",
        width: 120,
        type: "number",
        headerClassName: "dg-header",
        cellClassName: "dg-cell",
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            sx={{
              bgcolor: params.value > 20 ? "#e8f5e9" : "#fff3e0",
              color: params.value > 20 ? "#1b5e20" : "#e65100",
              fontWeight: 700,
            }}
          />
        ),
      },
      {
        field: "Location",
        headerName: "Warehouse",
        flex: 1,
        minWidth: 160,
        headerClassName: "dg-header",
        cellClassName: "dg-cell",
        renderCell: (params) => (
          <Chip
            variant="outlined"
            label={params.value}
            size="small"
            sx={{ borderColor: "#1976d2", color: "#1976d2", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Edit",
        width: 90,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        headerClassName: "dg-header",
        cellClassName: "dg-cell",
        renderCell: (params) => (
          <Tooltip title="Transfer">
            <IconButton
              color="primary"
              size="small"
              onClick={() =>
                navigate(`/transfer?productId=${params.row.ProductId}`, {
                  state: { product: params.row }, // pass full row to prefill Transfer page
                })
              }
              aria-label={`Transfer ${params.row.Name}`}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [navigate]
  );

  const visibleColumns = useMemo(() => {
    return canEdit
      ? allColumns
      : allColumns.filter((c) => c.field !== "actions");
  }, [canEdit, allColumns]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4ff, #e8f5e9)",
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          width: "95%",
          maxWidth: 1200,
          textAlign: "center",
          borderRadius: 3,
          backgroundColor: "#ffffff",
        }}
      >
        {/* Welcome */}
        <Typography
          variant="h4"
          sx={{
            mb: 1,
            color: "#1976d2",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Welcome to Your Smart Inventory Hub
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{
            mb: 4,
            color: "#555",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          Manage, Track, and Transfer with Ease!
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Role Selector (disabled) + Manager-only Export + Logout */}
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          {/* Role Select: subtle border, perfect alignment, disabled */}
          <FormControl
            size="small"
            variant="outlined"
            sx={{
              minWidth: 320,
              background: "linear-gradient(90deg, #e3f2fd 0%, #e8f5e9 100%)",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(25,118,210,0.07)",
              border: "1.5px solid #e0e0e0", // subtle border (no blue highlight)
            }}
          >
            <InputLabel
              id="role-label"
              sx={{ fontWeight: 700, color: "#1976d2" }}
            >
              Role
            </InputLabel>
            <Select
              labelId="role-label"
              label="Role"
              value={selectedRoleId || ""} // shows resolved role
              onChange={(e) => setSelectedRoleId(e.target.value)}
              disabled // locked after login
              sx={{
                fontWeight: 700,
                color: "#1976d2",
                fontSize: 18,
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingLeft: "12px",
                },
                ".MuiSelect-icon": { color: "#1976d2" },
                ".Mui-disabled": { color: "#1976d2" },
                background: "transparent",
              }}
              renderValue={(value) => {
                const r = roles.find((role) => role.id === value);
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {roleIconMap[value]}
                    <span style={{ fontWeight: 700, fontSize: 18 }}>
                      {r?.label || "—"}
                    </span>
                  </Box>
                );
              }}
            >
              <MenuItem value="">
                <em>— Select —</em>
              </MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {roleIconMap[r.id]}
                    <span style={{ fontWeight: 700 }}>{r.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {canEdit && (
            <Tooltip title="Export to Excel">
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={
                    exportBusy ? (
                      <CircularProgress size={16} sx={{ color: "#1976d2" }} />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={handleExport}
                  disabled={exportBusy}
                  aria-busy={exportBusy}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2,
                    background:
                      "linear-gradient(90deg, #e3f2fd 0%, #e8f5e9 100%)",
                    color: "#1976d2",
                    borderColor: "#1976d2",
                    "&:hover": { background: "#e3f2fd" },
                  }}
                >
                  {exportBusy ? "Exporting…" : "Export (Excel)"}
                </Button>
              </span>
            </Tooltip>
          )}

          <Tooltip title="Logout">
            <span>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  borderColor: "#d32f2f",
                  color: "#d32f2f",
                  background:
                    "linear-gradient(90deg, #fffde7 0%, #ffcdd2 100%)",
                  "&:hover": { background: "#ffcdd2" },
                }}
              >
                Logout
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {/* Grid */}
        {selectedRoleId && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: "#388e3c", fontWeight: "bold" }}
            >
              Inventory Details
            </Typography>
            <div style={{ height: 560 }}>
              <DataGrid
                rows={rows}
                columns={visibleColumns}
                loading={loading}
                disableRowSelectionOnClick
                getRowClassName={(params) =>
                  params.indexRelativeToCurrentPage % 2 === 0
                    ? "row-even"
                    : "row-odd"
                }
                initialState={{
                  pagination: { paginationModel: { pageSize: 10, page: 0 } },
                  sorting: { sortModel: [{ field: "ProductId", sort: "asc" }] },
                }}
                pageSizeOptions={[5, 10, 25]}
                sx={{
                  borderRadius: 2,
                  borderColor: "#e0e0e0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  "& .MuiDataGrid-columnHeaders": {
                    background:
                      "linear-gradient(90deg, rgba(25,118,210,0.15), rgba(56,142,60,0.15))",
                    borderBottom: "2px solid #e0e0e0",
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 800,
                    color: "#0d47a1",
                    letterSpacing: 0.2,
                  },
                  "& .dg-header": {
                    background:
                      "linear-gradient(90deg, rgba(25,118,210,0.12), rgba(56,142,60,0.12))",
                  },
                  "& .dg-cell": { fontWeight: 500 },
                  "& .row-even": { backgroundColor: "#fafafa" },
                  "& .row-odd": { backgroundColor: "#ffffff" },
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "#f1f8e9",
                    transition: "background-color 0.2s ease-in-out",
                  },
                  "& .MuiDataGrid-row.Mui-selected": {
                    backgroundColor: "#e3f2fd",
                  },
                }}
              />
            </div>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

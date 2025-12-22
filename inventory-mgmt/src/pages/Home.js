// src/pages/Home.js
import React, { useEffect, useMemo, useState } from "react";
import { getRoles, getInventory, getWarehouses } from "../services/api";
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
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  // Read raw role and token from sessionStorage (clears on browser close)
  const savedRoleRaw = sessionStorage.getItem("auth_role"); // "WarehouseManager" | "WarehouseOperator"
  const token = sessionStorage.getItem("auth_token");

  // Normalize backend roles to FE ids used by roles.json ("manager" / "operator")
  const roleMap = {
    WarehouseManager: "manager",
    WarehouseOperator: "operator",
  };
  const normalizedSavedRole = roleMap[savedRoleRaw] ?? "";

  // UI state
  const [roles, setRoles] = useState([]); // from roles.json
  const [selectedRoleId, setSelectedRoleId] = useState(""); // start with placeholder so Select is in-range
  const [rows, setRows] = useState([]); // inventory rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- Load roles; once loaded, set Select value if normalizedSavedRole exists among options ----
  useEffect(() => {
    console.debug(
      "[Home] roles effect: normalizedSavedRole =",
      normalizedSavedRole
    );
    (async () => {
      try {
        const r = await getRoles();
        console.debug("[Home] roles loaded:", r);
        setRoles(r);

        // Set the value ONLY after options exist and include it
        if (
          normalizedSavedRole &&
          r.some((role) => role.id === normalizedSavedRole)
        ) {
          setSelectedRoleId(normalizedSavedRole);
          console.debug("[Home] selectedRoleId set to", normalizedSavedRole);
        } else {
          setSelectedRoleId(""); // keep placeholder
          console.debug("[Home] selectedRoleId set to '' (placeholder)");
        }
      } catch (e) {
        setError("Failed to load roles");
        console.error("[Home] roles load error:", e);
      }
    })();
  }, [normalizedSavedRole]);

  // ---- Fetch inventory after a valid role is selected and a token is present ----
  useEffect(() => {
    console.debug(
      "[Home] inventory effect start; selectedRoleId =",
      selectedRoleId,
      "token =",
      !!token
    );

    if (!selectedRoleId) {
      console.debug("[Home] skip: no selectedRoleId yet");
      return;
    }

    if (!token) {
      setError("You are not logged in. Please sign in.");
      setLoading(false);
      console.error("[Home] skip: no token in sessionStorage");
      return;
    }

    (async () => {
      try {
        setLoading(true);
        console.debug("[Home] calling getInventory()");
        const inv = await getInventory();
        console.debug(
          "[Home] getInventory() returned rows =",
          (inv ?? []).length
        );

        // Normalize shapes into uniform row objects for the grid
        const joined = (inv ?? []).map((p) => ({
          id: p.productId ?? p.ProductId,
          ProductId: p.productId ?? p.ProductId,
          Name: p.name ?? p.Name,
          Price: Number(p.price ?? p.Price ?? 0),
          Stock: Number(p.stock ?? p.Stock ?? 0),
          WarehouseId:
            p.warehouse?.warehouseId ??
            p.Warehouse?.WarehouseId ??
            p.WarehouseId,
          Location:
            p.warehouse?.location ?? p.Warehouse?.Location ?? p.Location ?? "—",
        }));

        setRows(joined);
      } catch (err) {
        console.error("[Home] inventory failed:", err);
        const msg =
          err?.response?.data ?? err?.message ?? "Failed to load inventory";
        setError(String(msg));
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRoleId, token]);

  // ---- Manual test button for API call ----
  const manualTest = async () => {
    try {
      console.debug("[Home] manual test: calling getInventory()");
      const inv = await getInventory();
      console.debug("[Home] manual test returned rows =", (inv ?? []).length);
      alert(`Inventory rows: ${inv?.length ?? 0}`);
    } catch (e) {
      console.error("[Home] manual test error:", e);
      alert(`Error: ${e?.response?.status ?? ""} ${e?.message ?? e}`);
    }
  };

  // ---- Current role and permissions (from roles.json) ----
  const role = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [selectedRoleId, roles]
  );
  const canEdit = role?.permissions?.canEdit === true;

  // ---- Columns (memoized; array defined inside useMemo to avoid dependency warnings) ----
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
                navigate(`/transfer?productId=${params.row.ProductId}`)
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

  // ---- Role-based visibility of the Edit column ----
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

        {/* Role Selector */}
        <FormControl size="small" sx={{ minWidth: 260, mb: 3 }}>
          <InputLabel id="role-label">Choose Role</InputLabel>
          <Select
            labelId="role-label"
            label="Choose Role"
            value={selectedRoleId || ""} // guard to avoid out-of-range
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={roles.length === 0} // disable while loading options
          >
            <MenuItem value="">
              <em>— Select —</em>
            </MenuItem>
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Manual test button for API call */}
        <Button
          variant="outlined"
          color="secondary"
          onClick={manualTest}
          sx={{ mb: 2 }}
        >
          Test Inventory API (Console)
        </Button>

        {/* Grid shows only after a valid role is selected */}
        {selectedRoleId && (
          <Box sx={{ mt: 4 }}>
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
                  "& .dg-cell": {
                    fontWeight: 500,
                  },
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

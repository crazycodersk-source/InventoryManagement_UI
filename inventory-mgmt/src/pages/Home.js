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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Load roles initially
  useEffect(() => {
    (async () => {
      try {
        const r = await getRoles();
        setRoles(r);
      } catch {
        setError("Failed to load roles");
      }
    })();
  }, []);

  // 2) Load inventory after role selection
  useEffect(() => {
    if (!selectedRoleId) return;
    (async () => {
      try {
        setLoading(true);
        const [inv] = await Promise.all([getInventory(), getWarehouses()]);
        const joined = inv.map((p) => ({
          id: p.ProductId,
          ProductId: p.ProductId,
          Name: p.Name,
          Price: Number(p.Price ?? 0),
          Stock: Number(p.Stock ?? 0),
          WarehouseId: p.Warehouse?.WarehouseId ?? p.WarehouseId,
          Location: p.Warehouse?.Location ?? "—",
        }));
        setRows(joined);
      } catch {
        setError("Failed to load inventory");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRoleId]);

  // 3) Current role and permissions
  const role = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || null,
    [selectedRoleId, roles]
  );
  const canEdit = role?.permissions?.canEdit === true;

  // 4) All columns (with colorful chips and header classes)
  const allColumns = [
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
  ];

  // 5) Role-based visibility (hide Edit column when cannot edit)
  const visibleColumns = useMemo(
    () =>
      canEdit ? allColumns : allColumns.filter((c) => c.field !== "actions"),
    [canEdit, allColumns] // ✅ include allColumns to satisfy ESLint
  );

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

        {/* Role Selector (always visible; grid shows after selection) */}
        <FormControl size="small" sx={{ minWidth: 260, mb: 3 }}>
          <InputLabel id="role-label">Choose Role</InputLabel>
          <Select
            labelId="role-label"
            label="Choose Role"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
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

        {/* Grid shows only after role is selected */}
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
                  // Container
                  borderRadius: 2,
                  borderColor: "#e0e0e0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",

                  // Gradient header
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

                  // Per-column header/cell classes
                  "& .dg-header": {
                    background:
                      "linear-gradient(90deg, rgba(25,118,210,0.12), rgba(56,142,60,0.12))",
                  },
                  "& .dg-cell": {
                    fontWeight: 500,
                  },

                  // Zebra striping via row classes from getRowClassName
                  "& .row-even": { backgroundColor: "#fafafa" },
                  "& .row-odd": { backgroundColor: "#ffffff" },

                  // Hover glow
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "#f1f8e9",
                    transition: "background-color 0.2s ease-in-out",
                  },

                  // Selected row accent
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

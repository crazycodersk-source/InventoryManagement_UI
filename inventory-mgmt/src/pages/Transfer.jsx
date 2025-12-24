import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { transferProduct } from "../services/api";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ThumbUpAltRoundedIcon from "@mui/icons-material/ThumbUpAltRounded";

export default function Transfer() {
  const navigate = useNavigate();
  const location = useLocation();

  // Product row passed from Home (router state)
  const row = location?.state?.product ?? {};
  const raw = row._raw ?? row;

  // Robust field extraction (supports PascalCase/camelCase)
  const productId =
    row.ProductId ??
    row.productId ??
    row.id ??
    raw.ProductId ??
    raw.productId ??
    raw.id ??
    0;

  const name = (row.Name ?? row.name ?? raw.Name ?? raw.name ?? "").toString();

  const price = (() => {
    const v = row.Price ?? row.price ?? raw.Price ?? raw.price ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
  })();

  const stock = (() => {
    const v = row.Stock ?? row.stock ?? raw.Stock ?? raw.stock ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  })();

  const currentWarehouseId =
    row.WarehouseId ??
    row.warehouseId ??
    raw.WarehouseId ??
    raw.warehouseId ??
    null;

  const currentWarehouseName = (
    row.Warehouse?.Name ??
    raw.Warehouse?.Name ??
    row.Location ??
    row.location ??
    raw.Location ??
    raw.location ??
    ""
  ).toString();

  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");

  // Placeholder warehouse list (replace with API if you have one)
  const warehouses = useMemo(
    () => [
      { id: 1, name: "Delhi" },
      { id: 2, name: "Mumbai" },
      { id: 3, name: "Kolkata" },
      { id: 4, name: "Chennai" },
    ],
    []
  );

  // Default destination to a different warehouse than current
  useEffect(() => {
    const firstDifferent = warehouses.find((w) => w.id !== currentWarehouseId);
    if (firstDifferent && !destinationWarehouseId) {
      setDestinationWarehouseId(String(firstDifferent.id));
    }
  }, [warehouses, currentWarehouseId, destinationWarehouseId]);

  const disabledFieldProps = {
    fullWidth: true,
    disabled: true,
    variant: "outlined",
    InputProps: {
      sx: {
        fontWeight: 600,
        fontSize: 16,
        borderRadius: 2,
        color: "#1976d2",
        background: "#fafafa",
      },
    },
    InputLabelProps: {
      sx: {
        fontWeight: 700,
        color: "#1976d2",
      },
    },
  };

  const handleUpdate = async () => {
    try {
      setBusy(true);
      setError("");
      setSnackMsg("");
      const destId = Number(destinationWarehouseId);
      if (!productId || !destId) {
        throw new Error("Select a valid destination warehouse.");
      }

      // --- Minimal DTO payload { productId, warehouseId } ---
      const dto = {
        productId: Number(productId),
        warehouseId: Number(destId),
      };

      // Treat any 2xx as success; axios throws on non-2xx
      await transferProduct(dto);

      setSnackMsg("Transfer successful!");
      setSnackOpen(true); // show pop; navigation happens on close
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.title ||
        data?.detail ||
        (data?.errors && JSON.stringify(data.errors, null, 2)) ||
        err?.message ||
        "Transfer failed";
      setError(`Request failed (${status ?? "unknown"}).\n${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => navigate("/home", { replace: true });

  const handleSnackClose = () => {
    setSnackOpen(false);
    // Navigate to Home and pass refresh signal + toast
    navigate("/home", {
      replace: true,
      state: { refresh: true, toast: "Transfer is successful!" },
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 50%, #fffde7 100%)",
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          width: "95%",
          maxWidth: 560,
          borderRadius: 4,
          background:
            "linear-gradient(120deg, #fffde7 0%, #e8f5e9 60%, #e3f2fd 100%)",
          boxShadow: "0 8px 32px rgba(25,118,210,0.10)",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Inventory2OutlinedIcon
            sx={{ fontSize: 40, color: "#1976d2", mb: 1 }}
          />
        </Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: "#1976d2",
            textAlign: "center",
            fontFamily: "Segoe UI, Roboto, Arial, sans-serif",
            mb: 1,
          }}
        >
          Transfer Product
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-wrap" }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {/* Display-only fields */}
          <TextField
            label="Product Id"
            value={productId}
            {...disabledFieldProps}
          />
          <TextField
            label="Current Warehouse"
            value={
              currentWarehouseName
                ? `${currentWarehouseName} (ID: ${currentWarehouseId ?? "—"})`
                : `ID: ${currentWarehouseId ?? "—"}`
            }
            {...disabledFieldProps}
          />
          <TextField label="Name" value={name} {...disabledFieldProps} />
          <TextField label="Price" value={price} {...disabledFieldProps} />
          <TextField label="Stock" value={stock} {...disabledFieldProps} />

          {/* Destination only (enabled) */}
          <FormControl fullWidth variant="outlined">
            <InputLabel
              id="dest-wh-label"
              sx={{ fontWeight: 700, color: "#388e3c" }}
            >
              Destination Warehouse
            </InputLabel>
            <Select
              labelId="dest-wh-label"
              label="Destination Warehouse"
              value={String(destinationWarehouseId)}
              onChange={(e) => setDestinationWarehouseId(e.target.value)}
              sx={{
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 2,
                color: "#1976d2",
                background: "#fafafa",
              }}
            >
              {warehouses
                .filter((w) => w.id !== currentWarehouseId)
                .map((w) => (
                  <MenuItem
                    key={w.id}
                    value={String(w.id)}
                    sx={{
                      fontWeight: 700,
                      color: "#388e3c",
                      background: "#fff",
                      borderRadius: 2,
                    }}
                  >
                    {w.name} (ID: {w.id})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Stack
            direction="row"
            spacing={2}
            justifyContent="flex-end"
            sx={{ mt: 2 }}
          >
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleCancel}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                background: "#fffde7",
                color: "#e65100",
                borderColor: "#e65100",
                "&:hover": { background: "#ffe0b2" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleUpdate}
              disabled={busy}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                background: "#388e3c",
                color: "#fff",
                boxShadow: "0 2px 8px #a5d6a7",
                "&:hover": { background: "#2e7d32" },
              }}
            >
              {busy ? "Updating..." : "Update"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Classy, professional success popup */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={1800}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackClose}
          severity="success"
          icon={<ThumbUpAltRoundedIcon sx={{ color: "#2e7d32" }} />}
          variant="outlined"
          sx={{
            borderColor: "#a5d6a7",
            backgroundColor: "#e8f5e9",
            color: "#1b5e20",
            fontWeight: 600,
            fontSize: "1.1rem",
            boxShadow: 2,
            borderRadius: 2,
            alignItems: "center",
            letterSpacing: 0.1,
            minWidth: 280,
            justifyContent: "center",
          }}
        >
          Transfer successful!
        </Alert>
      </Snackbar>
    </Box>
  );
}

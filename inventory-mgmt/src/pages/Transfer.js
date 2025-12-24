// src/pages/Transfer.js
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

// Classy thumbs-up icon
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
        backgroundColor: "#f6f8fb",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "95%",
          maxWidth: 560,
          borderRadius: 3,
          backgroundColor: "#fff",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            mb: 3,
            fontWeight: 600,
            color: "#2b3a4a",
            textAlign: "center",
            letterSpacing: 0.2,
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
            <InputLabel id="dest-wh-label">Destination Warehouse</InputLabel>
            <Select
              labelId="dest-wh-label"
              label="Destination Warehouse"
              value={String(destinationWarehouseId)}
              onChange={(e) => setDestinationWarehouseId(e.target.value)}
            >
              {warehouses
                .filter((w) => w.id !== currentWarehouseId)
                .map((w) => (
                  <MenuItem key={w.id} value={String(w.id)}>
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
            <Button variant="outlined" color="inherit" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleUpdate}
              disabled={busy}
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
            fontWeight: 500,
            fontSize: "1.05rem",
            boxShadow: 1,
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

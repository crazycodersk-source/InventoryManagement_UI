// src/pages/Transfer.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { transferProduct, getInventory } from "../services/api";

export default function Transfer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Prefer full row from router state; else use productId query param
  const stateProduct = location.state?.product ?? null;
  const productIdParam = useMemo(() => {
    const fromState =
      stateProduct?.ProductId ?? stateProduct?.productId ?? undefined;
    const fromQuery = Number(searchParams.get("productId") ?? 0) || undefined;
    return fromState ?? fromQuery ?? 0;
  }, [searchParams, stateProduct]);

  // Form state (prefill from state if available)
  const [productId, setProductId] = useState(productIdParam || 0);
  const [name, setName] = useState(
    stateProduct?.Name ?? stateProduct?.name ?? ""
  );
  const [price, setPrice] = useState(
    stateProduct?.Price ?? stateProduct?.price ?? ""
  );
  const [stock, setStock] = useState(
    stateProduct?.Stock ?? stateProduct?.stock ?? ""
  );

  // Warehouses: current (disabled) + destination dropdown
  const [currentWarehouseId, setCurrentWarehouseId] = useState(
    stateProduct?.WarehouseId ?? stateProduct?.warehouseId ?? ""
  );
  const [currentWarehouseLabel, setCurrentWarehouseLabel] = useState(
    stateProduct?.Location ?? stateProduct?.location ?? ""
  );
  const [destWarehouseId, setDestWarehouseId] = useState("");
  const [warehouseOptions, setWarehouseOptions] = useState([]); // [{id, label}]

  // UI
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // On mount: If only productId is present (no state), fetch and prefill product & current warehouse
  useEffect(() => {
    (async () => {
      if (stateProduct || !productIdParam) return;

      try {
        const list = await getInventory();
        const found = (list ?? []).find(
          (p) => Number(p.productId ?? p.ProductId) === Number(productIdParam)
        );
        if (found) {
          setProductId(Number(found.productId ?? found.ProductId));
          const wid = found.warehouseId ?? found.WarehouseId ?? "";
          setCurrentWarehouseId(wid);
          setCurrentWarehouseLabel(found.location ?? found.Location ?? "");
          setName(found.name ?? found.Name ?? "");
          setPrice(found.price ?? found.Price ?? "");
          setStock(found.stock ?? found.Stock ?? "");
        } else {
          setError("Product not found in current inventory.");
        }
      } catch (e) {
        setError("Unable to load product details.");
        console.log("[Transfer] prefill fetch error:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdParam]);

  // Build destination dropdown from **entire grid** (unique warehouses)
  useEffect(() => {
    (async () => {
      try {
        const list = await getInventory();
        // Extract unique warehouses by (warehouseId, location)
        const uniq = new Map();
        (list ?? []).forEach((row) => {
          const wid = Number(row.warehouseId ?? row.WarehouseId);
          const loc = row.location ?? row.Location ?? "";
          if (!Number.isNaN(wid) && wid > 0) {
            const key = `${wid}|${loc}`;
            if (!uniq.has(key))
              uniq.set(key, { id: wid, label: loc || `Warehouse ${wid}` });
          }
        });

        let options = Array.from(uniq.values());
        // If we know the current warehouse, remove it from the destination list
        if (currentWarehouseId) {
          const cur = Number(currentWarehouseId);
          options = options.filter((w) => Number(w.id) !== cur);
        }

        // Sort options by label for nicer UX
        options.sort((a, b) => String(a.label).localeCompare(String(b.label)));

        setWarehouseOptions(options);
      } catch (e) {
        setError("Unable to load warehouse list.");
        console.log("[Transfer] warehouse build error:", e);
      }
    })();
  }, [currentWarehouseId]);

  const onUpdate = async (e) => {
    e.preventDefault();
    setError("");

    if (!productId) {
      setError("Missing Product Id.");
      return;
    }
    if (!destWarehouseId) {
      setError("Please select a destination warehouse.");
      return;
    }
    if (Number(destWarehouseId) === Number(currentWarehouseId)) {
      setError(
        "Destination warehouse cannot be the same as current warehouse."
      );
      return;
    }

    const payload = {
      // PascalCase to match typical ASP.NET Core model binding
      ProductId: Number(productId),
      WarehouseId: Number(destWarehouseId),
      Name: name || undefined,
      Price: price !== "" ? Number(price) : undefined,
      Stock: stock !== "" ? Number(stock) : undefined,
    };

    try {
      setBusy(true);
      const res = await transferProduct(payload);
      console.log("[Transfer] success:", res);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err?.response?.data ?? err?.message ?? "Transfer failed";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  };

  const onCancel = () => navigate("/", { replace: true });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background:
          "linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 50%, #fffde7 100%)",
      }}
    >
      <Paper
        elevation={6}
        component="form"
        onSubmit={onUpdate}
        sx={{ width: "100%", maxWidth: 720, borderRadius: 3, p: 4 }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, mb: 2, color: "primary.main" }}
        >
          Transfer Product
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Product basics */}
        <TextField
          label="Product Id"
          value={productId || ""}
          fullWidth
          sx={{ mb: 2 }}
          disabled
        />

        {/* Current warehouse (disabled) */}
        <FormControl size="small" sx={{ mb: 2 }}>
          <InputLabel id="current-warehouse-label">
            Current Warehouse
          </InputLabel>
          <Select
            labelId="current-warehouse-label"
            label="Current Warehouse"
            value={currentWarehouseId || ""}
            disabled
            sx={{
              fontWeight: 700,
              ".Mui-disabled": { color: "text.primary" },
            }}
          >
            <MenuItem value="">
              <em>— Unknown —</em>
            </MenuItem>
            {currentWarehouseId && (
              <MenuItem value={Number(currentWarehouseId)}>
                {currentWarehouseLabel
                  ? `${currentWarehouseLabel} (ID: ${currentWarehouseId})`
                  : `ID: ${currentWarehouseId}`}
              </MenuItem>
            )}
          </Select>
        </FormControl>

        {/* Destination warehouse (dropdown from entire grid) */}
        <FormControl size="small" sx={{ mb: 2 }}>
          <InputLabel id="dest-warehouse-label">
            Destination Warehouse *
          </InputLabel>
          <Select
            labelId="dest-warehouse-label"
            label="Destination Warehouse *"
            value={destWarehouseId || ""}
            onChange={(e) => setDestWarehouseId(e.target.value)}
            required
          >
            <MenuItem value="">
              <em>— Select warehouse —</em>
            </MenuItem>
            {warehouseOptions.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.label ? `${w.label} (ID: ${w.id})` : `ID: ${w.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Optional fields */}
        <TextField
          label="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="Price (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="Stock (optional)"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          type="number"
          fullWidth
          sx={{ mb: 3 }}
        />

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            color="inherit"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={busy}
            sx={{ fontWeight: 700 }}
          >
            {busy ? "Updating…" : "Update"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

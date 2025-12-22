// src/pages/Transfer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
  Alert,
  Divider,
} from "@mui/material";
import { getInventory, getWarehouses, updateProduct } from "../services/api";

export default function TransferPage() {
  const [searchParams] = useSearchParams();
  const productIdFromQuery = Number(searchParams.get("productId") || 0);

  // Data state
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState(
    productIdFromQuery ? String(productIdFromQuery) : ""
  );
  const [selectedToWarehouseId, setSelectedToWarehouseId] = useState("");

  // UI feedback
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Derived maps
  const warehouseMap = useMemo(
    () =>
      new Map(
        (warehouses ?? []).map((w) => [Number(w.WarehouseId), w.Location])
      ),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map((products ?? []).map((p) => [Number(p.ProductId), p])),
    [products]
  );

  // Load inventory & warehouses (uses token via axios interceptor)
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [wh, inv] = await Promise.all([getWarehouses(), getInventory()]);
        if (!mounted) return;
        setWarehouses(wh || []);
        setProducts(inv || []);
      } catch (err) {
        if (!mounted) return;
        setErrorMsg(
          `Failed to load data: ${err?.response?.data || err?.message || err}`
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Available "To" warehouses: exclude current product warehouse
  const availableToWarehouses = useMemo(() => {
    if (!selectedProductId) return warehouses;
    const p = productMap.get(Number(selectedProductId));
    if (!p) return warehouses;
    const currentWid = Number(p.Warehouse?.WarehouseId ?? p.WarehouseId);
    return (warehouses ?? []).filter(
      (w) => Number(w.WarehouseId) !== currentWid
    );
  }, [selectedProductId, warehouses, productMap]);

  async function onSubmit(e) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!selectedProductId || !selectedToWarehouseId) {
      setErrorMsg("Please select both Product and Destination Warehouse.");
      return;
    }

    try {
      const prod = productMap.get(Number(selectedProductId));
      if (!prod) {
        setErrorMsg("Product not found.");
        return;
      }

      // Build the payload expected by your API's Update endpoint
      // NOTE: keep PascalCase property names to match your backend DTO/model where applicable
      const updated = {
        ProductId: prod.ProductId,
        Name: prod.Name,
        Price: prod.Price,
        Stock: prod.Stock,
        WarehouseId: Number(selectedToWarehouseId),
        // Include nested Warehouse object only if your API tolerates it;
        // many APIs ignore navigation properties in updates.
        // Warehouse: { WarehouseId: Number(selectedToWarehouseId) },
      };

      // Manager-only endpoint; JWT is added by axios interceptor
      await updateProduct(updated);

      // Optimistic UI update in the client
      const fromLoc =
        warehouseMap.get(
          Number(prod?.Warehouse?.WarehouseId ?? prod?.WarehouseId)
        ) || "—";
      const toLoc = warehouseMap.get(Number(selectedToWarehouseId)) || "—";

      setSuccessMsg(
        `Updated: "${prod.Name}" moved from ${fromLoc} to ${toLoc}.`
      );

      setProducts((prev) =>
        prev.map((p) =>
          Number(p.ProductId) === Number(selectedProductId)
            ? {
                ...p,
                WarehouseId: Number(selectedToWarehouseId),
                Warehouse: {
                  ...(p.Warehouse || {}),
                  WarehouseId: Number(selectedToWarehouseId),
                  Location: toLoc,
                },
              }
            : p
        )
      );

      // Reset form
      setSelectedProductId("");
      setSelectedToWarehouseId("");
    } catch (err) {
      setErrorMsg(err?.response?.data || err?.message || "Update failed.");
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Transfer Product
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        This page uses your JWT token (from login) to call the API.
      </Alert>

      {loading ? (
        <Typography>Loading…</Typography>
      ) : (
        <Grid container spacing={3}>
          {/* Form card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transfer Form
                </Typography>

                {errorMsg && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {errorMsg}
                  </Alert>
                )}
                {successMsg && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {successMsg}
                  </Alert>
                )}

                <Box component="form" onSubmit={onSubmit}>
                  <TextField
                    select
                    label="Product"
                    fullWidth
                    size="small"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    sx={{ mb: 2 }}
                  >
                    {(products ?? []).map((p) => (
                      <MenuItem key={p.ProductId} value={p.ProductId}>
                        {p.Name} (Stock: {p.Stock ?? "—"}) — Current:{" "}
                        {warehouseMap.get(
                          Number(p.Warehouse?.WarehouseId ?? p.WarehouseId)
                        ) || "—"}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Destination Warehouse"
                    fullWidth
                    size="small"
                    value={selectedToWarehouseId}
                    onChange={(e) => setSelectedToWarehouseId(e.target.value)}
                    sx={{ mb: 2 }}
                    disabled={!selectedProductId}
                  >
                    {availableToWarehouses.map((w) => (
                      <MenuItem key={w.WarehouseId} value={w.WarehouseId}>
                        {w.Location}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button type="submit" variant="contained">
                    Transfer
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Inventory preview */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Inventory Snapshot
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Shows current warehouse per product. After a successful update
                  we refresh the client-side snapshot.
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {(products ?? []).map((p) => (
                  <Box
                    key={p.ProductId}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <span>
                      {p.Name} (#{p.ProductId}) — Stock: {p.Stock ?? "—"}
                    </span>
                    <strong>
                      {warehouseMap.get(
                        Number(p.Warehouse?.WarehouseId ?? p.WarehouseId)
                      ) || "—"}
                    </strong>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

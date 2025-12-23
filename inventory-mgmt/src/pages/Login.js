// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Chip,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LoginIcon from "@mui/icons-material/Login";
import { login } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  // UI state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false); // purely UI hint

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // basic guard to avoid empty / whitespace creds
    const u = username.trim();
    const p = password; // keep password as typed
    if (!u || !p) {
      setError("Please enter both username and password.");
      return;
    }

    if (busy) return; // guard double-click
    setBusy(true);

    try {
      console.log("[Login] attempting", { username: u });
      const res = await login(u, p); // { token, role }
      console.log("[Login] success", res);

      // Tip: sessionStorage is used in api.js, so auth clears when the tab closes.
      // 'remember' is currently visual only; not changing storage mechanism per your preference.
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err?.response?.data ?? "Invalid username or password";
      console.log("[Login] error:", err);
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  };

  const autofill = (role) => {
    if (role === "manager") {
      setUsername("manager");
      setPassword("manager@123");
    } else if (role === "operator") {
      setUsername("operator");
      setPassword("operator@123");
    }
  };

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
        elevation={8}
        component="form"
        onSubmit={onSubmit}
        sx={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 3,
          p: 4,
          backdropFilter: "blur(2px)",
        }}
      >
        {/* Header / Welcome */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <LockOpenIcon sx={{ fontSize: 40, color: "primary.main" }} />
        </Box>
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            color: "primary.main",
          }}
        >
          Welcome to Inventory Hub
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ textAlign: "center", mt: 1, color: "text.secondary" }}
        >
          Sign in to manage, track, and transfer with ease.
        </Typography>

        {/* Quick demo chips */}
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
          <Chip
            label="Use Manager Demo"
            color="primary"
            variant="outlined"
            onClick={() => autofill("manager")}
            size="small"
          />
          <Chip
            label="Use Operator Demo"
            color="success"
            variant="outlined"
            onClick={() => autofill("operator")}
            size="small"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Error area */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Inputs */}
        <TextField
          label="Username"
          placeholder="manager / operator"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          fullWidth
          required
          autoComplete="username"
          sx={{ mb: 2 }}
          inputProps={{ "aria-label": "username" }}
        />

        <TextField
          label="Password"
          placeholder="manager@123 / operator@123"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type={showPwd ? "text" : "password"}
          fullWidth
          required
          autoComplete="current-password"
          sx={{ mb: 1 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  onClick={() => setShowPwd((s) => !s)}
                  edge="end"
                >
                  {showPwd ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
            }
            label="Remember me (this tab)"
          />
          <Button
            color="inherit"
            size="small"
            onClick={() =>
              alert("Forgot password flow can be implemented here.")
            }
          >
            Forgot password?
          </Button>
        </Box>

        {/* Submit */}
        <Button
          type="submit"
          variant="contained"
          endIcon={<LoginIcon />}
          disabled={busy}
          fullWidth
          sx={{
            py: 1.2,
            fontWeight: 700,
            borderRadius: 2,
            background:
              "linear-gradient(90deg, rgba(25,118,210,1) 0%, rgba(56,142,60,1) 100%)",
          }}
        >
          {busy ? "Signing in..." : "Sign In"}
        </Button>

        {/* Helper text */}
        <Typography
          variant="caption"
          sx={{
            mt: 2,
            display: "block",
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          Tip: Use <strong>manager / manager@123</strong> or{" "}
          <strong>operator / operator@123</strong>.
        </Typography>
      </Paper>
    </Box>
  );
}

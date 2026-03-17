import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../services/api";

interface Movimiento {
  id: number;
  tipo: string;
  fecha: string;
  observaciones?: string;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  ENTRADA: "Entry",
  SALIDA: "Exit",
  TRANSFERENCIA: "Transfer",
  AJUSTE: "Adjustment",
};

const MovementsPage: React.FC = () => {
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [assets, setAssets] = useState<{ id: number; numero_inventario: string; modelo?: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; nombre: string }[]>([]);
  const [form, setForm] = useState({
    tipo: "ENTRADA",
    bien_id: "",
    cantidad: "",
    bodega_destino_id: "",
    observaciones: "",
  });
  const [error, setError] = useState<string | null>(null);

  const loadMovements = () => api.get("/movements/").then((res) => setMovements(res.data));

  useEffect(() => {
    loadMovements();
    api.get("/assets/").then((res) => setAssets(res.data));
    api.get("/warehouses/bodegas").then((res) => setWarehouses(res.data));
  }, []);

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      setForm((prev) => ({ ...prev, [field]: (e.target as HTMLInputElement).value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.bien_id || !form.cantidad) {
      setError("Please select an asset and enter quantity.");
      return;
    }
    try {
      await api.post("/movements/", {
        tipo: form.tipo,
        observaciones: form.observaciones || undefined,
        detalles: [
          {
            bien_id: Number(form.bien_id),
            cantidad: Number(form.cantidad),
            bodega_destino_id: form.bodega_destino_id ? Number(form.bodega_destino_id) : undefined,
          },
        ],
      });
      setForm({ tipo: "ENTRADA", bien_id: "", cantidad: "", bodega_destino_id: "", observaciones: "" });
      loadMovements();
    } catch (err: any) {
      setError(String(err?.response?.data?.detail ?? "Error creating movement."));
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Movements
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "grid", gap: 2, mb: 3, maxWidth: 420 }}
      >
        <FormControl>
          <InputLabel>Type</InputLabel>
          <Select value={form.tipo} label="Type" onChange={handleChange("tipo")}>
            <MenuItem value="ENTRADA">{MOVEMENT_TYPE_LABELS.ENTRADA}</MenuItem>
            <MenuItem value="SALIDA">{MOVEMENT_TYPE_LABELS.SALIDA}</MenuItem>
            <MenuItem value="TRANSFERENCIA">{MOVEMENT_TYPE_LABELS.TRANSFERENCIA}</MenuItem>
            <MenuItem value="AJUSTE">{MOVEMENT_TYPE_LABELS.AJUSTE}</MenuItem>
          </Select>
        </FormControl>
        <FormControl required>
          <InputLabel>Asset</InputLabel>
          <Select value={form.bien_id} label="Asset" onChange={handleChange("bien_id")}>
            <MenuItem value="">Select asset</MenuItem>
            {assets.map((a) => (
              <MenuItem key={a.id} value={String(a.id)}>
                {a.numero_inventario} {a.modelo ? `— ${a.modelo}` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Quantity"
          type="number"
          value={form.cantidad}
          onChange={handleChange("cantidad")}
          required
          inputProps={{ min: 1 }}
        />
        <FormControl>
          <InputLabel>Destination warehouse</InputLabel>
          <Select
            value={form.bodega_destino_id}
            label="Destination warehouse"
            onChange={handleChange("bodega_destino_id")}
          >
            <MenuItem value="">Select warehouse</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>
                {w.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Notes"
          value={form.observaciones}
          onChange={handleChange("observaciones")}
          multiline
          minRows={2}
        />
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        <Button type="submit" variant="contained">
          Create movement
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom>
        Recent movements
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{new Date(m.fecha).toLocaleString()}</TableCell>
              <TableCell>{MOVEMENT_TYPE_LABELS[m.tipo] ?? m.tipo}</TableCell>
              <TableCell>{m.observaciones ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default MovementsPage;

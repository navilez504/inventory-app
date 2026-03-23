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
import { useTranslation } from "react-i18next";
import api from "../services/api";

const MOV_TYPES = ["ENTRADA", "SALIDA", "TRANSFERENCIA", "AJUSTE"] as const;

interface Movimiento {
  id: number;
  tipo: string;
  fecha: string;
  observaciones?: string;
}

const MovementsPage: React.FC = () => {
  const { t } = useTranslation();
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

  const movTypeLabel = (tipo: string) =>
    t(`movements.movTypes.${tipo}`, { defaultValue: tipo });

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
      setError(t("movements.errorQty"));
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
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
          : undefined;
      setError(typeof detail === "string" ? detail : t("movements.errorCreate"));
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t("movements.title")}
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "grid", gap: 2, mb: 3, maxWidth: 420 }}
      >
        <FormControl>
          <InputLabel>{t("movements.type")}</InputLabel>
          <Select value={form.tipo} label={t("movements.type")} onChange={handleChange("tipo")}>
            {MOV_TYPES.map((tipo) => (
              <MenuItem key={tipo} value={tipo}>
                {movTypeLabel(tipo)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl required>
          <InputLabel>{t("movements.asset")}</InputLabel>
          <Select value={form.bien_id} label={t("movements.asset")} onChange={handleChange("bien_id")}>
            <MenuItem value="">{t("movements.selectAsset")}</MenuItem>
            {assets.map((a) => (
              <MenuItem key={a.id} value={String(a.id)}>
                {a.numero_inventario} {a.modelo ? `— ${a.modelo}` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={t("movements.qty")}
          type="number"
          value={form.cantidad}
          onChange={handleChange("cantidad")}
          required
          inputProps={{ min: 1 }}
        />
        <FormControl>
          <InputLabel>{t("movements.destWarehouse")}</InputLabel>
          <Select
            value={form.bodega_destino_id}
            label={t("movements.destWarehouse")}
            onChange={handleChange("bodega_destino_id")}
          >
            <MenuItem value="">{t("movements.selectWarehouse")}</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>
                {w.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={t("common.notes")}
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
          {t("movements.createMovement")}
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom>
        {t("movements.recent")}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t("movements.date")}</TableCell>
            <TableCell>{t("movements.type")}</TableCell>
            <TableCell>{t("movements.colNotes")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{new Date(m.fecha).toLocaleString()}</TableCell>
              <TableCell>{movTypeLabel(m.tipo)}</TableCell>
              <TableCell>{m.observaciones ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default MovementsPage;

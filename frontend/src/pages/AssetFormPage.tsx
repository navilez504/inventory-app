import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import api from "../services/api";

interface AssetForm {
  numero_inventario: string;
  categoria_id: string;
  marca_id: string;
  modelo: string;
  serie: string;
  precio: string;
  fecha_adquisicion: string;
  proveedor_id: string;
  estado: string;
  observaciones: string;
}

type AssetFormField = keyof AssetForm;

const defaultForm: AssetForm = {
  numero_inventario: "",
  categoria_id: "",
  marca_id: "",
  modelo: "",
  serie: "",
  precio: "",
  fecha_adquisicion: "",
  proveedor_id: "",
  estado: "AVAILABLE",
  observaciones: "",
};

const STATUS_VALUES = ["AVAILABLE", "IN_WAREHOUSE", "ASSIGNED", "DAMAGED", "OBSOLETE"] as const;

const AssetFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState<AssetForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<AssetFormField | "form", string>>>({});
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [marcas, setMarcas] = useState<{ id: number; nombre: string }[]>([]);
  const [proveedores, setProveedores] = useState<{ id: number; nombre: string }[]>([]);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    api.get("/master-data/categorias").then((res) => setCategorias(res.data));
    api.get("/master-data/marcas").then((res) => setMarcas(res.data));
    api.get("/master-data/proveedores").then((res) => setProveedores(res.data));
  }, []);

  useEffect(() => {
    if (id) {
      api.get(`/assets/${id}`).then((res) => {
        const data = res.data;
        setForm({
          numero_inventario: data.numero_inventario ?? "",
          categoria_id: String(data.categoria_id ?? ""),
          marca_id: String(data.marca_id ?? ""),
          modelo: data.modelo ?? "",
          serie: data.serie ?? "",
          precio: data.precio != null ? String(data.precio) : "",
          fecha_adquisicion: data.fecha_adquisicion ?? "",
          proveedor_id: data.proveedor_id != null ? String(data.proveedor_id) : "",
          estado: data.estado ?? "AVAILABLE",
          observaciones: data.observaciones ?? "",
        });
      });
    }
  }, [id]);

  const handleChange =
    (field: AssetFormField) =>
    (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      const value = (e.target as HTMLInputElement).value;
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
    };

  const validate = (): boolean => {
    const newErrors: Partial<Record<AssetFormField | "form", string>> = {};
    if (!form.numero_inventario.trim()) newErrors.numero_inventario = t("assetForm.errors.inventoryRequired");
    if (!form.categoria_id.trim()) newErrors.categoria_id = t("assetForm.errors.category");
    if (!form.marca_id.trim()) newErrors.marca_id = t("assetForm.errors.brand");
    if (!form.precio.trim() || Number(form.precio) <= 0) newErrors.precio = t("assetForm.errors.price");
    if (!form.fecha_adquisicion.trim()) newErrors.fecha_adquisicion = t("assetForm.errors.date");
    if (!form.estado.trim()) newErrors.estado = t("assetForm.errors.status");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const createPayload = {
      numero_inventario: form.numero_inventario.trim(),
      categoria_id: Number(form.categoria_id),
      marca_id: Number(form.marca_id),
      modelo: form.modelo || undefined,
      serie: form.serie || undefined,
      precio: Number(form.precio),
      fecha_adquisicion: form.fecha_adquisicion,
      proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : undefined,
      estado: form.estado,
      observaciones: form.observaciones || undefined,
    };
    try {
      if (id) {
        await api.put(`/assets/${id}`, {
          modelo: form.modelo || undefined,
          serie: form.serie || undefined,
          precio: form.precio ? Number(form.precio) : undefined,
          proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : undefined,
          estado: form.estado || undefined,
          observaciones: form.observaciones || undefined,
        });
      } else {
        await api.post("/assets/", createPayload);
      }
      navigate("/assets");
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        form: String(err?.response?.data?.detail ?? t("assetForm.saveError")),
      }));
    }
  };

  const isAssigned =
    id &&
    (form.estado === "ASSIGNED" ||
      String(form.estado).toUpperCase() === "ASIGNADO");

  const handleReturnAssignment = async () => {
    if (!id) return;
    setReturning(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    try {
      await api.post(`/assignments/return/${id}`);
      const res = await api.get(`/assets/${id}`);
      setForm((prev) => ({ ...prev, estado: res.data.estado ?? "AVAILABLE" }));
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        form: String(err?.response?.data?.detail ?? t("assetForm.returnError")),
      }));
    } finally {
      setReturning(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {id ? t("assetForm.editTitle") : t("assetForm.newTitle")}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
        <TextField
          label={t("assetForm.inventoryNumber")}
          value={form.numero_inventario}
          onChange={handleChange("numero_inventario")}
          required
          error={!!errors.numero_inventario}
          helperText={errors.numero_inventario}
        />
        <FormControl required error={!!errors.categoria_id}>
          <InputLabel>{t("assetForm.category")}</InputLabel>
          <Select
            value={form.categoria_id}
            label={t("assetForm.category")}
            onChange={handleChange("categoria_id")}
          >
            <MenuItem value="">{t("assetForm.selectCategory")}</MenuItem>
            {categorias.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </MenuItem>
            ))}
          </Select>
          {errors.categoria_id && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {errors.categoria_id}
            </Typography>
          )}
        </FormControl>
        <FormControl required error={!!errors.marca_id}>
          <InputLabel>{t("assetForm.brand")}</InputLabel>
          <Select value={form.marca_id} label={t("assetForm.brand")} onChange={handleChange("marca_id")}>
            <MenuItem value="">{t("assetForm.selectBrand")}</MenuItem>
            {marcas.map((m) => (
              <MenuItem key={m.id} value={String(m.id)}>
                {m.nombre}
              </MenuItem>
            ))}
          </Select>
          {errors.marca_id && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {errors.marca_id}
            </Typography>
          )}
        </FormControl>
        <TextField label={t("assetForm.model")} value={form.modelo} onChange={handleChange("modelo")} />
        <TextField label={t("assetForm.serial")} value={form.serie} onChange={handleChange("serie")} />
        <TextField
          label={t("assetForm.priceUsd")}
          type="number"
          value={form.precio}
          onChange={handleChange("precio")}
          required
          error={!!errors.precio}
          helperText={errors.precio}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />
        <TextField
          label={t("assetForm.acqDate")}
          type="date"
          value={form.fecha_adquisicion}
          onChange={handleChange("fecha_adquisicion")}
          InputLabelProps={{ shrink: true }}
          required
          error={!!errors.fecha_adquisicion}
          helperText={errors.fecha_adquisicion}
        />
        <FormControl>
          <InputLabel>{t("assetForm.supplier")}</InputLabel>
          <Select value={form.proveedor_id} label={t("assetForm.supplier")} onChange={handleChange("proveedor_id")}>
            <MenuItem value="">{t("assetForm.supplierNone")}</MenuItem>
            {proveedores.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl required error={!!errors.estado}>
          <InputLabel>{t("assetForm.status")}</InputLabel>
          <Select value={form.estado} label={t("assetForm.status")} onChange={handleChange("estado")}>
            {STATUS_VALUES.map((v) => (
              <MenuItem key={v} value={v}>
                {t(`assetStatus.${v}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={t("assetForm.notes")}
          value={form.observaciones}
          onChange={handleChange("observaciones")}
          multiline
          minRows={3}
        />
        {errors.form && (
          <Typography color="error" variant="body2">
            {errors.form}
          </Typography>
        )}
        {isAssigned && (
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t("assetForm.assignedHint")}
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              disabled={returning}
              onClick={(e) => {
                e.preventDefault();
                void handleReturnAssignment();
              }}
            >
              {returning ? t("assetForm.returning") : t("assetForm.returnBtn")}
            </Button>
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button type="submit" variant="contained">
            {t("common.save")}
          </Button>
          <Button variant="outlined" onClick={() => navigate("/assets")}>
            {t("common.cancel")}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default AssetFormPage;

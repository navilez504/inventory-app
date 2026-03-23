import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
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

interface Assignment {
  id: number;
  bien_id: number;
  persona_id: number;
  fecha: string;
  observaciones?: string;
  is_active: boolean;
}

interface Asset {
  id: number;
  numero_inventario: string;
  modelo?: string;
  estado?: string;
}

const AssignmentsPage: React.FC = () => {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignableAssets, setAssignableAssets] = useState<Asset[]>([]);
  const [personas, setPersonas] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);
  const [form, setForm] = useState({ bien_id: "", persona_id: "", observaciones: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAssignments = () =>
    api.get<Assignment[]>("/assignments/", { params: { active_only: true } }).then((res) => setAssignments(res.data));

  useEffect(() => {
    loadAssignments();
    api.get<Asset[]>("/assets/", { params: { assignable_only: true } }).then((res) => setAssignableAssets(res.data));
    api.get("/org/personas").then((res) => setPersonas(res.data));
  }, []);

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      setForm((prev) => ({ ...prev, [field]: (e.target as HTMLInputElement).value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!form.bien_id || !form.persona_id) {
      setError(t("assignments.selectBoth"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/assignments/", {
        bien_id: Number(form.bien_id),
        persona_id: Number(form.persona_id),
        observaciones: form.observaciones || undefined,
      });
      setForm({ bien_id: "", persona_id: "", observaciones: "" });
      await loadAssignments();
      const res = await api.get<Asset[]>("/assets/", { params: { assignable_only: true } });
      setAssignableAssets(res.data);
    } catch (err: any) {
      setError(String(err?.response?.data?.detail ?? t("assignments.createError")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (bienId: number) => {
    setError(null);
    try {
      await api.post(`/assignments/return/${bienId}`);
      await loadAssignments();
      const assetsRes = await api.get<Asset[]>("/assets/", { params: { assignable_only: true } });
      setAssignableAssets(assetsRes.data);
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      setError(typeof d === "string" ? d : Array.isArray(d) ? JSON.stringify(d) : t("assignments.returnFailed"));
    }
  };

  const personaMap = Object.fromEntries(personas.map((p) => [p.id, p]));
  const assetById: Record<number, Asset> = {};
  assignableAssets.forEach((a) => {
    assetById[a.id] = a;
  });
  assignments.forEach((a) => {
    if (!assetById[a.bien_id]) {
      assetById[a.bien_id] = {
        id: a.bien_id,
        numero_inventario: `#${a.bien_id}`,
      };
    }
  });

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t("assignments.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("assignments.hint")}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2, mb: 3, maxWidth: 420 }}>
        <FormControl required>
          <InputLabel>{t("assignments.assetAssignable")}</InputLabel>
          <Select value={form.bien_id} label={t("assignments.assetAssignable")} onChange={handleChange("bien_id")}>
            <MenuItem value="">{t("assignments.selectAsset")}</MenuItem>
            {assignableAssets.map((a) => (
              <MenuItem key={a.id} value={String(a.id)}>
                {a.numero_inventario} {a.modelo ? `— ${a.modelo}` : ""}{" "}
                {a.estado ? <Chip size="small" label={a.estado} sx={{ ml: 1 }} /> : null}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl required>
          <InputLabel>{t("assignments.person")}</InputLabel>
          <Select value={form.persona_id} label={t("assignments.person")} onChange={handleChange("persona_id")}>
            <MenuItem value="">{t("assignments.selectPerson")}</MenuItem>
            {personas.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.nombres} {p.apellidos}
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
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? t("assignments.assigning") : t("assignments.assignAsset")}
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom>
        {t("assignments.activeTitle")}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t("assignments.asset")}</TableCell>
            <TableCell>{t("assignments.person")}</TableCell>
            <TableCell>{t("assignments.date")}</TableCell>
            <TableCell>{t("common.notes")}</TableCell>
            <TableCell align="right">{t("common.actions")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{assetById[a.bien_id]?.numero_inventario ?? `#${a.bien_id}`}</TableCell>
              <TableCell>
                {personaMap[a.persona_id]
                  ? `${personaMap[a.persona_id].nombres} ${personaMap[a.persona_id].apellidos}`
                  : `#${a.persona_id}`}
              </TableCell>
              <TableCell>{new Date(a.fecha).toLocaleString()}</TableCell>
              <TableCell>{a.observaciones ?? "—"}</TableCell>
              <TableCell align="right">
                <Button size="small" color="warning" onClick={() => handleReturn(a.bien_id)}>
                  {t("common.return")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default AssignmentsPage;

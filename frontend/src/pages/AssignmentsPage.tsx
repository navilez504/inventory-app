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

interface Assignment {
  id: number;
  bien_id: number;
  persona_id: number;
  fecha: string;
  observaciones?: string;
}

const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assets, setAssets] = useState<{ id: number; numero_inventario: string; modelo?: string }[]>([]);
  const [personas, setPersonas] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);
  const [form, setForm] = useState({ bien_id: "", persona_id: "", observaciones: "" });
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = () => api.get("/assignments/").then((res) => setAssignments(res.data));

  useEffect(() => {
    loadAssignments();
    api.get("/assets/").then((res) => setAssets(res.data));
    api.get("/org/personas").then((res) => setPersonas(res.data));
  }, []);

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      setForm((prev) => ({ ...prev, [field]: (e.target as HTMLInputElement).value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.bien_id || !form.persona_id) {
      setError("Please select an asset and a person.");
      return;
    }
    try {
      await api.post("/assignments/", {
        bien_id: Number(form.bien_id),
        persona_id: Number(form.persona_id),
        observaciones: form.observaciones || undefined,
      });
      setForm({ bien_id: "", persona_id: "", observaciones: "" });
      loadAssignments();
    } catch (err: any) {
      setError(String(err?.response?.data?.detail ?? "Error creating assignment."));
    }
  };

  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]));
  const personaMap = Object.fromEntries(personas.map((p) => [p.id, p]));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Assignments
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2, mb: 3, maxWidth: 420 }}>
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
        <FormControl required>
          <InputLabel>Person</InputLabel>
          <Select value={form.persona_id} label="Person" onChange={handleChange("persona_id")}>
            <MenuItem value="">Select person</MenuItem>
            {personas.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.nombres} {p.apellidos}
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
          Assign asset
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom>
        Recent assignments
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Asset</TableCell>
            <TableCell>Person</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                {assetMap[a.bien_id]?.numero_inventario ?? `#${a.bien_id}`}
              </TableCell>
              <TableCell>
                {personaMap[a.persona_id]
                  ? `${personaMap[a.persona_id].nombres} ${personaMap[a.persona_id].apellidos}`
                  : `#${a.persona_id}`}
              </TableCell>
              <TableCell>{new Date(a.fecha).toLocaleString()}</TableCell>
              <TableCell>{a.observaciones ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default AssignmentsPage;

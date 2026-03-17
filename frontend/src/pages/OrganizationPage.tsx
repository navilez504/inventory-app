import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../services/api";

interface Gerencia {
  id: number;
  nombre: string;
}

interface Unidad {
  id: number;
  nombre: string;
  gerencia_id: number;
}

interface Persona {
  id: number;
  nombres: string;
  apellidos: string;
  identificacion: string;
  unidad_id: number;
}

const OrganizationPage: React.FC = () => {
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);

  const [newGerencia, setNewGerencia] = useState("");
  const [newUnidad, setNewUnidad] = useState({ nombre: "", gerencia_id: "" });
  const [newPersona, setNewPersona] = useState({
    nombres: "",
    apellidos: "",
    identificacion: "",
    unidad_id: "",
  });

  const loadAll = () => {
    api.get("/org/gerencias").then((res) => setGerencias(res.data));
    api.get("/org/unidades").then((res) => setUnidades(res.data));
    api.get("/org/personas").then((res) => setPersonas(res.data));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateGerencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGerencia.trim()) return;
    await api.post("/org/gerencias", { nombre: newGerencia.trim() });
    setNewGerencia("");
    loadAll();
  };

  const handleCreateUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnidad.nombre.trim() || !newUnidad.gerencia_id.trim()) return;
    await api.post("/org/unidades", {
      nombre: newUnidad.nombre.trim(),
      gerencia_id: Number(newUnidad.gerencia_id),
    });
    setNewUnidad({ nombre: "", gerencia_id: "" });
    loadAll();
  };

  const handleCreatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newPersona.nombres.trim() ||
      !newPersona.apellidos.trim() ||
      !newPersona.identificacion.trim() ||
      !newPersona.unidad_id.trim()
    ) {
      return;
    }
    await api.post("/org/personas", {
      nombres: newPersona.nombres.trim(),
      apellidos: newPersona.apellidos.trim(),
      identificacion: newPersona.identificacion.trim(),
      unidad_id: Number(newPersona.unidad_id),
    });
    setNewPersona({
      nombres: "",
      apellidos: "",
      identificacion: "",
      unidad_id: "",
    });
    loadAll();
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h5">Organization</Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Gerencias</Typography>
          <Box component="form" onSubmit={handleCreateGerencia} sx={{ mt: 1, display: "flex", gap: 1 }}>
            <TextField
              label="New Gerencia"
              size="small"
              value={newGerencia}
              onChange={(e) => setNewGerencia(e.target.value)}
            />
            <Button type="submit" variant="contained">
              Add
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gerencias.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.id}</TableCell>
                  <TableCell>{g.nombre}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Unidades</Typography>
          <Box component="form" onSubmit={handleCreateUnidad} sx={{ mt: 1, display: "grid", gap: 1 }}>
            <TextField
              label="Name"
              size="small"
              value={newUnidad.nombre}
              onChange={(e) =>
                setNewUnidad((prev) => ({ ...prev, nombre: e.target.value }))
              }
            />
            <TextField
              label="Gerencia ID"
              size="small"
              value={newUnidad.gerencia_id}
              onChange={(e) =>
                setNewUnidad((prev) => ({ ...prev, gerencia_id: e.target.value }))
              }
            />
            <Button type="submit" variant="contained">
              Add
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Gerencia ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unidades.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.nombre}</TableCell>
                  <TableCell>{u.gerencia_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Personas</Typography>
          <Box component="form" onSubmit={handleCreatePersona} sx={{ mt: 1, display: "grid", gap: 1 }}>
            <TextField
              label="First Names"
              size="small"
              value={newPersona.nombres}
              onChange={(e) =>
                setNewPersona((prev) => ({ ...prev, nombres: e.target.value }))
              }
            />
            <TextField
              label="Last Names"
              size="small"
              value={newPersona.apellidos}
              onChange={(e) =>
                setNewPersona((prev) => ({ ...prev, apellidos: e.target.value }))
              }
            />
            <TextField
              label="Identification"
              size="small"
              value={newPersona.identificacion}
              onChange={(e) =>
                setNewPersona((prev) => ({
                  ...prev,
                  identificacion: e.target.value,
                }))
              }
            />
            <TextField
              label="Unidad ID"
              size="small"
              value={newPersona.unidad_id}
              onChange={(e) =>
                setNewPersona((prev) => ({ ...prev, unidad_id: e.target.value }))
              }
            />
            <Button type="submit" variant="contained">
              Add
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Identification</TableCell>
                <TableCell>Unidad ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {personas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>
                    {p.nombres} {p.apellidos}
                  </TableCell>
                  <TableCell>{p.identificacion}</TableCell>
                  <TableCell>{p.unidad_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default OrganizationPage;


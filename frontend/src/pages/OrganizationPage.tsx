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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        <Typography variant="h5">{t("organization.title")}</Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{t("organization.gerencias")}</Typography>
          <Box component="form" onSubmit={handleCreateGerencia} sx={{ mt: 1, display: "flex", gap: 1 }}>
            <TextField
              label={t("organization.newGerencia")}
              size="small"
              value={newGerencia}
              onChange={(e) => setNewGerencia(e.target.value)}
            />
            <Button type="submit" variant="contained">
              {t("organization.addGerencia")}
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("organization.colId")}</TableCell>
                <TableCell>{t("organization.colName")}</TableCell>
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
          <Typography variant="h6">{t("organization.unidades")}</Typography>
          <Box component="form" onSubmit={handleCreateUnidad} sx={{ mt: 1, display: "grid", gap: 1 }}>
            <TextField
              label={t("common.name")}
              size="small"
              value={newUnidad.nombre}
              onChange={(e) =>
                setNewUnidad((prev) => ({ ...prev, nombre: e.target.value }))
              }
            />
            <TextField
              label={t("organization.gerenciaId")}
              size="small"
              value={newUnidad.gerencia_id}
              onChange={(e) =>
                setNewUnidad((prev) => ({ ...prev, gerencia_id: e.target.value }))
              }
            />
            <Button type="submit" variant="contained">
              {t("organization.addUnidad")}
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("organization.colId")}</TableCell>
                <TableCell>{t("organization.colName")}</TableCell>
                <TableCell>{t("organization.gerenciaId")}</TableCell>
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
          <Typography variant="h6">{t("organization.personas")}</Typography>
          <Box component="form" onSubmit={handleCreatePersona} sx={{ mt: 1, display: "grid", gap: 1 }}>
            <TextField
              label={t("organization.firstNames")}
              size="small"
              value={newPersona.nombres}
              onChange={(e) =>
                setNewPersona((prev) => ({ ...prev, nombres: e.target.value }))
              }
            />
            <TextField
              label={t("organization.lastNames")}
              size="small"
              value={newPersona.apellidos}
              onChange={(e) =>
                setNewPersona((prev) => ({ ...prev, apellidos: e.target.value }))
              }
            />
            <TextField
              label={t("organization.identification")}
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
              label={t("organization.unidadId")}
              size="small"
              value={newPersona.unidad_id}
              onChange={(e) =>
                setNewPersona((prev) => ({ ...prev, unidad_id: e.target.value }))
              }
            />
            <Button type="submit" variant="contained">
              {t("organization.addPersona")}
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("organization.colId")}</TableCell>
                <TableCell>{t("organization.personName")}</TableCell>
                <TableCell>{t("organization.identification")}</TableCell>
                <TableCell>{t("organization.unidadId")}</TableCell>
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

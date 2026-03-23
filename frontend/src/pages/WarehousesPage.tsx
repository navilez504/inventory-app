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

interface Bodega {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface Ubicacion {
  id: number;
  nombre: string;
  bodega_id: number;
}

const WarehousesPage: React.FC = () => {
  const { t } = useTranslation();
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [newBodega, setNewBodega] = useState({ nombre: "", descripcion: "" });
  const [newUbicacion, setNewUbicacion] = useState({
    nombre: "",
    bodega_id: "",
  });

  const loadData = () => {
    api.get("/warehouses/bodegas").then((res) => setBodegas(res.data));
    api.get("/warehouses/ubicaciones").then((res) => setUbicaciones(res.data));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBodega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBodega.nombre) return;
    await api.post("/warehouses/bodegas", newBodega);
    setNewBodega({ nombre: "", descripcion: "" });
    loadData();
  };

  const handleCreateUbicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUbicacion.nombre || !newUbicacion.bodega_id) return;
    await api.post("/warehouses/ubicaciones", {
      nombre: newUbicacion.nombre,
      bodega_id: Number(newUbicacion.bodega_id),
    });
    setNewUbicacion({ nombre: "", bodega_id: "" });
    loadData();
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h5">{t("warehouses.title")}</Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{t("warehouses.newWarehouse")}</Typography>
          <Box component="form" onSubmit={handleCreateBodega} sx={{ mt: 1, display: "grid", gap: 2 }}>
            <TextField
              label={t("warehouses.warehouseName")}
              value={newBodega.nombre}
              onChange={(e) => setNewBodega((prev) => ({ ...prev, nombre: e.target.value }))}
              required
            />
            <TextField
              label={t("common.description")}
              value={newBodega.descripcion}
              onChange={(e) => setNewBodega((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
            <Button type="submit" variant="contained">
              {t("warehouses.createWarehouse")}
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">{t("warehouses.list")}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("warehouses.id")}</TableCell>
                <TableCell>{t("common.name")}</TableCell>
                <TableCell>{t("common.description")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bodegas.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.id}</TableCell>
                  <TableCell>{b.nombre}</TableCell>
                  <TableCell>{b.descripcion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{t("warehouses.newLocation")}</Typography>
          <Box component="form" onSubmit={handleCreateUbicacion} sx={{ mt: 1, display: "grid", gap: 2 }}>
            <TextField
              label={t("warehouses.locationName")}
              value={newUbicacion.nombre}
              onChange={(e) => setNewUbicacion((prev) => ({ ...prev, nombre: e.target.value }))}
              required
            />
            <TextField
              label={t("warehouses.warehouseId")}
              value={newUbicacion.bodega_id}
              onChange={(e) => setNewUbicacion((prev) => ({ ...prev, bodega_id: e.target.value }))}
              required
            />
            <Button type="submit" variant="contained">
              {t("warehouses.createLocation")}
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">{t("warehouses.locations")}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("warehouses.id")}</TableCell>
                <TableCell>{t("common.name")}</TableCell>
                <TableCell>{t("warehouses.warehouseId")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ubicaciones.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.nombre}</TableCell>
                  <TableCell>{u.bodega_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default WarehousesPage;

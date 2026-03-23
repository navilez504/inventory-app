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

interface Categoria {
  id: number;
  nombre: string;
}

interface Marca {
  id: number;
  nombre: string;
}

interface Proveedor {
  id: number;
  nombre: string;
  contacto?: string;
}

const MasterDataPage: React.FC = () => {
  const { t } = useTranslation();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [newCategoria, setNewCategoria] = useState("");
  const [newMarca, setNewMarca] = useState("");
  const [newProveedor, setNewProveedor] = useState({
    nombre: "",
    contacto: "",
  });

  const loadAll = () => {
    api.get("/master-data/categorias").then((res) => setCategorias(res.data));
    api.get("/master-data/marcas").then((res) => setMarcas(res.data));
    api.get("/master-data/proveedores").then((res) => setProveedores(res.data));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoria.trim()) return;
    await api.post("/master-data/categorias", { nombre: newCategoria.trim() });
    setNewCategoria("");
    loadAll();
  };

  const handleCreateMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarca.trim()) return;
    await api.post("/master-data/marcas", { nombre: newMarca.trim() });
    setNewMarca("");
    loadAll();
  };

  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProveedor.nombre.trim()) return;
    await api.post("/master-data/proveedores", {
      nombre: newProveedor.nombre.trim(),
      contacto: newProveedor.contacto || undefined,
    });
    setNewProveedor({ nombre: "", contacto: "" });
    loadAll();
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h5">{t("masterData.title")}</Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{t("masterData.categories")}</Typography>
          <Box component="form" onSubmit={handleCreateCategoria} sx={{ mt: 1, display: "flex", gap: 1 }}>
            <TextField
              label={t("masterData.newCategory")}
              value={newCategoria}
              onChange={(e) => setNewCategoria(e.target.value)}
              size="small"
            />
            <Button type="submit" variant="contained">
              {t("masterData.add")}
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("masterData.colId")}</TableCell>
                <TableCell>{t("masterData.colName")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell>{c.nombre}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{t("masterData.brands")}</Typography>
          <Box component="form" onSubmit={handleCreateMarca} sx={{ mt: 1, display: "flex", gap: 1 }}>
            <TextField
              label={t("masterData.newBrand")}
              value={newMarca}
              onChange={(e) => setNewMarca(e.target.value)}
              size="small"
            />
            <Button type="submit" variant="contained">
              {t("masterData.add")}
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("masterData.colId")}</TableCell>
                <TableCell>{t("masterData.colName")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {marcas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell>{m.nombre}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{t("masterData.suppliers")}</Typography>
          <Box component="form" onSubmit={handleCreateProveedor} sx={{ mt: 1, display: "grid", gap: 1 }}>
            <TextField
              label={t("common.name")}
              value={newProveedor.nombre}
              onChange={(e) =>
                setNewProveedor((prev) => ({ ...prev, nombre: e.target.value }))
              }
              size="small"
            />
            <TextField
              label={t("masterData.contact")}
              value={newProveedor.contacto}
              onChange={(e) =>
                setNewProveedor((prev) => ({ ...prev, contacto: e.target.value }))
              }
              size="small"
            />
            <Button type="submit" variant="contained">
              {t("masterData.addSupplier")}
            </Button>
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("masterData.colId")}</TableCell>
                <TableCell>{t("masterData.colName")}</TableCell>
                <TableCell>{t("masterData.colContact")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell>{p.contacto}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default MasterDataPage;

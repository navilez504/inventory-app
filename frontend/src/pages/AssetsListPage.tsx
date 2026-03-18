import React, { useEffect, useState } from "react";
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

interface Asset {
  id: number;
  numero_inventario: string;
  categoria_id: number;
  marca_id: number;
  modelo?: string;
  serie?: string;
  estado?: string;
}

const ASSIGNED_STATUSES = new Set(["ASSIGNED", "ASIGNADO"]);

const AssetsListPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categorias, setCategorias] = useState<Record<number, string>>({});
  const [marcas, setMarcas] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const loadAssets = () => api.get("/assets/").then((res) => setAssets(res.data));

  useEffect(() => {
    api.get("/master-data/categorias").then((res) => {
      const map: Record<number, string> = {};
      res.data.forEach((c: { id: number; nombre: string }) => (map[c.id] = c.nombre));
      setCategorias(map);
    });
    api.get("/master-data/marcas").then((res) => {
      const map: Record<number, string> = {};
      res.data.forEach((m: { id: number; nombre: string }) => (map[m.id] = m.nombre));
      setMarcas(map);
    });
  }, []);

  useEffect(() => {
    loadAssets();
  }, [location.key]);

  const handleReturn = async (e: React.MouseEvent, assetId: number) => {
    e.stopPropagation();
    setMsg(null);
    try {
      await api.post(`/assignments/return/${assetId}`);
      setMsg("Asset returned from assignment.");
      await loadAssets();
    } catch (err: any) {
      setMsg(String(err?.response?.data?.detail ?? "Return failed."));
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Assets
      </Typography>
      {msg && (
        <Typography variant="body2" color={msg.includes("failed") ? "error" : "success.main"} sx={{ mb: 1 }}>
          {msg}
        </Typography>
      )}
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate("/assets/new")}
        sx={{ mb: 2 }}
      >
        New asset
      </Button>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Inventory #</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Brand</TableCell>
            <TableCell>Model</TableCell>
            <TableCell>Serial</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assets.map((a) => (
            <TableRow
              key={a.id}
              hover
              onClick={() => navigate(`/assets/${a.id}`)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell>{a.numero_inventario}</TableCell>
              <TableCell>{categorias[a.categoria_id] ?? a.categoria_id}</TableCell>
              <TableCell>{marcas[a.marca_id] ?? a.marca_id}</TableCell>
              <TableCell>{a.modelo ?? "—"}</TableCell>
              <TableCell>{a.serie ?? "—"}</TableCell>
              <TableCell>{a.estado ?? "—"}</TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                {a.estado && ASSIGNED_STATUSES.has(String(a.estado).toUpperCase()) ? (
                  <Button size="small" color="warning" variant="outlined" onClick={(e) => handleReturn(e, a.id)}>
                    Return
                  </Button>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default AssetsListPage;

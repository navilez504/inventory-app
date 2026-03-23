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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categorias, setCategorias] = useState<Record<number, string>>({});
  const [marcas, setMarcas] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
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
    setMsgIsError(false);
    try {
      await api.post(`/assignments/return/${assetId}`);
      setMsg(t("assets.returned"));
      await loadAssets();
    } catch (err: any) {
      setMsg(String(err?.response?.data?.detail ?? t("assets.returnFailed")));
      setMsgIsError(true);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t("assets.title")}
      </Typography>
      {msg && (
        <Typography variant="body2" color={msgIsError ? "error" : "success.main"} sx={{ mb: 1 }}>
          {msg}
        </Typography>
      )}
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate("/assets/new")}
        sx={{ mb: 2 }}
      >
        {t("assets.newAsset")}
      </Button>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t("assets.inventoryNumber")}</TableCell>
            <TableCell>{t("assets.category")}</TableCell>
            <TableCell>{t("assets.brand")}</TableCell>
            <TableCell>{t("assets.model")}</TableCell>
            <TableCell>{t("assets.serial")}</TableCell>
            <TableCell>{t("assets.status")}</TableCell>
            <TableCell align="right">{t("common.actions")}</TableCell>
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
                    {t("common.return")}
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

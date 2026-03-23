import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import InventoryAnalytics from "../components/erp/InventoryAnalytics";
import type { DashboardKPIs } from "../types/dashboard";

interface InventoryByWarehouse {
  bodega_id: number;
  bodega_nombre: string;
  total_cantidad: number;
}

interface InventoryByPerson {
  persona_id: number;
  nombres: string;
  apellidos: string;
  bienes_asignados: number;
}

interface MovementRow {
  movimiento_id: number;
  tipo: string;
  fecha: string;
  observaciones?: string;
  cantidad: number;
}

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const [byWarehouse, setByWarehouse] = useState<InventoryByWarehouse[]>([]);
  const [byPerson, setByPerson] = useState<InventoryByPerson[]>([]);
  const [assetId, setAssetId] = useState("");
  const [movementHistory, setMovementHistory] = useState<MovementRow[]>([]);

  useEffect(() => {
    api.get("/reports/inventory-by-warehouse").then((res) => setByWarehouse(res.data));
    api.get("/reports/inventory-by-person").then((res) => setByPerson(res.data));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setKpiLoading(true);
    setKpiError(null);
    api
      .get<DashboardKPIs>("/reports/dashboard-kpis")
      .then((res) => {
        if (!cancelled) setKpis(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setKpiError(String(err?.response?.data?.detail ?? err?.message ?? t("reports.kpiError")));
          setKpis(null);
        }
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const loadMovementHistory = async () => {
    if (!assetId.trim()) return;
    const res = await api.get(`/reports/asset-movements/${assetId}`);
    setMovementHistory(res.data);
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Typography variant="h5" fontWeight={700}>
        {t("reports.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("reports.subtitle")}
      </Typography>

      {kpiError && <Alert severity="warning">{kpiError}</Alert>}

      <InventoryAnalytics data={kpis} loading={kpiLoading} title={t("reports.execTitle")} dense />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t("reports.byWarehouse")}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("reports.warehouse")}</TableCell>
              <TableCell align="right">{t("reports.totalQty")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byWarehouse.map((row) => (
              <TableRow key={row.bodega_id}>
                <TableCell>{row.bodega_nombre}</TableCell>
                <TableCell align="right">{row.total_cantidad}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t("reports.byPerson")}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {t("reports.byPersonHint")}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("reports.person")}</TableCell>
              <TableCell align="right">{t("reports.assignedAssets")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byPerson.map((row) => (
              <TableRow key={row.persona_id}>
                <TableCell>
                  {row.nombres} {row.apellidos}
                </TableCell>
                <TableCell align="right">{row.bienes_asignados}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t("reports.movHistory")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            label={t("reports.assetId")}
            size="small"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            onBlur={loadMovementHistory}
          />
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("reports.movId")}</TableCell>
              <TableCell>{t("reports.type")}</TableCell>
              <TableCell>{t("reports.date")}</TableCell>
              <TableCell>{t("reports.quantity")}</TableCell>
              <TableCell>{t("common.notes")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movementHistory.map((m) => (
              <TableRow key={m.movimiento_id}>
                <TableCell>{m.movimiento_id}</TableCell>
                <TableCell>{m.tipo}</TableCell>
                <TableCell>{new Date(m.fecha).toLocaleString()}</TableCell>
                <TableCell>{m.cantidad}</TableCell>
                <TableCell>{m.observaciones}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ReportsPage;

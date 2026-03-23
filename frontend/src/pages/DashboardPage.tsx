import React, { useEffect, useState } from "react";
import { Alert, Box, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import InventoryAnalytics from "../components/erp/InventoryAnalytics";
import type { DashboardKPIs } from "../types/dashboard";

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<DashboardKPIs>("/reports/dashboard-kpis")
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err?.response?.data?.detail ?? err?.message ?? t("dashboard.loadError")));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, background: "linear-gradient(135deg, #1976d208 0%, #fff 50%)" }} elevation={0}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t("dashboard.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("dashboard.subtitle")}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <InventoryAnalytics data={data} loading={loading} title={t("dashboard.kpiTitle")} />
    </Box>
  );
};

export default DashboardPage;

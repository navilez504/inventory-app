import React from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  Skeleton,
} from "@mui/material";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { useTranslation } from "react-i18next";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PeopleIcon from "@mui/icons-material/People";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HistoryIcon from "@mui/icons-material/History";
import type { DashboardKPIs } from "../../types/dashboard";

const PALETTE = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#9c27b0",
  "#d32f2f",
  "#0288d1",
  "#5d4037",
  "#455a64",
];

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Paper
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        borderLeft: 4,
        borderColor: "primary.main",
      }}
      elevation={2}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography color="text.secondary" variant="body2" fontWeight={600}>
          {title}
        </Typography>
        {icon && <Box sx={{ color: "primary.main", opacity: 0.85 }}>{icon}</Box>}
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={48} />
      ) : (
        <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      )}
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

export default function InventoryAnalytics({
  data,
  loading,
  title,
  dense = false,
}: {
  data: DashboardKPIs | null;
  loading: boolean;
  title?: string;
  dense?: boolean;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const displayTitle = title ?? t("analytics.overview");

  const formatUsd = React.useCallback(
    (n: number) =>
      n.toLocaleString(i18n.language.startsWith("es") ? "es-ES" : "en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [i18n.language]
  );

  const statusLabel = React.useCallback(
    (code: string) => t(`assetStatus.${code}`, { defaultValue: code }),
    [t]
  );

  const statusData = React.useMemo(() => {
    if (!data?.assets_by_status) return [];
    return Object.entries(data.assets_by_status).map(([name, value]) => ({
      name: statusLabel(name),
      raw: name,
      value,
    }));
  }, [data, statusLabel]);

  const movTypeData = React.useMemo(() => {
    if (!data?.movements_by_type) return [];
    return Object.entries(data.movements_by_type).map(([name, value]) => ({ name, value }));
  }, [data]);

  const empty = !loading && !data;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: dense ? 1 : 2 }}>
        {displayTitle}
      </Typography>

      <Grid container spacing={dense ? 1.5 : 2} sx={{ mb: dense ? 2 : 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.totalAssets")}
            value={data?.total_assets ?? "—"}
            subtitle={t("analytics.totalAssetsHint")}
            icon={<Inventory2Icon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.bookValue")}
            value={data != null ? formatUsd(data.total_book_value_usd) : "—"}
            subtitle={t("analytics.bookValueHint")}
            icon={<AttachMoneyIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.stockUnits")}
            value={data?.total_stock_units ?? "—"}
            subtitle={t("analytics.stockUnitsHint")}
            icon={<TrendingUpIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.activeAssignments")}
            value={data?.active_assignments ?? "—"}
            subtitle={t("analytics.activeAssignmentsHint")}
            icon={<AssignmentIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.warehouses")}
            value={data?.warehouses_count ?? "—"}
            icon={<WarehouseIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.people")}
            value={data?.personas_count ?? "—"}
            icon={<PeopleIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.movements30")}
            value={data?.movements_last_30_days ?? "—"}
            subtitle={t("analytics.movements30Hint")}
            icon={<SwapHorizIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("analytics.movementsAll")}
            value={data?.movements_total ?? "—"}
            icon={<HistoryIcon />}
            loading={loading}
          />
        </Grid>
      </Grid>

      {empty && <Typography color="text.secondary">{t("analytics.noKpi")}</Typography>}

      {!empty && (
        <Grid container spacing={dense ? 1.5 : 2}>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 2, height: 360 }} elevation={2}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {t("analytics.chartStatus")}
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : statusData.length === 0 ? (
                <Typography color="text.secondary">{t("analytics.noData")}</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 2, height: 360 }} elevation={2}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {t("analytics.chartWarehouse")}
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : !data?.stock_by_warehouse?.length ? (
                <Typography color="text.secondary">{t("analytics.noStock")}</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.stock_by_warehouse} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name={t("analytics.units")}
                      fill={theme.palette.primary.main}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: 360 }} elevation={2}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {t("analytics.chartTimeline")}
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : !data?.movements_by_month?.length ? (
                <Typography color="text.secondary">{t("analytics.noMovements")}</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.movements_by_month}>
                    <defs>
                      <linearGradient id="colorMov" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={t("analytics.movements")}
                      stroke={theme.palette.primary.main}
                      fillOpacity={1}
                      fill="url(#colorMov)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 360 }} elevation={2}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {t("analytics.chartMovType")}
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : movTypeData.length === 0 ? (
                <Typography color="text.secondary">{t("analytics.noData")}</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name={t("analytics.count")}
                      fill={theme.palette.secondary.main}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 360 }} elevation={2}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {t("analytics.chartCategories")}
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : !data?.top_categories?.length ? (
                <Typography color="text.secondary">{t("analytics.noCategories")}</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top_categories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name={t("analytics.assets")}
                      fill={theme.palette.success.main}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

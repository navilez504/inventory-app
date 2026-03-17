import React, { useEffect, useState } from "react";
import { Grid, Paper, Typography } from "@mui/material";
import api from "../services/api";

const DashboardPage: React.FC = () => {
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [warehouseCount, setWarehouseCount] = useState<number | null>(null);
  const [movementCount, setMovementCount] = useState<number | null>(null);

  useEffect(() => {
    api.get("/assets/").then((res) => setAssetCount(res.data.length));
    api.get("/warehouses/bodegas").then((res) => setWarehouseCount(res.data.length));
    api.get("/movements/").then((res) => setMovementCount(res.data.length));
  }, []);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Assets</Typography>
          <Typography variant="h3">
            {assetCount !== null ? assetCount : "…"}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Warehouses</Typography>
          <Typography variant="h3">
            {warehouseCount !== null ? warehouseCount : "…"}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Movements (Total)</Typography>
          <Typography variant="h3">
            {movementCount !== null ? movementCount : "…"}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default DashboardPage;


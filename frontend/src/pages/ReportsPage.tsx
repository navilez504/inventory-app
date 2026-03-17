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
} from "@mui/material";
import api from "../services/api";

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
  const [byWarehouse, setByWarehouse] = useState<InventoryByWarehouse[]>([]);
  const [byPerson, setByPerson] = useState<InventoryByPerson[]>([]);
  const [assetId, setAssetId] = useState("");
  const [movementHistory, setMovementHistory] = useState<MovementRow[]>([]);

  useEffect(() => {
    api.get("/reports/inventory-by-warehouse").then((res) => setByWarehouse(res.data));
    api.get("/reports/inventory-by-person").then((res) => setByPerson(res.data));
  }, []);

  const loadMovementHistory = async () => {
    if (!assetId.trim()) return;
    const res = await api.get(`/reports/asset-movements/${assetId}`);
    setMovementHistory(res.data);
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Typography variant="h5">Reports</Typography>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Inventory by Warehouse
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Warehouse</TableCell>
              <TableCell align="right">Total Quantity</TableCell>
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
          Inventory by Person
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Person</TableCell>
              <TableCell align="right">Assigned Assets</TableCell>
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
          Asset Movement History
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            label="Asset ID"
            size="small"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            onBlur={loadMovementHistory}
          />
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Notes</TableCell>
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


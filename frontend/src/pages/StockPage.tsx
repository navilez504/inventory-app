import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import api from "../services/api";

interface StockRow {
  id: number;
  bien_id: number;
  ubicacion_id: number;
  cantidad: number;
  bien_numero_inventario: string;
  bien_modelo?: string;
  ubicacion_nombre: string;
  bodega_nombre: string;
}

const StockPage: React.FC = () => {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; nombre: string }[]>([]);
  const [filterBodegaId, setFilterBodegaId] = useState<string>("");

  useEffect(() => {
    api.get("/stock/").then((res) => setStock(res.data));
    api.get("/warehouses/bodegas").then((res) => setWarehouses(res.data));
  }, []);

  const selectedBodegaName = filterBodegaId
    ? warehouses.find((w) => String(w.id) === filterBodegaId)?.nombre
    : null;
  const filteredStock = selectedBodegaName
    ? stock.filter((s) => s.bodega_nombre === selectedBodegaName)
    : stock;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Stock management
      </Typography>
      <FormControl sx={{ minWidth: 260, mb: 2 }}>
        <InputLabel>Filter by warehouse</InputLabel>
        <Select
          value={filterBodegaId}
          label="Filter by warehouse"
          onChange={(e) => setFilterBodegaId(e.target.value as string)}
        >
          <MenuItem value="">All warehouses</MenuItem>
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={String(w.id)}>
              {w.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Warehouse</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Asset</TableCell>
            <TableCell>Model</TableCell>
            <TableCell align="right">Quantity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStock.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                No stock records. Create a movement (e.g. Entry) to add stock to a warehouse.
              </TableCell>
            </TableRow>
          ) : (
            filteredStock.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.bodega_nombre}</TableCell>
                <TableCell>{s.ubicacion_nombre}</TableCell>
                <TableCell>{s.bien_numero_inventario}</TableCell>
                <TableCell>{s.bien_modelo ?? "—"}</TableCell>
                <TableCell align="right">{s.cantidad}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default StockPage;

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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        {t("stock.title")}
      </Typography>
      <FormControl sx={{ minWidth: 260, mb: 2 }}>
        <InputLabel>{t("stock.filterWarehouse")}</InputLabel>
        <Select
          value={filterBodegaId}
          label={t("stock.filterWarehouse")}
          onChange={(e) => setFilterBodegaId(e.target.value as string)}
        >
          <MenuItem value="">{t("stock.allWarehouses")}</MenuItem>
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
            <TableCell>{t("stock.colWarehouse")}</TableCell>
            <TableCell>{t("stock.colLocation")}</TableCell>
            <TableCell>{t("stock.colAsset")}</TableCell>
            <TableCell>{t("stock.colModel")}</TableCell>
            <TableCell align="right">{t("stock.colQty")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStock.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                {t("stock.emptyHint")}
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

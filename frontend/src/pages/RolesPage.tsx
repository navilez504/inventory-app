import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
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

interface Permission {
  id: number;
  code: string;
  description?: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
}

const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    permission_ids: [] as number[],
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get<Role[]>("/roles/"),
        api.get<Permission[]>("/roles/permissions"),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("roles.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "", permission_ids: [] });
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description || "",
      permission_ids: role.permissions.map((p) => p.id),
    });
    setDialogOpen(true);
  };

  const handleFormChange = (field: "name" | "description") => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePermissionsChange = (event: any) => {
    const value = event.target.value as (number | string)[];
    setForm((prev) => ({
      ...prev,
      permission_ids: value.map((v) => Number(v)),
    }));
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError(t("roles.nameRequired"));
      return;
    }
    try {
      if (editingId !== null) {
        await api.put(`/roles/${editingId}`, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permission_ids: form.permission_ids,
        });
      } else {
        await api.post("/roles/", {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permission_ids: form.permission_ids,
        });
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("roles.saveError"));
    }
  };

  const handleDelete = async (roleId: number) => {
    setError(null);
    try {
      await api.delete(`/roles/${roleId}`);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("roles.deleteError"));
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">{t("roles.title")}</Typography>
        <Button variant="contained" onClick={openCreate} disabled={loading}>
          {t("roles.addRole")}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("roles.subtitle")}
      </Typography>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t("roles.colName")}</TableCell>
            <TableCell>{t("roles.colDesc")}</TableCell>
            <TableCell>{t("roles.colPerm")}</TableCell>
            <TableCell align="right">{t("common.actions")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.description || "—"}</TableCell>
              <TableCell>
                {r.permissions.length === 0
                  ? "—"
                  : r.permissions.map((p) => p.code).join(", ")}
              </TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => openEdit(r)}>
                  {t("roles.edit")}
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => setDeleteConfirmId(r.id)}
                >
                  {t("roles.delete")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId !== null ? t("roles.editRole") : t("roles.newRole")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("roles.name")}
            fullWidth
            value={form.name}
            onChange={handleFormChange("name")}
          />
          <TextField
            margin="dense"
            label={t("roles.desc")}
            fullWidth
            multiline
            value={form.description}
            onChange={handleFormChange("description")}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>{t("roles.permissions")}</InputLabel>
            <Select
              multiple
              value={form.permission_ids.map(String)}
              onChange={handlePermissionsChange}
              input={<OutlinedInput label={t("roles.permissions")} />}
              renderValue={(selected) =>
                (selected as string[])
                  .map((id) => permissions.find((p) => p.id === Number(id))?.code || id)
                  .join(", ")
              }
            >
              {permissions.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  <Checkbox checked={form.permission_ids.includes(p.id)} />
                  <ListItemText
                    primary={p.code}
                    secondary={p.description || undefined}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} variant="contained">
            {editingId !== null ? t("roles.update") : t("roles.create")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>{t("roles.confirmDelete")}</DialogTitle>
        <DialogContent>{t("roles.deleteBody")}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)}
          >
            {t("roles.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolesPage;

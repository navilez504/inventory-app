import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
import api from "../services/api";

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: Role[];
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role_ids: [] as number[],
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get<User[]>("/users/"),
        api.get<Role[]>("/roles/"),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormChange =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleRolesChange = (event: any) => {
    const value = event.target.value as number[] | string[];
    setForm((prev) => ({
      ...prev,
      role_ids: (value as (number | string)[]).map((v) => Number(v)),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.username || !form.full_name || !form.email || !form.password) {
      setError("All fields are required");
      return;
    }
    try {
      await api.post("/users/", {
        username: form.username,
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        is_superuser: false,
        role_ids: form.role_ids,
      });
      setForm({
        username: "",
        full_name: "",
        email: "",
        password: "",
        role_ids: [],
      });
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create user");
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Users
      </Typography>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Box
        component="form"
        onSubmit={handleCreate}
        sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 4 }}
      >
        <TextField
          label="Username"
          value={form.username}
          onChange={handleFormChange("username")}
          size="small"
        />
        <TextField
          label="Full name"
          value={form.full_name}
          onChange={handleFormChange("full_name")}
          size="small"
        />
        <TextField
          label="Email"
          value={form.email}
          onChange={handleFormChange("email")}
          size="small"
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={handleFormChange("password")}
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Roles</InputLabel>
          <Select
            multiple
            value={form.role_ids.map(String)}
            onChange={handleRolesChange}
            input={<OutlinedInput label="Roles" />}
            renderValue={(selected) =>
              (selected as string[])
                .map((id) => roles.find((r) => r.id === Number(id))?.name || id)
                .join(", ")
            }
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={String(role.id)}>
                <Checkbox checked={form.role_ids.includes(role.id)} />
                <ListItemText primary={role.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ alignSelf: "center" }}>
          <Button type="submit" variant="contained" disabled={loading}>
            Create user
          </Button>
        </Box>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Full name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Superuser</TableCell>
            <TableCell>Roles</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.full_name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.is_active ? "Yes" : "No"}</TableCell>
              <TableCell>{u.is_superuser ? "Yes" : "No"}</TableCell>
              <TableCell>{u.roles.map((r) => r.name).join(", ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default UsersPage;


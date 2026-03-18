import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../services/api";

interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  table_name: string;
  action: string;
  summary: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  timestamp: string;
  ip_address: string | null;
}

/** Map API row (new enriched API or legacy shape) to AuditLog */
function normalizeAuditRow(raw: Record<string, unknown>): AuditLog {
  const od = (raw.old_data as Record<string, unknown>) ?? null;
  const nd = (raw.new_data as Record<string, unknown>) ?? null;
  const table = String(raw.table_name ?? "");
  const action = String(raw.action ?? "");
  let summary = String(raw.summary ?? "");
  if (!summary) {
    if (table === "asignaciones" && action === "ASSIGN" && nd?.bien_id != null) {
      summary = `Assigned asset #${nd.bien_id} to person #${nd.persona_id ?? "?"}`;
    } else if (table === "movimientos" && action === "CREATE" && nd?.tipo != null) {
      summary = `Movement #${nd.id ?? "?"} — ${nd.tipo}`;
    } else if (nd && Object.keys(nd).length) {
      summary = JSON.stringify(nd).slice(0, 140) + (JSON.stringify(nd).length > 140 ? "…" : "");
    } else {
      summary = `${action} on ${table}`;
    }
  }
  const uid = Number(raw.user_id);
  const un = String(raw.username ?? "");
  const fn = String(raw.full_name ?? "");
  return {
    id: Number(raw.id),
    user_id: uid,
    username: un || `#${uid}`,
    full_name: fn,
    table_name: table,
    action,
    summary,
    old_data: od,
    new_data: nd,
    timestamp: String(raw.timestamp),
    ip_address: raw.ip_address != null ? String(raw.ip_address) : null,
  };
}

const actionColor = (action: string): "default" | "primary" | "secondary" | "success" | "warning" | "error" => {
  const a = action.toUpperCase();
  if (a === "CREATE" || a === "ASSIGN") return "success";
  if (a === "UPDATE") return "primary";
  if (a === "DELETE") return "error";
  if (a === "RETURN" || a === "RETURN_SYNC") return "warning";
  return "default";
};

const jsonBlock = (data: Record<string, unknown> | null | undefined) => {
  if (data == null || (typeof data === "object" && Object.keys(data).length === 0)) {
    return <Typography color="text.secondary">(empty)</Typography>;
  }
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        bgcolor: "grey.100",
        borderRadius: 1,
        fontSize: "0.75rem",
        overflow: "auto",
        maxHeight: 360,
        fontFamily: "ui-monospace, monospace",
      }}
    >
      {JSON.stringify(data, null, 2)}
    </Box>
  );
};

const PAGE = 200;

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [filterTable, setFilterTable] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [hasMore, setHasMore] = useState(false);

  const buildParams = useCallback(
    (offset: number) => {
      const params: Record<string, string | number> = { limit: PAGE, offset };
      if (filterTable) params.table_name = filterTable;
      if (filterAction) params.action = filterAction;
      if (filterUserId.trim() && !Number.isNaN(Number(filterUserId))) {
        params.user_id = Number(filterUserId);
      }
      return params;
    },
    [filterTable, filterAction, filterUserId]
  );

  const fetchLogs = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const offset = reset ? 0 : logs.length;
        const res = await api.get<Record<string, unknown>[]>("/audit/", { params: buildParams(offset) });
        const batch = res.data.map((r) => normalizeAuditRow(r));
        if (reset) {
          setLogs(batch);
        } else {
          setLogs((prev) => [...prev, ...batch]);
        }
        setHasMore(batch.length >= PAGE);
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: { detail?: string } } };
        if (err.response?.status === 403) {
          setError("You don’t have permission to view audit logs (audit:view).");
        } else {
          setError(String(err.response?.data?.detail ?? "Failed to load audit logs."));
        }
        if (reset) setLogs([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildParams, logs.length]
  );

  useEffect(() => {
    void fetchLogs(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  useEffect(() => {
    api
      .get<{ tables: string[]; actions: string[] }>("/audit/meta/filters")
      .then((r) => {
        setTables(r.data.tables ?? []);
        setActions(r.data.actions ?? []);
      })
      .catch(() => {});
  }, []);

  const applyFilters = () => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<Record<string, unknown>[]>("/audit/", { params: buildParams(0) });
        const batch = res.data.map((r) => normalizeAuditRow(r));
        setLogs(batch);
        setHasMore(batch.length >= PAGE);
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: { detail?: string } } };
        if (err.response?.status === 403) {
          setError("You don’t have permission to view audit logs (audit:view).");
        } else {
          setError(String(err.response?.data?.detail ?? "Failed to load."));
        }
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    void fetchLogs(false);
  };

  const filteredBySearch = searchText.trim()
    ? logs.filter(
        (l) =>
          l.summary.toLowerCase().includes(searchText.toLowerCase()) ||
          l.table_name.toLowerCase().includes(searchText.toLowerCase()) ||
          l.action.toLowerCase().includes(searchText.toLowerCase()) ||
          l.username.toLowerCase().includes(searchText.toLowerCase()) ||
          l.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
          String(l.user_id).includes(searchText)
      )
    : logs;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Audit logs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Who changed what, when, and from which IP. Open <strong>View</strong> for full before/after payloads (JSON).
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Table</InputLabel>
          <Select
            value={filterTable}
            label="Table"
            onChange={(e) => setFilterTable(e.target.value)}
          >
            <MenuItem value="">All tables</MenuItem>
            {tables.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Action</InputLabel>
          <Select
            value={filterAction}
            label="Action"
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <MenuItem value="">All actions</MenuItem>
            {actions.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="User ID"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          sx={{ width: 100 }}
        />
        <Button variant="contained" onClick={applyFilters} disabled={loading}>
          Apply filters
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setFilterTable("");
            setFilterAction("");
            setFilterUserId("");
            setTimeout(() => {
              void (async () => {
                setLoading(true);
                setError(null);
                try {
                  const res = await api.get<Record<string, unknown>[]>("/audit/", {
                    params: { limit: PAGE, offset: 0 },
                  });
                  const batch = res.data.map((r) => normalizeAuditRow(r));
                  setLogs(batch);
                  setHasMore(batch.length >= PAGE);
                } catch (e: unknown) {
                  const err = e as { response?: { data?: { detail?: string } } };
                  setError(String(err.response?.data?.detail ?? "Failed."));
                  setLogs([]);
                } finally {
                  setLoading(false);
                }
              })();
            }, 0);
          }}
          disabled={loading}
        >
          Reset
        </Button>
        <TextField
          size="small"
          label="Search in loaded rows"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ minWidth: 220, flex: 1 }}
        />
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ whiteSpace: "nowrap" }}>When (local)</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Table</TableCell>
            <TableCell>Action</TableCell>
            <TableCell sx={{ minWidth: 280 }}>Summary</TableCell>
            <TableCell>IP</TableCell>
            <TableCell align="right">Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredBySearch.map((log) => (
            <TableRow key={log.id} hover>
              <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                {new Date(log.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {log.full_name || log.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{log.username} · id {log.user_id}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip size="small" label={log.table_name} variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip size="small" label={log.action} color={actionColor(log.action)} />
              </TableCell>
              <TableCell>
                <Typography variant="body2">{log.summary}</Typography>
              </TableCell>
              <TableCell sx={{ fontSize: "0.8rem", fontFamily: "monospace" }}>
                {log.ip_address ?? "—"}
              </TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => setDetail(log)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!loading && filteredBySearch.length === 0 && !error && (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          No audit entries match your filters.
        </Typography>
      )}

      {hasMore && logs.length > 0 && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </Box>
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              Audit #{detail.id} — {detail.action} on {detail.table_name}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    When
                  </Typography>
                  <Typography>{new Date(detail.timestamp).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Actor
                  </Typography>
                  <Typography>
                    {detail.full_name} (@{detail.username}) · user id {detail.user_id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Client IP
                  </Typography>
                  <Typography fontFamily="monospace">{detail.ip_address ?? "—"}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Summary
                  </Typography>
                  <Typography>{detail.summary}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Before (old_data)
                  </Typography>
                  {jsonBlock(detail.old_data)}
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    After (new_data)
                  </Typography>
                  {jsonBlock(detail.new_data)}
                </Box>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default AuditLogsPage;

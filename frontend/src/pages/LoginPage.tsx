import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../services/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setInfo(null);
      const { replacedPreviousSession } = await login(username, password);
      if (replacedPreviousSession) {
        setInfo(t("login.sessionReplaced"));
      }
      navigate("/");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(t("login.invalidCredentials"));
      }
    }
  };

  return (
    <Container maxWidth="xs">
      <Box mt={4} display="flex" justifyContent="flex-end" mb={1}>
        <LanguageSwitcher />
      </Box>
      <Box mt={2}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" mb={2}>
            {t("login.title")}
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              label={t("login.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              fullWidth
              margin="normal"
              label={t("login.password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {info && (
              <Typography color="primary" variant="body2">
                {info}
              </Typography>
            )}
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              {t("login.submit")}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;

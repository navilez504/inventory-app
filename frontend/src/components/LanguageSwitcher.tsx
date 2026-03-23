import React from "react";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "../i18n";
import { SUPPORTED_LANGUAGES } from "../i18n";

const LABELS: Record<AppLanguage, string> = {
  en: "English",
  es: "Español",
};

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();

  const handle = (e: SelectChangeEvent<string>) => {
    void i18n.changeLanguage(e.target.value);
  };

  const lang = (SUPPORTED_LANGUAGES.includes(i18n.language as AppLanguage)
    ? i18n.language
    : "en") as AppLanguage;

  if (compact) {
    return (
      <FormControl size="small" variant="standard" sx={{ minWidth: 100, ml: 1 }}>
        <Select value={lang} onChange={handle} variant="standard" sx={{ color: "inherit", "&:before": { borderColor: "rgba(255,255,255,0.5)" } }}>
          {SUPPORTED_LANGUAGES.map((code) => (
            <MenuItem key={code} value={code}>
              {LABELS[code]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 130 }}>
      <InputLabel id="lang-label">{t("layout.language")}</InputLabel>
      <Select
        labelId="lang-label"
        label={t("layout.language")}
        value={lang}
        onChange={handle}
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <MenuItem key={code} value={code}>
            {LABELS[code]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

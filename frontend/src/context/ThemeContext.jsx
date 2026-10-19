import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_LAN_MODE === "1"
  ? `${window.location.protocol}//${window.location.hostname}:8001`
  : process.env.REACT_APP_BACKEND_URL;
const API = `${BASE}/api`;
const CACHE_KEY = "dlotus_theme_v1";

const DEFAULTS = {
  general: {
    app_name: "D'Lotus Lounge Bar", login_title: "D'LOTUS", menu_title: "D'LOTUS",
    subtitle: "Sistema de Ponto de Venda", logo_main: "", logo_login: "", favicon: "",
  },
  login: { bg_image: "", bg_mode: "cover", bg_opacity: 20, bg_position: "center" },
  colors: {
    primary: "#D4AF37", secondary: "#A855F7", accent: "#F3E5AB",
    button_bg: "#D4AF37", button_hover: "#C5A059",
    menu_bg: "#121215", header_bg: "#0A0A0C", body_bg: "#0A0A0C", card_bg: "#121215",
    text_primary: "#F4F4F6", text_secondary: "#A1A1AA",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6",
  },
  sirens: { bar: { tone: 1, volume: 85, mode: "repeat" }, rosh: { tone: 1, volume: 85, mode: "repeat" } },
  theme_preset: "dlotus_dark",
  mode: "dark",
  menu: { text_color: "#A1A1AA", icon_color: "#D4AF37", selected_bg: "rgba(212,175,55,0.1)", hover_bg: "rgba(255,255,255,0.05)", show_name: true, fixed: true, logo_size: 180 },
  buttons: { radius: 8, size: "md", style: "solid" },
  cards: { radius: 16, transparency: 100, border: true, border_color: "rgba(255,255,255,0.05)", shadow: "md" },
};

export const THEME_PRESETS = {
  dlotus_dark: { name: "D'Lotus Dark", colors: { primary: "#D4AF37", secondary: "#A855F7", accent: "#F3E5AB", button_bg: "#D4AF37", button_hover: "#C5A059", menu_bg: "#121215", header_bg: "#0A0A0C", body_bg: "#0A0A0C", card_bg: "#121215", text_primary: "#F4F4F6", text_secondary: "#A1A1AA", success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6" } },
  neon_blue:    { name: "Azul Neon",   colors: { primary: "#38BDF8", secondary: "#0EA5E9", accent: "#7DD3FC", button_bg: "#38BDF8", button_hover: "#0EA5E9", menu_bg: "#0C1322", header_bg: "#060A14", body_bg: "#060A14", card_bg: "#0C1322", text_primary: "#F0F9FF", text_secondary: "#94A3B8", success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6" } },
  neon_purple:  { name: "Roxo Neon",   colors: { primary: "#C084FC", secondary: "#A855F7", accent: "#E9D5FF", button_bg: "#C084FC", button_hover: "#A855F7", menu_bg: "#140C22", header_bg: "#0A0614", body_bg: "#0A0614", card_bg: "#140C22", text_primary: "#FAF5FF", text_secondary: "#A3A3A3", success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#A855F7" } },
  red:          { name: "Vermelho",    colors: { primary: "#EF4444", secondary: "#DC2626", accent: "#FCA5A5", button_bg: "#EF4444", button_hover: "#DC2626", menu_bg: "#1A0A0A", header_bg: "#0C0505", body_bg: "#0C0505", card_bg: "#1A0A0A", text_primary: "#FEE2E2", text_secondary: "#A1A1AA", success: "#10B981", warning: "#F59E0B", error: "#F87171", info: "#3B82F6" } },
  green:        { name: "Verde",       colors: { primary: "#10B981", secondary: "#059669", accent: "#6EE7B7", button_bg: "#10B981", button_hover: "#059669", menu_bg: "#0A1A14", header_bg: "#050C08", body_bg: "#050C08", card_bg: "#0A1A14", text_primary: "#ECFDF5", text_secondary: "#A1A1AA", success: "#34D399", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6" } },
  gold:         { name: "Preto e Dourado", colors: { primary: "#D4AF37", secondary: "#F3E5AB", accent: "#F3E5AB", button_bg: "#D4AF37", button_hover: "#997A15", menu_bg: "#0A0A0A", header_bg: "#000000", body_bg: "#000000", card_bg: "#0F0F0F", text_primary: "#FEF9C3", text_secondary: "#A3A3A3", success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6" } },
  blue_black:   { name: "Azul e Preto", colors: { primary: "#3B82F6", secondary: "#1D4ED8", accent: "#93C5FD", button_bg: "#3B82F6", button_hover: "#1D4ED8", menu_bg: "#0A0F1F", header_bg: "#000000", body_bg: "#000000", card_bg: "#0A0F1F", text_primary: "#DBEAFE", text_secondary: "#94A3B8", success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#60A5FA" } },
  light:        { name: "Claro",       colors: { primary: "#D4AF37", secondary: "#A855F7", accent: "#F3E5AB", button_bg: "#D4AF37", button_hover: "#997A15", menu_bg: "#F4F4F6", header_bg: "#FFFFFF", body_bg: "#FAFAFA", card_bg: "#FFFFFF", text_primary: "#18181B", text_secondary: "#52525B", success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6" } },
};

function mergeDeep(target, src) {
  const out = { ...target };
  for (const k in src) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
      out[k] = mergeDeep(target[k] || {}, src[k]);
    } else if (src[k] !== undefined) {
      out[k] = src[k];
    }
  }
  return out;
}

export function applyTheme(settings) {
  const root = document.documentElement;
  const c = settings.colors || {};
  // Direct CSS vars used across the app
  root.style.setProperty("--dl-primary", c.primary);
  root.style.setProperty("--dl-secondary", c.secondary);
  root.style.setProperty("--dl-accent", c.accent);
  root.style.setProperty("--dl-button-bg", c.button_bg);
  root.style.setProperty("--dl-button-hover", c.button_hover);
  root.style.setProperty("--dl-menu-bg", "#09090b");
  root.style.setProperty("--dl-header-bg", "#09090b");
  root.style.setProperty("--dl-body-bg", "#09090b");
  root.style.setProperty("--dl-card-bg", "#121215");
  root.style.setProperty("--dl-text-primary", c.text_primary);
  root.style.setProperty("--dl-text-secondary", c.text_secondary);
  root.style.setProperty("--dl-success", c.success);
  root.style.setProperty("--dl-warning", c.warning);
  root.style.setProperty("--dl-error", c.error);
  root.style.setProperty("--dl-info", c.info);
  root.style.setProperty("--dl-button-radius", `${settings.buttons?.radius ?? 8}px`);
  root.style.setProperty("--dl-card-radius", `${settings.cards?.radius ?? 16}px`);
  // Body bg
  document.body.style.background = "#09090b";
  document.body.style.color = c.text_primary || "#F4F4F6";
  // Mode
  if (false) { // DLotus keeps dark backgrounds for every color preset
    document.body.classList.add("dl-light"); document.body.classList.remove("dl-dark");
  } else {
    document.body.classList.add("dl-dark"); document.body.classList.remove("dl-light");
  }
  // Favicon
  if (settings.general?.favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = settings.general.favicon;
  }
  // Title
  if (settings.general?.app_name) {
    document.title = settings.general.app_name + " · PDV";
  }
}

const ThemeCtx = createContext({ settings: DEFAULTS, setSettings: () => {}, save: () => {}, reset: () => {}, DEFAULTS });

export const ThemeProvider = ({ children }) => {
  const [settings, setSettingsState] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached) return mergeDeep(DEFAULTS, cached);
    } catch {}
    return DEFAULTS;
  });

  // Apply immediately on first render
  useEffect(() => { applyTheme(settings); }, [settings]);

  // Fetch latest from server
  useEffect(() => {
    axios.get(`${API}/settings/system`, { timeout: 6000 }).then((r) => {
      const merged = mergeDeep(DEFAULTS, r.data || {});
      setSettingsState(merged);
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    }).catch(() => {});
  }, []);

  const setSettings = useCallback((updater) => {
    setSettingsState((s) => {
      const next = typeof updater === "function" ? updater(s) : mergeDeep(s, updater);
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    const token = localStorage.getItem("dlotus_token");
    await axios.put(`${API}/settings/system`, { data: settings }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [settings]);

  const reset = useCallback(async () => {
    const token = localStorage.getItem("dlotus_token");
    await axios.post(`${API}/settings/system/reset`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setSettingsState(DEFAULTS);
    localStorage.setItem(CACHE_KEY, JSON.stringify(DEFAULTS));
  }, []);

  return (
    <ThemeCtx.Provider value={{ settings, setSettings, save, reset, DEFAULTS }}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () => useContext(ThemeCtx);

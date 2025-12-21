// src/theme.js
import { createTheme } from "@mui/material/styles";

// 共通設定
const baseOptions = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: "none", fontWeight: "bold" },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
  },
};

// 1. Light (標準)
export const lightTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#9c27b0" },
    background: { default: "#f5f5f5", paper: "#ffffff" },
    text: { primary: "rgba(0, 0, 0, 0.87)" },
  },
});

// 2. Dark (標準)
export const darkTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "dark",
    primary: { main: "#90caf9" },
    secondary: { main: "#ce93d8" },
    background: { default: "#121212", paper: "#1e1e1e" },
    text: { primary: "#ffffff" },
  },
});

// 3. Unif1 Neon (ブランドカラー)
export const neonTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "dark",
    primary: {
      main: "#00F5FF", // Cyan/Teal
      contrastText: "#000",
    },
    secondary: {
      main: "#6A00FF", // Deep Violet
    },
    error: { main: "#FF0055" },
    background: {
      default: "#050A1F", // 宇宙のような深い紺色
      paper: "#0F152B", // カード背景
    },
    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.7)",
    },
    action: {
      active: "#00F5FF",
      hover: "rgba(0, 245, 255, 0.08)",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#0F152B",
          border: "1px solid rgba(0, 245, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
        contained: {
          background: "linear-gradient(90deg, #00F5FF 0%, #6A00FF 100%)",
          color: "#fff",
          boxShadow: "0 3px 5px 2px rgba(0, 245, 255, 0.3)",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#00F5FF",
          height: 3,
          boxShadow: "0 0 10px #00F5FF",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          "&.Mui-selected": { color: "#00F5FF" },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
            "&:hover fieldset": { borderColor: "rgba(0, 245, 255, 0.5)" },
            "&.Mui-focused fieldset": { borderColor: "#00F5FF" },
          },
          "& .MuiInputLabel-root.Mui-focused": { color: "#00F5FF" },
        },
      },
    },
  },
});

export const themeMap = {
  light: lightTheme,
  dark: darkTheme,
  neon: neonTheme,
};

import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ThemeName = "light" | "dark";

type ThemeColors = {
  background: string;
  cardBackground: string;
  surface: string;
  placeholder: string;
  textPrimary: string;
  textSecondary: string;
  separator: string;
  date: string;
  badgeBg: string;
  deleteBtnBg: string;
  border: string;
  accent: string;
};

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
};

const lightColors: ThemeColors = {
  background: "#ffffff",
  cardBackground: "#ffffff",
  surface: "#f8fafc",
  placeholder: "#cbd5e1",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  separator: "#e2e8f0",
  date: "#64748b",
  badgeBg: "#1e3a8a", // Dark blue badge
  deleteBtnBg: "rgba(255,255,255,0.9)",
  border: "#f1f5f9",
  accent: "#1e3a8a", // Dark blue accent
};

const darkColors: ThemeColors = {
  background: "#020617", // Very dark navy
  cardBackground: "#0b1120", // Slightly lighter navy
  surface: "#1e293b",
  placeholder: "#334155",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  separator: "#1e293b",
  date: "#64748b",
  badgeBg: "rgba(255,255,255,0.1)",
  deleteBtnBg: "rgba(255,255,255,0.1)",
  border: "#1e293b",
  accent: "#3b82f6", // Brighter blue for contrast
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("light");

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const colors = useMemo(() => (theme === "light" ? lightColors : darkColors), [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

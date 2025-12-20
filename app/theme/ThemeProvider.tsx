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
  background: "#f8fafc",
  cardBackground: "#ffffff",
  surface: "#f1f5f9",
  placeholder: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  separator: "#cbd5e1",
  date: "#94a3b8",
  badgeBg: "rgba(15,23,42,0.8)",
  deleteBtnBg: "rgba(255,255,255,0.95)",
  border: "#e2e8f0",
  accent: "#0ea5e9",
};

const darkColors: ThemeColors = {
  background: "#071025",
  cardBackground: "#0b1220",
  surface: "#072033",
  placeholder: "#0f172a",
  textPrimary: "#e6eef8",
  textSecondary: "#94a3b8",
  separator: "#123047",
  date: "#7aa1bf",
  badgeBg: "rgba(255,255,255,0.06)",
  deleteBtnBg: "rgba(255,255,255,0.06)",
  border: "#123047",
  accent: "#0284c7",
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

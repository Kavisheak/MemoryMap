import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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

const THEME_STORAGE_KEY = "@app_theme";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("light");
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
          setTheme(saved);
        }
      } catch (e) {
        console.error("Failed to load theme", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Persist theme changes
  const handleSetTheme = async (t: ThemeName) => {
    setTheme(t);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, t);
    } catch (e) {
      console.error("Failed to save theme", e);
    }
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    handleSetTheme(next);
  };

  const colors = useMemo(() => (theme === "light" ? lightColors : darkColors), [theme]);

  // Don't render until theme is loaded to avoid flash
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

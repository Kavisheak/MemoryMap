import { Stack } from "expo-router";
import ThemeProvider, { useTheme } from "./theme/ThemeProvider";

function RootStack() {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  // ✅ little grey title bar (light mode), slightly deeper grey (dark mode)
  const headerBg = isDark ? "#111827" : "#f1f5f9";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "800" },
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootStack />
    </ThemeProvider>
  );
}

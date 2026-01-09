import { Stack, router, useSegments } from "expo-router";
import React from "react";
import { onAuthStateChanged } from "firebase/auth";
import ThemeProvider, { useTheme } from "./theme/ThemeProvider";
import { auth } from "../src/firebase/config";

function RootStack() {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const headerBg = isDark ? "#111827" : "#f1f5f9";

  const segments = useSegments();
  const [ready, setReady] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState<boolean>(!!auth.currentUser);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setSignedIn(!!user);
      setReady(true);
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!ready) return;

    const first = segments[0]; // "(tabs)" | "sign-in" | "sign-up" | "memory" | etc.
    const isAuthRoute = first === "sign-in" || first === "sign-up";

    // ✅ Not signed in: allow ONLY auth routes
    if (!signedIn && !isAuthRoute) {
      router.replace("/sign-in");
      return;
    }

    // ✅ Signed in: prevent going back to auth screens
    if (signedIn && isAuthRoute) {
      router.replace("/"); // app root = tabs index
    }
  }, [ready, signedIn, segments]);

  if (!ready) return null;

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
      <Stack.Screen name="memory/[id]" options={{ headerShown: true }} />
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

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function TabsLayout() {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  // ✅ little grey title bar (light mode), slightly deeper grey (dark mode)
  const headerBg = isDark ? "#111827" : "#f1f5f9";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          height: Platform.OS === "ios" ? 100 : 90,
          paddingBottom: Platform.OS === "ios" ? 4 : -4,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: -12,
        },
        headerStyle: {
          backgroundColor: headerBg, // ✅ changed from colors.cardBackground
          borderBottomColor: colors.border,
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
          letterSpacing: 0.5,
        },
        headerTitleAlign: "center",
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="memories"
        options={{
          title: "Memories",
          
          tabBarLabel: () => null,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="add-to-photos" size={30} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarLabel: () => null,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.centerIconContainer}>
              <View
                style={[
                  styles.centerIconCircle,
                  { backgroundColor: colors.accent, shadowColor: colors.accent, borderColor: colors.cardBackground },
                  focused && [styles.centerIconCircleActive, { backgroundColor: colors.accent }],
                ]}
              >
                <FontAwesome5
                  name="map-marked-alt"
                  size={28}
                  color="#ffffff"
                />
              </View>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: () => null,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="settings" size={30} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerIconContainer: {
    position: "absolute",
    top: -30,
    alignItems: "center",
    justifyContent: "center",
  },
  centerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
  },
  centerIconCircleActive: {
    backgroundColor: "#0284c7",
    transform: [{ scale: 1.05 }],
  },
});

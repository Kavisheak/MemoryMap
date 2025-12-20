import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0ea5e9",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: Platform.OS === "ios" ? 100 : 90,
          paddingBottom: Platform.OS === "ios" ? 4 : -4,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: -12,
        },
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
                  focused && styles.centerIconCircleActive,
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
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: "#ffffff",
  },
  centerIconCircleActive: {
    backgroundColor: "#0284c7",
    transform: [{ scale: 1.05 }],
  },
});

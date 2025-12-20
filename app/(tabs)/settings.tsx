import React, { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function Settings() {
  const { theme, toggleTheme, colors } = useTheme();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  const handleOptionPress = (option: string) => {
    console.log(`${option} pressed`);
    // Add navigation or functionality for each option here
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.option, { borderBottomColor: colors.border }]} onPress={() => handleOptionPress("Edit Profile")}>
        <Text style={[styles.optionText, { color: colors.textPrimary }]}>Edit Profile</Text>
      </TouchableOpacity>

      <View style={[styles.option, { borderBottomColor: colors.border }]}>
        <Text style={[styles.optionText, { color: colors.textPrimary }]}>Dark Mode / Light Mode</Text>
        <Switch
          value={theme === "dark"}
          onValueChange={() => toggleTheme()}
        />
      </View>

      <View style={[styles.option, { borderBottomColor: colors.border }]}>
        <Text style={[styles.optionText, { color: colors.textPrimary }]}>Notifications</Text>
        <Switch
          value={isNotificationsEnabled}
          onValueChange={(value) => setIsNotificationsEnabled(value)}
        />
      </View>

      <TouchableOpacity style={[styles.option, { borderBottomColor: colors.border }]} onPress={() => handleOptionPress("Privacy")}>
        <Text style={[styles.optionText, { color: colors.textPrimary }]}>Privacy</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.option, { borderBottomColor: colors.border }]} onPress={() => handleOptionPress("Help and Feedback")}>
        <Text style={[styles.optionText, { color: colors.textPrimary }]}>Help and Feedback</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  optionText: {
    fontSize: 18,
  },
});

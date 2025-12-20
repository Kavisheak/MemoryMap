import React, { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";

export default function Settings() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  const handleOptionPress = (option: string) => {
    console.log(`${option} pressed`);
    // Add navigation or functionality for each option here
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.option} onPress={() => handleOptionPress("Edit Profile")}>
        <Text style={styles.optionText}>Edit Profile</Text>
      </TouchableOpacity>

      <View style={styles.option}>
        <Text style={styles.optionText}>Dark Mode / Light Mode</Text>
        <Switch
          value={isDarkMode}
          onValueChange={(value) => setIsDarkMode(value)}
        />
      </View>

      <View style={styles.option}>
        <Text style={styles.optionText}>Notifications</Text>
        <Switch
          value={isNotificationsEnabled}
          onValueChange={(value) => setIsNotificationsEnabled(value)}
        />
      </View>

      <TouchableOpacity style={styles.option} onPress={() => handleOptionPress("Privacy")}>
        <Text style={styles.optionText}>Privacy</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => handleOptionPress("Help and Feedback")}>
        <Text style={styles.optionText}>Help and Feedback</Text>
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

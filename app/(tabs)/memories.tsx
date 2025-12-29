import React from "react";
import { SafeAreaView, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import MemoryCard from "../../components/MemoryCard";
import { useTheme } from "../theme/ThemeProvider";

export default function Memories() {
  const { colors } = useTheme();

  type DemoMemory = {
    id: string;
    title: string;
    subtitle?: string;
    location?: string;
    date: string;
    imageUri?: string;
    memoryType?: "photo" | "voice" | "note";
  };

  const demoMemories: DemoMemory[] = [
    {
      id: "1",
      title: "A Day at the Park",
      subtitle: "Sunny afternoon with friends",
      location: "Central Park",
      date: "2024-04-15",
      imageUri:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=60",
      memoryType: "photo",
    },
    {
      id: "2",
      title: "First Apartment",
      subtitle: "Moving day excitement",
      location: "Manhattan",
      date: "2024-02-09",
      imageUri:
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&fit=crop&q=60",
      memoryType: "photo",
    },
    {
      id: "3",
      title: "Beach Vacation",
      subtitle: "Summer getaway",
      location: "Malibu",
      date: "2023-12-22",
      imageUri:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60",
      memoryType: "photo",
    },
    {
      id: "4",
      title: "Dinner with Sam",
      subtitle: "Amazing Italian restaurant",
      location: "Brooklyn",
      date: "2023-11-03",
      imageUri:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=60",
      memoryType: "photo",
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {demoMemories.map((m) => (
          <MemoryCard
            key={m.id}
            title={m.title}
            subtitle={m.subtitle}
            location={m.location}
            date={m.date}
            imageUri={m.imageUri}
            memoryType={m.memoryType}
            onPress={() => {
              // ✅ Only the first memory opens the swipe preview for now
              if (m.id === "1") router.push(`/memory/${m.id}`);
              else console.log("Pressed:", m.id);
            }}
            onDelete={() => console.log("Delete:", m.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16, paddingBottom: 24 },
});

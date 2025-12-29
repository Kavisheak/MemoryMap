import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "title">("date-desc");

  const sortedMemories = useMemo(() => {
    const sorted = [...demoMemories];
    if (sortBy === "date-desc") {
      return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "date-asc") {
      return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === "title") {
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [sortBy]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Delete Memory",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => console.log("Deleted:", id) 
        }
      ]
    );
  };

  const SortChip = ({ label, value }: { label: string; value: typeof sortBy }) => {
    const isActive = sortBy === value;
    return (
      <TouchableOpacity
        onPress={() => setSortBy(value)}
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? colors.accent : colors.surface,
            borderColor: isActive ? colors.accent : colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text
          style={{
            color: isActive ? "#fff" : colors.textSecondary,
            fontSize: 13,
            fontWeight: isActive ? "700" : "500",
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
         <SortChip label="Newest" value="date-desc" />
         <SortChip label="Oldest" value="date-asc" />
         <SortChip label="A-Z" value="title" />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {sortedMemories.map((m) => (
          <MemoryCard
            key={m.id}
            title={m.title}
            subtitle={m.subtitle}
            location={m.location}
            date={m.date}
            imageUri={m.imageUri}
            memoryType={m.memoryType}
            onPress={() => {
              // Pass data so detail view has coords if available
              router.push({ pathname: `/memory/${m.id}`, params: { data: JSON.stringify(m) } });
            }}
            onDelete={() => handleDelete(m.id, m.title)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  list: { padding: 16, paddingBottom: 24 },
});

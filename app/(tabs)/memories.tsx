import { router } from "expo-router";
import React from "react";
import { SafeAreaView, ScrollView, StyleSheet } from "react-native";
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
    type?: "photo" | "voice" | "note" | "video";
    latitude?: number;
    longitude?: number;
    media?: { uri: string; type: string }[];
  };

  const SAMPLE_MEMORIES: DemoMemory[] = [
    {
      id: "1",
      title: "Sunrise at Ella Rock",
      subtitle: "A breathtaking view after a long hike up the mountain.",
      date: "2024-05-20",
      location: "Ella, Sri Lanka",
      type: "photo",
      imageUri: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200",
      latitude: 6.8667,
      longitude: 81.0467,
      media: [
         { uri: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200", type: "photo" },
         { uri: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200", type: "photo" },
         { uri: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200", type: "photo" },
      ]
    },
    {
      id: "2",
      title: "Surfing in Mirissa",
      subtitle: "Caught some amazing waves this morning!",
      date: "2024-05-22",
      location: "Mirissa Beach",
      type: "video",
      imageUri: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200",
      latitude: 5.9482,
      longitude: 80.4716,
      media: [
         { uri: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200", type: "photo" }, // thumb
         { uri: "https://vjs.zencdn.net/v/oceans.mp4", type: "video" }
      ]
    },
    {
      id: "3",
      title: "Galle Fort Walk",
      subtitle: "Walking through history in the colonial fortress.",
      date: "2024-05-25",
      location: "Galle Fort",
      type: "photo",
      imageUri: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200",
      latitude: 6.0329,
      longitude: 80.2168,
      media: [
        { uri: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200", type: "photo" },
        { uri: "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200", type: "photo" },
        { uri: "https://images.unsplash.com/photo-1523490792147-38e4a9e1443b?w=1200", type: "photo" }
      ]
    },
    {
      id: "4",
      title: "Notes on Architecture",
      subtitle: "Observing the Dutch colonial style buildings.",
      location: "Galle",
      date: "2024-05-26",
      type: "note",
      latitude: 6.0535,
      longitude: 80.2210,
      media: []
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {SAMPLE_MEMORIES.map((m) => (
          <MemoryCard
            key={m.id}
            title={m.title}
            subtitle={m.subtitle}
            location={m.location}
            date={m.date}
            imageUri={m.imageUri}
            memoryType={m.type === "video" ? "photo" : (m.type as any)} // map video to photo or let it pass if supported
            onPress={() => {
              // Pass data so detail view has coords if available
              router.push({ pathname: "/memory/[id]", params: { id: m.id, data: JSON.stringify(m) } });
            }}
            onDelete={() => console.log("Deleted:", m.id)}
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
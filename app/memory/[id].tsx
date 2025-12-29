import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Dimensions, FlatList, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const { width: W } = Dimensions.get("window");
const ITEM_W = W;
const CARD_W = W - 32;
const MEDIA_H = Math.round(CARD_W * 0.78);

type MediaItem = { kind: "image"; uri: string };
type SampleMemory = {
  id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  media: MediaItem[];
};

const SAMPLE: SampleMemory = {
  id: "1",
  title: "A Day at the Park",
  location: "Central Park",
  date: "2024-04-15",
  description:
    "A calm afternoon: long walk, fresh air, snacks on the grass, and golden hour. Swipe through the photos (demo).",
  media: [
    { kind: "image", uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1400&auto=format&fit=crop&q=60" },
    { kind: "image", uri: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1400&auto=format&fit=crop&q=60" },
    { kind: "image", uri: "https://images.unsplash.com/photo-1477511801984-4ad318ed9846?w=1400&auto=format&fit=crop&q=60" },
    { kind: "image", uri: "https://images.unsplash.com/photo-1523413457543-1e5e8a6d2fb1?w=1400&auto=format&fit=crop&q=60" },
    { kind: "image", uri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&auto=format&fit=crop&q=60" },
  ],
};

export default function MemorySwipeDetails() {
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  const listRef = React.useRef<FlatList<any> | null>(null);
  const [index, setIndex] = React.useState(0);

  const mem = useMemo<any | null>(() => {
    if (data) {
      try {
        const parsed = JSON.parse(data);
        // Normalize for display
        return {
          id: parsed.id,
          title: parsed.title,
          location: parsed.latitude ? "Lat: " + parsed.latitude.toFixed(4) : "Unknown Loc",
          date: parsed.date,
          description: parsed.description || parsed.note || "No details provided.",
          media: parsed.media || (parsed.imageUri ? [{ uri: parsed.imageUri, type: "image" }] : []),
        };
      } catch (e) {
        console.log("Error parsing memory data", e);
      }
    }
    if (String(id) === "1") return SAMPLE;
    return null;
  }, [id, data]);

  if (!mem) return null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={{ fontSize: 24, paddingBottom: 2, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={[s.headerTitle, { color: colors.textPrimary }]}>
          {mem.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        {/* Carousel */}
        <View style={{ marginTop: 10 }}>
          <FlatList
            ref={(r) => { listRef.current = r; }}
            data={mem.media}
            keyExtractor={(it, i) => `${it.uri}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_W}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / ITEM_W);
              setIndex(next);
            }}
            getItemLayout={(_, i) => ({ length: ITEM_W, offset: ITEM_W * i, index: i })}
            renderItem={({ item }) => (
              <View style={{ width: ITEM_W, paddingHorizontal: 16 }}>
                <View
                  style={[
                    s.mediaCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      shadowColor: colors.textPrimary,
                    },
                  ]}
                >
                  <Image source={{ uri: item.uri }} style={s.mediaImg} />
                  <View style={s.overlay}>
                    <Text style={[s.overlayText, { color: "#fff" }]}>
                      {mem.location} • {mem.date}
                    </Text>
                    <View style={s.counterBadge}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                        {index + 1}/{mem.media.length}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />
        </View>

        {/* Dots */}
        <View style={s.dotsRow}>
          {mem.media.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: i === index ? colors.accent : colors.border,
                  width: i === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Description */}
        <View style={{ padding: 20 }}>
          <View style={[s.detailsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>MEMORY DETAILS</Text>
            <Text style={[s.bodyText, { color: colors.textPrimary }]}>{mem.description}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  mediaCard: {
    width: CARD_W,
    height: MEDIA_H,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  mediaImg: { width: "100%", height: "100%", resizeMode: "cover" },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  overlayText: { fontWeight: "600", fontSize: 13, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    height: 10,
  },
  dot: { height: 6, borderRadius: 3, marginHorizontal: 3 },
  detailsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    opacity: 0.8,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
  },
});
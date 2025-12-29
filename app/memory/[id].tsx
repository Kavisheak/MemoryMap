import Ionicons from "@expo/vector-icons/Ionicons";
import { ResizeMode, Video } from "expo-av";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Dimensions, FlatList, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const { width: W } = Dimensions.get("window");
const ITEM_W = W;
const CARD_W = W - 32;
const MEDIA_H = Math.round(CARD_W * 0.78);

type MediaItem = { kind: "image" | "video"; uri: string };
type SampleMemory = {
  id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  media: MediaItem[];
  latitude?: number;
  longitude?: number;
};

const SAMPLE: SampleMemory = {
  id: "1",
  title: "Weekend Getaway",
  location: "Ella, Sri Lanka",
  date: "2024-05-20",
  description:
    "We started the day with a hike up Little Adam's Peak, enjoying the breathtaking sunrise. Later, we visited the Nine Arches Bridge and watched the train pass by. The evening was spent relaxing at a cozy cafe with live music.",
  media: [
    { kind: "image", uri: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1400&auto=format&fit=crop&q=60" },
    { kind: "video", uri: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { kind: "image", uri: "https://images.unsplash.com/photo-1628628045151-24b8686a603c?w=1400&auto=format&fit=crop&q=60" },
    { kind: "image", uri: "https://images.unsplash.com/photo-1620619767323-b95a89183081?w=1400&auto=format&fit=crop&q=60" },
  ],
  latitude: 6.8667,
  longitude: 81.0467,
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
          media: parsed.media || (parsed.imageUri ? [{ uri: parsed.imageUri, type: "image", kind: "image" }] : []),
          latitude: parsed.latitude,
          longitude: parsed.longitude,
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
      <Stack.Screen
        options={{
          title: mem.title || "Memory",
          headerStyle: { backgroundColor: colors.cardBackground },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

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
            renderItem={({ item, index: i }) => (
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
                  {(item.kind === "video" || item.type === "video") ? (
                    <Video
                      source={{ uri: item.uri }}
                      style={s.mediaImg}
                      useNativeControls
                      shouldPlay={index === i}
                      isLooping
                      resizeMode={ResizeMode.COVER}
                    />
                  ) : (
                    <Image source={{ uri: item.uri }} style={s.mediaImg} />
                  )}
                  <View style={s.overlay}>
                    <Text style={[s.overlayText, { color: "#fff" }]}>
                      {mem.location} • {mem.date}
                    </Text>
                    <View style={s.counterBadge}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                        {i + 1}/{mem.media.length}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Prev Button */}
          {index > 0 && (
            <TouchableOpacity
              style={[s.navBtn, { left: 24 }]}
              onPress={() => {
                const nextIndex = index - 1;
                listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                setIndex(nextIndex);
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Next Button */}
          {index < mem.media.length - 1 && (
            <TouchableOpacity
              style={[s.navBtn, { right: 24 }]}
              onPress={() => {
                const nextIndex = index + 1;
                listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                setIndex(nextIndex);
              }}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          )}
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

          {/* See in Map Button */}
          {mem.latitude && mem.longitude ? (
             <TouchableOpacity
             activeOpacity={0.8}
             onPress={() => {
               // Navigate to map tab with focus params
               router.navigate({ pathname: "/(tabs)", params: { focusLat: mem.latitude, focusLng: mem.longitude } });
             }}
             style={{
               marginTop: 20,
               backgroundColor: colors.accent,
               paddingVertical: 16,
               borderRadius: 16,
               alignItems: "center",
               shadowColor: colors.accent,
               shadowOffset: { width: 0, height: 4 },
               shadowOpacity: 0.3,
               shadowRadius: 10,
               elevation: 6,
             }}
           >
             <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>See in Map</Text>
           </TouchableOpacity>
          ) : null}
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
  navBtn: {
    position: "absolute",
    top: MEDIA_H / 2 - 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResizeMode, Video } from "expo-av";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import MemoryPreviewModal from "../../components/MemoryPreviewModal";

const { width: W, height: H } = Dimensions.get("window");
const ITEM_W = W;
const CARD_W = W - 32;

const DEFAULT_MEDIA_H = Math.round(CARD_W * 0.78);
const MIN_MEDIA_H = 220;
const MAX_MEDIA_H = Math.round(H * 0.72);

type MediaItem = { kind: "image" | "video"; uri: string };

type MemoryForDetails = {
  id: string;
  title: string;
  location: string;
  date?: string;
  description: string;
  media: MediaItem[];
  latitude?: number;
  longitude?: number;
};

const STORAGE_KEY = "@memories_v1";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeMemory(parsed: any): MemoryForDetails {
  const latitude = typeof parsed?.latitude === "number" ? parsed.latitude : undefined;
  const longitude = typeof parsed?.longitude === "number" ? parsed.longitude : undefined;

  const location =
    (typeof parsed?.locationName === "string" && parsed.locationName.trim()) ||
    (typeof parsed?.location === "string" && parsed.location.trim()) ||
    (latitude != null && longitude != null ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : "Unknown location");

  const rawMedia: any[] = Array.isArray(parsed?.media) ? parsed.media : [];
  const media: MediaItem[] = rawMedia
    .map((x) => {
      const uri = typeof x?.uri === "string" ? x.uri : null;
      const kind = x?.kind === "video" || x?.type === "video" ? "video" : "image";
      if (!uri) return null;
      return { kind, uri } as const;
    })
    .filter(Boolean) as MediaItem[];

  if (media.length === 0) {
    const imageUri = typeof parsed?.imageUri === "string" ? parsed.imageUri : null;
    const videoUri = typeof parsed?.videoUri === "string" ? parsed.videoUri : null;
    const uri = typeof parsed?.uri === "string" ? parsed.uri : null;
    if (imageUri) media.push({ kind: "image", uri: imageUri });
    else if (videoUri) media.push({ kind: "video", uri: videoUri });
    else if (uri) media.push({ kind: "image", uri });
  }

  return {
    id: String(parsed?.id ?? ""),
    title: typeof parsed?.title === "string" && parsed.title.trim() ? parsed.title : "Untitled",
    location,
    date: typeof parsed?.date === "string" ? parsed.date : undefined,
    description:
      (typeof parsed?.description === "string" && parsed.description.trim()) ||
      (typeof parsed?.note === "string" && parsed.note.trim()) ||
      "No details provided.",
    media,
    latitude,
    longitude,
  };
}

export default function MemorySwipeDetails() {
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  const listRef = React.useRef<FlatList<any> | null>(null);
  const [index, setIndex] = React.useState(0);

  const [mem, setMem] = React.useState<MemoryForDetails | null>(null);

  const [dimsByUri, setDimsByUri] = React.useState<Record<string, { width: number; height: number }>>({});

  // ✅ Preview visible only (logic is inside MemoryPreviewModal)
  const [previewVisible, setPreviewVisible] = React.useState(false);

  const openPreview = () => {
    if (!mem?.media?.length) return;
    setPreviewVisible(true);
  };

  const closePreview = () => {
    setPreviewVisible(false);
  };

  const getCardHeightForUri = React.useCallback(
    (uri?: string) => {
      if (!uri) return DEFAULT_MEDIA_H;

      const d = dimsByUri[uri];
      const computedH =
        d && d.width > 0 && d.height > 0 ? Math.round(CARD_W * (d.height / d.width)) : DEFAULT_MEDIA_H;

      return clamp(computedH, MIN_MEDIA_H, MAX_MEDIA_H);
    },
    [dimsByUri]
  );

  const activeUri = mem?.media?.[index]?.uri;
  const activeCardH = getCardHeightForUri(activeUri);

  React.useEffect(() => {
    let mounted = true;

    async function loadFromStorage(memoryId: string) {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const list = raw ? (JSON.parse(raw) as any[]) : [];
        const found = Array.isArray(list) ? list.find((m) => String(m?.id) === String(memoryId)) : null;
        if (!mounted) return;
        setMem(found ? normalizeMemory(found) : null);
      } catch {
        if (!mounted) return;
        setMem(null);
      }
    }

    if (data) {
      try {
        const parsed = JSON.parse(data);
        setMem(normalizeMemory(parsed));
        return () => {
          mounted = false;
        };
      } catch {}
    }

    if (id) loadFromStorage(String(id));
    else setMem(null);

    return () => {
      mounted = false;
    };
  }, [data, id]);

  React.useEffect(() => {
    if (!mem?.media?.length) return;

    mem.media.forEach((it) => {
      if (it.kind !== "image") return;
      if (dimsByUri[it.uri]) return;

      Image.getSize(
        it.uri,
        (w, h) => {
          setDimsByUri((cur) => {
            if (cur[it.uri]) return cur;
            return { ...cur, [it.uri]: { width: w, height: h } };
          });
        },
        () => {}
      );
    });
  }, [mem, dimsByUri]);

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

      {/* ✅ Make screen scrollable */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 10, height: activeCardH, position: "relative" }}>
          <FlatList
            ref={(r) => {
              listRef.current = r;
            }}
            data={mem.media}
            keyExtractor={(it, i) => `${it.uri}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_W}
            decelerationRate="fast"
            style={{ height: activeCardH }}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / ITEM_W);
              setIndex(next);
            }}
            getItemLayout={(_, i) => ({ length: ITEM_W, offset: ITEM_W * i, index: i })}
            renderItem={({ item, index: i }) => {
              const cardH = getCardHeightForUri(item.uri);

              return (
                <View style={{ width: ITEM_W, paddingHorizontal: 16 }}>
                  <View
                    style={[
                      s.mediaCard,
                      {
                        height: cardH,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        shadowColor: colors.textPrimary,
                      },
                    ]}
                  >
                    {item.kind === "video" ? (
                      <Video
                        source={{ uri: item.uri }}
                        style={s.mediaImg}
                        useNativeControls
                        shouldPlay={index === i}
                        isLooping
                        resizeMode={ResizeMode.CONTAIN}
                        onLoad={(status) => {
                          const ns: any = (status as any)?.naturalSize;
                          const w = Number(ns?.width);
                          const h = Number(ns?.height);
                          if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;

                          setDimsByUri((cur) => {
                            if (cur[item.uri]) return cur;
                            return { ...cur, [item.uri]: { width: w, height: h } };
                          });
                        }}
                      />
                    ) : (
                      <Image source={{ uri: item.uri }} style={s.mediaImg} resizeMode="contain" />
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
              );
            }}
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

        <View style={{ padding: 20, paddingTop: 10 }}>
          <View style={[s.detailsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>MEMORY DETAILS</Text>
            <Text style={[s.bodyText, { color: colors.textPrimary }]}>{mem.description}</Text>
          </View>

          {/* Preview Memory Button */}
          {mem.media?.length ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openPreview}
              style={{
                marginTop: 14,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 16 }}>Preview Memory</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12, fontWeight: "700" }}>
                Plays photos & videos like a clip
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* See in Map Button */}
          {mem.latitude && mem.longitude ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                router.navigate({
                  pathname: "/(tabs)",
                  params: { focusLat: String(mem.latitude), focusLng: String(mem.longitude) },
                });
              }}
              style={{
                marginTop: 14,
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
      </ScrollView>

      <MemoryPreviewModal
        visible={previewVisible}
        onClose={closePreview}
        title={mem.title}
        location={mem.location}
        date={mem.date}
        media={mem.media}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  mediaCard: {
    width: CARD_W,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  mediaImg: { width: "100%", height: "100%" },
  navBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  overlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overlayText: { fontSize: 12, fontWeight: "700" },
  counterBadge: {
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { height: 8, borderRadius: 999 },

  detailsCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 0.6, marginBottom: 8 },
  bodyText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
});
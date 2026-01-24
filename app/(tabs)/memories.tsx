import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native"; // ✅ add Share
import * as Clipboard from "expo-clipboard"; // ✅ add
import { auth } from "../../src/firebase/config";
import { deleteMemoryCloud } from "../../src/services/memories.service";
import MemoryCard from "../../components/MemoryCard";
import { useTheme } from "../theme/ThemeProvider";

export default function Memories() {
  const { colors } = useTheme();

  type MemoryType = "image" | "video" | "note";

  type Memory = {
    id: string;
    type: MemoryType;
    uri?: string | null;
    imageUri?: string | null;
    videoUri?: string | null;
    media?: { uri: string; type: string }[];
    note?: string;
    title?: string;
    description?: string;
    date?: string;
    latitude: number;
    longitude: number;
    locationName?: string; // already here ✅
    createdAt: number;
  };

  const STORAGE_KEY = "@memories_v1";
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  type SortBy = "newest" | "oldest" | "title" | "location";
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  // ✅ Nominatim reverse geocode (no device location permission needed)
  const fetchAddress = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const resp = await fetch(url, { headers: { "User-Agent": "MemoryMap/1.0 (local)" } });
      const json = await resp.json();
      const name = typeof json?.display_name === "string" ? json.display_name : null;
      return name ? name : null;
    } catch {
      return null;
    }
  };

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Memory[]) : [];
      const sorted = Array.isArray(parsed)
        ? [...parsed].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        : [];
      
      setMemories(sorted);

      // Background process: Enrich with location names if missing
      // We do this logically *after* render to unblock UI
      setTimeout(async () => {
        let changed = false;
        const enriched = await Promise.all(
          sorted.map(async (m) => {
            if (m.locationName) return m; // Already has name
            if (!m.latitude || !m.longitude) return m;

            const name = await fetchAddress(m.latitude, m.longitude);
            if (name) {
              changed = true;
              return { ...m, locationName: name };
            }
            return m;
          })
        );

        if (changed) {
          setMemories(enriched);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
        }
      }, 500);

    } catch (e: any) {
      console.error("Failed to load memories", e);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [loadMemories])
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      Alert.alert("Delete memory?", "This will remove it from your device (and from cloud if signed in).", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const next = memories.filter((m) => m.id !== id);
              setMemories(next);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (e: any) {
              Alert.alert("Delete failed", e?.message ?? "Could not delete locally.");
              loadMemories();
              return;
            }

            try {
              const uid = auth.currentUser?.uid;
              if (uid) await deleteMemoryCloud(uid, id);
            } catch {
              // keep local delete; cloud can fail silently
            }
          },
        },
      ]);
    },
    [loadMemories, memories]
  );

  const buildDeepLink = (memoryId: string) => `memorymap://memory/${memoryId}`;

  const shareMemory = useCallback(async (m: Memory) => {
    const link = buildDeepLink(m.id);
    const title = m.title ?? "Memory";
    const loc = m.locationName?.trim() ? m.locationName.trim() : "Unknown location";
    const when = m.date ? `\nDate: ${m.date}` : "";

    // Small action menu: Copy link OR open native share sheet
    Alert.alert("Share memory", "Choose an option:", [
      {
        text: "Copy link",
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(link);
            Alert.alert("Copied", "Link copied to clipboard.");
          } catch {
            Alert.alert("Copy failed", "Could not copy the link.");
          }
        },
      },
      {
        text: "Share…",
        onPress: async () => {
          try {
            await Share.share({
              title,
              message: `${title}\nLocation: ${loc}${when}\n\n${link}`,
              url: link,
            });
          } catch {
            // user cancelled / share failed
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, []);

  const displayedMemories = useMemo(() => {
    const list = [...memories];

    const normalize = (s?: string | null) => (s ?? "").trim().toLocaleLowerCase();

    list.sort((a, b) => {
      if (sortBy === "newest") return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      if (sortBy === "oldest") return (a.createdAt ?? 0) - (b.createdAt ?? 0);

      if (sortBy === "title") {
        return normalize(a.title).localeCompare(normalize(b.title));
      }

      // location
      const aLoc = normalize(a.locationName) || `${a.latitude ?? ""},${a.longitude ?? ""}`;
      const bLoc = normalize(b.locationName) || `${b.latitude ?? ""},${b.longitude ?? ""}`;
      return aLoc.localeCompare(bLoc);
    });

    return list;
  }, [memories, sortBy]);

  const renderItem = ({ item: m }: { item: Memory }) => {
    const thumb =
      m.imageUri ||
      (m.media || []).find((x) => x.type === "image")?.uri ||
      (m.type === "image" ? m.uri ?? undefined : undefined);

    // ✅ show location name (not coords)
    const locDisplay = m.locationName?.trim() ? m.locationName : "Unknown location";

    return (
      <MemoryCard
        key={m.id}
        title={m.title ?? "Untitled"}
        subtitle={m.description ?? m.note ?? "No details"}
        location={locDisplay}
        date={m.date ?? new Date(m.createdAt ?? Date.now())}
        imageUri={thumb ?? undefined}
        memoryType={m.type === "note" ? "note" : "photo"}
        onPress={() => {
          router.push({ pathname: "/memory/[id]", params: { id: m.id, data: JSON.stringify(m) } });
        }}
        onShare={() => shareMemory(m)} // ✅ add
        onDelete={() => deleteMemory(m.id)}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayedMemories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
           

            <View style={styles.sortRow}>
              <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.sortPillsOuter, { backgroundColor: colors.surface, borderColor: colors.border }]}
                contentContainerStyle={styles.sortPillsContent}
              >
                {(
                  [
                    { key: "newest" as const, label: "Newest" },
                    { key: "oldest" as const, label: "Oldest" },
                    { key: "title" as const, label: "Title" },
                    { key: "location" as const, label: "Location" },
                  ]
                ).map((opt) => {
                  const active = sortBy === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setSortBy(opt.key)}
                      style={({ pressed }) => [
                        styles.pill,
                        active ? { backgroundColor: colors.accent } : null,
                        pressed ? { opacity: 0.92 } : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: active ? "#ffffff" : colors.textPrimary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        }
        
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 18 }}>No memories yet</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>
                Save a memory from the Map tab,{"\n"}and it will show up here.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary }}>Loading...</Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingTop: 6, paddingBottom: 6 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sortRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sortPillsOuter: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
  },
  sortPillsContent: {
    padding: 4,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  list: { 
    paddingHorizontal: 16, 
    paddingTop: 10,
    paddingBottom: 32,
  },
});
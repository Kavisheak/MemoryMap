import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-root-toast";
import { auth } from "../../src/firebase/config";
import { deleteMemoryCloud } from "../../src/services/memories.service";
import MemoryCard from "../../components/MemoryCard";
import ConfirmDialog from "../../components/ConfirmDialog";
import ShareOptionsModal from "../../components/ShareOptionsModal";
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
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [shareVisible, setShareVisible] = useState(false);
  const [shareTarget, setShareTarget] = useState<Memory | null>(null);

  type SortBy = "newest" | "oldest" | "title" | "location";
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const askDeleteMemory = useCallback((id: string) => {
    setPendingDeleteId(id);
    setConfirmVisible(true);
  }, []);

  const fetchAddress = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const resp = await fetch(url, { headers: { "User-Agent": "MemoryMap/1.0 (local)" } });
      const json = await resp.json();
      const name = typeof json?.display_name === "string" ? json.display_name : null;
      return name ? name : null;
    } catch {
      return null;
    }
  }, []);

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
  }, [fetchAddress]);

  const performDelete = useCallback(
    async (id: string) => {
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
    [loadMemories, memories]
  );

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [loadMemories])
  );

  const buildDeepLink = (memoryId: string) => `memorymap://memory/${memoryId}`;

  const openShare = useCallback((m: Memory) => {
    setShareTarget(m);
    setShareVisible(true);
  }, []);

  const closeShare = useCallback(() => {
    setShareVisible(false);
    setShareTarget(null);
  }, []);

  const copyShareLink = useCallback(async () => {
    if (!shareTarget) return;
    const link = buildDeepLink(shareTarget.id);
    try {
      await Clipboard.setStringAsync(link);
      Toast.show("Link copied", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
      });
    } catch {
      Alert.alert("Copy failed", "Could not copy the link.");
    }
  }, [shareTarget]);

  const nativeShare = useCallback(async () => {
    if (!shareTarget) return;
    const link = buildDeepLink(shareTarget.id);
    const title = shareTarget.title ?? "Memory";
    const loc = shareTarget.locationName?.trim() ? shareTarget.locationName.trim() : "Unknown location";
    const when = shareTarget.date ? `\nDate: ${shareTarget.date}` : "";

    try {
      await Share.share({
        title,
        message: `${title}\nLocation: ${loc}${when}\n\n${link}`,
        url: link,
      });
    } catch {
      // user cancelled / share failed
    }
  }, [shareTarget]);

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
        onShare={() => openShare(m)}
        onDelete={() => askDeleteMemory(m.id)}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ShareOptionsModal
        visible={shareVisible}
        title={shareTarget?.title ?? "Memory"}
        location={shareTarget?.locationName?.trim() ? shareTarget.locationName.trim() : "Unknown location"}
        dateText={shareTarget?.date}
        link={shareTarget ? buildDeepLink(shareTarget.id) : ""}
        onClose={closeShare}
        onCopyLink={async () => {
          await copyShareLink();
          closeShare();
        }}
        onShare={async () => {
          await nativeShare();
          closeShare();
        }}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete memory?"
        message="This will remove it from your device (and from cloud if signed in)."
        cancelText="Cancel"
        confirmText="Delete"
        destructive
        onCancel={() => {
          setConfirmVisible(false);
          setPendingDeleteId(null);
        }}
        onConfirm={() => {
          const id = pendingDeleteId;
          setConfirmVisible(false);
          setPendingDeleteId(null);
          if (id) performDelete(id);
        }}
      />

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
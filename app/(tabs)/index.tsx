import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { WebView } from "react-native-webview";
import Toast from "react-native-root-toast";

import AddMemoryModal from "../../components/AddMemoryModal";
import ConfirmDialog from "../../components/ConfirmDialog"; // ✅ add this
import { auth } from "../../src/firebase/config";
import { deleteMemoryCloud, listMemoriesCloud, upsertMemoryCloud } from "../../src/services/memories.service";
import { uploadMediaAndGetUrl } from "../../src/services/storage.service";
import { useTheme } from "../theme/ThemeProvider";

type MemoryType = "image" | "video" | "note";

type Memory = {
  id: string;
  type: MemoryType;

  uri?: string | null;

  imageUri?: string | null;
  videoUri?: string | null;

  imageUris?: string[];
  videoUris?: string[];

  media?: { uri: string; type: string }[];

  note?: string;
  title?: string;
  description?: string;
  date?: string;

  latitude: number;
  longitude: number;

  // ✅ add this
  locationName?: string | null;

  createdAt: number;
};

const STORAGE_KEY = "@memories_v1";

export default function Index() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ focusLat?: string; focusLng?: string }>();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  // ✅ multiple media
  const [mediaItems, setMediaItems] = useState<{ uri: string; type: "image" | "video" }[]>([]);
  const [noteText, setNoteText] = useState("");

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUriToPlay, setVideoUriToPlay] = useState<string | null>(null);

  const webviewRef = useRef<WebView | null>(null);
  const initialSyncRef = useRef(false);
  const cloudWarnedRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0, 10));

  const [tempMarkerId, setTempMarkerId] = useState<string | null>(null);
  const [showAddButton, setShowAddButton] = useState(false);

  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const [locationFetching, setLocationFetching] = useState(false);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which memory is being edited
  const [editingId, setEditingId] = useState<string | null>(null);

  const postToWeb = React.useCallback((obj: any) => {
    try {
      webviewRef.current?.postMessage(JSON.stringify(obj));
    } catch {
      // ignore
    }
  }, []);

  const addTempMarker = (id: string, lat: number, lng: number, titleText?: string) => {
    postToWeb({ type: "addTempMarker", marker: { id, latitude: lat, longitude: lng, title: titleText ?? null } });
    setTempMarkerId(id);
  };

  const removeTempMarker = (id: string | null) => {
    if (!id) return;
    postToWeb({ type: "removeTempMarker", id });
    setTempMarkerId(null);
  };

  const addPermanentMarkerToWeb = (m: Memory) => {
    postToWeb({ type: "addMarker", marker: m });
  };

  const panTo = React.useCallback(
    (lat: number, lng: number, zoom = 15) => {
      postToWeb({ type: "panTo", lat, lng, zoom });
    },
    [postToWeb]
  );

  const persistLocal = React.useCallback(async (items: Memory[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e: any) {
      console.error("persistLocal failed", e);
      Alert.alert("Save failed", e?.message ?? "Could not save locally.");
    }
  }, []);

  const isRemoteUri = React.useCallback((uri?: string | null) => {
    if (!uri) return false;
    return /^https?:\/\//i.test(uri);
  }, []);

  const guessExtFromUri = React.useCallback((uri: string, fallback: string) => {
    try {
      const cleaned = uri.split("?")[0].split("#")[0];
      const last = cleaned.split("/").pop() ?? "";
      const parts = last.split(".");
      const ext = parts.length > 1 ? parts.pop() : null;
      const safe = (ext ?? fallback ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return safe || fallback;
    } catch {
      return fallback;
    }
  }, []);

  // Persist media into app storage (documentDirectory) so it still loads after restart/re-login.
  const persistMediaToDevice = React.useCallback(
    async (items: { uri: string; type: "image" | "video" }[], uid: string, memoryId: string) => {
      try {
        const root = FileSystem.Paths?.document?.uri;
        if (!root) return items;

        const dir = `${root}memories/${uid}/${memoryId}/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

        const persisted = await Promise.all(
          (items ?? []).map(async (item, idx) => {
            const uri = item?.uri;
            if (!uri) return null;
            if (isRemoteUri(uri)) return item;
            if (uri.startsWith(dir)) return item;

            const ext = guessExtFromUri(uri, item.type === "video" ? "mp4" : "jpg");
            const to = `${dir}media_${idx}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

            try {
              await FileSystem.copyAsync({ from: uri, to });
              return { ...item, uri: to };
            } catch (e) {
              console.warn("Local media copy failed", { uri, to, e });
              return item;
            }
          })
        );

        return persisted.filter(Boolean) as { uri: string; type: "image" | "video" }[];
      } catch (e) {
        console.warn("persistMediaToDevice failed", e);
        return items;
      }
    },
    [guessExtFromUri, isRemoteUri]
  );

  const performDelete = React.useCallback(
    (id: string) => {
      setMemories((cur) => {
        const next = cur.filter((m) => m.id !== id);
        persistLocal(next);
        return next;
      });

      postToWeb({ type: "removeMarker", id });

      (async () => {
        try {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          await deleteMemoryCloud(uid, id);
        } catch {
          // keep local delete even if cloud fails
        }
      })();
    },
    [postToWeb, persistLocal]
  );

  const removeMemory = (id: string) => {
    setPendingDeleteId(id);
    setConfirmVisible(true);
  };

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleMapPress = (lat: number, lng: number) => {
    try {
      const id = `tmp_${Date.now()}`;
      setSelectedCoord({ latitude: lat, longitude: lng });
      setShowAddButton(true);
      addTempMarker(id, lat, lng, "New memory");
      setShowResults(false);
    } catch {
      // ignore
    }
  };

  const selectSuggestion = (item: any) => {
    try {
      const lat = parseFloat(item?.lat);
      const lng = parseFloat(item?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      panTo(lat, lng, 16);
      setSelectedCoord({ latitude: lat, longitude: lng });
      setShowAddButton(true);

      const id = `tmp_${Date.now()}`;
      addTempMarker(id, lat, lng, "New memory");

      setQuery(item?.display_name ?? "");
      setShowResults(false);
      setResults([]);
    } catch {
      // ignore
    }
  };

  const closeAddMemory = () => {
    setModalVisible(false);
    setSelectedCoord(null);
    setEditingId(null);

    setTitle("");
    setDescription("");
    setDateISO(new Date().toISOString().slice(0, 10));
    setNoteText("");
    setMediaItems([]);

    removeTempMarker(tempMarkerId);
    setShowAddButton(false);
  };

  const saveMemory = async () => {
    if (!selectedCoord) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Not signed in", "Sign in to save to Firebase.");
      return;
    }

    const newId = editingId ? editingId : String(Date.now());

    const memoryType: MemoryType = mediaItems.find((i) => i.type === "image")
      ? "image"
      : mediaItems.find((i) => i.type === "video")
      ? "video"
      : "note";

    const createdAt = editingId
      ? memories.find((x) => x.id === editingId)?.createdAt || Date.now()
      : Date.now();

    const localMedia = (mediaItems ?? [])
      .filter((x): x is { uri: string; type: "image" | "video" } => Boolean(x?.uri))
      .map((x) => ({ uri: x.uri, type: x.type }));

    // ✅ Make local media persistent on this device (documentDirectory)
    const persistedLocalMedia = await persistMediaToDevice(localMedia, uid, newId);

    const firstLocalImageUrl = persistedLocalMedia.find((x) => x.type === "image")?.uri ?? null;
    const firstLocalVideoUrl = persistedLocalMedia.find((x) => x.type === "video")?.uri ?? null;

    // ✅ Upload ALL media to Storage and store remote URLs.
    // Local file:// or content:// URIs won't work on other devices.
    const uploadedMedia = await Promise.all(
      (persistedLocalMedia ?? []).map(async (item, idx) => {
        if (!item?.uri) return null;

        try {
          const url = await uploadMediaAndGetUrl(item.uri, uid, newId, item.type, idx);
          return { uri: url, type: item.type };
        } catch (e) {
          console.warn("Media upload failed", { uri: item.uri, type: item.type, e });
          return null;
        }
      })
    );

    const failedCount = uploadedMedia.filter((x) => !x).length;
    const hasUploadWarnings = failedCount > 0;

    const cloudMedia = uploadedMedia.filter(Boolean) as { uri: string; type: "image" | "video" }[];
    const firstImageUrl = cloudMedia.find((x) => x.type === "image")?.uri ?? null;
    const firstVideoUrl = cloudMedia.find((x) => x.type === "video")?.uri ?? null;

    const baseMemory: Omit<Memory, "uri" | "imageUri" | "videoUri" | "media"> = {
      id: newId,
      type: memoryType,
      note: noteText || undefined,
      title: title || undefined,
      description: description || undefined,
      date: dateISO || undefined,
      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,
      locationName: selectedLocationName ?? null,
      createdAt,
    };

    // Local (AsyncStorage + immediate UI): keep original URIs so media always shows on this device.
    const mLocal: Memory = {
      ...baseMemory,
      uri: firstLocalImageUrl ?? firstLocalVideoUrl ?? null,
      imageUri: firstLocalImageUrl,
      videoUri: firstLocalVideoUrl,
      media: persistedLocalMedia,
    };

    // Cloud (Firestore): store ONLY remote URLs so other devices can display media.
    const mCloud: Memory = {
      ...baseMemory,
      uri: firstImageUrl ?? firstVideoUrl ?? null,
      imageUri: firstImageUrl,
      videoUri: firstVideoUrl,
      media: cloudMedia,
    };

    if (editingId) {
      setMemories((cur) => {
        const next = cur.map((x) => (x.id === editingId ? mLocal : x));
        persistLocal(next);
        return next;
      });
      postToWeb({ type: "removeMarker", id: editingId });
      postToWeb({ type: "addMarker", marker: mLocal });

      Toast.show(
        hasUploadWarnings
          ? "Memory updated (some media failed to upload)"
          : "Memory updated successfully!",
        {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        }
      );
    } else {
      setMemories((cur) => {
        const next = [mLocal, ...cur];
        persistLocal(next);
        return next;
      });
      addPermanentMarkerToWeb(mLocal);

      Toast.show(
        hasUploadWarnings
          ? "Memory added (some media failed to upload)"
          : "Memory added successfully!",
        {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        }
      );
    }

    removeTempMarker(tempMarkerId);
    setShowAddButton(false);

    (async () => {
      try {
        console.log("Saving memory to Firestore", { uid, mCloud });
        await upsertMemoryCloud(uid, mCloud as any);
      } catch (e: any) {
        console.error("Cloud save failed", e);
        Alert.alert("Cloud sync failed", e?.message ?? "Could not save to Firebase.");
      }
    })();

    closeAddMemory();
  };

  const handleEditMemory = (id: string) => {
    const mem = memories.find((m) => m.id === id);
    if (!mem) return;

    setTitle(mem.title || "");
    setDescription(mem.description || "");
    setDateISO(mem.date || new Date().toISOString().slice(0, 10));
    setNoteText(mem.note || "");
    setMediaItems(
      (mem.media || []).map((x) => ({
        uri: x.uri,
        type: x.type === "video" ? "video" : "image",
      }))
    );

    setSelectedCoord({ latitude: mem.latitude, longitude: mem.longitude });
    setEditingId(id);
    setModalVisible(true);
  };

  // ✅ permissions
  useEffect(() => {
    async function requestPerms() {
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch {
        // ignore
      }
    }
    requestPerms();
  }, []);

  // focus params from details screen
  useEffect(() => {
    if (params.focusLat && params.focusLng) {
      const lat = parseFloat(params.focusLat);
      const lng = parseFloat(params.focusLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setTimeout(() => panTo(lat, lng, 16), 700);
    }
  }, [panTo, params.focusLat, params.focusLng]);

  // load local first
  useEffect(() => {
    async function load() {
      let loaded: Memory[] = [];
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) loaded = JSON.parse(raw);
      } catch (e: any) {
        console.error("load local failed", e);
      }

      setMemories(loaded);

      setTimeout(() => {
        try {
          loaded.forEach((m) => postToWeb({ type: "addMarker", marker: m }));
          initialSyncRef.current = true;
        } catch (e) {
          console.error("initial marker sync failed", e);
        }
      }, 350);
    }
    load();
  }, [postToWeb]);

  // load cloud after auth ready
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) return;
      try {
        const cloud = await listMemoriesCloud(user.uid);
        setMemories((cur) => {
          const byId = new Map<string, Memory>();
          cur.forEach((m) => byId.set(m.id, m));

          const hasLocalMediaUris = (m?: any) => {
            if (!m) return false;
            const candidates: any[] = [m.uri, m.imageUri, m.videoUri];
            if (Array.isArray(m.media)) {
              for (const x of m.media) candidates.push(x?.uri);
            }
            return candidates.some((u) => typeof u === "string" && u.trim() && !/^https?:\/\//i.test(u));
          };

          cloud.forEach((m: any) => {
            const existing = byId.get(String(m?.id ?? ""));
            if (existing && hasLocalMediaUris(existing)) {
              byId.set(existing.id, {
                ...m,
                uri: existing.uri ?? m?.uri ?? null,
                imageUri: existing.imageUri ?? m?.imageUri ?? null,
                videoUri: existing.videoUri ?? m?.videoUri ?? null,
                media: Array.isArray(existing.media) && existing.media.length ? existing.media : m?.media,
              } as any);
            } else {
              byId.set(String(m?.id ?? ""), m);
            }
          });
          const merged = Array.from(byId.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          persistLocal(merged);
          setTimeout(() => {
            merged.forEach((m) => postToWeb({ type: "addMarker", marker: m }));
            initialSyncRef.current = true;
          }, 350);
          return merged;
        });
      } catch (e: any) {
        console.error("Cloud load failed", e);

        // ✅ No spam alerts; just keep local memories working
        if (!cloudWarnedRef.current && (e?.code === "permission-denied" || /insufficient permissions/i.test(e?.message))) {
          cloudWarnedRef.current = true;
        }
      }
    });

    return () => unsub();
  }, [persistLocal, postToWeb]);

  // reverse geocode for selected point
  useEffect(() => {
    const coord = selectedCoord;
    if (!coord) {
      setSelectedLocationName(null);
      setLocationFetching(false);
      return;
    }

    let mounted = true;

    async function fetchName(lat: number, lon: number) {
      setLocationFetching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const resp = await fetch(url, { headers: { "User-Agent": "MemoryMap/1.0 (local)" } });
        const json = await resp.json();

        if (!mounted) return;
        setSelectedLocationName(json?.display_name ?? null);
        } catch {
        if (!mounted) return;
        setSelectedLocationName(null);
      } finally {
        if (!mounted) return;
        setLocationFetching(false);
      }
    }

    fetchName(coord.latitude, coord.longitude);

    return () => {
      mounted = false;
    };
  }, [selectedCoord]);

  // search (Nominatim)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const q = query.trim();
    if (q.length < 3) {
      setSearching(false);
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&q=${encodeURIComponent(q)}`;
        const resp = await fetch(url, { headers: { "User-Agent": "MemoryMap/1.0 (local)" } });
        const json = await resp.json();
        setResults(Array.isArray(json) ? json : []);
        setShowResults(true);
      } catch {
        setResults([]);
        setShowResults(false);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  // ✅ Convert Android content:// URIs into file:// URIs in app cache (WebView-friendly)
  const normalizePickedUri = async (
    uri: string,
    fallbackExt: string,
    asset?: { mimeType?: string | null; fileName?: string | null }
  ) => {
    try {
      if (!uri) return uri;

      // Remote URLs are fine in WebView already
      if (/^https?:\/\//i.test(uri)) return uri;

      // iOS: convert HEIC/HEIF to JPEG so WebView + Android can display it
      if (Platform.OS === "ios") {
        const mt = (asset?.mimeType ?? "").toLowerCase();
        const fn = (asset?.fileName ?? "").toLowerCase();
        const isHeic =
          mt.includes("heic") ||
          mt.includes("heif") ||
          /\.(heic|heif)$/.test(fn) ||
          /\.(heic|heif)$/i.test(uri);

        if (isHeic) {
          try {
            const result = await ImageManipulator.manipulateAsync(
              uri,
              [],
              { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );
            return result.uri; // file://...jpg
          } catch {
            return uri; // fallback to original if conversion fails
          }
        }
        // non‑HEIC on iOS: just use as‑is
        return uri;
      }

      // Android: convert content:// to file:// in app cache (WebView-friendly)
      if (!uri.startsWith("content://")) return uri;

      const fromFileName = asset?.fileName && asset.fileName.includes(".") ? asset.fileName.split(".").pop() : null;
      const fromUri = uri.includes(".") ? uri.split(".").pop() : null;
      const extGuess = fromFileName || fromUri || fallbackExt || "jpg";

      const to = `${FileSystem.Paths.cache.uri}picked_${Date.now()}_${Math.random()
        .toString(16)
        .slice(2)}.${extGuess}`;

      await FileSystem.copyAsync({ from: uri, to });
      return to; // file://... in app cache
    } catch {
      return uri;
    }
  };

  // ✅ Pick multiple photos
  const pickImages = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 0.9,
      });

      if (res?.canceled) return;

      const assets = (res as any)?.assets ?? [];
      if (!assets.length) return;

      const picked = await Promise.all(
        assets
          .filter((a: any) => a?.uri)
          .map(async (a: any) => ({
            uri: await normalizePickedUri(a.uri, "jpg", { mimeType: a?.mimeType, fileName: a?.fileName }),
            type: "image" as const,
          }))
      );

      if (!picked.length) return;
      setMediaItems((cur) => [...cur, ...picked]);
    } catch {
      // ignore
    }
  };

  // ✅ Pick multiple videos
  const pickVideos = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 1,
      });

      if (res?.canceled) return;

      const assets = (res as any)?.assets ?? [];
      if (!assets.length) return;

      const picked = await Promise.all(
        assets
          .filter((a: any) => a?.uri)
          .map(async (a: any) => ({
            uri: await normalizePickedUri(a.uri, "mp4", { mimeType: a?.mimeType, fileName: a?.fileName }),
            type: "video" as const,
          }))
      );

      if (!picked.length) return;
      setMediaItems((cur) => [...cur, ...picked]);
    } catch {
      // ignore
    }
  };

  const onWebMessage = (event: any) => {
    try {
      const raw = event?.nativeEvent?.data;
      if (!raw) return;
      const msg = JSON.parse(raw);

      if (msg?.type === "mapPress" && typeof msg.lat === "number" && typeof msg.lng === "number") {
        handleMapPress(msg.lat, msg.lng);
        return;
      }

      if (msg?.type === "editMemory" && typeof msg.id === "string") {
        handleEditMemory(msg.id);
        return;
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* SEARCH BAR */}
      <View style={[styles.searchWrap, { backgroundColor: "transparent" }]}>
        <TextInput
          placeholder={searching ? "Searching..." : "Search places or addresses"}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.searchInput,
            { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border },
          ]}
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
          }}
        />
      </View>

      {showResults && results.length > 0 && (
        <View style={[styles.resultsDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <FlatList
            data={results}
            keyExtractor={(i) => i.place_id?.toString() ?? Math.random().toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                onPress={() => selectSuggestion(item)}
              >
                <Text numberOfLines={2} style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 13 }}>
                  {item?.display_name ?? "Result"}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Floating Add Memory button */}
      {showAddButton && selectedCoord && (
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          style={{
            position: "absolute",
            alignSelf: "center",
            bottom: 100,
            zIndex: 220,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setModalVisible(true)}
            style={[
              styles.addButton,
              {
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.addButtonText, { color: "#fff" }]}>+ Add Memory</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <WebView
        ref={(r) => {
          webviewRef.current = r;
        }}
        originWhitelist={["*"]}
        style={styles.map}
        javaScriptEnabled

        // ✅ allow local file access (needed for file:// images on markers/popup)
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"

        source={{ html: generateMapHTML(memories), baseUrl: "file:///" }}
        onMessage={onWebMessage}
      />

      {/* Simple bottom list (tap = open edit) */}
      <View style={styles.bottomList} pointerEvents="box-none">
        <FlatList
          data={memories}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const thumbUri =
              item.imageUri ||
              (Array.isArray(item.media)
                ? item.media.find((m) => m.type === "image")?.uri ?? null
                : null) ||
              item.uri ||
              null;

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleEditMemory(item.id)}
                style={[
                  styles.memCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    shadowColor: colors.textPrimary,
                  },
                ]}
              >
                {thumbUri && (
                  <Image source={{ uri: thumbUri }} style={styles.memThumb} />
                )}

                <View style={styles.memInfo}>
                  <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: "800" }}>
                    {item.title ?? "Untitled"}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}>
                    {item.description ?? item.note ?? "No details"}
                  </Text>

                  <View style={{ flexDirection: "row", marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={() => removeMemory(item.id)}
                      style={[styles.deleteBtnSmall, { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 }]}
                    >
                      <Text style={{ color: colors.textSecondary, fontWeight: "800", fontSize: 12 }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Add Memory Modal */}
      <AddMemoryModal
        visible={modalVisible}
        colors={colors}
        selectedCoord={selectedCoord}
        locationFetching={locationFetching}
        selectedLocationName={selectedLocationName}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        dateISO={dateISO}
        setDateISO={setDateISO}
        noteText={noteText}
        setNoteText={setNoteText}
        mediaItems={mediaItems}
        setMediaItems={setMediaItems}
        onPickImage={pickImages}
        onPickVideo={pickVideos}
        onSave={saveMemory}
        onClose={closeAddMemory}
      />

      {/* Video Modal (if you later use openVideo) */}
      <Modal visible={videoModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.videoModal, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: "800" }}>Video</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
              {videoUriToPlay ?? ""}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setVideoUriToPlay(null);
                setVideoModalVisible(false);
              }}
              style={{ marginTop: 14 }}
            >
              <Text style={{ color: colors.accent, fontWeight: "800" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ Delete confirmation modal */}
      <ConfirmDialog
        visible={confirmVisible}
        title="Delete memory?"
        message="This action cannot be undone."
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  videoModal: { width: "92%", borderRadius: 12, padding: 16, borderWidth: 1, alignItems: "center" },

  bottomList: { position: "absolute", bottom: 18, left: 0, right: 0, paddingHorizontal: 12 },
  memCard: {
    width: 260,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  memThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginLeft: 8,
    marginRight: 8,
    backgroundColor: "#ccc",
  },
  memInfo: { flex: 1, padding: 10 },
  deleteBtnSmall: { marginTop: 8 },

  searchWrap: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  resultsDropdown: {
    position: "absolute",
    top: 68,
    left: 12,
    right: 12,
    maxHeight: 260,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 60,
    paddingVertical: 6,
  },
  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
  },
  addButtonText: {
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});

function generateMapHTML(markers: any[]) {
  const markersJson = JSON.stringify(markers || []);
  return `
  <!doctype html>
  <html>
  <head>
    <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
    <style>
      html,body,#map{height:100%;margin:0;padding:0}
      .leaflet-popup-content img{max-width:100%;height:auto;border-radius:6px;}
      .pin-wrap { position: relative; width: 50px; height: 60px; display: flex; justify-content: center; align-items: center; }
      .pin-marker { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); background-position: center; background-size: cover; background-color: #eee; z-index: 2; }
      .pin-arrow { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 14px solid #fff; z-index: 1; }
    </style>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const markersData = ${markersJson};
      const map = L.map('map', { zoomControl: false }).setView([7.8731, 80.7718], 7);
      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      const permanentMarkers = {};
      let tempMarker = null;

      function esc(u) {
        // escape single quotes for use inside attribute + CSS url('...')
        return String(u || '').replace(/'/g, "%27");
      }

      function editMem(id) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'editMemory', id: id }));
      }

      function svgDataUrl(color, w=36, h=54) {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 24 36"><path d="M12 0C7.03 0 3 4.03 3 9c0 6.6 9 18 9 18s9-11.4 9-18c0-4.97-4.03-9-9-9z" fill="'+color+'"/><circle cx="12" cy="9" r="3.5" fill="#fff"/></svg>';
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
      }

      const icons = {
        note: L.icon({ iconUrl: svgDataUrl('#f59e0b'), iconSize: [36,54], iconAnchor: [18,54], popupAnchor: [0,-46] }),
        image: L.icon({ iconUrl: svgDataUrl('#06b6d4'), iconSize: [36,54], iconAnchor: [18,54], popupAnchor: [0,-46] }),
        video: L.icon({ iconUrl: svgDataUrl('#ef4444'), iconSize: [36,54], iconAnchor: [18,54], popupAnchor: [0,-46] }),
        temp: L.icon({ iconUrl: svgDataUrl('#6b7280',30,44), iconSize: [30,44], iconAnchor: [15,44], popupAnchor: [0,-36] })
      };

      function makePopupContent(m) {
        let content = '';
        if (m.title) content += '<div style="font-weight:700;margin-bottom:6px;">' + (m.title||'') + '</div>';
        if (m.date) content += '<div style="font-size:12px;color:#555;margin-bottom:6px;">' + (new Date(m.date)).toDateString() + '</div>';

        // Prefer an image for preview (videos won't render as <img>)
        let imgUri = m.imageUri || m.uri;
        if (!imgUri && m.media && m.media.length > 0) {
          const found = m.media.find(function(x){ return (x.type === 'image' || x.kind === 'image') && x.uri; });
          if (found) imgUri = found.uri;
        }

        if (imgUri) content += '<div><img src="'+esc(imgUri)+'" style="width:160px;height:90px;object-fit:cover;border-radius:6px"/></div>';
        if (m.description) content += '<div style="color:#111;margin-top:6px;">' + (m.description||'') + '</div>';
        if (m.note) content += '<div style="color:#111;margin-top:6px;">' + (m.note||'') + '</div>';

        content += '<div style="margin-top:12px;text-align:right;border-top:1px solid #eee;padding-top:8px;">';
        content += '<button onclick="editMem(\\'' + m.id + '\\')" style="background:#2563eb;color:white;border:none;padding:6px 12px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">Edit Memory</button>';
        content += '</div>';

        return content;
      }

      function addPermanent(m) {
        if (!m || !m.id) return;
        // If marker already exists (e.g. local load first, then cloud sync), refresh it.
        if (permanentMarkers[m.id]) {
          try { map.removeLayer(permanentMarkers[m.id]); } catch {}
          delete permanentMarkers[m.id];
        }

        let marker;

        let imgUri = m.imageUri || (m.type === 'image' ? m.uri : null);
        if (!imgUri && m.media && m.media.length > 0) {
          const found = m.media.find(function(x){ return (x.type === 'image' || x.kind === 'image') && x.uri; });
          if (found) imgUri = found.uri;
        }

        if (imgUri) {
          const html = \`
            <div class="pin-wrap">
              <div class="pin-marker" style="background-image: url('\${esc(imgUri)}')"></div>
              <div class="pin-arrow"></div>
            </div>\`;
          const icon = L.divIcon({ className: 'custom-div-icon', html: html, iconSize: [50, 60], iconAnchor: [25, 60], popupAnchor: [0, -60] });
          marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
        } else {
          const icon = icons[m.type] || icons.note;
          marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
        }

        marker.bindPopup(makePopupContent(m));
        permanentMarkers[m.id] = marker;
      }

      (markersData || []).forEach(addPermanent);

      function addTemp(m) {
        removeTemp();
        if (!m) return;
        tempMarker = L.marker([m.latitude, m.longitude], { icon: icons.temp, zIndexOffset: 2000 }).addTo(map);
      }

      function removeTemp() {
        if (tempMarker) {
          try { map.removeLayer(tempMarker); } catch {}
          tempMarker = null;
        }
      }

      map.on('click', function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress', lat: e.latlng.lat, lng: e.latlng.lng }));
      });

      function handleIncoming(d) {
        if (!d || !d.type) return;
        if (d.type === 'addMarker' && d.marker) addPermanent(d.marker);
        if (d.type === 'addTempMarker' && d.marker) addTemp(d.marker);
        if (d.type === 'removeTempMarker') removeTemp();
        if (d.type === 'removeMarker' && d.id) {
          if (permanentMarkers[d.id]) {
            try { map.removeLayer(permanentMarkers[d.id]); } catch {}
            delete permanentMarkers[d.id];
          }
        }
        if (d.type === 'panTo' && typeof d.lat === 'number' && typeof d.lng === 'number') {
          map.setView([d.lat, d.lng], d.zoom || 15, { animate: true });
        }
      }

      document.addEventListener('message', function(ev) {
        try { handleIncoming(JSON.parse(ev.data)); } catch {}
      });
      window.addEventListener('message', function(ev) {
        try { handleIncoming(JSON.parse(ev.data)); } catch {}
      });
    </script>
  </body>
  </html>
  `;
}
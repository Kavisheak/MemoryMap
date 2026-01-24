import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { WebView } from "react-native-webview";

import AddMemoryModal from "../../components/AddMemoryModal";
import { auth } from "../../src/firebase/config";
import { deleteMemoryCloud, listMemoriesCloud, upsertMemoryCloud } from "../../src/services/memories.service";
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
  const [mediaItems, setMediaItems] = useState<Array<{ uri: string; type: "image" | "video" }>>([]);
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

  // lazy require (so app won’t crash if missing)
  let ImagePicker: any = null;
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    ImagePicker = require("expo-image-picker");
  } catch (e) {
    ImagePicker = null;
  }

  const postToWeb = (obj: any) => {
    try {
      webviewRef.current?.postMessage(JSON.stringify(obj));
    } catch (e) {}
  };

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

  const panTo = (lat: number, lng: number, zoom = 15) => {
    postToWeb({ type: "panTo", lat, lng, zoom });
  };

  const openVideo = (uri: string) => {
    setVideoUriToPlay(uri);
    setVideoModalVisible(true);
  };

  const persistLocal = async (items: Memory[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e: any) {
      console.error("persistLocal failed", e);
      Alert.alert("Save failed", e?.message ?? "Could not save locally.");
    }
  };

  const removeMemory = (id: string) => {
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
      } catch (e) {}
    })();
  };

  const handleMapPress = (lat: number, lng: number) => {
    try {
      const id = `tmp_${Date.now()}`;
      setSelectedCoord({ latitude: lat, longitude: lng });
      setShowAddButton(true);
      addTempMarker(id, lat, lng, "New memory");
      setShowResults(false);
    } catch (e) {}
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
    } catch (e) {}
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

  const saveMemory = () => {
    if (!selectedCoord) return;

    const newId = editingId ? editingId : String(Date.now());
    const m: Memory = {
      id: newId,
      type: mediaItems.find((i) => i.type === "image")
        ? "image"
        : mediaItems.find((i) => i.type === "video")
        ? "video"
        : "note",
      uri: mediaItems[0]?.uri ?? null,
      imageUri: mediaItems.find((i) => i.type === "image")?.uri ?? null,
      videoUri: mediaItems.find((i) => i.type === "video")?.uri ?? null,
      media: mediaItems,

      note: noteText || undefined,
      title: title || undefined,
      description: description || undefined,
      date: dateISO || undefined,

      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,

      // ✅ store the human-readable place name you already fetched
      locationName: selectedLocationName ?? null,

      createdAt: editingId ? (memories.find((x) => x.id === editingId)?.createdAt || Date.now()) : Date.now(),
    };

    if (editingId) {
      setMemories((cur) => {
        const next = cur.map((x) => (x.id === editingId ? m : x));
        persistLocal(next);
        return next;
      });
      postToWeb({ type: "removeMarker", id: editingId });
      postToWeb({ type: "addMarker", marker: m });
    } else {
      setMemories((cur) => {
        const next = [m, ...cur];
        persistLocal(next);
        return next;
      });
      addPermanentMarkerToWeb(m);
    }

    removeTempMarker(tempMarkerId);
    setShowAddButton(false);

    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          throw new Error("Not signed in. Please sign in to save to Firebase.");
        }
        await upsertMemoryCloud(uid, m as any);
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
      if (!ImagePicker?.requestMediaLibraryPermissionsAsync) return;
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch (e) {}
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
  }, [params.focusLat, params.focusLng]);

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
  }, []);

  // load cloud after auth ready
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) return;
      try {
        const cloud = await listMemoriesCloud(user.uid);
        setMemories((cur) => {
          const byId = new Map<string, Memory>();
          cur.forEach((m) => byId.set(m.id, m));
          cloud.forEach((m: any) => byId.set(m.id, m));
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
  }, []);

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
      } catch (e) {
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
      } catch (e) {
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
  const normalizePickedUri = async (uri: string, fallbackExt: string) => {
    try {
      if (!uri) return uri;

      // Remote URLs are fine in WebView already
      if (/^https?:\/\//i.test(uri)) return uri;

      // iOS usually returns file:// already; keep it
      if (Platform.OS !== "android") return uri;

      // On Android, content:// often won't load inside WebView <img>/CSS backgrounds
      if (!uri.startsWith("content://")) return uri;

      const extGuess =
        (uri.includes(".") ? uri.split(".").pop() : null) ||
        fallbackExt ||
        "jpg";

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
    if (!ImagePicker?.launchImageLibraryAsync) return;

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
          .map((a: any) => a?.uri)
          .filter(Boolean)
          .map(async (uri: string) => ({
            uri: await normalizePickedUri(uri, "jpg"),
            type: "image" as const,
          }))
      );

      if (!picked.length) return;
      setMediaItems((cur) => [...cur, ...picked]);
    } catch (e) {}
  };

  // ✅ Pick multiple videos
  const pickVideos = async () => {
    if (!ImagePicker?.launchImageLibraryAsync) return;

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
          .map((a: any) => a?.uri)
          .filter(Boolean)
          .map(async (uri: string) => ({
            uri: await normalizePickedUri(uri, "mp4"),
            type: "video" as const,
          }))
      );

      if (!picked.length) return;
      setMediaItems((cur) => [...cur, ...picked]);
    } catch (e) {}
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
    } catch (e) {}
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
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleEditMemory(item.id)}
              style={[
                styles.memCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.border, shadowColor: colors.textPrimary },
              ]}
            >
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
          )}
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
            <TouchableOpacity onPress={() => setVideoModalVisible(false)} style={{ marginTop: 14 }}>
              <Text style={{ color: colors.accent, fontWeight: "800" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    width: 240,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
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
          const found = m.media.find(function(x){ return x.type === 'image' });
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
        if (permanentMarkers[m.id]) return;

        let marker;

        let imgUri = m.imageUri || (m.type === 'image' ? m.uri : null);
        if (!imgUri && m.media && m.media.length > 0) {
          const found = m.media.find(function(x){ return x.type === 'image' });
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
          try { map.removeLayer(tempMarker); } catch (e) {}
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
            try { map.removeLayer(permanentMarkers[d.id]); } catch (e) {}
            delete permanentMarkers[d.id];
          }
        }
        if (d.type === 'panTo' && typeof d.lat === 'number' && typeof d.lng === 'number') {
          map.setView([d.lat, d.lng], d.zoom || 15, { animate: true });
        }
      }

      document.addEventListener('message', function(ev) {
        try { handleIncoming(JSON.parse(ev.data)); } catch (e) {}
      });
      window.addEventListener('message', function(ev) {
        try { handleIncoming(JSON.parse(ev.data)); } catch (e) {}
      });
    </script>
  </body>
  </html>
  `;
}
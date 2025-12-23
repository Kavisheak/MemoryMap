import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  Button,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "../theme/ThemeProvider";

type MemoryType = "image" | "video" | "note";
type Memory = {
  id: string;
  type: MemoryType;
  uri?: string | null; // for image/video
  note?: string;
  title?: string;
  description?: string;
  date?: string;
  latitude: number;
  longitude: number;
  createdAt: number;
};

export default function Index() {
  const { colors } = useTheme();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [memoryType, setMemoryType] = useState<MemoryType>("note");
  const [inputUri, setInputUri] = useState("");
  const [noteText, setNoteText] = useState("");
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUriToPlay, setVideoUriToPlay] = useState<string | null>(null);
  const webviewRef = useRef<any>(null);
  const initialSyncRef = useRef(false);

  // title/description/date fields (modal)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateISO, setDateISO] = useState<string>(new Date().toISOString().slice(0, 10));

  // temp marker + add-button states
  const [tempMarkerId, setTempMarkerId] = useState<string | null>(null);
  const [showAddButton, setShowAddButton] = useState(false);

  // human-readable name for selected location
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const [locationFetching, setLocationFetching] = useState(false);

  // --- SEARCH STATES ---
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef<number | null>(null);

  // Optional: image picker and AsyncStorage (dynamic)
  let ImagePicker: any = null;
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    ImagePicker = require("expo-image-picker");
  } catch (e) {
    ImagePicker = null;
  }
  let AsyncStorage: any = null;
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    AsyncStorage = require("@react-native-async-storage/async-storage");
  } catch (e) {
    AsyncStorage = null;
  }

  useEffect(() => {
    async function requestPerms() {
      if (ImagePicker && ImagePicker.requestMediaLibraryPermissionsAsync) {
        try {
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        } catch (e) {}
      }
    }
    requestPerms();
  }, []);

  // load saved memories
  useEffect(() => {
    async function load() {
      if (!AsyncStorage || !AsyncStorage.getItem) return;
      try {
        const raw = await AsyncStorage.getItem("@memories_v1");
        if (raw) {
          const parsed: Memory[] = JSON.parse(raw);
          setMemories(parsed);

          // sync existing memories to webview without reloading it
          // wait a short moment for WebView to be ready
          window.setTimeout(() => {
            parsed.forEach((m) => {
              try { postToWeb({ type: "addMarker", marker: m }); } catch (e) {}
            });
            initialSyncRef.current = true;
          }, 350);
        }
      } catch (e) {}
    }
    load();
  }, []);

  // persist memories
  useEffect(() => {
    async function save() {
      if (!AsyncStorage || !AsyncStorage.setItem) return;
      try {
        await AsyncStorage.setItem("@memories_v1", JSON.stringify(memories));
      } catch (e) {}
    }
    save();
  }, [memories]);

  // debounce search
  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    if (!query) {
      setResults([]);
      setShowResults(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = window.setTimeout(async () => {
      await performSearch(query);
    }, 450);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const performSearch = async (q: string) => {
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}&addressdetails=1`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "MemoryMap/1.0 (example@local)" },
      });
      const json = await resp.json();
      setResults(Array.isArray(json) ? json : []);
      setShowResults(true);
    } catch (e) {
      setResults([]);
      setShowResults(false);
    } finally {
      setSearching(false);
    }
  };

  // helpers to communicate with WebView (temp/add/remove/pan)
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

  // when user selects suggestion -> pan and add temp marker + show add button
  const selectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    panTo(lat, lon, 15);

    // create a temp marker for visual feedback (distinct)
    const tmpId = `search-temp-${Date.now()}`;
    setSelectedCoord({ latitude: lat, longitude: lon });
    addTempMarker(tmpId, lat, lon, item.display_name);
    setShowAddButton(true);

    // set readable name immediately from suggestion (no reverse lookup needed)
    setSelectedLocationName(item.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);

    setShowResults(false);
    setQuery(item.display_name || `${lat}, ${lon}`);

    // DO NOT open modal here — modal opens only when user taps add button
  };

  // handle map click from WebView: add temp marker (distinct) and show add button
  const handleMapPress = (lat: number, lng: number) => {
    // clear any previous temp marker
    if (tempMarkerId) removeTempMarker(tempMarkerId);
    const tmpId = `tap-temp-${Date.now()}`;
    setSelectedCoord({ latitude: lat, longitude: lng });
    addTempMarker(tmpId, lat, lng, "Selected location");
    setShowAddButton(true);

    // DO NOT open modal automatically; open only when user presses the floating Add button
    // reset modal fields so when user opens it they start fresh
    setTitle("");
    setDescription("");
    setDateISO(new Date().toISOString().slice(0, 10));
    setMemoryType("note");
    setInputUri("");
    setNoteText("");
    // clear previous name until reverse-geocode completes
    setSelectedLocationName(null);
  };

  const pickFromDevice = async () => {
    if (!ImagePicker) {
      Alert.alert("Picker not installed", "Install expo-image-picker to pick files from device or enter a URL instead.");
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });
      if (!res.cancelled) {
        const uri = res.uri ?? (res.assets && res.assets[0]?.uri);
        if (uri) setInputUri(uri);
      }
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Could not open image picker");
    }
  };

  // save memory -> convert temp marker into permanent + persist
  const saveMemory = () => {
    if (!selectedCoord) return;
    if (memoryType !== "note" && !inputUri) {
      Alert.alert("Missing media", "Please pick or paste a media URL for image/video.");
      return;
    }

    if (!title?.trim()) {
      Alert.alert("Missing title", "Please enter a title for this memory.");
      return;
    }

    const m: Memory = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      type: memoryType,
      uri: inputUri || null,
      note: noteText || undefined,
      title: title.trim(),
      description: description?.trim() || undefined,
      date: dateISO || undefined,
      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,
      createdAt: Date.now(),
    };

    // persist in RN state (and AsyncStorage via useEffect)
    setMemories((cur) => [m, ...cur]);

    // convert temp -> permanent on map
    addPermanentMarkerToWeb(m);

    // remove temp marker if present
    if (tempMarkerId) removeTempMarker(tempMarkerId);

    // reset UI
    setModalVisible(false);
    setShowAddButton(false);
    setSelectedCoord(null);
    setTempMarkerId(null);
    setTitle("");
    setDescription("");
    setInputUri("");
    setNoteText("");
    setDateISO(new Date().toISOString().slice(0, 10));
  };

  // Ensure when webview becomes available later we sync any memories not yet sent
  useEffect(() => {
    if (!webviewRef.current) return;
    if (initialSyncRef.current) return;
    if (!memories || memories.length === 0) return;

    // send existing memories to webview once
    window.setTimeout(() => {
      memories.forEach((m) => {
        try { postToWeb({ type: "addMarker", marker: m }); } catch (e) {}
      });
      initialSyncRef.current = true;
    }, 350);
  }, [webviewRef.current, memories]);

  // reverse geocode selectedCoord to get nearest/place name
  useEffect(() => {
    if (!selectedCoord) {
      setSelectedLocationName(null);
      setLocationFetching(false);
      return;
    }
    let mounted = true;
    async function fetchName() {
      setLocationFetching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedCoord.latitude}&lon=${selectedCoord.longitude}&zoom=18&addressdetails=1`;
        const resp = await fetch(url, { headers: { "User-Agent": "MemoryMap/1.0 (example@local)" } });
        const json = await resp.json();
        if (!mounted) return;
        const name = json?.display_name ||
          (json?.address && (json.address.road || json.address.suburb || json.address.city || json.address.town || json.address.village || json.address.county)) ||
          `${selectedCoord.latitude.toFixed(5)}, ${selectedCoord.longitude.toFixed(5)}`;
        setSelectedLocationName(name);
      } catch (e) {
        if (!mounted) return;
        setSelectedLocationName(`${selectedCoord.latitude.toFixed(5)}, ${selectedCoord.longitude.toFixed(5)}`);
      } finally {
        if (mounted) setLocationFetching(false);
      }
    }
    fetchName();
    return () => { mounted = false; };
  }, [selectedCoord]);

  // ...existing JSX (unchanged) ...
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* SEARCH BAR */}
      <View style={[styles.searchWrap, { backgroundColor: "transparent" }]}>
        <TextInput
          placeholder="Search places or addresses"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
          }}
          style={[styles.searchInput, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
          onFocus={() => {
            if (results.length) setShowResults(true);
          }}
        />
        {searching ? <ActivityIndicator style={{ marginLeft: 8 }} /> : null}
      </View>

      {showResults && results.length > 0 && (
        <View style={[styles.resultsDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <FlatList
            data={results}
            keyExtractor={(i) => i.place_id?.toString() ?? Math.random().toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => selectSuggestion(item)} style={styles.resultItem}>
                <Text numberOfLines={1} style={{ color: colors.textPrimary }}>{item.display_name}</Text>
                <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12 }}>{item.type} • {item.class}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Floating "➕ Add Memory" button shown when a location is selected */}
      {showAddButton && selectedCoord && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => {
            setTitle("");
            setDescription("");
            setDateISO(new Date().toISOString().slice(0, 10));
            setMemoryType("note");
            setInputUri("");
            setNoteText("");
            setModalVisible(true);
          }}
        >
          <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>➕ Add Memory</Text>
        </TouchableOpacity>
      )}

      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        style={styles.map}
        javaScriptEnabled
        source={{ html: generateMapHTML(memories) }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === "mapPress") {
              handleMapPress(data.lat, data.lng);
            }
          } catch (e) {
            // ignore
          }
        }}
      />

      <View style={styles.bottomList} pointerEvents="box-none">
        <FlatList
          data={memories}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (item.type === "video" && item.uri) openVideo(item.uri);
                else {
                  try {
                    panTo(item.latitude, item.longitude, 16);
                  } catch (e) {}
                }
              }}
              activeOpacity={0.9}
            >
              <View style={[styles.memCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                {item.uri ? <Image source={{ uri: item.uri }} style={styles.memThumb} /> : <View style={styles.memThumbPlaceholder}><Text style={{ color: colors.textSecondary }}>No Preview</Text></View>}
                <View style={styles.memInfo}>
                  <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.title ?? item.type.toUpperCase()}</Text>
                  {item.date ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{new Date(item.date).toDateString()}</Text> : null}
                  {item.description ? <Text numberOfLines={1} style={{ color: colors.textSecondary }}>{item.description}</Text> : null}
                  <TouchableOpacity onPress={() => removeMemory(item.id)} style={styles.deleteBtnSmall}><Text style={{ color: '#ef4444' }}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Add Memory Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Memory</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Save a moment at the selected place</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => {
                setModalVisible(false);
                removeTempMarker(tempMarkerId);
                setSelectedCoord(null);
                setShowAddButton(false);
                setTempMarkerId(null);
                setSelectedLocationName(null);
              }}>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Location row */}
            <View style={[styles.locationRow, { borderColor: colors.border }]}>
              <View style={[styles.locationIcon, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 18 }}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={{ color: colors.textPrimary, fontWeight: "700" }}>
                  {selectedCoord ? (locationFetching ? "Fetching location…" : (selectedLocationName ?? `${selectedCoord.latitude.toFixed(5)}, ${selectedCoord.longitude.toFixed(5)}`)) : "No location selected"}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{selectedCoord ? "Nearest place / address" : "Tap map to choose location"}</Text>
              </View>
            </View>

            {/* Form fields */}
            <TextInput
              placeholder="Title"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            />

            <TextInput
              placeholder="Short description"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              style={[styles.inputMultiline, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
              multiline
            />

            <View style={styles.rowSpace}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 6, fontSize: 12 }}>Date</Text>
                <TextInput value={dateISO} onChangeText={setDateISO} placeholder={new Date().toISOString().slice(0,10)} placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]} />
              </View>
              <View style={{ width: 120 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 6, fontSize: 12 }}>Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity onPress={() => setMemoryType("note")} style={[styles.typeBtn, memoryType === "note" && styles.typeBtnActive, { borderColor: colors.border, backgroundColor: memoryType === "note" ? colors.primary : colors.surface }]}>
                    <Text style={{ color: memoryType === "note" ? "#fff" : colors.textPrimary }}>Note</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMemoryType("image")} style={[styles.typeBtn, memoryType === "image" && styles.typeBtnActive, { borderColor: colors.border, backgroundColor: memoryType === "image" ? colors.primary : colors.surface }]}>
                    <Text style={{ color: memoryType === "image" ? "#fff" : colors.textPrimary }}>Image</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 8 }} />
                <View style={styles.typeRow}>
                  <TouchableOpacity onPress={() => setMemoryType("video")} style={[styles.typeBtn, memoryType === "video" && styles.typeBtnActive, { borderColor: colors.border, backgroundColor: memoryType === "video" ? colors.primary : colors.surface }]}>
                    <Text style={{ color: memoryType === "video" ? "#fff" : colors.textPrimary }}>Video</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Media / Note field */}
            {memoryType !== "note" ? (
              <>
                <Text style={{ color: colors.textSecondary, marginVertical: 8 }}>Media URI</Text>
                <TextInput value={inputUri} onChangeText={setInputUri} placeholder="https://..." style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]} placeholderTextColor={colors.textSecondary} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <TouchableOpacity onPress={pickFromDevice} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.primaryBtnText]}>Pick from device</Text>
                  </TouchableOpacity>
                  {inputUri ? <Image source={{ uri: inputUri }} style={styles.mediaPreview} /> : null}
                </View>
              </>
            ) : (
              <>
                <TextInput value={noteText} onChangeText={setNoteText} placeholder="Enter a note" style={[styles.inputMultiline, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]} placeholderTextColor={colors.textSecondary} multiline />
              </>
            )}

            {/* Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity onPress={saveMemory} style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1, marginRight: 8 }]}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                removeTempMarker(tempMarkerId);
                setSelectedCoord(null);
                setShowAddButton(false);
                setTempMarkerId(null);
                setSelectedLocationName(null);
              }} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal visible={videoModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.videoModal, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {(() => {
              try {
                // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                const { Video } = require("expo-av");
                return (
                  // @ts-ignore
                  <Video source={{ uri: videoUriToPlay || undefined }} useNativeControls resizeMode="contain" style={{ width: "100%", height: 300 }} />
                );
              } catch (e) {
                return <View style={{ padding: 16 }}><Text style={{ color: colors.textPrimary }}>Install `expo-av` to play videos in-app.</Text></View>;
              }
            })()}

            <View style={{ marginTop: 12 }}>
              <Button title="Close" onPress={() => { setVideoModalVisible(false); setVideoUriToPlay(null); }} />
            </View>
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
  modal: { width: "92%", borderRadius: 12, padding: 16, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 8 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  typeRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 8 },
  typeBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "transparent" },
  typeBtnActive: { backgroundColor: "rgba(0,0,0,0.06)" },
  calloutContainer: { width: 150, padding: 6 },
  calloutText: { fontSize: 12 },
  preview: { width: 140, height: 80, borderRadius: 6, marginBottom: 6 },
  bottomList: { position: "absolute", bottom: 18, left: 0, right: 0, paddingHorizontal: 12 },
  memCard: { width: 240, marginRight: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, flexDirection: "row", alignItems: "center" },
  memThumb: { width: 80, height: 80 },
  memThumbPlaceholder: { width: 80, height: 80, justifyContent: "center", alignItems: "center" },
  memInfo: { flex: 1, padding: 8 },
  deleteBtnSmall: { marginTop: 8 },
  videoModal: { width: "92%", borderRadius: 12, padding: 16, borderWidth: 1, alignItems: 'center' },

  // search styles (top-left)
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
    borderBottomColor: "#eee",
  },

  // add button (when a location is selected)
  addButton: {
    position: "absolute",
    left: 12,
    bottom: 140,
    zIndex: 220,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 4,
  },
  addButtonText: { fontWeight: "700" },

  // modal specific styles
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  closeBtn: {
    padding: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#333",
    fontWeight: "500",
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 8,
  },
  inputMultiline: {
    maxHeight: 120,
  },
  rowSpace: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
});

function generateMapHTML(markers: any[]) {
  // markers: array of Memory
  const markersJson = JSON.stringify(markers || []);
  return `
  <!doctype html>
  <html>
  <head>
    <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
    <style>
      html,body,#map{height:100%;margin:0;padding:0}
      .leaflet-popup-content img{max-width:100%;height:auto;border-radius:6px;}
    </style>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const markersData = ${markersJson};
      // Default center set to Sri Lanka (approx. center)
      const map = L.map('map', { zoomControl: false }).setView([7.8731, 80.7718], 7);
      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      // keep references
      const permanentMarkers = {};
      let tempMarker = null;

      // make a tiny SVG pin as data URL
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
        if (m.uri) content += '<div><img src="'+m.uri+'" style="width:160px;height:90px;object-fit:cover;border-radius:6px"/></div>';
        if (m.description) content += '<div style="color:#111;margin-top:6px;">' + (m.description||'') + '</div>';
        if (m.note) content += '<div style="color:#111;margin-top:6px;">' + (m.note||'') + '</div>';
        return content;
      }

      function addPermanent(m) {
        if (!m || !m.id) return;
        // avoid duplicates
        if (permanentMarkers[m.id]) return;
        const icon = icons[m.type] || icons.note;
        const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
        marker.bindPopup(makePopupContent(m));
        permanentMarkers[m.id] = marker;
      }

      // init existing markers
      (markersData || []).forEach(addPermanent);

      // add a temporary visual marker (distinct style)
      function addTemp(m) {
        removeTemp();
        if (!m) return;
        // use marker with temp icon so it's visually a pin (not a circle)
        tempMarker = L.marker([m.latitude, m.longitude], { icon: icons.temp, zIndexOffset: 2000 }).addTo(map);
      }

      function removeTemp() {
        if (tempMarker) {
          try { map.removeLayer(tempMarker); } catch (e) {}
          tempMarker = null;
        }
      }

      // map click -> notify RN
      map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress', lat: lat, lng: lng }));
      });

      // handle messages from RN
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
          const z = d.zoom || 15;
          map.setView([d.lat, d.lng], z, { animate: true });
        }
      }

      document.addEventListener('message', function(ev) {
        try {
          const d = JSON.parse(ev.data);
          handleIncoming(d);
        } catch (e) {}
      });
      window.addEventListener('message', function(ev) {
        try {
          const d = JSON.parse(ev.data);
          handleIncoming(d);
        } catch (e) {}
      });
    </script>
  </body>
  </html>
  `;
}
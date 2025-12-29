import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router"; // Import router and params
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Button,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { WebView } from "react-native-webview";
import AddMemoryModal from "../../components/AddMemoryModal";
import { useTheme } from "../theme/ThemeProvider";

type MemoryType = "image" | "video" | "note";

type Memory = {
  id: string;
  type: MemoryType;

  uri?: string | null;

  // legacy single
  imageUri?: string | null;
  videoUri?: string | null;

  // ✅ new multi
  imageUris?: string[];
  videoUris?: string[];

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
  const params = useLocalSearchParams<{ focusLat?: string; focusLng?: string }>();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  // ✅ multiple media
  const [mediaItems, setMediaItems] = useState<Array<{ uri: string; type: "image" | "video" }>>([]);
  const [noteText, setNoteText] = useState("");

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUriToPlay, setVideoUriToPlay] = useState<string | null>(null);

  const webviewRef = useRef<any>(null);
  const initialSyncRef = useRef(false);

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

  // Handle focus params
  useEffect(() => {
    if (params.focusLat && params.focusLng) {
      const lat = parseFloat(params.focusLat);
      const lng = parseFloat(params.focusLng);
      // delay slightly to allow map to load if cold start
      setTimeout(() => {
        panTo(lat, lng, 16);
      }, 1000);
    }
  }, [params.focusLat, params.focusLng]);

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

  const removeMemory = (id: string) => {
    setMemories((cur) => cur.filter((m) => m.id !== id));
    postToWeb({ type: "removeMarker", id });
  };

  const closeAddMemory = () => {
    setModalVisible(false);
    setSelectedCoord(null);

    // reset inputs
    setTitle("");
    setDescription("");
    setDateISO(new Date().toISOString().slice(0, 10));
    setNoteText("");
    setDateISO(new Date().toISOString().slice(0, 10));
    setNoteText("");
    setMediaItems([]);
  };

  // load saved memories
  useEffect(() => {
    async function load() {
      if (!AsyncStorage || !AsyncStorage.getItem) return;
      try {
        const raw = await AsyncStorage.getItem("@memories_v1");
        if (raw) {
          const parsed: Memory[] = JSON.parse(raw);
          setMemories(parsed);

          setTimeout(() => {
            parsed.forEach((m) => {
              try {
                postToWeb({ type: "addMarker", marker: m });
              } catch (e) {}
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
    searchTimer.current = setTimeout(async () => {
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

  const selectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    panTo(lat, lon, 15);

    const tmpId = `search-temp-${Date.now()}`;
    setSelectedCoord({ latitude: lat, longitude: lon });
    addTempMarker(tmpId, lat, lon, item.display_name);
    setShowAddButton(true);

    setSelectedLocationName(item.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);

    setShowResults(false);
    setQuery(item.display_name || `${lat}, ${lon}`);
  };

  const handleMapPress = (lat: number, lng: number) => {
    if (tempMarkerId) removeTempMarker(tempMarkerId);
    const tmpId = `tap-temp-${Date.now()}`;
    setSelectedCoord({ latitude: lat, longitude: lng });
    addTempMarker(tmpId, lat, lng, "Selected location");
    setShowAddButton(true);

    // reset form fields
    setTitle("");
    setDescription("");
    setDateISO(new Date().toISOString().slice(0, 10));
    setDateISO(new Date().toISOString().slice(0, 10));
    setMediaItems([]);
    setNoteText("");
    setSelectedLocationName(null);
  };

  const pickImages = async () => {
    if (!ImagePicker) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    const canceled = (res as any).canceled ?? (res as any).cancelled ?? false;
    if (canceled) return;

    const assets = (res as any).assets ?? [];
    const newItems = assets.map((a: any) => ({ uri: a.uri, type: "image" }));
    if (!newItems.length) return;

    setMediaItems((cur) => [...cur, ...newItems]);
  };

  const pickVideos = async () => {
    if (!ImagePicker) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    const canceled = (res as any).canceled ?? (res as any).cancelled ?? false;
    if (canceled) return;

    const assets = (res as any).assets ?? [];
    const newItems = assets.map((a: any) => ({ uri: a.uri, type: "video" }));
    if (!newItems.length) return;

    setMediaItems((cur) => [...cur, ...newItems]);
  };

  const saveMemory = () => {
    if (!selectedCoord) return;

    const m: any = {
      id: String(Date.now()),
      type: mediaItems.find((i) => i.type === "image")
        ? "image"
        : mediaItems.find((i) => i.type === "video")
        ? "video"
        : "note",

      // legacy single
      uri: mediaItems[0]?.uri ?? null,
      imageUri: mediaItems.find((i) => i.type === "image")?.uri ?? null,
      videoUri: mediaItems.find((i) => i.type === "video")?.uri ?? null,

      // ✅ store all in 'media'
      media: mediaItems, // [{uri, type}, ...]

      note: noteText || undefined,
      title: title || undefined,
      description: description || undefined,
      date: dateISO || undefined,

      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,
      createdAt: Date.now(),
    };

    setMemories((cur) => [m, ...cur]);
    addPermanentMarkerToWeb(m);
    closeAddMemory();
  };

  useEffect(() => {
    if (!webviewRef.current) return;
    if (initialSyncRef.current) return;
    if (!memories || memories.length === 0) return;

    setTimeout(() => {
      memories.forEach((m) => {
        try {
          postToWeb({ type: "addMarker", marker: m });
        } catch (e) {}
      });
      initialSyncRef.current = true;
    }, 350);
  }, [memories]);

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
        const name =
          json?.display_name ||
          (json?.address &&
            (json.address.road ||
              json.address.suburb ||
              json.address.city ||
              json.address.town ||
              json.address.village ||
              json.address.county)) ||
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
    return () => {
      mounted = false;
    };
  }, [selectedCoord]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* SEARCH BAR */}
      <View style={[styles.searchWrap, { backgroundColor: "transparent" }]}>
        <TextInput
          placeholder="Search places or addresses"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.searchInput,
            { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border },
          ]}
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
                <Text numberOfLines={1} style={{ color: colors.textPrimary }}>
                  {item.display_name}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {item.type} • {item.class}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Floating "➕ Add Memory" button */}
      {/* Floating "➕ Add Memory" button - Modernized */}
      {showAddButton && selectedCoord && (
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          style={{
            position: "absolute",
            alignSelf: "center",
            bottom: 100, // slightly higher
            zIndex: 220,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.addButton,
              {
                backgroundColor: colors.accent, // Use accent color (blue)
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 12,
              },
            ]}
            onPress={() => {
              setTitle("");
              setDescription("");
              setDateISO(new Date().toISOString().slice(0, 10));
              setTitle("");
              setDescription("");
              setDateISO(new Date().toISOString().slice(0, 10));
              setMediaItems([]); // Unified
              setNoteText("");
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={[styles.addButtonText, { color: "#fff" }]}>Add Memory</Text>
          </TouchableOpacity>
        </Animated.View>
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
          } catch (e) {}
        }}
      />

      <View style={styles.bottomList} pointerEvents="box-none">
        <FlatList
          data={memories}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const thumbUri = item.imageUri ?? (item.type === "image" ? item.uri : null);

            return (
              <TouchableOpacity
                onPress={() => {
                  // Pass serialized data to detail view
                  router.push({
                    pathname: "/memory/[id]",
                    params: { id: item.id, data: JSON.stringify(item) },
                  });
                }}
                activeOpacity={0.9}
              >
                <View style={[styles.memCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  {thumbUri ? (
                    <Image source={{ uri: thumbUri }} style={styles.memThumb} />
                  ) : (
                    <View style={styles.memThumbPlaceholder}>
                      <Text style={{ color: colors.textSecondary }}>{item.type.toUpperCase()}</Text>
                    </View>
                  )}

                  <View style={styles.memInfo}>
                    <Text numberOfLines={1} style={{ color: colors.textPrimary, fontWeight: "700" }}>
                      {item.title ?? "Memory"}
                    </Text>
                    {item.date ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {new Date(item.date).toDateString()}
                      </Text>
                    ) : null}
                    {item.description ? (
                      <Text numberOfLines={1} style={{ color: colors.textSecondary }}>
                        {item.description}
                      </Text>
                    ) : null}
                    <TouchableOpacity onPress={() => removeMemory(item.id)} style={styles.deleteBtnSmall}>
                      <Text style={{ color: "#ef4444" }}>Delete</Text>
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
                  <Video
                    source={{ uri: videoUriToPlay || undefined }}
                    useNativeControls
                    resizeMode="contain"
                    style={{ width: "100%", height: 300 }}
                  />
                );
              } catch (e) {
                return (
                  <View style={{ padding: 16 }}>
                    <Text style={{ color: colors.textPrimary }}>Install `expo-av` to play videos in-app.</Text>
                  </View>
                );
              }
            })()}

            <View style={{ marginTop: 12 }}>
              <Button
                title="Close"
                onPress={() => {
                  setVideoModalVisible(false);
                  setVideoUriToPlay(null);
                }}
              />
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
  videoModal: { width: "92%", borderRadius: 12, padding: 16, borderWidth: 1, alignItems: "center" },

  bottomList: { position: "absolute", bottom: 18, left: 0, right: 0, paddingHorizontal: 12 },
  memCard: { width: 240, marginRight: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, flexDirection: "row", alignItems: "center" },
  memThumb: { width: 80, height: 80 },
  memThumbPlaceholder: { width: 80, height: 80, justifyContent: "center", alignItems: "center" },
  memInfo: { flex: 1, padding: 8 },
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
    borderBottomColor: "#eee",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999, // Pill shape
    // removed absolute positioning here as it's handled by wrapper now for centering
  },
  addButtonText: {
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
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

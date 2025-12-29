import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  colors: any;

  selectedCoord: { latitude: number; longitude: number } | null;
  locationFetching: boolean;
  selectedLocationName: string | null;

  title: string;
  setTitle: (s: string) => void;

  description: string;
  setDescription: (s: string) => void;

  dateISO: string;
  setDateISO: (s: string) => void;

  noteText: string;
  setNoteText: (s: string) => void;

  // ✅ Unified media items
  mediaItems: Array<{ uri: string; type: "image" | "video" }>;
  setMediaItems: (items: Array<{ uri: string; type: "image" | "video" }>) => void;

  onPickImage?: () => void;
  onPickVideo?: () => void;

  onSave: () => void;
  onClose: () => void;
};

export default function AddMemoryModal({
  visible,
  colors,
  selectedCoord,
  locationFetching,
  selectedLocationName,
  title,
  setTitle,
  description,
  setDescription,
  dateISO,
  setDateISO,
  noteText,
  setNoteText,
  mediaItems,
  setMediaItems,
  onPickImage,
  onPickVideo,
  onSave,
  onClose,
}: Props) {
  const locationLine = selectedCoord
    ? locationFetching
      ? "Fetching location…"
      : selectedLocationName ??
        `${selectedCoord.latitude.toFixed(5)}, ${selectedCoord.longitude.toFixed(5)}`
    : "No location selected";

  const canSave = useMemo(() => {
    const hasTitle = !!title.trim();
    const hasContent = !!noteText.trim() || mediaItems.length > 0;
    return !!selectedCoord && hasTitle && hasContent;
  }, [selectedCoord, title, noteText, mediaItems.length]);

  const c = {
    bg: colors?.cardBackground ?? "#ffffff",
    surface: colors?.surface ?? colors?.cardBackground ?? "#ffffff",
    border: colors?.border ?? "#e5e7eb",
    text: colors?.textPrimary ?? "#0f172a",
    sub: colors?.textSecondary ?? "#64748b",
    primary: colors?.primary ?? "#2563eb",
  };

  const [showNote, setShowNote] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showVideos, setShowVideos] = useState(false);

  useEffect(() => {
    if (noteText?.trim()) setShowNote(true);
    // Auto-expand media section if items exist is implicit in the new design (it's always visible or just a list)
    // but if we kept "Show" toggles, we need to fix them. 
    // Actually, in the new styling (Step 135), we added "Unified Media Section". 
    // Let's just remove the effect if it's not needed, or update it.
    // Simplifying to just check noteText.
  }, [noteText]);

  const removeMediaAt = (idx: number) => {
    const newItems = [...mediaItems];
    newItems.splice(idx, 1);
    setMediaItems(newItems);
  };

  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.chip,
        {
          borderColor: active ? c.primary : c.border,
          backgroundColor: active ? "rgba(37,99,235,0.10)" : c.surface,
        },
      ]}
    >
      <Text style={{ color: active ? c.primary : c.text, fontWeight: "900", fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.kav}>
          <View style={[s.sheet, { backgroundColor: c.bg, borderColor: c.border }]}>
            {/* Header */}
            <View style={s.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.h1, { color: c.text }]}>New Memory</Text>
                <Text numberOfLines={1} style={[s.h2, { color: c.sub }]}>
                  {locationLine}
                </Text>
              </View>

              <TouchableOpacity onPress={onClose} style={[s.iconBtn, { borderColor: c.border }]}>
                <Text style={[s.iconBtnText, { color: c.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView
              style={s.body}
              contentContainerStyle={s.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title / Date */}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: c.sub }]}>TITLE</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Give it a name"
                    placeholderTextColor={c.sub}
                    style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                    returnKeyType="next"
                  />
                </View>

                <View style={{ width: 120, marginLeft: 10 }}>
                  <Text style={[s.label, { color: c.sub }]}>DATE</Text>
                  <TextInput
                    value={dateISO}
                    onChangeText={setDateISO}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={c.sub}
                    style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                  />
                </View>
              </View>

              {/* Description */}
              <Text style={[s.label, { color: c.sub }]}>DESCRIPTION</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Short description..."
                placeholderTextColor={c.sub}
                style={[s.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
              />

              {/* Description */}
              {/* Unified Media Section */}
              <View style={{ marginTop: 24 }}>
                <View style={[s.sectionHeaderRow, { marginBottom: 12 }]}>
                  <Text style={[s.label, { color: c.sub, marginTop: 0, marginBottom: 0 }]}>MEDIA ({mediaItems.length})</Text>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity onPress={onPickImage} style={[s.smallBtn, { borderColor: c.border, backgroundColor: c.surface, marginRight: 8 }]}>
                      <Text style={{ color: c.text, fontWeight: "700", fontSize: 12 }}>+ Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onPickVideo} style={[s.smallBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
                      <Text style={{ color: c.text, fontWeight: "700", fontSize: 12 }}>+ Videos</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {mediaItems.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 14 }}>
                    {mediaItems.map((item, idx) => (
                      <View key={`${item.uri}-${idx}`} style={s.thumbWrap}>
                        <Image source={{ uri: item.uri }} style={[s.thumb, { backgroundColor: c.surface }]} />
                        {item.type === "video" && (
                          <View style={s.videoBadge}>
                            <Text style={{ fontSize: 10 }}>🎥</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => removeMediaAt(idx)}
                          style={[s.thumbX, { borderColor: c.border, backgroundColor: c.surface }]}
                        >
                          <Text style={{ color: c.text, fontWeight: "900", fontSize: 12 }}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={[s.emptyMediaBox, { borderColor: c.border, backgroundColor: c.surface }]}>
                    <Text style={{ color: c.sub, fontSize: 13 }}>No photos or videos added yet.</Text>
                  </View>
                )}
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[s.footer, { borderTopColor: c.border, backgroundColor: c.bg }]}>
              <TouchableOpacity
                onPress={onSave}
                disabled={!canSave}
                style={[s.primaryBtn, { backgroundColor: c.primary, opacity: canSave ? 1 : 0.55 }]}
              >
                <Text style={s.primaryBtnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={[s.secondaryBtn, { borderColor: c.border }]}>
                <Text style={[s.secondaryBtnText, { color: c.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 56, // your "little down"
  },
  kav: { width: "100%", alignItems: "center" },

  sheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "86%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },

  headerRow: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  h1: { fontSize: 18, fontWeight: "900" },
  h2: { marginTop: 2, fontSize: 12, lineHeight: 16 },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  iconBtnText: { fontSize: 16, fontWeight: "900" },

  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 14, paddingBottom: 10 },

  label: { fontSize: 12, fontWeight: "900", letterSpacing: 0.7, marginTop: 8, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "flex-start" },

  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  chipsRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8, marginBottom: 8 },

  textArea: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    maxHeight: 120,
    textAlignVertical: "top",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  smallBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 74,
  },

  mediaStrip: { paddingVertical: 10 },
  thumbWrap: { width: 84, height: 84, marginRight: 10 },
  thumb: { width: 84, height: 84, borderRadius: 16 },
  thumbX: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  videoRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  videoX: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  videoBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 2,
    borderRadius: 4,
  },
  emptyMediaBox: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
  },

  primaryBtn: { width: "100%", paddingVertical: 13, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  secondaryBtn: { width: "100%", paddingVertical: 12, borderRadius: 16, borderWidth: 1, alignItems: "center", marginTop: 8 },
  secondaryBtnText: { fontWeight: "900", fontSize: 15 },
});
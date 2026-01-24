import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
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
import { useTheme } from "../app/theme/ThemeProvider";

type Props = {
  visible: boolean;
  
  // Pass color object or use hook inside? 
  // keeping props for compatibility if parent passes them, 
  // but better to use hook if not passed or just ignore prop
  colors?: any; 

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

  mediaItems: Array<{ uri: string; type: "image" | "video" }>;
  setMediaItems: (items: Array<{ uri: string; type: "image" | "video" }>) => void;

  onPickImage?: () => void;
  onPickVideo?: () => void;

  onSave: () => void;
  onClose: () => void;
};

export default function AddMemoryModal({
  visible,
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
  const { colors } = useTheme(); // Use hook for consistency
  
  // Fallback for location text
  const locationLine = selectedCoord
    ? locationFetching
      ? "Fetching location…"
      : selectedLocationName ??
        `${selectedCoord.latitude.toFixed(4)}, ${selectedCoord.longitude.toFixed(4)}`
    : "No location selected";

  const canSave = useMemo(() => {
    const hasTitle = !!title.trim();
    // Allow saving if just title (and location implied)
    return !!selectedCoord && hasTitle;
  }, [selectedCoord, title]);

  const removeMediaAt = (idx: number) => {
    const newItems = [...mediaItems];
    newItems.splice(idx, 1);
    setMediaItems(newItems);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdropTouch} onPress={onClose} activeOpacity={1} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.keyboardView}
        >
          <View style={[s.sheet, { backgroundColor: colors.cardBackground }]}>
            {/* Drag Handle Indicator */}
            <View style={s.handleRow}>
              <View style={[s.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={[s.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={[s.headerTitle, { color: colors.textPrimary }]}>New Memory</Text>
              
              <TouchableOpacity 
                onPress={onSave} 
                disabled={!canSave} 
                hitSlop={10}
              >
                <Text style={[
                  s.saveText, 
                  { color: canSave ? colors.accent : colors.textSecondary, opacity: canSave ? 1 : 0.5 }
                ]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView 
              style={s.scroll} 
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Location Badge */}
              <View style={[s.locationBadge, { backgroundColor: colors.surface }]}>
                <Ionicons name="location" size={14} color={colors.accent} />
                <Text numberOfLines={1} style={[s.locationText, { color: colors.textSecondary }]}>
                  {locationLine}
                </Text>
              </View>

              {/* Title Input */}
              <View style={s.section}>
                <Text style={[s.label, { color: colors.textSecondary }]}>TITLE</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What is this moment?"
                  placeholderTextColor={colors.placeholder}
                  style={[s.inputTitle, { color: colors.textPrimary, borderBottomColor: colors.border }]}
                  autoFocus={false}
                />
              </View>

              {/* Date Input */}
              <View style={s.section}>
                <Text style={[s.label, { color: colors.textSecondary }]}>DATE</Text>
                 <TextInput
                  value={dateISO}
                  onChangeText={setDateISO}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.placeholder}
                  style={[s.input, { color: colors.textPrimary, backgroundColor: colors.surface }]}
                />
              </View>

              {/* Description Input */}
              <View style={s.section}>
                <Text style={[s.label, { color: colors.textSecondary }]}>DETAILS</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a description..."
                  placeholderTextColor={colors.placeholder}
                  multiline
                  style={[
                    s.inputMultiline, 
                    { color: colors.textPrimary, backgroundColor: colors.surface }
                  ]}
                />
              </View>

              {/* Media Section */}
              <View style={[s.section, { borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 20 }]}>
                <View style={s.mediaHeader}>
                   <Text style={[s.label, { color: colors.textSecondary, marginBottom: 0 }]}>PHOTOS & VIDEOS</Text>
                   <View style={s.mediaActions}>
                      <TouchableOpacity onPress={onPickImage} style={[s.mediaBtn, { backgroundColor: colors.surface }]}>
                          <Ionicons name="image-outline" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={onPickVideo} style={[s.mediaBtn, { backgroundColor: colors.surface }]}>
                          <Ionicons name="videocam-outline" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                   </View>
                </View>

                {mediaItems.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mediaScroll}>
                    {mediaItems.map((item, idx) => (
                      <View key={`${item.uri}-${idx}`} style={s.mediaItem}>
                        <Image source={{ uri: item.uri }} style={[s.mediaThumb, { backgroundColor: colors.surface }]} />
                        {item.type === "video" && (
                          <View style={s.videoBadge}>
                            <Ionicons name="videocam" size={10} color="#fff" />
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => removeMediaAt(idx)}
                          style={[s.removeMediaBtn, { backgroundColor: colors.cardBackground }]}
                        >
                          <Ionicons name="close" size={12} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <TouchableOpacity onPress={onPickImage} style={[s.emptyMedia, { borderColor: colors.border }]}>
                     <Ionicons name="images-outline" size={24} color={colors.placeholder} />
                     <Text style={{ color: colors.placeholder, fontSize: 13, marginTop: 4 }}>Add photos or videos</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)", // Dim backdrop
  },
  backdropTouch: {
    flex: 1,
  },
  keyboardView: {
    width: "100%",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    height: "85%", // Tall sheet
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    paddingBottom: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    opacity: 0.8,
  },
  inputTitle: {
    fontSize: 22,
    fontWeight: "600",
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  mediaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  mediaActions: {
      flexDirection: 'row',
  },
  mediaBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
  },
  mediaScroll: {
      marginHorizontal: -4,
  },
  mediaItem: {
      width: 100,
      height: 100,
      borderRadius: 12,
      marginRight: 12,
      overflow: 'hidden',
  },
  mediaThumb: {
      width: '100%',
      height: '100%',
  },
  videoBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 4,
      borderRadius: 4,
  },
  removeMediaBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
  },
  emptyMedia: {
      height: 100,
      borderWidth: 1,
      borderRadius: 12,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
  },
});

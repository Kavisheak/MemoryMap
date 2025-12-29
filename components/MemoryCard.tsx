import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../app/theme/ThemeProvider";

type MemoryCardType = "photo" | "voice" | "note";

type Props = {
  title: string;
  subtitle?: string;
  location?: string;
  date?: string;
  imageUri?: string;
  memoryType?: MemoryCardType;
  onPress?: () => void;
  onDelete?: () => void;
};

export default function MemoryCard({
  title,
  subtitle,
  location,
  date,
  imageUri,
  memoryType = "photo",
  onPress,
  onDelete,
}: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        s.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      {/* Left Media / Icon */}
      <View style={[s.mediaBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.image} />
        ) : (
          <Ionicons
            name={memoryType === "voice" ? "mic" : memoryType === "note" ? "document-text" : "image"}
            size={24}
            color={colors.accent}
          />
        )}
      </View>

      {/* Center Content */}
      <View style={s.content}>
        <View style={s.topRow}>
          <Text numberOfLines={1} style={[s.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {date ? <Text style={[s.date, { color: colors.date }]}>{new Date(date).toLocaleDateString()}</Text> : null}
        </View>

        <Text numberOfLines={1} style={[s.subtitle, { color: colors.textSecondary }]}>
          {subtitle || "No description"}
        </Text>

        <View style={s.footerRow}>
          {location ? (
            <View style={s.locationTag}>
              <Ionicons name="location-sharp" size={10} color={colors.accent} style={{ marginRight: 4 }} />
              <Text numberOfLines={1} style={[s.locationText, { color: colors.textSecondary }]}>
                {location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right Action */}
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={s.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    // Soft shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mediaBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: "rgba(0,0,0,0.03)", // optional subtle bg
    // paddingHorizontal: 6,
    // paddingVertical: 2,
    // borderRadius: 6,
  },
  locationText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deleteBtn: {
    paddingLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
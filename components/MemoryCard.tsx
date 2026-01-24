import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../app/theme/ThemeProvider";

type MemoryCardType = "photo" | "voice" | "note";

type Props = {
  title: string;
  subtitle?: string;
  location?: string;
  date?: string | number | Date;
  imageUri?: string;
  memoryType?: MemoryCardType;
  onPress?: () => void;
  onDelete?: () => void;

  // ✅ new
  onShare?: () => void;
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
  onShare, // ✅ new
}: Props) {
  const { colors } = useTheme();

  // Formatting date to match "5/20/2024" style
  const formattedDate = (() => {
    if (!date) return "";
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
  })();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
      {/* 1. Image / Icon */}
      <View style={s.imageContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={s.image}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[s.placeholder, { backgroundColor: colors.surface ?? colors.cardBackground }]}>
             <Ionicons 
                name={memoryType === 'note' ? 'document-text' : 'mic'} 
                size={32} 
                color={colors.accent} 
             />
          </View>
        )}
      </View>

      {/* 2. Content Column */}
      <View style={s.contentContainer}>
        {/* Top Row: Title & Date */}
        <View style={s.headerRow}>
          <Text numberOfLines={1} style={[s.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {!!formattedDate && <Text style={[s.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>}
        </View>

        {/* Middle: Description */}
        {!!subtitle && (
          <Text numberOfLines={2} style={[s.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}

        {/* Bottom: Location */}
        {!!location && (
          <View style={s.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.accent} style={{ marginRight: 6 }} />
            <Text numberOfLines={1} style={[s.locationText, { color: colors.textPrimary }]}>
              {location}
            </Text>
          </View>
        )}
      </View>

      {/* ✅ Actions (Share + Delete) */}
      {(!!onShare || !!onDelete) && (
        <View style={s.actions}>
          {!!onShare && (
            <TouchableOpacity onPress={onShare} style={s.actionBtn} hitSlop={14}>
              <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {!!onDelete && (
            <TouchableOpacity onPress={onDelete} style={s.actionBtn} hitSlop={14}>
              <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 0, // Handled by separator
    alignItems: 'center',

    // Shadow matching the reference
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
      default: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
    }),
  },
  imageContainer: {
    marginRight: 14,
  },
  image: {
    width: 78,
    height: 78,
    borderRadius: 18,
  },
  placeholder: {
    width: 78,
    height: 78,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    paddingRight: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end", // Align baseline
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.2,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.85,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    opacity: 0.85,
    marginBottom: 6,
  },
  locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  locationText: {
      fontSize: 12,
      fontWeight: '700',
      opacity: 0.92,
      flex: 1,
  },
  actions: {
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginLeft: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

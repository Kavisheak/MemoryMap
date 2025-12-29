import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  title: string;
  subtitle?: string;
  location?: string;
  date: string | number | Date;
  imageUri?: string | null;
  memoryType?: "photo" | "voice" | "note";
  onPress?: () => void;
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
};

function formatDate(d: Props["date"]) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default memo(function MemoryCard({
  title,
  subtitle,
  location,
  date,
  imageUri,
  memoryType = "photo",
  onPress,
  onDelete,
  style,
}: Props) {
  const formattedDate = formatDate(date);
  const { colors } = useTheme();

  const getTypeIcon = () => {
    switch (memoryType) {
      case "voice":
        return "mic";
      case "note":
        return "document-text";
      default:
        return "image";
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.cardBackground,
          shadowColor: colors.textPrimary,
        },
        style,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: colors.placeholder },
            ]}
          >
            <Ionicons name={getTypeIcon()} size={48} color={colors.separator} />
          </View>
        )}

        <View style={[styles.badge, { backgroundColor: "transparent" }]}>
          <Ionicons name={getTypeIcon()} size={16} color="#ffffff" />
        </View>

        {onDelete && (
          <Pressable
            style={[styles.deleteBtn, { backgroundColor: "transparent" }]}
            onPress={onDelete}
          >
            <Ionicons name="trash" size={22} color="#ef4444" />
          </Pressable>
        )}

        <View style={styles.textOverlay}>
          <Text
            numberOfLines={2}
            style={[styles.title]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              numberOfLines={1}
              style={[styles.subtitle]}
            >
              {subtitle}
            </Text>
          )}

          <View style={styles.metaRow}>
            {location && (
              <>
                <Ionicons
                  name="location"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.location]}
                >
                  {location}
                </Text>
              </>
            )}
            {location && formattedDate && (
              <Text style={[styles.separator]}>
                •
              </Text>
            )}
            {formattedDate && (
              <Text style={[styles.date]}>
                {formattedDate}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 250,
    backgroundColor: "#f1f5f9",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 16 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
    lineHeight: 26,

    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 6,

    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  location: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    flex: 1,

    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  date: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",

    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  separator: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",

    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  textOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "transparent",
    padding: 8,
    borderRadius: 8,
    color: "#ffffff",
  },
});

import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../app/theme/ThemeProvider";

type Props = {
  visible: boolean;
  title: string;
  location?: string;
  dateText?: string;
  link: string;
  onClose: () => void;
  onCopyLink: () => void;
  onShare: () => void;
};

export default function ShareOptionsModal({
  visible,
  title,
  location,
  dateText,
  link,
  onClose,
  onCopyLink,
  onShare,
}: Props) {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />

        <View
          style={[
            s.sheet,
            {
              backgroundColor: colors.cardBackground,
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.10)",
            },
          ]}
        >
          <View style={s.handleRow}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={s.header}>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Share memory</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[s.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.metaTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {title}
            </Text>
            {!!location && (
              <View style={s.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={[s.metaText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {location}
                </Text>
              </View>
            )}
            {!!dateText && (
              <View style={s.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[s.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {dateText}
                </Text>
              </View>
            )}
          </View>

          <View style={[s.linkCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.linkLabel, { color: colors.textSecondary }]}>Link</Text>
              <Text style={[s.linkText, { color: colors.textPrimary }]} numberOfLines={2}>
                {link}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onCopyLink}
              activeOpacity={0.9}
              style={[s.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.04)" }]}
            >
              <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={s.actions}>
            <TouchableOpacity
              onPress={onCopyLink}
              activeOpacity={0.9}
              style={[
                s.actionBtn,
                s.actionSecondary,
                {
                  borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(2,6,23,0.10)",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.04)",
                },
              ]}
            >
              <Ionicons name="link-outline" size={18} color={colors.textPrimary} />
              <Text style={[s.actionText, { color: colors.textPrimary }]}>Copy link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onShare}
              activeOpacity={0.9}
              style={[s.actionBtn, s.actionPrimary, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={[s.actionText, { color: "#fff" }]}>Share…</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.9}
              style={[
                s.cancelBtn,
                {
                  borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(2,6,23,0.10)",
                  backgroundColor: colors.cardBackground,
                },
              ]}
            >
              <Text style={[s.cancelText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 8,
  },
  handleRow: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    opacity: 0.9,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  metaCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    opacity: 0.95,
  },

  linkCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    opacity: 0.85,
  },
  linkText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  actions: {
    marginTop: 14,
    gap: 10,
  },
  actionBtn: {
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  actionSecondary: {
    borderWidth: 1,
  },
  actionPrimary: {},
  actionText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  cancelBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "900",
  },
});

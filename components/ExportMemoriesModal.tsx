import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../app/theme/ThemeProvider";

export type ExportStatus = "idle" | "working" | "ready" | "error";

type Props = {
  visible: boolean;
  infoLine?: string;
  status: ExportStatus;
  fileUri?: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onExport: () => void;
  onShare: () => void;
  onCopyPath: () => void;
};

export default function ExportMemoriesModal({
  visible,
  infoLine,
  status,
  fileUri,
  errorMessage,
  onClose,
  onExport,
  onShare,
  onCopyPath,
}: Props) {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  const canExport = status !== "working";
  const canShare = status === "ready" && !!fileUri;

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
            <View style={s.headerLeft}>
              <View style={[s.iconBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, { color: colors.textPrimary }]}>Export memories</Text>
                {!!infoLine && <Text style={[s.subtitle, { color: colors.textSecondary }]}>{infoLine}</Text>}
              </View>
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {status === "working" ? (
              <View style={s.rowCenter}>
                <ActivityIndicator color={colors.accent} />
                <Text style={[s.cardText, { color: colors.textSecondary }]}>Preparing export…</Text>
              </View>
            ) : status === "ready" ? (
              <View>
                <View style={s.rowCenter}>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  <Text style={[s.cardText, { color: colors.textSecondary }]}>Export ready</Text>
                </View>

                {!!fileUri && (
                  <View style={[s.pathBox, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                    <Text style={[s.pathLabel, { color: colors.textSecondary }]}>File</Text>
                    <Text style={[s.pathText, { color: colors.textPrimary }]} numberOfLines={2}>
                      {fileUri}
                    </Text>
                    <TouchableOpacity
                      onPress={onCopyPath}
                      style={[
                        s.pathCopyBtn,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.04)" },
                      ]}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : status === "error" ? (
              <View>
                <View style={s.rowCenter}>
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text style={[s.cardText, { color: colors.textSecondary }]}>Export failed</Text>
                </View>
                {!!errorMessage && (
                  <Text style={[s.errorText, { color: colors.textSecondary }]}>{errorMessage}</Text>
                )}
              </View>
            ) : (
              <Text style={[s.cardText, { color: colors.textSecondary }]}>
                Export creates a JSON file you can share or keep as a backup.
              </Text>
            )}
          </View>

          <View style={s.actions}>
            <TouchableOpacity
              onPress={onExport}
              disabled={!canExport}
              activeOpacity={0.9}
              style={[
                s.btn,
                { backgroundColor: colors.accent, opacity: canExport ? 1 : 0.55 },
              ]}
            >
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={s.btnText}>Export JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onShare}
              disabled={!canShare}
              activeOpacity={0.9}
              style={[
                s.btn,
                s.btnSecondary,
                {
                  borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(2,6,23,0.10)",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.04)",
                  opacity: canShare ? 1 : 0.5,
                },
              ]}
            >
              <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
              <Text style={[s.btnText, { color: colors.textPrimary }]}>Share file</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.9}
              style={[
                s.btn,
                s.btnSecondary,
                {
                  borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(2,6,23,0.10)",
                  backgroundColor: colors.cardBackground,
                },
              ]}
            >
              <Text style={[s.btnText, { color: colors.textPrimary }]}>Done</Text>
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
  handleRow: { alignItems: "center", paddingVertical: 6 },
  handle: { width: 44, height: 4, borderRadius: 999, opacity: 0.9 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: "700", opacity: 0.9 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardText: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  errorText: { marginTop: 10, fontSize: 12, fontWeight: "700", lineHeight: 17 },

  pathBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    position: "relative",
  },
  pathLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" },
  pathText: { marginTop: 6, fontSize: 12, fontWeight: "800", lineHeight: 16, paddingRight: 44 },
  pathCopyBtn: {
    position: "absolute",
    right: 10,
    top: 28,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  actions: { marginTop: 14, gap: 10 },
  btn: {
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnSecondary: { borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.2, color: "#fff" },
});

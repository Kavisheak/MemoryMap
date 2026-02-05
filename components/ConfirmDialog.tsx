import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../app/theme/ThemeProvider";

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  visible,
  title = "Confirm",
  message = "",
  confirmText = "Delete",
  cancelText = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.backdrop} onPress={onCancel}>
        <Pressable
          onPress={() => {}}
          style={[
            s.card,
            {
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.10)",
              backgroundColor: isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)",
            },
          ]}
        >
          <View
            style={[
              s.accentStrip,
              { backgroundColor: isDark ? "rgba(59,130,246,0.25)" : "rgba(37,99,235,0.12)" },
            ]}
          />

          <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>

          {!!message && (
            <Text style={[s.message, { color: colors.textSecondary }]}>{message}</Text>
          )}

          <View style={s.actions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onCancel}
              style={[
                s.btn,
                s.btnGhost,
                {
                  borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(2,6,23,0.10)",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.04)",
                },
              ]}
            >
              <Text style={[s.btnGhostText, { color: colors.textPrimary }]}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onConfirm}
              style={[
                s.btn,
                s.btnPrimary,
                { backgroundColor: destructive ? "#ef4444" : colors.accent },
              ]}
            >
              <Text style={s.btnPrimaryText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22, // ✅ curved
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  accentStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    paddingTop: 6,
  },
  message: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 6, // ✅ correct padding for message
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    borderWidth: 1,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: "900",
  },
  btnPrimary: {},
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },
});
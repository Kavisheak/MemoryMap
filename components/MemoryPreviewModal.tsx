import Ionicons from "@expo/vector-icons/Ionicons";
import { ResizeMode, Video } from "expo-av";
import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../app/theme/ThemeProvider";

type MediaItem = { kind: "image" | "video"; uri: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  location: string;
  date?: string;
  media: MediaItem[];
};

const PREVIEW_INTRO_MS = 1800;
const PREVIEW_IMAGE_MS = 2500;

export default function MemoryPreviewModal({ visible, onClose, title, location, date, media }: Props) {
  const { colors } = useTheme();

  const [phase, setPhase] = React.useState<"intro" | "media">("intro");
  const [idx, setIdx] = React.useState(0);
  const didFinishGuardRef = React.useRef<string | null>(null);

  const close = React.useCallback(() => {
    didFinishGuardRef.current = null;
    setPhase("intro");
    setIdx(0);
    onClose();
  }, [onClose]);

  const advance = React.useCallback(() => {
    if (!media?.length) return close();

    setIdx((cur) => {
      const next = cur + 1;
      if (next >= media.length) {
        setTimeout(() => close(), 0);
        return cur;
      }
      didFinishGuardRef.current = null;
      return next;
    });
  }, [close, media]);

  // Reset when opened
  React.useEffect(() => {
    if (!visible) return;
    didFinishGuardRef.current = null;
    setPhase("intro");
    setIdx(0);
  }, [visible]);

  // Intro timer → start media
  React.useEffect(() => {
    if (!visible) return;
    if (phase !== "intro") return;

    const t = setTimeout(() => setPhase("media"), PREVIEW_INTRO_MS);
    return () => clearTimeout(t);
  }, [visible, phase]);

  // Image timer → auto advance
  React.useEffect(() => {
    if (!visible) return;
    if (phase !== "media") return;

    const item = media?.[idx];
    if (!item) return;
    if (item.kind !== "image") return;

    const t = setTimeout(() => advance(), PREVIEW_IMAGE_MS);
    return () => clearTimeout(t);
  }, [advance, idx, media, phase, visible]);

  const item = media?.[idx];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropPress} onPress={close} />

        <View style={[s.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Top progress */}
          <View style={s.progressRow}>
            {(media || []).map((_, i) => {
              const done = phase === "media" && i < idx;
              const active = phase === "media" && i === idx;
              return (
                <View
                  key={i}
                  style={[
                    s.progressSeg,
                    {
                      backgroundColor: done ? colors.accent : colors.border,
                      opacity: active ? 1 : done ? 1 : 0.6,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Close */}
          <TouchableOpacity onPress={close} style={s.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {phase === "intro" ? (
            <View style={s.introWrap}>
              <Text style={[s.introTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {title}
              </Text>
              <Text style={[s.introMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                {location}
              </Text>
              {!!date && <Text style={[s.introMeta, { color: colors.textSecondary, marginTop: 6 }]}>{date}</Text>}
              <View style={{ height: 18 }} />
              <Text style={[s.introHint, { color: colors.textSecondary }]}>Preview starting…</Text>
            </View>
          ) : (
            <View style={s.mediaWrap}>
              {item?.kind === "video" ? (
                <Video
                  source={{ uri: item.uri }}
                  style={s.media}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping={false}
                  useNativeControls={false}
                  onPlaybackStatusUpdate={(st: any) => {
                    if (!st?.didJustFinish) return;

                    const key = `${idx}:${item.uri}`;
                    if (didFinishGuardRef.current === key) return;
                    didFinishGuardRef.current = key;

                    advance();
                  }}
                />
              ) : (
                <Image source={{ uri: item?.uri }} style={s.media} resizeMode="contain" />
              )}

              {/* Caption overlay */}
              <View style={s.captionBar}>
                <Text style={s.captionTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={s.captionMeta} numberOfLines={1}>
                  {location}
                </Text>
              </View>

              {/* Tap zones */}
              <View style={s.tapZones}>
                <Pressable style={s.tapLeft} onPress={() => setIdx((cur) => Math.max(0, cur - 1))} />
                <Pressable style={s.tapRight} onPress={advance} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 16,
  },
  backdropPress: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    height: "78%",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  progressSeg: { flex: 1, height: 3, borderRadius: 999 },
  closeBtn: { position: "absolute", top: 10, right: 10, zIndex: 5, padding: 8 },

  introWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  introTitle: { fontSize: 24, fontWeight: "900", textAlign: "center" },
  introMeta: { fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 10, opacity: 0.9 },
  introHint: { fontSize: 12, fontWeight: "700", opacity: 0.85 },

  mediaWrap: { flex: 1, backgroundColor: "#000" },
  media: { width: "100%", height: "100%" },

  captionBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  captionTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  captionMeta: { marginTop: 2, color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" },

  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },
});
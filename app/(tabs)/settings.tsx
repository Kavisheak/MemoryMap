import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function Settings() {
  const { theme, toggleTheme, colors } = useTheme();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  // Modals state
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.accent }]}>{title.toUpperCase()}</Text>
  );

  const SettingItem = ({
    icon,
    label,
    onPress,
    rightElement,
    color,
  }: {
    icon: string;
    label: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    color?: string;
  }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.item, { borderBottomColor: colors.border }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon as any} size={20} color={color || colors.textPrimary} />
        </View>
        <Text style={[styles.itemLabel, { color: color || colors.textPrimary }]}>{label}</Text>
      </View>
      {rightElement ? (
        rightElement
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* APP SETTINGS */}
        <SectionHeader title="Preferences" />
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <SettingItem
            icon="moon"
            label="Dark Mode"
            rightElement={
              <Switch
                value={theme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={"#fff"}
              />
            }
          />
          <SettingItem
            icon="notifications"
            label="Notifications"
            rightElement={
              <Switch
                value={isNotificationsEnabled}
                onValueChange={setIsNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={"#fff"}
              />
            }
          />
        </View>

        {/* ACCOUNT (Placeholder) */}
        <SectionHeader title="Account" />
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <SettingItem icon="person" label="Account Details" onPress={() => {}} />
          <SettingItem icon="lock-closed" label="Security" onPress={() => {}} />
        </View>

        {/* SUPPORT */}
        <SectionHeader title="Support" />
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <SettingItem icon="shield-checkmark" label="Privacy Policy" onPress={() => setPrivacyVisible(true)} />
          <SettingItem icon="help-buoy" label="Help & Feedback" onPress={() => setHelpVisible(true)} />
          <SettingItem icon="information-circle" label="About MemoryMap" onPress={() => {}} />
        </View>

        {/* DANGER ZONE */}
        <View style={{ marginTop: 20 }}>
          <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <SettingItem
              icon="log-out-outline"
              label="Log Out"
              onPress={() => {}}
              color="#ef4444"
              rightElement={<View />} // hide chevron
            />
          </View>
        </View>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>v1.0.0 (Build 102)</Text>
      </ScrollView>

      {/* PRIVACY MODAL */}
      <Modal visible={privacyVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
            <TouchableOpacity onPress={() => setPrivacyVisible(false)} style={styles.closeBtn}>
              <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ color: colors.textPrimary, lineHeight: 24 }}>
              <Text style={{ fontWeight: "700" }}>1. Data Collection</Text>{"\n"}
              We collect location data only when you explicitly add a memory. Your photos and notes are stored locally on your device.{"\n\n"}
              <Text style={{ fontWeight: "700" }}>2. Usage</Text>{"\n"}
              We do not sell your personal data. We use map services to display your memories.{"\n\n"}
              <Text style={{ fontWeight: "700" }}>3. Security</Text>{"\n"}
              Your memories are precious. We implement standard security measures to protect your local data.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* HELP MODAL */}
      <Modal visible={helpVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
           <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Help & Feedback</Text>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.closeBtn}>
              <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, marginBottom: 10 }}>
              Need assistance?
            </Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
              If you encounter any issues with the map or memory syncing, please try restarting the app.{"\n\n"}
              For feedback, please email us at:{"\n"}
              <Text style={{ color: colors.accent, fontWeight: "700" }}>support@memorymap.app</Text>
            </Text>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 1,
    marginLeft: 4,
  },
  sectionBlock: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 12,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "center", // Title centered
    alignItems: "center",
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  closeBtn: { position: "absolute", right: 16 },
});

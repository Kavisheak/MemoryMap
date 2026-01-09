import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { router } from "expo-router";
import { signOutUser } from "../../src/services/auth.service";

export default function Settings() {
  const { theme, toggleTheme, colors } = useTheme();
  
  // -- Notification Persistence --
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem("settings.notifications");
        if (val !== null) {
          setIsNotificationsEnabled(JSON.parse(val));
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    })();
  }, []);

  const handleNotificationToggle = async (val: boolean) => {
    setIsNotificationsEnabled(val);
    try {
      await AsyncStorage.setItem("settings.notifications", JSON.stringify(val));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  // -- Modals State --
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [securityVisible, setSecurityVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  // -- Logout Handler --
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOutUser();
            router.replace("/sign-in");
          } catch (e: any) {
            Alert.alert("Logout failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
  };

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

  // Reusable Modal Layout
  const SettingsModal = ({ 
    visible, 
    onClose, 
    title, 
    children 
  }: { 
    visible: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode 
  }) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
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
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={"#fff"}
              />
            }
          />
        </View>

        {/* ACCOUNT */}
        <SectionHeader title="Account" />
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <SettingItem 
            icon="person" 
            label="Account Details" 
            onPress={() => setAccountVisible(true)} 
          />
          <SettingItem 
            icon="lock-closed" 
            label="Security" 
            onPress={() => setSecurityVisible(true)} 
          />
        </View>

        {/* SUPPORT */}
        <SectionHeader title="Support" />
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <SettingItem icon="shield-checkmark" label="Privacy Policy" onPress={() => setPrivacyVisible(true)} />
          <SettingItem icon="help-buoy" label="Help & Feedback" onPress={() => setHelpVisible(true)} />
          <SettingItem icon="information-circle" label="About MemoryMap" onPress={() => setAboutVisible(true)} />
        </View>

        {/* DANGER ZONE */}
        <View style={{ marginTop: 20 }}>
          <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <SettingItem
              icon="log-out-outline"
              label="Log Out"
              onPress={handleLogout}
              color="#ef4444"
              rightElement={<View />} // hide chevron
            />
          </View>
        </View>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>v1.0.0 (Build 102)</Text>
      </ScrollView>

      {/* --- MODALS --- */}

      {/* ACCOUNT MODAL */}
      <SettingsModal visible={accountVisible} onClose={() => setAccountVisible(false)} title="Account">
         <View style={{ alignItems: "center", marginBottom: 30 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
               <Ionicons name="person" size={40} color={colors.textSecondary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary }}>Demo User</Text>
            <Text style={{ color: colors.textSecondary }}>user@memorymap.app</Text>
         </View>
         
         <View style={{ marginBottom: 20 }}>
             <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12, fontWeight: "600" }}>FULL NAME</Text>
             <TextInput 
                value="Demo User" 
                editable={false}
                style={{ 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    borderRadius: 8, 
                    padding: 12, 
                    color: colors.textPrimary,
                    backgroundColor: colors.surface 
                }} 
            />
         </View>

         <View>
             <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12, fontWeight: "600" }}>EMAIL</Text>
             <TextInput 
                value="user@memorymap.app" 
                editable={false}
                style={{ 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    borderRadius: 8, 
                    padding: 12, 
                    color: colors.textPrimary,
                    backgroundColor: colors.surface 
                }} 
            />
         </View>
      </SettingsModal>

      {/* SECURITY MODAL */}
      <SettingsModal visible={securityVisible} onClose={() => setSecurityVisible(false)} title="Security">
          <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginBottom: 20 }]}>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]} onPress={() => Alert.alert("Reset Password", "A password reset link has been sent to your email.")}>
                <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Change Password</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 }}>
             <Text style={{ fontSize: 16, color: colors.textPrimary }}>Two-Factor Authentication</Text>
             <Switch value={false} onValueChange={() => Alert.alert("Coming Soon", "2FA will be available in a future update.")} trackColor={{ false: colors.border, true: colors.accent }} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
             Add an extra layer of security to your account.
          </Text>
      </SettingsModal>

      {/* PRIVACY MODAL */}
      <SettingsModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} title="Privacy Policy">
        <Text style={{ color: colors.textPrimary, lineHeight: 24 }}>
          <Text style={{ fontWeight: "700" }}>1. Data Collection</Text>{"\n"}
          We collect location data only when you explicitly add a memory. Your photos and notes are stored locally on your device.{"\n\n"}
          <Text style={{ fontWeight: "700" }}>2. Usage</Text>{"\n"}
          We do not sell your personal data. We use map services to display your memories.{"\n\n"}
          <Text style={{ fontWeight: "700" }}>3. Security</Text>{"\n"}
          Your memories are precious. We implement standard security measures to protect your local data.
        </Text>
      </SettingsModal>

      {/* HELP MODAL */}
      <SettingsModal visible={helpVisible} onClose={() => setHelpVisible(false)} title="Help & Feedback">
         <Text style={{ color: colors.textPrimary, fontSize: 16, marginBottom: 10 }}>
            Need assistance?
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
            If you encounter any issues with the map or memory syncing, please try restarting the app.{"\n\n"}
            For feedback, please email us at:{"\n"}
            <Text style={{ color: colors.accent, fontWeight: "700" }}>support@memorymap.app</Text>
          </Text>
      </SettingsModal>

      {/* ABOUT MODAL */}
      <SettingsModal visible={aboutVisible} onClose={() => setAboutVisible(false)} title="About">
         <View style={{ alignItems: "center", paddingTop: 20 }}>
             <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                 <Ionicons name="map" size={40} color="#fff" />
             </View>
             <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textPrimary, marginBottom: 8 }}>MemoryMap</Text>
             <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 30 }}>Preserve your journey.</Text>
             
             <Text style={{ textAlign: "center", lineHeight: 22, color: colors.textPrimary }}>
                MemoryMap is designed to help you organize and revisit your favorite moments on a map. 
                Built with React Native and Expo.
             </Text>

             <Text style={{ marginTop: 40, color: colors.textSecondary, fontSize: 12 }}>
                © 2025 MemoryMap Inc. All rights reserved.
             </Text>
         </View>
      </SettingsModal>

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
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  closeBtn: { position: "absolute", right: 16 },
});

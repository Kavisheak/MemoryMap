import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { router } from "expo-router";
import { signOutUser } from "../../src/services/auth.service";
import { auth } from "../../src/firebase/config";
import { sendPasswordResetEmail, deleteUser } from "firebase/auth";
import * as FileSystem from "expo-file-system";
import { deleteAllMemoriesCloud } from "../../src/services/memories.service";

const STORAGE_KEY = "@memories_v1";

export default function Settings() {
  const { theme, toggleTheme, colors } = useTheme();
  
  // User state
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // -- Notification Persistence --
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem("settings.notifications");
        if (val !== null) {
          setIsNotificationsEnabled(JSON.parse(val));
        }
      } catch {
        console.error("Failed to load settings");
      }
    })();
  }, []);

  const handleNotificationToggle = async (val: boolean) => {
    setIsNotificationsEnabled(val);
    try {
      await AsyncStorage.setItem("settings.notifications", JSON.stringify(val));
    } catch {
      console.error("Failed to save settings");
    }
  };

  // -- Modals State --
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [securityVisible, setSecurityVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [dataVisible, setDataVisible] = useState(false);

  // -- Storage Info --
  const [storageInfo, setStorageInfo] = useState<{ count: number; size: string } | null>(null);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const memories = raw ? JSON.parse(raw) : [];
      const count = Array.isArray(memories) ? memories.length : 0;
      
      // Estimate size (rough calculation)
      const sizeBytes = raw ? new Blob([raw]).size : 0;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      setStorageInfo({ count, size: `${sizeMB} MB` });
    } catch {
      setStorageInfo({ count: 0, size: "0 MB" });
    }
  };

  // -- Export Memories --
  const handleExportMemories = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        Alert.alert("No Data", "You don't have any memories to export.");
        return;
      }

      const data = JSON.parse(raw);
      const jsonString = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `memories_${timestamp}.json`;
      
      const fileUri = `${FileSystem.Paths.cache.uri}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Try to share the file
      try {
        await Share.share({
          title: "Export Memories",
          message: `Memories exported on ${timestamp}`,
          url: fileUri,
        });
        Alert.alert("Success", "Memories exported successfully!");
      } catch {
        // Fallback: show file location
        Alert.alert("Export Ready", `Export file saved. You can access it from: ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e?.message ?? "Could not export memories.");
    } finally {
      setLoading(false);
    }
  };

  // -- Clear Cache --
  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will remove all locally stored memories. Cloud data will remain. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setStorageInfo({ count: 0, size: "0 MB" });
              Alert.alert("Success", "Cache cleared successfully.");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not clear cache.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllMemories = () => {
    Alert.alert(
      "Delete All Memories",
      "This will permanently delete all memories from this device and your Firebase cloud (if signed in). This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              // Always clear local
              await AsyncStorage.removeItem(STORAGE_KEY);
              setStorageInfo({ count: 0, size: "0 MB" });

              // Clear cloud (best-effort)
              const uid = auth.currentUser?.uid;
              if (uid) {
                await deleteAllMemoriesCloud(uid);
              }

              Alert.alert("Success", uid ? "Deleted local + cloud memories." : "Deleted local memories (not signed in).\nCloud was not cleared.");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not delete memories.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // -- Password Reset --
  const handlePasswordReset = () => {
    if (!user?.email) {
      Alert.alert("Error", "No email address found. Please sign in first.");
      return;
    }

    Alert.alert(
      "Reset Password",
      `Send a password reset link to ${user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              setLoading(true);
              await sendPasswordResetEmail(auth, user.email!);
              Alert.alert("Success", "Password reset email sent! Check your inbox.");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not send reset email.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // -- Delete Account --
  const handleDeleteAccount = () => {
    if (!user) {
      Alert.alert("Error", "You must be signed in to delete your account.");
      return;
    }

    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all cloud data. This action cannot be undone. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              // Note: deleteUser requires recent authentication
              // In production, you'd want to re-authenticate first
              await deleteUser(user);
              await signOutUser();
              Alert.alert("Account Deleted", "Your account has been permanently deleted.");
              router.replace("/sign-in");
            } catch (e: any) {
              setLoading(false);
              if (e?.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Re-authentication Required",
                  "Please sign out and sign in again, then try deleting your account."
                );
              } else {
                Alert.alert("Error", e?.message ?? "Could not delete account.");
              }
            }
          },
        },
      ]
    );
  };

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
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}
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

        {/* DATA MANAGEMENT */}
        <SectionHeader title="Data" />
        <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <SettingItem 
            icon="cloud-download" 
            label="Export Memories" 
            onPress={handleExportMemories}
          />
          <SettingItem 
            icon="trash" 
            label="Clear Cache" 
            onPress={handleClearCache}
            color="#ef4444"
          />
          {storageInfo && (
            <View style={[styles.item, { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                  <Ionicons name="stats-chart" size={20} color={colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Storage</Text>
                  <Text style={[styles.itemSubtext, { color: colors.textSecondary }]}>
                    {storageInfo.count} memories • {storageInfo.size}
                  </Text>
                </View>
              </View>
            </View>
          )}
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
          {user && (
            <View style={[styles.item, { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                  <Ionicons name="cloud" size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>Cloud Sync</Text>
                  <Text style={[styles.itemSubtext, { color: colors.accent }]}>Active</Text>
                </View>
              </View>
            </View>
          )}
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
            {user && (
              <SettingItem
                icon="trash-outline"
                label="Delete Account"
                onPress={handleDeleteAccount}
                color="#ef4444"
                rightElement={<View />}
              />
            )}
            <SettingItem
              icon="log-out-outline"
              label="Log Out"
              onPress={handleLogout}
              color={user ? "#ef4444" : colors.textSecondary}
              rightElement={<View />}
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
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary }}>
              {user?.displayName || "Guest User"}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {user?.email || "Not signed in"}
            </Text>
            {user?.emailVerified === false && (
              <Text style={{ color: "#f59e0b", marginTop: 8, fontSize: 12 }}>
                Email not verified
              </Text>
            )}
         </View>
         
         <View style={{ marginBottom: 20 }}>
             <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12, fontWeight: "600" }}>FULL NAME</Text>
             <TextInput 
                value={user?.displayName || "Not set"} 
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

         <View style={{ marginBottom: 20 }}>
             <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12, fontWeight: "600" }}>EMAIL</Text>
             <TextInput 
                value={user?.email || "Not signed in"} 
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

         {user && (
           <View>
             <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12, fontWeight: "600" }}>USER ID</Text>
             <TextInput 
                value={user.uid} 
                editable={false}
                style={{ 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    borderRadius: 8, 
                    padding: 12, 
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    fontSize: 11,
                    fontFamily: "monospace"
                }} 
            />
           </View>
         )}
      </SettingsModal>

      {/* SECURITY MODAL */}
      <SettingsModal visible={securityVisible} onClose={() => setSecurityVisible(false)} title="Security">
          <View style={[styles.sectionBlock, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginBottom: 20 }]}>
            <TouchableOpacity 
              style={[styles.item, { borderBottomColor: colors.border }]} 
              onPress={handlePasswordReset}
              disabled={!user}
            >
                <Text style={[styles.itemLabel, { color: user ? colors.textPrimary : colors.textSecondary }]}>Change Password</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 }}>
             <Text style={{ fontSize: 16, color: colors.textPrimary }}>Two-Factor Authentication</Text>
             <Switch 
               value={false} 
               onValueChange={() => Alert.alert("Coming Soon", "2FA will be available in a future update.")} 
               trackColor={{ false: colors.border, true: colors.accent }}
               thumbColor={"#fff"}
             />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
             Add an extra layer of security to your account.
          </Text>

          {!user && (
            <View style={{ marginTop: 20, padding: 16, backgroundColor: colors.surface, borderRadius: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                Sign in to access security settings
              </Text>
            </View>
          )}
      </SettingsModal>

      {/* DATA MANAGEMENT MODAL */}
      <SettingsModal visible={dataVisible} onClose={() => setDataVisible(false)} title="Data Management">
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 8 }}>Storage Information</Text>
          {storageInfo ? (
            <View style={{ padding: 16, backgroundColor: colors.surface, borderRadius: 12 }}>
              <Text style={{ color: colors.textPrimary, marginBottom: 4 }}>
                Memories: {storageInfo.count}
              </Text>
              <Text style={{ color: colors.textPrimary }}>
                Size: {storageInfo.size}
              </Text>
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary }}>Loading...</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accent, marginBottom: 12 }]}
          onPress={handleExportMemories}
        >
          <Ionicons name="cloud-download" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Export Memories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
          onPress={handleClearCache}
        >
          <Ionicons name="trash" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Clear Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#b91c1c", marginTop: 12 }]}
          onPress={handleDeleteAllMemories}
          disabled={loading}
        >
          <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#fff", fontWeight: "700" }}>{loading ? "Working..." : "Delete All (Local + Cloud)"}</Text>
        </TouchableOpacity>
      </SettingsModal>

      {/* PRIVACY MODAL */}
      <SettingsModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} title="Privacy Policy">
        <Text style={{ color: colors.textPrimary, lineHeight: 24 }}>
          <Text style={{ fontWeight: "700" }}>1. Data Collection</Text>{"\n"}
          We collect location data only when you explicitly add a memory. Your photos and notes are stored locally on your device.{"\n\n"}
          <Text style={{ fontWeight: "700" }}>2. Usage</Text>{"\n"}
          We do not sell your personal data. We use map services to display your memories.{"\n\n"}
          <Text style={{ fontWeight: "700" }}>3. Security</Text>{"\n"}
          Your memories are precious. We implement standard security measures to protect your local data.{"\n\n"}
          <Text style={{ fontWeight: "700" }}>4. Cloud Storage</Text>{"\n"}
          When signed in, your memories are synced to Firebase. You can export or delete your data at any time from Settings.
        </Text>
      </SettingsModal>

      {/* HELP MODAL */}
      <SettingsModal visible={helpVisible} onClose={() => setHelpVisible(false)} title="Help & Feedback">
         <Text style={{ color: colors.textPrimary, fontSize: 16, marginBottom: 10, fontWeight: "700" }}>
            Need assistance?
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: 20 }}>
            If you encounter any issues with the map or memory syncing, please try restarting the app.{"\n\n"}
            For feedback, please email us at:{"\n"}
            <Text style={{ color: colors.accent, fontWeight: "700" }}>support@memorymap.app</Text>
          </Text>

          <View style={{ marginTop: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, marginBottom: 10, fontWeight: "700" }}>
              How to Use
            </Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
              • Tap on the map to add a new memory{"\n"}
              • Add photos, videos, or notes to your memories{"\n"}
              • View all memories in the Memories tab{"\n"}
              • Tap a memory to see full details{"\n"}
              • Sign in to sync memories across devices
            </Text>
          </View>
      </SettingsModal>

      {/* ABOUT MODAL */}
      <SettingsModal visible={aboutVisible} onClose={() => setAboutVisible(false)} title="About">
         <View style={{ alignItems: "center", paddingTop: 20 }}>
             <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                 <Ionicons name="map" size={40} color="#fff" />
             </View>
             <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textPrimary, marginBottom: 8 }}>MemoryMap</Text>
             <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 30 }}>Preserve your journey.</Text>
             
             <Text style={{ textAlign: "center", lineHeight: 22, color: colors.textPrimary, marginBottom: 20 }}>
                MemoryMap is designed to help you organize and revisit your favorite moments on a map. 
                Built with React Native and Expo.
             </Text>

             <View style={{ width: "100%", marginTop: 20 }}>
               <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center", marginBottom: 8 }}>
                 Version 1.0.0 (Build 102)
               </Text>
               <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                 © 2025 MemoryMap Inc. All rights reserved.
               </Text>
             </View>
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
  itemSubtext: {
    fontSize: 12,
    marginTop: 2,
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
});

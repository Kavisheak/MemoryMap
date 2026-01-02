import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function SignUpScreen() {
  const router = useRouter();

  const handleSignUp = () => {
    // Navigate to tabs
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background with Gradient */}
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop" }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.5 }]}
        resizeMode="cover"
      />
      
      <LinearGradient
        colors={["rgba(10,10,30,0.5)", "rgba(10,10,30,0.8)", "#0f172a"]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.header}>
            <Text style={styles.title}>Join the Journey</Text>
            <Text style={styles.subtitle}>Create an account to start mapping your memories.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(1000).springify()} style={styles.formContainer}>
            
            {/* Name Field */}
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#94a3b8" />
                    <TextInput
                        placeholder="John Doe"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                    />
                </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                    <TextInput
                        placeholder="you@example.com"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputWrapper}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                    <TextInput
                        placeholder="Create a strong password"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                        secureTextEntry
                    />
                </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity onPress={handleSignUp} activeOpacity={0.8}>
                <LinearGradient
                    colors={["#a855f7", "#ec4899"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signUpButton}
                >
                    <Text style={styles.signUpButtonText}>Create Account</Text>
                </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.orText}>or sign up with</Text>
                <View style={styles.line} />
            </View>

             <TouchableOpacity style={styles.googleButton} activeOpacity={0.8} onPress={() => alert('Google Sign Up Mock')}>
                <Image 
                    source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png" }}
                    style={{ width: 20, height: 20, marginRight: 10 }}
                />
                <Text style={styles.googleText}>Google</Text>
             </TouchableOpacity>

        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/sign-in" asChild>
                <TouchableOpacity>
                    <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
            </Link>
        </Animated.View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  // ✅ centered + more top/bottom padding + constrained width
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 56,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
    maxWidth: 420,
  },

  // ✅ smaller title/subtitle
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 12,
  },

  // ✅ remove `gap` + constrain width
  formContainer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },

  inputWrapper: {
    marginBottom: 16,
  },

  label: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    marginBottom: 8,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12, // ✅ slightly smaller
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },

  input: {
    flex: 1,
    marginLeft: 12,
    color: "white",
    fontSize: 15,
  },

  signUpButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14, // ✅ slightly smaller
    borderRadius: 16,
    marginTop: 6,
    shadowColor: "#ec4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  signUpButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  orText: {
    color: "#64748b",
    marginHorizontal: 16,
    fontSize: 13,
  },

  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 16,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
    width: "100%",
    maxWidth: 420,
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  signInLink: {
    color: "#a855f7",
    fontWeight: "bold",
    fontSize: 14,
  },
});

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
  Easing,
  Keyboard,
} from "react-native";
import { Ionicons, SimpleLineIcons } from "@expo/vector-icons";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from "../../assets/constants/fonts";
import { useDispatch } from "react-redux";
import { signIn } from "../../store/authSlice";
import { AppDispatch } from "../../store";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ForgotPasswordModal from "../../components/ForgotPasswordModal";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🤝",
    text: "Rejoignez une communauté engagée de professionnels de santé",
  },
  {
    emoji: "🧠",
    text: "Accédez à la meilleure veille scientifique personnalisée",
  },
  {
    emoji: "❤️",
    text: "Liker, mettre en favoris et retrouver facilement vos articles préférés",
  },
  {
    emoji: "🔔",
    text: "Choisissez à votre rythme d’être notifié : chaque jour ou chaque semaine",
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastLoginMethod, setLastLoginMethod] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem("lastLoginMethod").then(setLastLoginMethod);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const resultAction = await dispatch(signIn({ email, password }));
      if (signIn.fulfilled.match(resultAction)) {
        await AsyncStorage.setItem("lastLoginMethod", "Mail");
        router.replace("/(app)");
      } else {
        if (resultAction.payload) {
          Alert.alert(
            "Erreur de connexion",
            (resultAction.payload as any).message ||
              "Email ou mot de passe incorrect."
          );
        } else {
          Alert.alert(
            "Erreur de connexion",
            (resultAction.error as any).message ||
              "Email ou mot de passe incorrect."
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.message ||
          "Une erreur est survenue lors de la tentative de connexion."
      );
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#111" }}
    >
      {/* Header avec flèche retour et titre */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 60,
          paddingBottom: 18,
          paddingHorizontal: 18,
          backgroundColor: "#000",
          borderBottomWidth: .4,
          borderColor: "#919191",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 6, borderRadius: 100, borderColor: "grey", borderWidth: .5, width: 30, height: 30, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="keyboard-arrow-left" size={24} color="#fff" style={{ transform: [{ translateX: -5 }, { translateY: -3 }] }} />
          {/* <Ionicons name="arrow-back" size={26} color="#fff" /> */}
        </TouchableOpacity>
        <Text
          style={{
            fontWeight: "bold",
            color: "#fff",
            flex: 1,
            textAlign: "center",
            marginRight: 36,
          }}
        >
          se connecter
        </Text>
      </View>
      {/* Formulaire */}
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        {/* Input email */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 46,
            borderRadius: 24,
            backgroundColor: "#000",
            borderWidth: .5,
            borderColor: "#919191",
            marginBottom: 10,
            paddingHorizontal: 18,
          }}
        >
          <TextInput
            style={{ flex: 1, color: "#fff", fontSize: 16, height: "100%" }}
            placeholder="adresse email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => {}}
          />
        </View>
        {/* Input mot de passe */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "black",
            alignItems: "center",
            height: 46,
            borderRadius: 24,
            borderWidth: .5,
            borderColor: "#919191",
            marginBottom: 8,
            paddingHorizontal: 18,
            position: "relative",
          }}
        >
          <TextInput
            style={{ flex: 1, color: "#fff", fontSize: 16, height: "100%" }}
            placeholder="mot de passe"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={{
              position: "absolute",
              right: 20,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              zIndex: 2,
            }}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#aaa"
            />
          </TouchableOpacity>
        </View>
        {/* Mot de passe oublié */}
        <View style={{ alignItems: "flex-start", marginTop: 12, marginBottom: 18 }}>
          <Text style={{ color: "#fff", fontSize: 14 }}>
            Mot de passe oublié ?{" "}
            <Text
              style={{ color: "#2196F3", fontWeight: "500" }}
              onPress={() => setShowForgotPasswordModal(true)}
            >
              cliquez ici.
            </Text>
          </Text>
        </View>
        {/* Bouton se connecter */}
        <TouchableOpacity
          style={{
            backgroundColor: email && password ? "#fff" : "#a3a3a3",
            borderRadius: 24,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            opacity: email && password ? 1 : 0.5,
          }}
          onPress={handleLogin}
          disabled={!email || !password || loading}
        >
        {loading ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={{ color: "#121212" }}>se connecter</Text>
          )}
        </TouchableOpacity>
        {/* Séparateur "ou avec" */}
        {/* <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222', marginHorizontal: 8 }} />
          <Text style={{ color: '#888', fontSize: 15 }}>ou avec</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222', marginHorizontal: 8 }} />
        </View> */}
        {/* Social login */}
        {/* <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          <TouchableOpacity style={{ backgroundColor: '#222', borderRadius: 32, width: 54, height: 54, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10, borderWidth: 2, borderColor: '#333' }}>
            <Ionicons name="logo-apple" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#222', borderRadius: 32, width: 54, height: 54, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10, borderWidth: 2, borderColor: '#333' }}>
            <Ionicons name="logo-google" size={28} color="#fff" />
          </TouchableOpacity>
        </View> */}
        <View
          style={{
            marginVertical: 18,
            height: 1,
            backgroundColor: "#222",
            width: "100%",
          }}
        />
        {/* Footer pill "pas encore inscrit ? créer un compte" */}
        <View style={{ alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            style={{
              backgroundColor: "#000",
              borderRadius: 24,
              paddingVertical: 12,
              width: "90%",
              alignItems: "center",
              borderColor: "grey",
              borderWidth: 0.3,
            }}
          >
            <Text style={{ color: "#3973c4" }}>
              pas encore inscrit ? créer un compte
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Dernier moyen de connexion en bas */}
      <View
        style={{
          backgroundColor: "#000",
          paddingVertical: Dimensions.get("window").height * 0.03,
          borderTopWidth: .4,
          borderColor: "#919191",
          alignItems: "center",
        }}
      >
        {lastLoginMethod && (
          <Text style={{ color: "#fff", fontSize: 14 }}>
            Votre dernier moyen de connexion :{" "}
            <Text style={{ fontWeight: "bold" }}>{lastLoginMethod}</Text>
          </Text>
        )}
      </View>
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  sliderBigContainer: {
    height: "65%",
    justifyContent: "center",
    alignItems: "center",
  },
  slideBig: {
    width: Dimensions.get("window").width,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  slideEmojiBig: {
    fontSize: 48,
    marginBottom: 24,
  },
  slideTextBig: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    fontFamily: FONTS.sans.bold,
    fontWeight: "bold",
  },
  dotsContainerBig: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#888",
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: "#fff",
  },
  formOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: "rgba(17,17,17,0.95)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
  },
  inputGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 18,
    marginTop: 18,
  },
  inputBig: {
    flex: 1,
    height: 54,
    backgroundColor: "#222",
    borderRadius: 28,
    paddingHorizontal: 20,
    color: "#fff",
    fontSize: 18,
    fontFamily: FONTS.sans.regular,
    borderWidth: 2,
    borderColor: "#333",
  },
  nextButton: {
    marginLeft: 10,
    backgroundColor: "#007AFF",
    borderRadius: 28,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    marginRight: 10,
    backgroundColor: "#222",
    borderRadius: 28,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  linkText: {
    color: "#ccc",
    fontFamily: FONTS.sans.regular,
    fontSize: FONT_SIZES.sm,
    textAlign: "center",
  },
  linkTextBold: {
    fontFamily: FONTS.sans.bold,
    color: "#fff",
  },
  orText: {
    color: "#888",
    marginVertical: 18,
    fontSize: 15,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  socialButton: {
    backgroundColor: "#222",
    borderRadius: 32,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: "#333",
  },
  eyeButton: {
    position: "absolute",
    right: 70,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 10,
    zIndex: 2,
  },
  backTextRow: {
    marginTop: 12,
    alignItems: "center",
  },
  backText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "500",
  },
  // Login flow styles
  loginHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: "#111",
  },
  loginBackIcon: {
    marginRight: 10,
    padding: 6,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginRight: 36,
  },
  loginFormContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroupLogin: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    position: "relative",
  },
  inputLogin: {
    flex: 1,
    height: 46,
    backgroundColor: "#181818",
    borderRadius: 24,
    paddingHorizontal: 18,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: "#333",
  },
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: 18,
  },
  forgotText: {
    color: "#aaa",
    fontSize: 14,
  },
  forgotLink: {
    color: "#2196F3",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#fff",
    borderRadius: 24,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loginButtonText: {
    color: "#111",
    fontWeight: "bold",
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#222",
    marginHorizontal: 8,
  },
  loginFooter: {
    marginTop: 18,
    alignItems: "center",
  },
  loginFooterText: {
    color: "#aaa",
    fontSize: 15,
  },
  loginFooterLink: {
    color: "#2196F3",
    fontWeight: "500",
  },
  lastLoginRow: {
    backgroundColor: "#000",
    paddingVertical: 10,
    alignItems: "center",
  },
  lastLoginText: {
    color: "#fff",
    fontSize: 14,
  },
  fixedInputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: "rgba(17,17,17,0.95)",
    alignItems: "center",
  },
}); 

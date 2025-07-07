import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Animated, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { Easing } from "react-native";

const { height } = Dimensions.get("window");

export default function ForgotPasswordModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [shouldRender, setShouldRender] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const [showEmailError, setShowEmailError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else if (shouldRender) {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start(() => setShouldRender(false));
    }
    // Réinitialise tous les états quand la modal se ferme
    if (!visible) {
      setTimeout(() => {
        setEmail("");
        setEmailTouched(false);
        setShowEmailError(false);
        setError(null);
        setMessage(null);
        setShowSuccess(false);
        successAnim.setValue(0);
        setLoading(false);
      }, 350); // attendre la fin de l'animation de fermeture
    }
  }, [visible]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (!emailTouched || !email) {
      setShowEmailError(false);
    } else if (!isEmailValid) {
      timeout = setTimeout(() => {
        setShowEmailError(true);
      }, 900);
    } else {
      setShowEmailError(false);
    }
    return () => clearTimeout(timeout);
  }, [email, emailTouched, isEmailValid]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    if (!isEmailValid) {
      setError("Veuillez entrer une adresse email valide.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "sano://reset-password",
    });
    setLoading(false);
    if (error) {
      setError("Erreur : " + error.message);
    } else {
      setShowSuccess(true);
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  if (!shouldRender) return null;

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>se connecter</Text>
      </View>
      {showSuccess ? (
        <Animated.View style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: Dimensions.get("window").height * 0.15, opacity: successAnim, paddingHorizontal: 24 }}>
          <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: .5, borderColor: "green", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 25 }}>
            <Ionicons name="checkmark" size={44} color="#111" />
          </View>
          <Text style={{ fontWeight: "bold", color: "#fff", fontSize: 18, marginBottom: 10, textAlign: "center" }}>mot de passe oublié</Text>
          <Text style={{ color: "#fff", fontSize: 15, textAlign: "center", marginBottom: 6, lineHeight: 20 }}>
            Un email vous a été envoyé à l'adresse
            {"\n"}
            <Text>{email}</Text>.
          </Text>
          <Text style={{ color: "#fff", fontSize: 15, textAlign: "center", lineHeight: 20 }}>
            Si vous ne recevez pas cet email,{"\n"}consultez vos courriers indésirables.
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>mot de passe oublié</Text>
          <Text style={styles.desc}>
            Saisissez l'adresse email associée à votre compte VeilleMedicale.
          </Text>
          <View style={[styles.inputContainer, {
            borderColor: !emailTouched || !email
              ? "#919191"
              : showEmailError
                ? "#ff6b6b"
                : isEmailValid
                  ? "#4CAF50"
                  : "#919191"
          }]}
          >
            <TextInput
              style={styles.input}
              placeholder="adresse email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={text => {
                setEmail(text);
                setEmailTouched(true);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {/* Croix à droite pour clear */}
            {email.length > 0 && (
              <TouchableOpacity
                style={{ position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 32, height: 42, zIndex: 2 }}
                onPress={() => setEmail("")}
              >
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>
          {/* Message d'erreur email */}
          {showEmailError && (
            <Text style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 8, marginTop: -10, textAlign: "center" }}>
              Veuillez entrer une adresse email valide.
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isEmailValid ? "#fff" : "#666666" },
            ]}
            onPress={handleSubmit}
            disabled={!isEmailValid || loading}
          >
            {loading ? <ActivityIndicator color="#111" /> : <Text style={{ color: "#111", fontWeight: "bold" }}>valider</Text>}
          </TouchableOpacity>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#181818",
    zIndex: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: "#000",
    borderBottomWidth: 0.4,
    borderColor: "#919191",
  },
  closeButton: {
    padding: 6,
    borderRadius: 100,
    borderColor: "grey",
    borderWidth: 0.5,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginRight: 36,
  },
  content: {
    padding: 24,
  },
  title: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },
  desc: {
    color: "#fff",
    fontSize: 15,
    marginBottom: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 24,
    backgroundColor: "#000",
    borderWidth: 0.5,
    borderColor: "#919191",
    marginBottom: 18,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    height: "100%",
  },
  button: {
    borderRadius: 24,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  success: {
    color: "#4CAF50",
    marginTop: 10,
    textAlign: "center",
  },
  error: {
    color: "#ff6b6b",
    marginTop: 10,
    textAlign: "center",
  },
}); 
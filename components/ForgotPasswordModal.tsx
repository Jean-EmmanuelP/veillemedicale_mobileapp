import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Animated, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { Easing } from "react-native";
import { COLORS } from "../assets/design-system/colors";

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
          <Ionicons name="close" size={18} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>se connecter</Text>
      </View>
      {showSuccess ? (
        <Animated.View style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: Dimensions.get("window").height * 0.15, opacity: successAnim, paddingHorizontal: 24 }}>
          <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: .5, borderColor: COLORS.success, backgroundColor: COLORS.background.secondary, alignItems: "center", justifyContent: "center", marginBottom: 25 }}>
            <Ionicons name="checkmark" size={44} color={COLORS.success} />
          </View>
          <Text style={{ fontWeight: "bold", color: COLORS.text.primary, fontSize: 18, marginBottom: 10, textAlign: "center" }}>mot de passe oublié</Text>
          <Text style={{ color: COLORS.text.secondary, fontSize: 15, textAlign: "center", marginBottom: 6, lineHeight: 20 }}>
            Un email vous a été envoyé à l'adresse
            {"\n"}
            <Text>{email}</Text>.
          </Text>
          <Text style={{ color: COLORS.text.secondary, fontSize: 15, textAlign: "center", lineHeight: 20 }}>
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
              ? COLORS.border.medium
              : showEmailError
                ? COLORS.error
                : isEmailValid
                  ? COLORS.success
                  : COLORS.border.medium
          }]}
          >
            <TextInput
              style={styles.input}
              placeholder="adresse email"
              placeholderTextColor={COLORS.text.disabled}
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
                <Ionicons name="close" size={18} color={COLORS.icon.secondary} />
              </TouchableOpacity>
            )}
          </View>
          {/* Message d'erreur email */}
          {showEmailError && (
            <Text style={{ color: COLORS.error, fontSize: 13, marginBottom: 8, marginTop: -10, textAlign: "center" }}>
              Veuillez entrer une adresse email valide.
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: COLORS.primary.main, opacity: isEmailValid ? 1 : 0.45 },
            ]}
            onPress={handleSubmit}
            disabled={!isEmailValid || loading}
          >
            {loading ? <ActivityIndicator color={COLORS.text.white} /> : <Text style={{ color: COLORS.text.white, fontWeight: "bold" }}>valider</Text>}
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
    backgroundColor: COLORS.background.primary,
    zIndex: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 0.4,
    borderColor: COLORS.border.light,
  },
  closeButton: {
    padding: 6,
    borderRadius: 100,
    borderColor: COLORS.border.medium,
    borderWidth: 0.5,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "bold",
    color: COLORS.text.primary,
    flex: 1,
    textAlign: "center",
    marginRight: 36,
  },
  content: {
    padding: 24,
  },
  title: {
    fontWeight: "bold",
    color: COLORS.text.primary,
    fontSize: 16,
    marginBottom: 8,
  },
  desc: {
    color: COLORS.text.secondary,
    fontSize: 15,
    marginBottom: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 0,
    backgroundColor: COLORS.background.primary,
    borderWidth: 0.5,
    borderColor: COLORS.border.medium,
    marginBottom: 18,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: 14,
    height: "100%",
  },
  button: {
    borderRadius: 0,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  success: {
    color: COLORS.success,
    marginTop: 10,
    textAlign: "center",
  },
  error: {
    color: COLORS.error,
    marginTop: 10,
    textAlign: "center",
  },
}); 
import React, { useState } from "react";
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
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { signIn, signInAnonymously } from "../../../store/authSlice";
import { AppDispatch } from "../../../store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ForgotPasswordModal from "../../../components/ForgotPasswordModal";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, COMPONENT_STYLES } from "../../../assets/design-system";

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const isFormValid = email.trim() !== "" && password.trim() !== "";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header minimaliste avec retour */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.icon.primary} />
          </Pressable>
        </View>

        {/* Titre et sous-titre */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Bienvenue</Text>
          <Text style={styles.subtitle}>
            Connectez-vous pour accéder à votre veille médicale personnalisée
          </Text>
        </View>

        {/* Formulaire */}
        <View style={styles.formContainer}>
          {/* Input Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse email</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "email" && styles.inputContainerFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="nom@exemple.fr"
                placeholderTextColor={COLORS.text.disabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Input Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "password" && styles.inputContainerFocused,
              ]}
            >
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.text.disabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <Pressable
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={COLORS.icon.secondary}
                />
              </Pressable>
            </View>
          </View>

          {/* Mot de passe oublié */}
          <View style={styles.forgotPasswordContainer}>
            <Pressable onPress={() => setShowForgotPasswordModal(true)}>
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </Pressable>
          </View>

          {/* Bouton Se connecter */}
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              !isFormValid && styles.loginButtonDisabled,
              pressed && isFormValid && styles.loginButtonPressed,
            ]}
            onPress={handleLogin}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text.white} />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.divider} />
          </View>

          {/* Créer un compte */}
          <Pressable
            style={({ pressed }) => [
              styles.createAccountButton,
              pressed && styles.createAccountButtonPressed,
            ]}
            onPress={() => router.push("/(auth)/(register)")}
          >
            <Text style={styles.createAccountButtonText}>Créer un compte</Text>
          </Pressable>
        </View>
      </ScrollView>

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
    backgroundColor: COLORS.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING['2xl'],
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: COLORS.interaction.pressed,
  },
  titleSection: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING['3xl'],
  },
  title: {
    ...TYPOGRAPHY.display.large,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body.large,
    color: COLORS.text.secondary,
    lineHeight: 24,
  },
  formContainer: {
    paddingHorizontal: SPACING.screenPadding,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.label.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    borderWidth: 1.5,
    borderColor: COLORS.border.light,
    borderRadius: RADIUS.input,
    height: 52,
    paddingHorizontal: SPACING.base,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary.main,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    height: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: SPACING.base,
    padding: SPACING.xs,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING['2xl'],
  },
  forgotPasswordText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: RADIUS.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.button,
  },
  loginButtonDisabled: {
    // Reste sur la couleur de marque (tiber) mais atténuée : le bouton demeure lisible
    // et reconnaissable comme CTA, au lieu d'un gris quasi invisible.
    backgroundColor: COLORS.primary.main,
    opacity: 0.45,
    ...SHADOWS.none,
  },
  loginButtonPressed: {
    backgroundColor: COLORS.primary.dark,
  },
  loginButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border.light,
  },
  dividerText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
    marginHorizontal: SPACING.md,
  },
  createAccountButton: {
    backgroundColor: COLORS.background.primary,
    borderWidth: 1.5,
    borderColor: COLORS.border.medium,
    borderRadius: RADIUS.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountButtonPressed: {
    backgroundColor: COLORS.interaction.pressed,
  },
  createAccountButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.primary,
  },
});

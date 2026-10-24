import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../../assets/design-system";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim() === "" || emailRegex.test(email);
  const isPasswordValid = password.trim() === "" || password.length >= 8;
  const isFormValid =
    email.trim() !== "" &&
    password.trim() !== "" &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    emailRegex.test(email) &&
    password.length >= 8;

  const handleContinue = () => {
    if (!isFormValid) return;
    // Navigate to preferences page with registration data
    router.push({
      pathname: "/(auth)/(register)/preferences",
      params: { email, password, firstName, lastName },
    });
  };

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
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Rejoignez la communauté et accédez à votre veille médicale personnalisée
          </Text>
        </View>

        {/* Formulaire */}
        <View style={styles.formContainer}>
          {/* Input Prénom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "firstName" && styles.inputContainerFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Votre prénom"
                placeholderTextColor={COLORS.text.disabled}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => setFocusedField("firstName")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Input Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "lastName" && styles.inputContainerFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                placeholderTextColor={COLORS.text.disabled}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => setFocusedField("lastName")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Input Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse email</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "email" && styles.inputContainerFocused,
                !isEmailValid && email.trim() !== "" && styles.inputContainerError,
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
            {!isEmailValid && email.trim() !== "" && (
              <Text style={styles.errorText}>Adresse email invalide</Text>
            )}
          </View>

          {/* Input Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === "password" && styles.inputContainerFocused,
                !isPasswordValid && password.trim() !== "" && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Minimum 6 caractères"
                placeholderTextColor={COLORS.text.disabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleContinue}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={COLORS.icon.secondary}
                />
              </Pressable>
            </View>
            {!isPasswordValid && password.trim() !== "" && (
              <Text style={styles.errorText}>
                Le mot de passe doit contenir au moins 8 caractères
              </Text>
            )}
          </View>

          {/* Info légale */}
          <View style={styles.legalInfo}>
            <Text style={styles.legalText}>
              En créant un compte, vous acceptez nos conditions d'utilisation et
              notre politique de confidentialité
            </Text>
          </View>

          {/* Bouton Continuer */}
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              !isFormValid && styles.continueButtonDisabled,
              pressed && isFormValid && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            disabled={!isFormValid}
          >
            <Text style={styles.continueButtonText}>Continuer</Text>
          </Pressable>

          {/* Lien de connexion */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Vous avez déjà un compte ? </Text>
            <Pressable onPress={() => router.push("/(auth)/(login)")}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: SPACING['2xl'],
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
  inputContainerError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
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
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  legalInfo: {
    marginBottom: SPACING['2xl'],
    marginTop: SPACING.md,
  },
  legalText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    lineHeight: 16,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: RADIUS.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.button,
  },
  continueButtonDisabled: {
    // Reste sur la couleur de marque (tiber) mais atténuée : le bouton demeure lisible
    // et reconnaissable comme CTA, au lieu d'un gris quasi invisible.
    backgroundColor: COLORS.primary.main,
    opacity: 0.45,
    ...SHADOWS.none,
  },
  continueButtonPressed: {
    backgroundColor: COLORS.primary.dark,
  },
  continueButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.base,
  },
  loginLinkText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
  },
  loginLink: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
});

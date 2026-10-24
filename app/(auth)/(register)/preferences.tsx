import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../store";
import { signUp, authErrorMessage } from "../../../store/authSlice";
import { convex, api } from "../../../lib/convex";
import NotificationFrequencySelector, {
  NotificationOption,
} from "../../../components/NotificationFrequencySelector";
import GradeSelector, { GradeOption } from "../../../components/GradeSelector";
import TermsAcceptanceSection from "../../../components/TermsAcceptanceSection";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "../../../assets/design-system";

const strings = {
  headerTitle: "Personnalisez votre expérience",
  subtitle: "Dernières informations pour une veille adaptée à vos besoins",
  notificationFrequencyTitle: "Fréquence de notification",
  gradeTitle: "Niveau de preuve scientifique minimum",
  termsText: "J'ai pris connaissance et j'accepte les ",
  termsLink: "conditions générales d'utilisation",
  andText: " et la ",
  privacyLink: "politique de confidentialité.",
  validateButton: "Créer mon compte",
  footerText: "Vos données sont collectées pour créer votre compte. ",
  footerLink: "En savoir plus",
  notificationOptions: [
    { value: "tous_les_jours", label: "Tous les jours" },
    { value: "tous_les_2_jours", label: "Tous les 2 jours" },
    { value: "tous_les_3_jours", label: "Tous les 3 jours" },
    { value: "1_fois_par_semaine", label: "1 fois par semaine" },
    { value: "tous_les_15_jours", label: "Tous les 15 jours" },
    { value: "1_fois_par_mois", label: "1 fois par mois" },
  ] as NotificationOption[],
  gradeOptions: [
    {
      value: "A",
      label: "Grade A",
      description: "Preuve scientifique établie",
    },
    { value: "B", label: "Grade B", description: "Présomption scientifique" },
    { value: "C", label: "Grade C", description: "Faible niveau de preuve" },
  ] as GradeOption[],
};

export default function PreferencesScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { email, password, firstName, lastName } = useLocalSearchParams<{
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }>();

  const [notificationFrequency, setNotificationFrequency] = useState("tous_les_jours");
  const [minimumGrade, setMinimumGrade] = useState("C");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const notificationOptions = strings.notificationOptions;
  const gradeOptions = strings.gradeOptions;

  const handleCompleteRegistration = async () => {
    if (!email || !password) {
      setError("Erreur: informations manquantes.");
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        "Conditions requises",
        "Veuillez accepter les conditions générales et la politique de confidentialité pour continuer."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userFirstName = firstName || email.split("@")[0];
      const userLastName = lastName || "";

      // 1. Compte Convex Auth. Le profil userMirror et l'email de bienvenue
      //    sont créés côté serveur.
      const result = await dispatch(
        signUp({ email, password, firstName: userFirstName, lastName: userLastName })
      );
      if (!signUp.fulfilled.match(result)) {
        setError(authErrorMessage(result.error, "Erreur lors de l'inscription. Réessayez."));
        setLoading(false);
        return;
      }

      // 2. Préférences (non bloquant : modifiables ensuite dans Paramètres).
      try {
        await convex.mutation(api.userMirror.updateMyProfile, {
          firstName: userFirstName,
          lastName: userLastName,
          notificationFrequency,
          minimumGradeNotification: minimumGrade,
        });
      } catch (prefError) {
        console.error("Profile preferences error:", prefError);
      }

      router.replace("/(app)");
    } catch (error) {
      setError("Erreur de connexion lors de l'inscription.");
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header avec retour */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.icon.primary} />
        </Pressable>
      </View>

      {/* Titre */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{strings.headerTitle}</Text>
        <Text style={styles.subtitle}>{strings.subtitle}</Text>
      </View>

      {/* Formulaire */}
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section fréquence de notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {strings.notificationFrequencyTitle}
          </Text>
          <NotificationFrequencySelector
            value={notificationFrequency}
            options={notificationOptions}
            onValueChange={(value: string) => setNotificationFrequency(value)}
          />
        </View>

        {/* Section grade minimum */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.gradeTitle}</Text>
          <GradeSelector
            value={minimumGrade}
            options={gradeOptions}
            onValueChange={(value: string) => setMinimumGrade(value)}
          />
        </View>

        {/* Terms and conditions */}
        <View style={styles.termsSection}>
          <TermsAcceptanceSection
            accepted={termsAccepted}
            onToggle={(accepted: boolean) => setTermsAccepted(accepted)}
          />
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Complete registration button */}
        <Pressable
          style={({ pressed }) => [
            styles.completeButton,
            !termsAccepted && styles.completeButtonDisabled,
            pressed && termsAccepted && styles.completeButtonPressed,
          ]}
          onPress={handleCompleteRegistration}
          disabled={!termsAccepted || loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text.white} />
          ) : (
            <Text style={styles.completeButtonText}>
              {strings.validateButton}
            </Text>
          )}
        </Pressable>

        {/* Footer */}
        <Pressable
          style={styles.footer}
          onPress={() => router.push("/(auth)/(legal)/company-group")}
        >
          <Text style={styles.footerText}>
            {strings.footerText}
            <Text style={styles.footerLink}>{strings.footerLink}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: COLORS.interaction.pressed,
  },
  titleSection: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING['2xl'],
  },
  title: {
    ...TYPOGRAPHY.display.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING['4xl'],
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  termsSection: {
    marginBottom: SPACING.lg,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.error,
    flex: 1,
  },
  completeButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: RADIUS.button,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
    ...SHADOWS.button,
  },
  completeButtonDisabled: {
    backgroundColor: COLORS.primary.main,
    opacity: 0.45,
    ...SHADOWS.none,
  },
  completeButtonPressed: {
    backgroundColor: COLORS.primary.dark,
  },
  completeButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
  footer: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: "center",
    lineHeight: 16,
  },
  footerLink: {
    color: COLORS.primary.main,
    fontWeight: "500",
  },
});

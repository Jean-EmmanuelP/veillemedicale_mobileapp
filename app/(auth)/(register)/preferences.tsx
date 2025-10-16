import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { supabase } from "../../../lib/supabase";
import { FONTS } from "../../../assets/constants/fonts";
import NotificationFrequencySelector, {
  NotificationOption,
} from "../../../components/NotificationFrequencySelector";
import GradeSelector, { GradeOption } from "../../../components/GradeSelector";
import TermsAcceptanceSection from "../../../components/TermsAcceptanceSection";

const { width, height } = Dimensions.get("window");

// i18n strings - will be moved to proper i18n later
const strings = {
  headerTitle:
    "Dernières informations nécessaires\npour personnaliser votre expérience.",
  notificationFrequencyTitle:
    "À quelle régularité souhaitez-vous recevoir les nouveautés ?",
  gradeTitle: "Quel niveau de preuve scientifique minimum ?",
  termsText: "J'ai pris connaissance et j'accepte les ",
  termsLink: "conditions générales d'utilisation",
  andText: " et la ",
  privacyLink: "politique de confidentialité.",
  asterisk: "*",
  validateButton: "valider mon inscription",
  footerText: "Sano recueille vos données pour créer votre compte... ",
  footerLink: "voir plus",
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
  const { email, password } = useLocalSearchParams<{
    email: string;
    password: string;
  }>();

  const [notificationFrequency, setNotificationFrequency] =
    useState("tous_les_jours");
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

    setLoading(true);
    setError("");

    try {
      // 1. Create auth user with metadata
      const firstName = email.split("@")[0];

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: firstName,
            notification_frequency: notificationFrequency,
            minimum_grade_notification: minimumGrade,
          }
        }
      });

      if (signUpError) {
        if (
          signUpError.code === "user_already_exists" ||
          signUpError.message?.includes("User already registered")
        ) {
          setError("Cet email est déjà utilisé.");
          setLoading(false);
          return;
        } else {
          setError("Erreur lors de l'inscription: " + signUpError.message);
          setLoading(false);
          return;
        }
      }

      if (!data.user) {
        setError("Erreur interne lors de la création de l'utilisateur.");
        setLoading(false);
        return;
      }

      // 2. Wait for auth user creation to complete, then create profile with preferences
      const profile = {
        id: data.user.id,
        first_name: firstName,
        last_name: "",
        email: email,
        disciplines: [],
        notification_frequency: notificationFrequency,
        minimum_grade_notification: minimumGrade,
        date_of_birth: null,
      };

      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert(profile);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        setError("Erreur lors de la sauvegarde du profil utilisateur.");
        setLoading(false);
        return;
      }

      // 3. Send welcome email (fire-and-forget)
      try {
        const response = await fetch(
          "https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/send-welcome-email",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eGVsaGpucWJyZ3d1aXRsdHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2OTE5NzAsImV4cCI6MjA1NjI2Nzk3MH0.EvaK9bCSYaBVaVOIgakKTAVoM8UrDYg2HX7Z-iyWoD4`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: data.user.id,
              email: email,
              first_name: firstName,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            "Welcome email error:",
            response.status,
            response.statusText
          );
        }
      } catch (emailError) {
        console.error("Welcome email error:", emailError);
        // Don't block the flow for email error
      }

      // Success - redirect to app
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
      {/* Header avec flèche retour et titre */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons
            name="keyboard-arrow-left"
            size={24}
            color="#fff"
            style={{ transform: [{ translateX: -5 }, { translateY: -3 }] }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sano</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.subHeaderContainer}>
        <Text style={styles.subHeaderTitle}>{strings.headerTitle}</Text>
        <Text style={styles.progressText}>3/3</Text>
      </View>

      {/* Formulaire */}
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
      >
        <View style={{ paddingHorizontal: 24 }}>
          {/* Section fréquence de notification */}
          <Text style={styles.sectionTitle}>
            {strings.notificationFrequencyTitle}
          </Text>

          <NotificationFrequencySelector
            value={notificationFrequency}
            options={notificationOptions}
            onValueChange={(value: string) => setNotificationFrequency(value)}
          />
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <Text style={styles.sectionTitle}>{strings.gradeTitle}</Text>

          <GradeSelector
            value={minimumGrade}
            options={gradeOptions}
            onValueChange={(value: string) => setMinimumGrade(value)}
          />
        </View>
      </ScrollView>

      {/* Terms and conditions section */}
      <TermsAcceptanceSection
        accepted={termsAccepted}
        onToggle={(accepted: boolean) => setTermsAccepted(accepted)}
      />

      {/* Error message */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Complete registration button */}
      <View style={{ paddingHorizontal: 24 }}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            termsAccepted
              ? styles.completeButtonActive
              : styles.completeButtonInactive,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleCompleteRegistration}
          disabled={!termsAccepted || loading}
        >
          {loading ? (
            <ActivityIndicator
              color={termsAccepted ? "#111" : "#fff"}
              size="small"
            />
          ) : (
            <Text
              style={[
                styles.completeButtonText,
                termsAccepted
                  ? styles.completeButtonTextActive
                  : styles.completeButtonTextInactive,
              ]}
            >
              {strings.validateButton}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push("/(auth)/(legal)/company-group")}>
          <Text style={styles.footerText}>
            {strings.footerText}
            <Text style={styles.footerLink}>{strings.footerLink}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: "#000",
  },
  backButton: {
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
    fontSize: 16,
  },
  headerSpacer: {
    width: 50, // Adjust as needed to center "Sano"
  },
  subHeaderContainer: {
    flexDirection: "column",
    gap: Dimensions.get("window").height * 0.03,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: "#000",
    borderBottomWidth: 0.4,
    borderColor: "#919191",
  },
  subHeaderTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: FONTS.sans.regular,
  },
  progressText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
  },
  formContainer: {
    flex: 1,
    paddingTop: 24,
  },
  formContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    fontFamily: FONTS.sans.regular,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    flex: 1,
    fontFamily: FONTS.sans.regular,
  },
  completeButton: {
    backgroundColor: "#a3a3a3",
    borderRadius: 24,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    opacity: 0.5,
  },
  completeButtonActive: {
    backgroundColor: "#fff",
    opacity: 1,
  },
  completeButtonInactive: {
    backgroundColor: "#a3a3a3",
    opacity: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButtonTextActive: {
    color: "#121212",
  },
  completeButtonTextInactive: {
    color: "#121212",
  },
  footer: {
    paddingVertical: Dimensions.get("window").height * 0.03,
    alignItems: "flex-start",
    paddingHorizontal: 24,
  },
  footerText: {
    color: "#919191",
    fontSize: 12,
    lineHeight: 16,
  },
  footerLink: {
    color: "#2196F3",
  },
  companyText: {
    color: "#2196F3",
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
  },
});

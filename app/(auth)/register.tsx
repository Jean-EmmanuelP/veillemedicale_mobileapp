import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Animated,
  Easing,
  FlatList, // Ajout FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { supabase } from "../../lib/supabase";
import { FONTS, FONT_SIZES } from "../../assets/constants/fonts";

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

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=email, 2=mdp
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const passwordAnim = useRef(new Animated.Value(0)).current;
  const [showBlur, setShowBlur] = useState(false);
  const blurOpacity = React.useRef(new Animated.Value(0)).current;
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  React.useEffect(() => {
    if (!emailTouched) return;
    if (!email) {
      setEmailError("");
    } else if (!isEmailValid) {
      setEmailError("L'adresse email saisie est invalide.\nexemple : nom@domaine.fr");
    } else {
      setEmailError("");
    }
  }, [email, emailTouched]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % SLIDES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    Animated.timing(passwordAnim, {
      toValue: step === 2 ? 1 : 0,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [step]);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  React.useEffect(() => {
    if (showBlur || keyboardOpen) {
      Animated.timing(blurOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      blurOpacity.setValue(0); // disparition instantanée
    }
  }, [showBlur, keyboardOpen]);

  const passwordFade = passwordAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleNext = () => {
    if (step === 1 && email) setStep(2);
  };
  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const handleRegister = async () => {
    setError("");
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Veuillez entrer une adresse email valide.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      console.log(JSON.stringify(data, null, 2));
      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          setError("Cet email est déjà utilisé.");
        } else {
          setError("Erreur lors de l'inscription: " + signUpError.message);
        }
        setLoading(false);
        return;
      }
      if (!data.user) {
        setError("Erreur interne lors de la création de l'utilisateur.");
        setLoading(false);
        return;
      }

      // 2. Création du profil utilisateur
      const firstName = email.split("@")[0];
      const profile = {
        id: data.user.id,
        first_name: firstName,
        last_name: "",
        email: email,
        disciplines: [],
        notification_frequency: "tous_les_jours",
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

      // 3. Envoi de l'email de bienvenue (fire-and-forget)
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
        // Ne pas bloquer le flow pour une erreur d'email
      }
      setSuccess("Compte créé avec succès ! Vous allez être redirigé...");
      setTimeout(() => {
        router.replace("/(app)");
      }, 2500);
    } catch (error) {
      setError("Erreur de connexion lors de l'inscription.");
    }
    setLoading(false);
  };

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "column-reverse",
        backgroundColor: "blue",
        paddingBottom: Dimensions.get("window").height * 0.2,
      }}
    >
      <View style={styles.sliderBigContainer}>
        <Animated.FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={styles.slideBig}>
              <Text style={styles.slideEmojiBig}>{item.emoji}</Text>
              <Text style={styles.slideTextBig}>{item.text}</Text>
            </View>
          )}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / Dimensions.get("window").width
            );
            setCurrentSlide(index);
          }}
        />
        {(showBlur || keyboardOpen) && (
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setShowBlur(false);
              Keyboard.dismiss();
            }}
          >
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}
              pointerEvents={showBlur ? "auto" : "none"}
            >
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            </Animated.View>
          </TouchableOpacity>
        )}
        <View style={styles.dotsContainerBig}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, currentSlide === i && styles.dotActive]}
            />
          ))}
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={20}
      >
        <View style={styles.fixedInputContainer}>
          <View style={styles.inputGroupRow}>
            {step === 1 && (
              <>
                <View style={{ width: "100%", height: 44, backgroundColor: "yellow", position: "relative", overflow: "visible", flexDirection: "row", alignItems: "center", gap: Dimensions.get("window").width * 0.04 }}>
                  <TextInput
                    style={[
                      styles.inputBig,
                      {
                        height: "100%",
                        borderWidth: 1,
                        borderColor: !emailTouched || !email ? "#a3a3a3" : emailError ? "#ff6b6b" : "#4CAF50",
                        color: "#fff",
                        backgroundColor: "#111",
                        paddingRight: 90,
                        paddingLeft: 20,
                        fontSize: 17,
                        borderRadius: 22,
                        paddingVertical: 0,
                        flex: 1,
                      },
                    ]}
                    placeholder="adresse email"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      setEmailTouched(true);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    returnKeyType="next"
                    onPressIn={() => setShowBlur(true)}
                    onSubmitEditing={() => {
                      if (isEmailValid) {
                        setShowBlur(false);
                        handleNext();
                      } else {
                        setEmailTouched(true);
                      }
                    }}
                  />
                  {/* Bouton clear (croix) en absolute à droite dans le champ */}
                  {email.length > 0 && (
                    <TouchableOpacity
                      style={{ position: "absolute", right: 54, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 44, height: 44, zIndex: 2 }}
                      onPress={() => setEmail("")}
                    >
                      <Ionicons name="close" size={22} color="#888" />
                    </TouchableOpacity>
                  )}
                  {/* Bouton flèche dans un cercle, à droite */}
                  <TouchableOpacity
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "#111",
                      borderWidth: 1,
                      borderColor: !emailTouched || !email ? "#a3a3a3" : emailError ? "#ff6b6b" : "#4CAF50",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: isEmailValid ? 1 : 0.5,
                      marginLeft: 2,
                    }}
                    onPress={() => {
                      if (isEmailValid) {
                        setShowBlur(false);
                        handleNext();
                      } else {
                        setEmailTouched(true);
                      }
                    }}
                    disabled={!isEmailValid}
                  >
                    <Ionicons name="arrow-forward" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                {/* Message d'erreur */}
                {!!emailError && (
                  <View style={{ marginTop: 10, marginBottom: 0, alignItems: "center", width: "100%" }}>
                    <Text style={{ color: "#ff6b6b", fontSize: 15, textAlign: "center", lineHeight: 20 }}>{emailError}</Text>
                  </View>
                )}
              </>
            )}
            {step === 2 && (
              <Animated.View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: passwordFade,
                  position: "relative",
                }}
              >
                <TextInput
                  style={styles.inputBig}
                  placeholder="mot de passe"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoFocus
                  returnKeyType="go"
                  onPressIn={() => setShowBlur(true)}
                  onSubmitEditing={() => {
                    setShowBlur(false);
                    handleRegister();
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#aaa"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => {
                    setShowBlur(false);
                    handleRegister();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="arrow-forward" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: Dimensions.get("window").height * 0.2,
          backgroundColor: "brown",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          flexDirection: "column",
          paddingHorizontal: 30,
          paddingTop: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: "#fff" }}>Deja membre ?</Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={{ color: "blue" }}>Connectez-vous.</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderBigContainer: {
    position: "absolute",
    backgroundColor: "red",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: "90%",
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
  fixedInputContainer: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
  },
  inputGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
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
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: "100%",
  },
  errorText: {
    color: "#ff6b6b",
    fontFamily: FONTS.sans.regular,
    fontSize: FONT_SIZES.sm,
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: "100%",
  },
  successText: {
    color: "#4CAF50",
    fontFamily: FONTS.sans.regular,
    fontSize: FONT_SIZES.sm,
    marginLeft: 8,
    flex: 1,
  },
  linkRowFixed: {
    width: "100%",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 0,
  },
});

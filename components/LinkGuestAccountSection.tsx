import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  linkEmailToAnonymousAccount, 
  addPasswordToVerifiedAccount, 
  resetLinkProcess,
  clearError 
} from '../store/authSlice';
import { fetchProfile } from '../store/profileSlice';
import { supabase } from '../lib/supabase';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../assets/constants/fonts';

export default function LinkGuestAccountSection() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { linkingAccount, error, linkStep, user } = useAppSelector((state) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Nettoyer les erreurs quand on change d'étape
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleLinkAccount = async () => {
    console.log('🚀 [LINK ACCOUNT] Starting account conversion process...', {
      currentUser: {
        id: user?.id,
        email: user?.email || 'No email yet',
        isAnonymous: user?.is_anonymous
      },
      inputEmail: email
    });

    // Validation des champs
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre adresse email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un mot de passe.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      console.log('⏳ [LINK ACCOUNT] Step 1: Linking email to anonymous account...');
      // Étape 1: Lier l'email et le mot de passe
      await dispatch(linkEmailToAnonymousAccount({ email })).unwrap();
      console.log('✅ [LINK ACCOUNT] Email linked successfully');
      
      console.log('⏳ [LINK ACCOUNT] Step 2: Adding password to account...');
      await dispatch(addPasswordToVerifiedAccount({ password })).unwrap();
      console.log('✅ [LINK ACCOUNT] Password added successfully');
      
      // Étape 2: Créer le profil utilisateur
      const firstName = email.split('@')[0]; // Utiliser la partie avant @ comme prénom par défaut
      const newUserProfile = {
        id: user.id,
        first_name: firstName,
        last_name: '',
        email: email,
        disciplines: [], // Default value
        notification_frequency: 'tous_les_jours', // Default value
        date_of_birth: null,
      };

      console.log('⏳ [LINK ACCOUNT] Step 3: Creating user profile in database...', {
        profileData: newUserProfile
      });

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert(newUserProfile);

      if (profileError) {
        console.error('❌ [LINK ACCOUNT] Supabase Profile Insert Error:', profileError);
        throw new Error('Erreur lors de la sauvegarde du profil utilisateur.');
      }

      console.log('✅ [LINK ACCOUNT] User profile created successfully in database');

      // Étape 3: Envoyer l'email de bienvenue
      console.log('⏳ [LINK ACCOUNT] Step 4: Sending welcome email...');
      try {
        const welcomeEdgeUrl = 'https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/send-welcome-email';
        fetch(welcomeEdgeUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eGVsaGpucWJyZ3d1aXRsdHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2OTE5NzAsImV4cCI6MjA1NjI2Nzk3MH0.EvaK9bCSYaBVaVOIgakKTAVoM8UrDYg2HX7Z-iyWoD4`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            email: email,
            first_name: firstName
          }),
        }).then(async response => {
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [LINK ACCOUNT] Error triggering send-welcome-email (async):', errorText);
          } else {
            console.log('✅ [LINK ACCOUNT] send-welcome-email triggered successfully (async)');
          }
        }).catch(e => {
          console.error('❌ [LINK ACCOUNT] Exception calling send-welcome-email (async):', e);
        });
      } catch (e) {
        console.error('❌ [LINK ACCOUNT] Error setting up welcome email fetch:', e);
      }

      // Étape 4: Refetch le profil pour mettre à jour Redux
      console.log('⏳ [LINK ACCOUNT] Step 5: Refetching profile to update Redux...');
      const profileResult = await dispatch(fetchProfile(user.id)).unwrap();
      console.log('✅ [LINK ACCOUNT] Profile refetched successfully:', {
        profile: profileResult
      });
      
      // Étape 5: Reset l'état de liaison et rediriger
      console.log('🎉 [LINK ACCOUNT] ACCOUNT CONVERSION COMPLETED SUCCESSFULLY!', {
        userId: user.id,
        email: email,
        firstName: firstName,
        message: 'Anonymous account has been successfully converted to permanent account'
      });

      // Reset l'état de liaison AVANT d'afficher l'alerte
      dispatch(resetLinkProcess());
      
      // Réinitialiser les champs locaux
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // Afficher le succès et rediriger
      Alert.alert(
        'Compte créé avec succès!',
        'Votre compte invité a été transformé en compte permanent. Vous allez être redirigé vers l\'application.',
        [
          { 
            text: 'Parfait!', 
            onPress: () => {
              console.log('🚀 [LINK ACCOUNT] Redirecting to main app...');
              // Rediriger vers la page principale
              router.replace('/(app)');
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ [LINK ACCOUNT] ACCOUNT CONVERSION FAILED:', error);
      Alert.alert('Erreur', error.message || 'Impossible de créer le compte.');
    }
  };

  const handleReset = () => {
    dispatch(resetLinkProcess());
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // L'onAuthStateChange dans _layout.tsx gère automatiquement la redirection
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Erreur lors de la déconnexion');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="link" size={24} color={COLORS.primary} />
        <Text style={styles.title}>Lier votre compte invité</Text>
      </View>

      <Text style={styles.description}>
        Transformez votre compte invité en compte permanent pour sauvegarder vos préférences et accéder à toutes les fonctionnalités.
      </Text>

      <View style={styles.formContainer}>
        <Text style={styles.stepTitle}>Créer votre compte permanent</Text>
        
        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Votre adresse email"
          placeholderTextColor={COLORS.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!linkingAccount}
        />

        {/* Mot de passe */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe (min. 6 caractères)"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!linkingAccount}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Confirmation mot de passe */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor={COLORS.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            editable={!linkingAccount}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons 
              name={showConfirmPassword ? "eye-off" : "eye"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Bouton de création */}
        <TouchableOpacity
          style={[styles.button, linkingAccount && styles.buttonDisabled]}
          onPress={handleLinkAccount}
          disabled={linkingAccount}
        >
          {linkingAccount ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.textOnPrimaryButton} />
              <Text style={styles.loadingText}>Création du compte...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Créer mon compte permanent</Text>
          )}
        </TouchableOpacity>

        {/* Bouton reset */}
        {(email || password || confirmPassword) && !linkingAccount && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
            <Text style={styles.secondaryButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
        )}

        {/* Bouton de déconnexion */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={linkingAccount}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      {/* Affichage des erreurs */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  } as ViewStyle,
  title: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: 10,
  } as TextStyle,
  description: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: LINE_HEIGHTS.sm,
  } as TextStyle,
  formContainer: {
    marginBottom: 20,
  } as ViewStyle,
  stepTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  } as TextStyle,
  input: {
    backgroundColor: COLORS.backgroundPrimary,
    borderRadius: 8,
    padding: 15,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    marginBottom: 15,
  } as TextStyle,
  passwordContainer: {
    position: 'relative',
  } as ViewStyle,
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  } as ViewStyle,
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  } as ViewStyle,
  buttonDisabled: {
    backgroundColor: COLORS.backgroundTertiary,
  } as ViewStyle,
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.bold,
    color: COLORS.textOnPrimaryButton,
  } as TextStyle,
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  loadingText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.medium,
    color: COLORS.textOnPrimaryButton,
  } as TextStyle,
  secondaryButton: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    marginTop: 10,
  } as ViewStyle,
  secondaryButtonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  } as TextStyle,
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  } as ViewStyle,
  successTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.success,
    marginTop: 10,
    marginBottom: 5,
  } as TextStyle,
  successText: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: LINE_HEIGHTS.base,
  } as TextStyle,
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  } as ViewStyle,
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    marginLeft: 8,
    flex: 1,
  } as TextStyle,
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
  } as ViewStyle,
  logoutButtonText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.medium,
    marginLeft: 8,
  } as TextStyle,
}); 
import React, { useState } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../lib/supabase'; 
import { FONTS, FONT_SIZES } from '../../assets/constants/fonts';
import { useDispatch } from 'react-redux';
import { signIn } from '../../store/authSlice';
import { AppDispatch } from '../../store';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const player = useVideoPlayer(
    require('../../assets/videos/home_video.mp4'), 
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );

  const validateForm = () => {
    setError('');
    
    if (!email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return false;
    }
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return false;
    }
    
    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez entrer une adresse email valide.');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // 1. Inscription avec Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Cet email est déjà utilisé.');
        } else {
          setError("Erreur lors de l'inscription: " + signUpError.message);
        }
        setLoading(false);
        return;
      }
      
      if (!data.user) {
        setError('Erreur interne lors de la création de l\'utilisateur.');
        setLoading(false);
        return;
      }
      
      // 2. Création du profil utilisateur
      const firstName = email.split('@')[0];
      const profile = {
        id: data.user.id,
        first_name: firstName,
        last_name: '',
        email: email,
        disciplines: [],
        notification_frequency: 'tous_les_jours',
        date_of_birth: null,
      };
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert(profile);
        
      if (profileError) {
        console.error('Profile creation error:', profileError);
        setError('Erreur lors de la sauvegarde du profil utilisateur.');
        setLoading(false);
        return;
      }
      
      // 3. Envoi de l'email de bienvenue (fire-and-forget)
      try {
        const response = await fetch('https://etxelhjnqbrgwuitltyk.supabase.co/functions/v1/send-welcome-email', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eGVsaGpucWJyZ3d1aXRsdHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2OTE5NzAsImV4cCI6MjA1NjI2Nzk3MH0.EvaK9bCSYaBVaVOIgakKTAVoM8UrDYg2HX7Z-iyWoD4`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            user_id: data.user.id, 
            email: email, 
            first_name: firstName 
          }),
        });
        
        if (!response.ok) {
          console.error('Welcome email error:', response.status, response.statusText);
        }
      } catch (emailError) {
        console.error('Welcome email error:', emailError);
        // Ne pas bloquer le flow pour une erreur d'email
      }
      
      // 4. Succès
      setSuccess('Compte créé avec succès ! Vous allez être redirigé...');
      
      // 5. Redirection après 2.5 secondes
      setTimeout(() => {
        router.replace('/(app)');
      }, 2500);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setError('Erreur de connexion lors de l\'inscription.');
    }
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <VideoView
        player={player}
        style={styles.videoBackground}
        contentFit="cover"
      />
      <View style={styles.overlay} />

      <View style={styles.formContainer}>
        <Text style={styles.mainTitle}>Veille Medicale</Text>
        <Text style={styles.tagline}>La veille scientifique, simplifiée.</Text>

        <Text style={styles.title}>Inscription</Text>
        
        {success ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={20} color="#ccc" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Adresse e-mail"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="#ccc" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#ccc" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="#ccc" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#aaa"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#ccc" 
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ff6b6b" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator size="large" color="#fff" style={styles.button} />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>S'inscrire</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.linkText}>
                Déjà un compte ? <Text style={styles.linkTextBold}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  mainTitle: {
    fontSize: FONT_SIZES['4xl'],
    fontFamily: FONTS.sans.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.regular,
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: FONT_SIZES['3xl'],
    fontFamily: FONTS.sans.bold,
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontFamily: FONTS.sans.regular,
    fontSize: FONT_SIZES.base,
    color: '#fff',
  },
  eyeButton: {
    padding: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontFamily: FONTS.sans.bold,
    fontSize: FONT_SIZES.lg,
  },
  linkText: {
    color: '#ccc',
    fontFamily: FONTS.sans.regular,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  linkTextBold: {
    fontFamily: FONTS.sans.bold,
    color: '#fff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#ff6b6b',
    fontFamily: FONTS.sans.regular,
    fontSize: FONT_SIZES.sm,
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  successText: {
    color: '#4CAF50',
    fontFamily: FONTS.sans.regular,
    fontSize: FONT_SIZES.sm,
    marginLeft: 8,
    flex: 1,
  },
}); 
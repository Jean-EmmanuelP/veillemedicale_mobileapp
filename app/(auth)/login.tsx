import React, { useState, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase'; 
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../assets/constants/fonts';
import { useDispatch } from 'react-redux';
import { signIn } from '../../store/authSlice';
import { AppDispatch } from '../../store';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const player = useVideoPlayer(
    require('../../assets/videos/home_video.mp4'), 
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      const resultAction = await dispatch(signIn({ email, password }));

      if (signIn.fulfilled.match(resultAction)) {
        router.replace('/(app)'); 
      } else {
        if (resultAction.payload) {
          Alert.alert('Erreur de connexion', (resultAction.payload as any).message || 'Email ou mot de passe incorrect.');
        } else {
          Alert.alert('Erreur de connexion', (resultAction.error as any).message || 'Email ou mot de passe incorrect.');
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la tentative de connexion.');
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

        <Text style={styles.title}>Connexion</Text>
        
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
            secureTextEntry
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.button} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Se connecter</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.linkText}>
            Pas encore de compte ? <Text style={styles.linkTextBold}>S'inscrire</Text>
          </Text>
        </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark overlay for text contrast
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
  button: {
    backgroundColor: '#007AFF', // Example primary color
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
}); 
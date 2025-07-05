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
  Dimensions,
  FlatList,
  Animated,
  Easing,
  Keyboard
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
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🤝',
    text: 'Rejoignez une communauté engagée de professionnels de santé',
  },
  {
    emoji: '🧠',
    text: 'Accédez à la meilleure veille scientifique personnalisée',
  },
  {
    emoji: '❤️',
    text: 'Liker, mettre en favoris et retrouver facilement vos articles préférés',
  },
  {
    emoji: '🔔',
    text: 'Choisissez à votre rythme d’être notifié : chaque jour ou chaque semaine',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.loginHeaderRow}>
        <Text style={styles.loginTitle}>se connecter</Text>
      </View>
      <View style={styles.loginFormContainer}>
        <View style={styles.inputGroupLogin}>
          <TextInput
            style={styles.inputLogin}
            placeholder="adresse email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => {}}
          />
        </View>
        <View style={styles.inputGroupLogin}>
          <TextInput
            style={styles.inputLogin}
            placeholder="mot de passe"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
        <View style={styles.forgotRow}>
          <Text style={styles.forgotText}>Mot de passe oublié ? <Text style={styles.forgotLink}>cliquez ici.</Text></Text>
        </View>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginButtonText}>se connecter</Text>
        </TouchableOpacity>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={{ color: '#888', fontSize: 15 }}>ou avec</Text>
          <View style={styles.divider} />
        </View>
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialButton}><Ionicons name="logo-apple" size={28} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}><Ionicons name="logo-google" size={28} color="#fff" /></TouchableOpacity>
        </View>
        <View style={styles.loginFooter}>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.loginFooterText}>pas encore inscrit ? <Text style={styles.loginFooterLink}>créer un compte</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.lastLoginRow}>
        <Text style={styles.lastLoginText}>Votre dernier moyen de connexion : <Text style={{ fontWeight: 'bold' }}>Google</Text></Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  sliderBigContainer: {
    height: '65%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideBig: {
    width: Dimensions.get('window').width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  slideEmojiBig: {
    fontSize: 48,
    marginBottom: 24,
  },
  slideTextBig: {
    color: '#fff',
    fontSize: 28,
    textAlign: 'center',
    fontFamily: FONTS.sans.bold,
    fontWeight: 'bold',
  },
  dotsContainerBig: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#888',
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  formOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: 'rgba(17,17,17,0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  inputGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 18,
    marginTop: 18,
  },
  inputBig: {
    flex: 1,
    height: 54,
    backgroundColor: '#222',
    borderRadius: 28,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.sans.regular,
    borderWidth: 2,
    borderColor: '#333',
  },
  nextButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    marginRight: 10,
    backgroundColor: '#222',
    borderRadius: 28,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
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
  orText: {
    color: '#888',
    marginVertical: 18,
    fontSize: 15,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  socialButton: {
    backgroundColor: '#222',
    borderRadius: 32,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: '#333',
  },
  eyeButton: {
    position: 'absolute',
    right: 70,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 10,
    zIndex: 2,
  },
  backTextRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  backText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  // Login flow styles
  loginHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: '#111',
  },
  loginBackIcon: {
    marginRight: 10,
    padding: 6,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 36,
  },
  loginFormContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroupLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  inputLogin: {
    flex: 1,
    height: 46,
    backgroundColor: '#181818',
    borderRadius: 24,
    paddingHorizontal: 18,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#333',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  forgotText: {
    color: '#aaa',
    fontSize: 14,
  },
  forgotLink: {
    color: '#2196F3',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#fff',
    borderRadius: 24,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loginButtonText: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: 8,
  },
  loginFooter: {
    marginTop: 18,
    alignItems: 'center',
  },
  loginFooterText: {
    color: '#aaa',
    fontSize: 15,
  },
  loginFooterLink: {
    color: '#2196F3',
    fontWeight: '500',
  },
  lastLoginRow: {
    backgroundColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
  },
  lastLoginText: {
    color: '#fff',
    fontSize: 14,
  },
  fixedInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(17,17,17,0.95)',
    alignItems: 'center',
  },
}); 
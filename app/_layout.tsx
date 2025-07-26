import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useNavigationContainerRef, useSegments } from 'expo-router';
import { useReactNavigationDevTools } from '@dev-plugins/react-navigation';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setUser, setSession } from '../store/authSlice';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';
import NotificationService from '../services/NotificationService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

// Import useFonts and the specific Roboto fonts we need
import {
  useFonts,
  Roboto_100Thin,
  Roboto_300Light,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  Roboto_900Black,
  Roboto_100Thin_Italic,
  Roboto_300Light_Italic,
  Roboto_400Regular_Italic,
  Roboto_500Medium_Italic,
  Roboto_700Bold_Italic,
  Roboto_900Black_Italic,
} from '@expo-google-fonts/roboto';

// Composant séparé pour la logique de navigation
function NavigationLayout() {
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation de l'état d'authentification au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          dispatch(setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata.name || '',
          }));
          dispatch(setSession(session.access_token));
          
          // Initialiser le service de notifications pour l'utilisateur connecté
          try {
            await NotificationService.getInstance().initialize(session.user.id);
          } catch (error) {
            console.error('Failed to initialize notifications:', error);
          }
        } else {
          dispatch(setUser(null));
          dispatch(setSession(null));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch(setUser(null));
        dispatch(setSession(null));
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        dispatch(setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name || '',
        }));
        dispatch(setSession(session.access_token));
        
        // Initialiser les notifications quand l'utilisateur se connecte
        try {
          await NotificationService.getInstance().initialize(session.user.id);
        } catch (error) {
          console.error('Failed to initialize notifications on auth change:', error);
        }
      } else {
        dispatch(setUser(null));
        dispatch(setSession(null));
        
        // Annuler les notifications quand l'utilisateur se déconnecte
        try {
          await NotificationService.getInstance().cancelAllNotifications();
        } catch (error) {
          console.error('Failed to cancel notifications on logout:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, segments, isInitialized]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

// Composant racine qui fournit le Provider et charge les polices
export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();
  useReactNavigationDevTools(navigationRef as any);

  let [fontsLoaded, fontError] = useFonts({
    Roboto_100Thin,
    Roboto_300Light,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    Roboto_900Black,
    Roboto_100Thin_Italic,
    Roboto_300Light_Italic,
    Roboto_400Regular_Italic,
    Roboto_500Medium_Italic,
    Roboto_700Bold_Italic,
    Roboto_900Black_Italic,
  });

  useEffect(() => {
    if (fontError) {
      console.error('Error loading Roboto fonts:', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <NavigationLayout />
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
} 
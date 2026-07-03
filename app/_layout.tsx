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
import NotificationService from '../services/NotificationService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

// Auth mobile = 100% Convex. Le legacy `SupabaseAuthBootstrap` a été retiré ici
// (voir `lib/authConfig.ts` pour le contexte). Toute la logique auth passe par
// `<ConvexAuthProvider>` + `<ConvexAuthBridge/>` ci-dessous.
import { AUTH_CONVEX_ENABLED } from '../lib/authConfig';
import {
  ConvexAuthProvider,
  secureStorage,
  convex,
  convexAuthBridge,
  resetConvexAuthBridge,
  hydrateConvexUserProfile,
} from '../lib/auth/convexAuthClient';
import { useAuthActions, useAuthToken, useConvexAuth } from '@convex-dev/auth/react';

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

/**
 * ConvexAuthBridge — synchronise le hook React `useAuthActions()` / `useConvexAuth()`
 * avec le module-level `convexAuthBridge` que les thunks Redux consomment.
 *
 * Hydrate aussi Redux `state.auth.user` au boot / après un refresh de session en
 * arrière-plan (ex : app reprise après plusieurs jours).
 */
function ConvexAuthBridge() {
  const actions = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authToken = useAuthToken();
  const dispatch = useDispatch();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Publie les callbacks du provider sur le bridge global (thunks Redux).
    convexAuthBridge.signIn = actions.signIn as any;
    convexAuthBridge.signOut = actions.signOut as any;
    // `useAuthToken()` renvoie le JWT courant depuis le context (auto-refresh
    // géré par le provider). On snapshotte la valeur dans une closure pour
    // que le bridge impératif y ait accès depuis les thunks Redux.
    convexAuthBridge.getToken = async () => authToken ?? null;
    convexAuthBridge.isAuthenticated = isAuthenticated;

    return () => {
      // Ne reset PAS le bridge au démontage — les autres composants (thunks)
      // peuvent avoir un signIn en cours. Le bridge sera réinitialisé au
      // prochain mount du provider.
    };
  }, [actions, authToken, isAuthenticated]);

  // Hydratation Redux au boot / après refresh.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      // Convex a désauthentifié (session expirée) — purge Redux si on avait
      // un user Convex (source: 'convex' dans les logs).
      if (hydrated) {
        dispatch(setUser(null));
        dispatch(setSession(null));
        try { NotificationService.getInstance().resetInitState(); } catch {}
        setHydrated(false);
      }
      return;
    }
    if (hydrated) return;

    (async () => {
      try {
        const user = await hydrateConvexUserProfile();
        const token = await convexAuthBridge.getToken?.();
        dispatch(setUser(user));
        dispatch(setSession(token ? { access_token: token } : null));
        setHydrated(true);
        // Init notifications (non-anon uniquement).
        try {
          await NotificationService.getInstance().initialize(user.id);
        } catch (err) {
          console.warn('[ConvexAuthBridge] NotificationService.initialize failed:', (err as Error).message);
        }
      } catch (err) {
        console.warn(
          '[ConvexAuthBridge] hydrateConvexUserProfile failed (user peut-être pas encore lié à userMirror):',
          (err as Error).message
        );
      }
    })();
  }, [isAuthenticated, isLoading, hydrated, dispatch]);

  return null;
}

// Composant séparé pour la logique de navigation
function NavigationLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  // App = 100 % Convex → on considère l'app initialisée dès que le provider a
  // eu le temps de rehydrate. Le bridge Convex s'occupe de la session en
  // arrière-plan.
  useEffect(() => {
    // Un tick pour que redux-persist réhydrate d'abord.
    const t = setTimeout(() => setIsInitialized(true), 100);
    return () => clearTimeout(t);
  }, []);

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
      <Stack.Screen name="discipline-modal" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="subdiscipline-modal" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

// Composant racine qui fournit le Provider et charge les polices
export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();
  useReactNavigationDevTools(navigationRef as any);

  // Sanity check — si quelqu'un remet `AUTH_CONVEX_ENABLED` en false, ce log
  // remonte immédiatement (l'app mobile n'est PAS conçue pour tourner en
  // Supabase Auth ici — le boot n'a plus le `SupabaseAuthBootstrap`).
  if (!AUTH_CONVEX_ENABLED) {
    console.error(
      '[RootLayout] AUTH_CONVEX_ENABLED=false détecté — le mobile est censé être 100% Convex. ' +
      'Ce build ne va pas booter correctement (pas de bootstrap Supabase legacy).'
    );
  }

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

  useEffect(() => {
    // Purge le bridge à l'unmount de l'app.
    return () => {
      resetConvexAuthBridge();
    };
  }, []);

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
        <ConvexAuthProvider client={convex as any} storage={secureStorage as any}>
          <StatusBar style="dark" />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <ConvexAuthBridge />
              <NavigationLayout />
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </ConvexAuthProvider>
      </PersistGate>
    </Provider>
  );
}

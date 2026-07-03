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
import { ConvexProvider } from 'convex/react';
import { convex } from '../lib/convex';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

// Phase 4 — Auth Convex (feature flag gated).
import { AUTH_CONVEX_ENABLED } from '../lib/authConfig';
import {
  ConvexAuthProvider,
  secureStorage,
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
 * Rendu UNIQUEMENT quand `AUTH_CONVEX_ENABLED === true`. Zéro impact prod tant que
 * le flag est OFF (l'arbre `<ConvexAuthProvider>` n'est même pas monté).
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

/**
 * SupabaseAuthBootstrap — logique d'initialisation Supabase Auth (legacy).
 * Ne monte QUE quand `AUTH_CONVEX_ENABLED === false`. Comportement prod actuel
 * inchangé.
 */
function SupabaseAuthBootstrap({ onInitialized }: { onInitialized: () => void }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('🔐 [ROOT LAYOUT] Session found during initialization:', {
            userId: session.user.id,
            email: session.user.email,
            isAnonymous: session.user.is_anonymous,
          });

          dispatch(setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || '',
            is_anonymous: session.user.is_anonymous || false,
          }));
          dispatch(setSession(session.access_token));

          if (!session.user.is_anonymous) {
            try {
              await NotificationService.getInstance().initialize(session.user.id);
            } catch (error) {
              console.error('Failed to initialize notifications:', error);
            }
          } else {
            console.log('👤 [ROOT LAYOUT] Anonymous user - skipping notification initialization');
          }
        } else {
          console.log('🔐 [ROOT LAYOUT] No session found during initialization');
          dispatch(setUser(null));
          dispatch(setSession(null));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch(setUser(null));
        dispatch(setSession(null));
      } finally {
        onInitialized();
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        console.log('🔐 [ROOT LAYOUT] Auth state changed - session found:', {
          event: _event,
          userId: session.user.id,
          email: session.user.email,
          isAnonymous: session.user.is_anonymous,
        });

        dispatch(setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || '',
          is_anonymous: session.user.is_anonymous || false,
        }));
        dispatch(setSession(session.access_token));

        if (!session.user.is_anonymous) {
          try {
            await NotificationService.getInstance().initialize(session.user.id);
          } catch (error) {
            console.error('Failed to initialize notifications on auth change:', error);
          }
        } else {
          console.log('👤 [ROOT LAYOUT] Anonymous user - skipping notification initialization on auth change');
        }
      } else {
        console.log('🔐 [ROOT LAYOUT] Auth state changed - session cleared:', {
          event: _event,
        });

        // Reset guards NotificationService pour permettre une réinit propre au next login
        try { NotificationService.getInstance().resetInitState(); } catch {}
        dispatch(setUser(null));
        dispatch(setSession(null));

        try {
          await NotificationService.getInstance().cancelAllNotifications();
        } catch (error) {
          console.error('Failed to cancel notifications on logout:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch, onInitialized]);

  return null;
}

// Composant séparé pour la logique de navigation
function NavigationLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  // Quand le flag Convex est ON, on considère l'app initialisée dès que le
  // provider a fini son `isLoading` initial. Sinon, le bootstrap Supabase gère.
  useEffect(() => {
    if (AUTH_CONVEX_ENABLED) {
      // Le bridge Convex se hydrate en arrière-plan — pas besoin d'attendre.
      // On laisse un tick pour que redux-persist réhydrate d'abord.
      const t = setTimeout(() => setIsInitialized(true), 100);
      return () => clearTimeout(t);
    }
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
      <>
        {!AUTH_CONVEX_ENABLED && <SupabaseAuthBootstrap onInitialized={() => setIsInitialized(true)} />}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      {!AUTH_CONVEX_ENABLED && <SupabaseAuthBootstrap onInitialized={() => setIsInitialized(true)} />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="discipline-modal" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="subdiscipline-modal" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </>
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

  useEffect(() => {
    // Purge le bridge à l'unmount de l'app.
    return () => {
      if (AUTH_CONVEX_ENABLED) resetConvexAuthBridge();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Wrap conditionnel : quand `AUTH_CONVEX_ENABLED === false`, on court-circuite
  // complètement `<ConvexAuthProvider>` — zéro impact runtime sur prod actuelle.
  const providerTree = (
    <>
      <StatusBar style="dark" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          {AUTH_CONVEX_ENABLED && <ConvexAuthBridge />}
          <NavigationLayout />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </>
  );

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {AUTH_CONVEX_ENABLED ? (
          <ConvexAuthProvider client={convex as any} storage={secureStorage as any}>
            {providerTree}
          </ConvexAuthProvider>
        ) : (
          <ConvexProvider client={convex}>{providerTree}</ConvexProvider>
        )}
      </PersistGate>
    </Provider>
  );
}

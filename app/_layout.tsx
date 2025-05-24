import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ActivityIndicator, View } from 'react-native';
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
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

// Composant racine qui fournit le Provider et charge les polices
export default function RootLayout() {
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
    // Note: 'Roboto_200ExtraLight', 'Roboto_600SemiBold', 'Roboto_800ExtraBold' 
    // are not standard exports from @expo-google-fonts/roboto.
    // If you need these specific weights, you might need to find a different package
    // or manually download and link those specific font files.
  });

  useEffect(() => {
    if (fontError) {
      console.error('Error loading Roboto fonts:', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    // Potentially show a loading screen or an ActivityIndicator
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationLayout />
      </PersistGate>
    </Provider>
  );
} 
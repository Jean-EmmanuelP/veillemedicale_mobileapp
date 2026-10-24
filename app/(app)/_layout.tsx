import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../assets/design-system';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import React, { useEffect, useState } from 'react';
import { fetchProfile } from '../../store/profileSlice';
import { useRouter } from 'expo-router';
import GuestAccountModal from '../../components/GuestAccountModal';
import AnimatedTabBar from '../../components/AnimatedTabBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboardingSkippedKey } from '../../lib/onboarding';

export default function AppLayout() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isAnonymous } = useSelector((state: RootState) => state.auth);
  const userId = user?.id;

  // State pour la modal guest
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalFeature, setGuestModalFeature] = useState<string>('');

  useEffect(() => {
    console.log('🏠 [APP LAYOUT] useEffect triggered:', {
      userId,
      isAnonymous,
      userObject: user ? {
        id: user.id,
        email: user.email,
        is_anonymous: user.is_anonymous
      } : null
    });

    // Ne pas charger le profil pour les utilisateurs anonymes
    if (userId && !isAnonymous) {
      console.log('🏠 [APP LAYOUT] ✅ Loading profile for permanent user:', {
        userId,
        isAnonymous
      });
      dispatch(fetchProfile(userId) as any);
    } else if (userId && isAnonymous) {
      console.log('👤 [APP LAYOUT] ⛔ Anonymous user detected, profile loading SKIPPED:', {
        userId,
        isAnonymous
      });
    } else {
      console.log('❌ [APP LAYOUT] No user found or user not ready:', {
        userId,
        isAnonymous,
        hasUser: !!user
      });
    }
  }, [dispatch, userId, isAnonymous, user?.is_anonymous]);

  // Onboarding : un compte sans discipline suivie choisit ses spécialités avant
  // d'arriver sur le feed (sauf s'il a choisi « Plus tard »).
  const { profile, loading: profileLoading, currentSubscriptions } = useSelector(
    (state: RootState) => state.profile
  );
  const profileReady = !!userId && !isAnonymous && !profileLoading && profile?.id === userId;
  const hasSubscriptions = currentSubscriptions.length > 0;
  useEffect(() => {
    if (!profileReady || hasSubscriptions || !userId) return;
    let cancelled = false;
    AsyncStorage.getItem(onboardingSkippedKey(userId))
      .catch(() => null)
      .then((skipped) => {
        if (!cancelled && !skipped) router.replace('/onboarding');
      });
    return () => {
      cancelled = true;
    };
  }, [profileReady, hasSubscriptions, userId, router]);

  const handleGoToSettings = () => {
    setShowGuestModal(false);
    router.push('/profile');
  };

  return (
    <>
      <Tabs
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary.main,
          tabBarInactiveTintColor: COLORS.icon.secondary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Articles',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "newspaper" : "newspaper-outline"}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="discussions"
          options={{
            title: 'Communauté',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={20}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (isAnonymous) {
                e.preventDefault();
                setGuestModalFeature('Communauté');
                setShowGuestModal(true);
              }
            },
          }}
        />
        <Tabs.Screen
          name="messagerie"
          options={{
            title: 'Messagerie',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={20}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (isAnonymous) {
                e.preventDefault();
                setGuestModalFeature('Messagerie');
                setShowGuestModal(true);
              }
            },
          }}
        />
        {/* Routes techniques cachées — accessibles via /messagerie ou deep-link. */}
        <Tabs.Screen name="live-chat" options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="u" options={{ href: null }} />
        <Tabs.Screen
          name="my-articles"
          options={{
            title: 'Mes articles',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "bookmark" : "bookmark-outline"}
                size={20}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              // Intercepter la navigation si l'utilisateur est anonyme
              if (isAnonymous) {
                e.preventDefault(); // Empêcher la navigation
                console.log('👤 [APP LAYOUT] Tab press intercepted for anonymous user - My Articles');
                setGuestModalFeature('Mes articles');
                setShowGuestModal(true);
              }
            },
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favoris',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "heart" : "heart-outline"}
                size={20}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              // Intercepter la navigation si l'utilisateur est anonyme
              if (isAnonymous) {
                e.preventDefault(); // Empêcher la navigation
                console.log('👤 [APP LAYOUT] Tab press intercepted for anonymous user - Favorites');
                setGuestModalFeature('Articles favoris');
                setShowGuestModal(true);
              }
            },
          }}
        />
      </Tabs>

      {/* Modal guest pour les tabs interceptées */}
      <GuestAccountModal
        visible={showGuestModal}
        feature={guestModalFeature}
        onClose={() => setShowGuestModal(false)}
        onGoToSettings={handleGoToSettings}
      />
    </>
  );
}

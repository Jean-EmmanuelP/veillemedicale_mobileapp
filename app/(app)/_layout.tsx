import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../assets/constants/colors';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import React, { useEffect, useState } from 'react';
import { fetchProfile } from '../../store/profileSlice';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import GuestAccountModal from '../../components/GuestAccountModal';

// Composant pour l'effet glassmorphism de la bottom navigation
const MenuBlur = () => {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <BlurView
          intensity={15}
          tint="dark"
          style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
        />
      </View>
    </View>
  );
};

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

  const handleGoToSettings = () => {
    setShowGuestModal(false);
    router.push('/profile');
  };

  return (
    <>
      <Tabs 
        screenOptions={{
          headerShown: false, 
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 20,
            right: 20,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            borderRadius: 20,
            height: Dimensions.get('window').height * 0.1,
            paddingBottom: 10,
            paddingTop: 10,
            elevation: 10, // Shadow pour Android
            shadowColor: '#000', // Shadow pour iOS
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
          },
          tabBarActiveTintColor: COLORS.tabBarActiveTint,
          tabBarInactiveTintColor: COLORS.tabBarInactiveTint,
          tabBarBackground: () => <MenuBlur />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Articles',
            tabBarIcon: ({ color }) => (
              <FontAwesome name="newspaper-o" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="my-articles"
          options={{
            title: 'Mes Articles',
            tabBarIcon: ({ color }) => (
              <FontAwesome name="book" size={20} color={color} />
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
            tabBarIcon: ({ color }) => (
              <FontAwesome name="heart" size={20} color={color} />
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
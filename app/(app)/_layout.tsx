import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../assets/constants/colors';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { View, Text, StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import { fetchProfile } from '../../store/profileSlice';
import { BlurView } from 'expo-blur';

// Helper component for the avatar
const UserAvatar = ({ color }: { color: string }) => {
  const { profile } = useSelector((state: RootState) => state.profile);

  if (profile?.first_name) {
    return (
      <View style={[styles.avatarCircle, { borderColor: color }]}>
        <Text style={[styles.avatarInitial, { color }]}>
          {profile.first_name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return <FontAwesome name="user" size={24} color={color} />;
};

export default function AppLayout() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      dispatch(fetchProfile(userId) as any);
    }
  }, [dispatch, userId]);

  return (
    <Tabs 
      screenOptions={{
        headerShown: false, 
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(24, 24, 24, 0.8)',
          borderTopWidth: 0.5,
          borderTopColor: COLORS.borderPrimary,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.tabBarActiveTint,
        tabBarInactiveTintColor: COLORS.tabBarInactiveTint,
        tabBarBackground: () => (
          <BlurView 
            intensity={40} 
            tint="dark" 
            style={{
              ...StyleSheet.absoluteFillObject,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            }} 
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Articles',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="newspaper-o" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-articles"
        options={{
          title: 'Mes Articles',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <UserAvatar color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color }) => (
            <Text style={{fontSize: 24, color}}>{'❤️'}</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  avatarInitial: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 
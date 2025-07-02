import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../assets/constants/colors';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { View, Text, StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import { fetchProfile } from '../../store/profileSlice';

// Helper component for the avatar
const UserAvatar = ({ color }: { color: string }) => {
  const { profile } = useSelector((state: RootState) => state.profile);

  if (profile?.first_name) {
    return (
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>
          {profile.first_name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  // Fallback icon if no user data or avatar/firstName
  // return <FontAwesome name="user" size={24} color={color} />;
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
          backgroundColor: COLORS.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderPrimary,
        },
        tabBarActiveTintColor: COLORS.tabBarActiveTint,
        tabBarInactiveTintColor: COLORS.tabBarInactiveTint,
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
    borderColor: 'rgba(128, 128, 128, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: 'grey',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 
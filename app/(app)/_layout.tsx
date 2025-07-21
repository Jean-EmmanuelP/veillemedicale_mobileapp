import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../assets/constants/colors';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { View, Text, StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import { fetchProfile } from '../../store/profileSlice';
import { BlurView } from 'expo-blur';

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
          backgroundColor: 'black',
          borderTopWidth: 0.5,
          borderTopColor: COLORS.borderPrimary,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.tabBarActiveTint,
        tabBarInactiveTintColor: COLORS.tabBarInactiveTint,
        tabBarBackground: () => (
          <BlurView 
            intensity={0}
            tint="dark" 
            style={{
              ...StyleSheet.absoluteFillObject,
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
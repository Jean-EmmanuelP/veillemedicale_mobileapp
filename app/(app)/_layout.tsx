import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../assets/constants/colors';

export default function AppLayout() {
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
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RegisterLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Inscription',
        }} 
      />
      <Stack.Screen 
        name="preferences" 
        options={{ 
          title: 'Préférences',
        }} 
      />
    </Stack>
  );
} 
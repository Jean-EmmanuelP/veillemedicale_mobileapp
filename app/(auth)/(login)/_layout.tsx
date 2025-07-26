import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function LoginLayout() {
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
          title: 'Connexion',
        }} 
      />
    </Stack>
  );
} 
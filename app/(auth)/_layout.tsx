import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Connexion',
          headerShown: false,
        }}
      />
    </Stack>
  );
} 
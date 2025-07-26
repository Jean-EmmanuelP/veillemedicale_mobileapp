import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'terms-of-use',
};

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen 
        name="terms-of-use" 
        options={{ 
          title: 'Conditions d\'utilisation',
        }} 
      />
      <Stack.Screen 
        name="privacy-policy" 
        options={{ 
          title: 'Politique de confidentialité',
        }} 
      />
      <Stack.Screen 
        name="company-group" 
        options={{ 
          title: 'Groupe de sociétés',
        }} 
      />
    </Stack>
  );
} 
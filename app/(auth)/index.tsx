import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../store/hooks';

export default function AuthScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  // Rediriger vers la page de login par défaut si pas d'utilisateur
  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
    }
  }, [user]);

  return null; // Pas de rendu car on redirige
} 
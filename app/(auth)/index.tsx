import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUser, setSession } from '../../store/authSlice';
import { supabase } from '../../lib/supabase';
import Auth from '../../components/Auth';

export default function AuthScreen() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.user !== null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch(setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name || '',
        }));
        dispatch(setSession(session.access_token));
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        dispatch(setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name || '',
        }));
        dispatch(setSession(session.access_token));
      } else {
        dispatch(setUser(null));
        dispatch(setSession(null));
      }
    });
  }, [dispatch]);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (isAuthenticated && inAuthGroup) {
      router.replace('/tabs');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth');
    }
  }, [isAuthenticated, segments]);

  return <Auth />;
} 
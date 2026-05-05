import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const { session, loading, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/onboarding-intro');
      return;
    }
    if (session && inAuth) {
      // Check if onboarding done
      supabase.from('taste_profiles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) router.replace('/(tabs)/club');
          else router.replace('/(auth)/onboarding');
        });
    }
  }, [session, loading, router, segments]);

  return <Slot />;
}

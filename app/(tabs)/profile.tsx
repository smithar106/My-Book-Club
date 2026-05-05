import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/auth';
import type { TasteProfile } from '../../src/lib/types';

const PACE_LABELS: Record<string, string> = {
  slow: '📖 Leisurely',
  medium: '📚 Steady',
  fast: '⚡ Fast',
};

export default function ProfileScreen() {
  const { session, signOut } = useAuthStore();
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const loadTasteProfile = async () => {
      const { data } = await supabase
        .from('taste_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      setTaste(data as TasteProfile | null);
      setLoading(false);
    };

    loadTasteProfile();
  }, [session]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.heading}>My Profile</Text>
      <Text style={s.email}>{session?.user.email}</Text>

      {taste ? (
        <View style={s.card}>
          <Text style={s.label}>Genres</Text>
          <Text style={s.value}>{taste.genres.length > 0 ? taste.genres.join(', ') : '—'}</Text>

          <Text style={s.label}>Reading Pace</Text>
          <Text style={s.value}>{PACE_LABELS[taste.pace] ?? taste.pace}</Text>

          <Text style={s.label}>Books Liked</Text>
          <Text style={s.value}>{taste.liked_book_ids.length}</Text>

          <Text style={s.label}>Books Skipped</Text>
          <Text style={s.value}>{taste.disliked_book_ids.length}</Text>
        </View>
      ) : (
        <Text style={s.noProfile}>Complete onboarding to see your taste profile.</Text>
      )}

      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Text style={s.signOutTxt}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  email: { color: '#666', marginBottom: 24 },
  card: { backgroundColor: '#F5F5F0', borderRadius: 16, padding: 16 },
  label: { fontSize: 12, color: '#999', textTransform: 'uppercase', marginTop: 12 },
  value: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  noProfile: { color: '#999', textAlign: 'center', marginTop: 40 },
  signOut: { marginTop: 40, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  signOutTxt: { color: '#e33', fontWeight: '600' },
});

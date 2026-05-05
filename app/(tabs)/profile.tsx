import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/auth';
import type { TasteProfile } from '../../src/lib/types';

const PACE_LABELS: Record<string, string> = {
  slow: '📖 Leisurely — a chapter or two a week',
  medium: '📚 Steady — a few chapters a week',
  fast: '⚡ Fast — I finish books in a weekend',
};

export default function ProfileScreen() {
  const { session, signOut } = useAuthStore();
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const loadTasteProfile = async () => {
      try {
        const { data } = await supabase
          .from('taste_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        setTaste(data as TasteProfile | null);
      } finally {
        setLoading(false);
      }
    };

    loadTasteProfile();
  }, [session]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#D4874E" />
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <View style={s.avatarRow}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>📚</Text>
        </View>
        <View>
          <Text style={s.heading}>My Profile</Text>
          <Text style={s.email}>{session?.user.email}</Text>
        </View>
      </View>

      {taste ? (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Your Reading Taste</Text>

            {taste.genres.length > 0 && (
              <View style={s.section}>
                <Text style={s.label}>Genres you love</Text>
                <View style={s.chips}>
                  {taste.genres.map(g => (
                    <View key={g} style={s.chip}><Text style={s.chipTxt}>{g}</Text></View>
                  ))}
                </View>
              </View>
            )}

            <View style={s.section}>
              <Text style={s.label}>Reading pace</Text>
              <Text style={s.value}>{PACE_LABELS[taste.pace] ?? taste.pace}</Text>
            </View>

            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statNum}>{taste.liked_book_ids.length}</Text>
                <Text style={s.statLbl}>Books liked</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={s.statNum}>{taste.disliked_book_ids.length}</Text>
                <Text style={s.statLbl}>Passed on</Text>
              </View>
            </View>
          </View>
        </>
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
  scroll: { flex: 1, backgroundColor: '#FEFAF4' },
  container: { padding: 20, paddingBottom: 60, paddingTop: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFAF4' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 26 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1C1C1E' },
  email: { color: '#8A7060', fontSize: 14, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },
  section: { marginBottom: 16 },
  label: { fontSize: 11, color: '#A89B8C', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  value: { fontSize: 15, color: '#2C2C2E', fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#FFF3E8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chipTxt: { color: '#D4874E', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F0EAE2' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#2D6A4F' },
  statLbl: { fontSize: 12, color: '#8A7060', marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: '#F0EAE2' },
  noProfile: { color: '#A89B8C', textAlign: 'center', marginTop: 40, fontSize: 15 },
  signOut: { marginTop: 8, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5D9CC', alignItems: 'center' },
  signOutTxt: { color: '#C0392B', fontWeight: '600', fontSize: 15 },
});

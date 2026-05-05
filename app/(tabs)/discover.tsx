import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { DiscoverCard } from '../../src/components/DiscoverCard';
import type { DiscoveryEntry } from '../../src/lib/types';

export default function DiscoverScreen() {
  const [entries, setEntries] = useState<DiscoveryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscovery = async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('discovery_feed')
      .select('*')
      .limit(20);

    if (e) {
      setError(e.message);
    } else {
      setEntries((data ?? []) as DiscoveryEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDiscovery();
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#D4874E" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Something went wrong.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchDiscovery}>
          <Text style={s.retryTxt}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.heading}>Discover</Text>
      <Text style={s.sub}>What other book clubs are reading right now</Text>
      {entries.length === 0
        ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>🌱</Text>
            <Text style={s.emptyTitle}>This is just the beginning</Text>
            <Text style={s.emptySub}>Be one of the first clubs — your book will appear here for others to discover.</Text>
          </View>
        )
        : entries.map(e => (
          <DiscoverCard key={`${e.book_id}-${e.region ?? 'global'}`} entry={e} />
        ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FEFAF4' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FEFAF4' },
  heading: { fontSize: 28, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
  sub: { color: '#8A7060', marginBottom: 20, fontSize: 15 },
  emptyBox: { alignItems: 'center', marginTop: 40, padding: 24, backgroundColor: '#fff',
    borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8A7060', textAlign: 'center', lineHeight: 22 },
  errorText: { color: '#6B5A4E', marginBottom: 12, fontSize: 15 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2D6A4F' },
  retryTxt: { color: '#fff', fontWeight: '600' },
});

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
        <ActivityIndicator size="large" color="#2D6A4F" />
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
      <Text style={s.sub}>What other clubs are reading right now</Text>
      {entries.length === 0
        ? <Text style={s.empty}>No clubs yet — be one of the first!</Text>
        : entries.map(e => (
            <DiscoverCard key={`${e.book_id}-${e.region ?? 'global'}`} entry={e} />
          ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#666', marginBottom: 20 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  errorText: { color: '#666', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2D6A4F' },
  retryTxt: { color: '#fff', fontWeight: '600' },
});

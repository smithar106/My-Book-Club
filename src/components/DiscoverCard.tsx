import { View, Text, Image, StyleSheet } from 'react-native';
import type { DiscoveryEntry } from '../lib/types';

export function DiscoverCard({ entry }: { entry: DiscoveryEntry }) {
  return (
    <View style={s.card}>
      {entry.book_cover_url
        ? <Image source={{ uri: entry.book_cover_url }} style={s.cover} />
        : <View style={[s.cover, s.placeholder]} />}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>{entry.book_title}</Text>
        <Text style={s.author}>{entry.book_author}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>
            📖 {entry.reader_count} {entry.reader_count === 1 ? 'reader' : 'readers'}
            {entry.region ? ` · ${entry.region}` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cover: { width: 60, height: 90, borderRadius: 8 },
  placeholder: { backgroundColor: '#E5D9CC' },
  info: { flex: 1, justifyContent: 'center', gap: 4 },
  title: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  author: { color: '#8A7060', fontSize: 13, fontWeight: '500' },
  badge: { backgroundColor: '#E8F4EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { color: '#2D6A4F', fontSize: 12, fontWeight: '600' },
});

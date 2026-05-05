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
        <Text style={s.readers}>
          📖 {entry.reader_count} {entry.reader_count === 1 ? 'reader' : 'readers'}
          {entry.region ? ` in ${entry.region}` : ''}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#F5F5F0', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  cover: { width: 56, height: 84, borderRadius: 6 },
  placeholder: { backgroundColor: '#ddd' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  author: { color: '#666', fontSize: 13, marginBottom: 4 },
  readers: { color: '#2D6A4F', fontSize: 12 },
});

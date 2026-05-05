import { View, Text, Image, StyleSheet } from 'react-native';
import type { Club } from '../lib/types';

export function BookCard({ club }: { club: Club }) {
  return (
    <View style={s.card}>
      {club.book_cover_url
        ? <Image source={{ uri: club.book_cover_url }} style={s.cover} />
        : <View style={[s.cover, s.placeholder]} />}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>{club.book_title}</Text>
        <Text style={s.author}>{club.book_author}</Text>
        <Text style={s.reason}>{club.book_reason}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#F5F5F0', borderRadius: 16, padding: 16, gap: 12 },
  cover: { width: 72, height: 108, borderRadius: 8 },
  placeholder: { backgroundColor: '#ddd' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  author: { color: '#666', marginBottom: 6 },
  reason: { fontSize: 12, color: '#2D6A4F', fontStyle: 'italic' },
});

import { View, Text, Image, StyleSheet } from 'react-native';
import type { Club } from '../lib/types';

export function BookCard({ club }: { club: Club }) {
  return (
    <View style={s.card}>
      <View style={s.top}>
        {club.book_cover_url
          ? <Image source={{ uri: club.book_cover_url }} style={s.cover} />
          : <View style={[s.cover, s.placeholder]} />}
        <View style={s.info}>
          <Text style={s.title} numberOfLines={3}>{club.book_title}</Text>
          <Text style={s.author}>{club.book_author}</Text>
        </View>
      </View>
      {club.book_reason ? (
        <View style={s.reasonBox}>
          <Text style={s.reasonLabel}>Why this book for your club</Text>
          <Text style={s.reason}>"{club.book_reason}"</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  top: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  cover: { width: 80, height: 120, borderRadius: 10 },
  placeholder: { backgroundColor: '#E5D9CC' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '800', color: '#1C1C1E', marginBottom: 4, lineHeight: 26 },
  author: { color: '#8A7060', fontSize: 14, fontWeight: '500' },
  reasonBox: { backgroundColor: '#FFF3E8', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#D4874E' },
  reasonLabel: { fontSize: 11, color: '#A87448', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  reason: { fontSize: 15, color: '#4A3728', lineHeight: 22, fontStyle: 'italic', fontWeight: '500' },
});

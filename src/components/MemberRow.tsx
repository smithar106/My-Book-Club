import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from './ProgressBar';

const AVATAR_COLORS = ['#E07B39', '#2D6A4F', '#7B68EE', '#E91E8C', '#2980B9', '#C0392B', '#16A085'];

interface Props {
  userId: string;
  percent: number;
  isMe: boolean;
  genres?: string[];
  pace?: string;
}

export function MemberRow({ userId, percent, isMe, genres = [], pace }: Props) {
  const colorIdx = parseInt(userId.slice(0, 2), 16) % AVATAR_COLORS.length;
  const avatarColor = isMe ? '#2D6A4F' : AVATAR_COLORS[colorIdx];
  const tagline = genres.length > 0
    ? `${genres[0]}${pace ? ` · ${pace === 'slow' ? 'Leisurely' : pace === 'fast' ? 'Fast reader' : 'Steady'}` : ''}`
    : pace ? (pace === 'slow' ? 'Leisurely reader' : pace === 'fast' ? 'Fast reader' : 'Steady reader') : 'Reader';

  return (
    <View style={s.row}>
      <View style={[s.avatar, { backgroundColor: avatarColor }]}>
        <Text style={s.avatarTxt}>{isMe ? 'Me' : '📚'}</Text>
      </View>
      <View style={s.body}>
        <View style={s.nameRow}>
          <Text style={s.name}>{isMe ? 'You' : tagline}</Text>
          <Text style={s.pct}>{percent}%</Text>
        </View>
        <ProgressBar percent={percent} color={isMe ? '#D4874E' : avatarColor} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  body: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#2C2C2E' },
  pct: { fontSize: 13, color: '#8A7060', fontWeight: '600' },
});

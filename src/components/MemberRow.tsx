import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from './ProgressBar';

interface Props {
  userId: string;
  percent: number;
  isMe: boolean;
}

export function MemberRow({ userId, percent, isMe }: Props) {
  return (
    <View style={s.row}>
      <View style={s.avatar}>
        <Text style={s.avatarTxt}>{userId.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={s.body}>
        <Text style={s.name}>{isMe ? 'You' : `Reader ${userId.slice(0, 4)}`}</Text>
        <ProgressBar percent={percent} color={isMe ? '#2D6A4F' : '#aaa'} />
      </View>
      <Text style={s.pct}>{percent}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700' },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '500' },
  pct: { fontSize: 13, color: '#666', width: 36, textAlign: 'right' },
});

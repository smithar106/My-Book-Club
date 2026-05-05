import { View, StyleSheet } from 'react-native';

export function ProgressBar({ percent, color = '#2D6A4F' }: { percent: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.min(Math.max(percent, 0), 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

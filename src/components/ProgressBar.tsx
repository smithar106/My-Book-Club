import { View, StyleSheet } from 'react-native';

export function ProgressBar({ percent, color = '#D4874E' }: { percent: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.min(Math.max(percent, 0), 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 7, backgroundColor: '#EDE3D8', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

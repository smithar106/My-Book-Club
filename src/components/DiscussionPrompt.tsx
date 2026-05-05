import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { DiscussionPrompt as Prompt, PromptReaction, Reaction } from '../lib/types';

const REACTIONS: { key: Reaction; label: string; color: string }[] = [
  { key: 'love', label: '❤️ Loved it', color: '#FDECEA' },
  { key: 'confused', label: '🤔 Confused', color: '#FFF3E0' },
  { key: 'bored', label: '😴 Bored me', color: '#F3F3F3' },
];

interface Props {
  prompt: Prompt;
  reactions: PromptReaction[];
  myReaction: PromptReaction | undefined;
  onReact: (reaction: Reaction) => void;
  locked: boolean;
}

export function DiscussionPromptCard({ prompt, reactions, myReaction, onReact, locked }: Props) {
  if (locked) {
    return (
      <View style={[s.card, s.locked]}>
        <Text style={s.lockIcon}>🔒</Text>
        <Text style={s.lockText}>Unlocks at {prompt.unlock_at_percent}%</Text>
        <Text style={s.lockHint}>Keep reading to unlock this discussion</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.label}>Discussion prompt</Text>
      <Text style={s.text}>{prompt.prompt_text}</Text>
      <View style={s.row}>
        {REACTIONS.map(r => {
          const count = reactions.filter(rx => rx.prompt_id === prompt.id && rx.reaction === r.key).length;
          const active = myReaction?.reaction === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[s.chip, active && { backgroundColor: r.color, borderColor: '#D4874E' }]}
              onPress={() => onReact(r.key)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {r.label}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  locked: { backgroundColor: '#F7F2EC', alignItems: 'center', paddingVertical: 20, shadowOpacity: 0 },
  lockIcon: { fontSize: 24, marginBottom: 6 },
  lockText: { fontSize: 15, color: '#8A7060', fontWeight: '700', marginBottom: 3 },
  lockHint: { fontSize: 12, color: '#A89B8C' },
  label: { fontSize: 11, color: '#D4874E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  text: { fontSize: 16, lineHeight: 24, color: '#2C2C2E', fontStyle: 'italic', marginBottom: 14, fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F7F2EC', borderWidth: 1.5, borderColor: '#E5D9CC' },
  chipText: { fontSize: 13, color: '#4A3728', fontWeight: '500' },
  chipTextActive: { color: '#4A3728', fontWeight: '700' },
});

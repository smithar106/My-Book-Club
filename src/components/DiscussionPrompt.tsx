import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { DiscussionPrompt as Prompt, PromptReaction, Reaction } from '../lib/types';

const REACTIONS: { key: Reaction; label: string }[] = [
  { key: 'love', label: '❤️' },
  { key: 'confused', label: '🤔' },
  { key: 'bored', label: '😴' },
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
        <Text style={s.lockText}>🔒 Unlocks at {prompt.unlock_at_percent}%</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.text}>{prompt.prompt_text}</Text>
      <View style={s.row}>
        {REACTIONS.map(r => {
          const count = reactions.filter(rx => rx.prompt_id === prompt.id && rx.reaction === r.key).length;
          const active = myReaction?.reaction === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[s.chip, active && s.active]}
              onPress={() => onReact(r.key)}
            >
              <Text style={s.chipText}>{r.label}{count > 0 ? ` ${count}` : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#F5F5F0', borderRadius: 14, padding: 16, marginBottom: 12 },
  locked: { opacity: 0.4 },
  lockText: { color: '#999', textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  active: { borderColor: '#2D6A4F', backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 14 },
});

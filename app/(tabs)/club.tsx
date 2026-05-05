import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../src/store/auth';
import { useClubStore } from '../../src/store/club';
import { BookCard } from '../../src/components/BookCard';
import { MemberRow } from '../../src/components/MemberRow';
import { DiscussionPromptCard } from '../../src/components/DiscussionPrompt';
import type { Reaction } from '../../src/lib/types';

export default function ClubScreen() {
  const { session } = useAuthStore();
  const { club, myProgress, memberProgress, prompts, reactions, loading, load, updateProgress, react } = useClubStore();
  const userId = session?.user.id ?? '';

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  if (!club || club.book_id === 'pending') {
    return (
      <View style={s.center}>
        <Text style={s.waiting}>⏳ Finding your perfect club…</Text>
        <Text style={s.sub}>We're matching you with readers like you. Check back soon!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.heading}>My Club</Text>
      <BookCard club={club} />

      <Text style={s.section}>Reading Progress</Text>
      <View style={s.progressRow}>
        <Text style={s.progressLabel}>You: {myProgress}%</Text>
        <TouchableOpacity
          onPress={() => updateProgress(userId, club.id, Math.min(myProgress + 10, 100))}
        >
          <Text style={s.nudge}>+10%</Text>
        </TouchableOpacity>
      </View>

      {memberProgress.map(mp => (
        <MemberRow
          key={mp.user_id}
          userId={mp.user_id}
          percent={mp.percent}
          isMe={mp.user_id === userId}
        />
      ))}

      <Text style={s.section}>Discussion</Text>
      {prompts.map(p => (
        <DiscussionPromptCard
          key={p.id}
          prompt={p}
          reactions={reactions}
          myReaction={reactions.find(r => r.prompt_id === p.id && r.user_id === userId)}
          onReact={(reaction: Reaction) => react(p.id, userId, reaction)}
          locked={myProgress < p.unlock_at_percent}
        />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  waiting: { fontSize: 22, textAlign: 'center', marginBottom: 8 },
  sub: { color: '#666', textAlign: 'center' },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontSize: 15, fontWeight: '500' },
  nudge: { color: '#2D6A4F', fontWeight: '600' },
});

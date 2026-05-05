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
  const { club, myProgress, memberProgress, prompts, reactions, loading, load, updateProgress, addReaction } = useClubStore();
  const userId = session?.user.id ?? '';

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#D4874E" />
      </View>
    );
  }

  if (!club || club.book_id === 'pending') {
    return (
      <View style={s.pendingContainer}>
        <Text style={s.pendingEmoji}>🔍</Text>
        <Text style={s.pendingTitle}>Finding your perfect club</Text>
        <Text style={s.pendingSub}>
          We're scanning readers with your taste and pace to find the right match.
        </Text>
        <View style={s.pendingSteps}>
          <Text style={s.pendingStep}>✅ Your taste profile saved</Text>
          <Text style={s.pendingStep}>⏳ Matching you with readers like you…</Text>
          <Text style={s.pendingStepGray}>📖 Picking a book your whole club will love</Text>
        </View>
        <Text style={s.pendingNote}>Usually takes a few minutes. Pull down to refresh.</Text>
      </View>
    );
  }

  const totalPercent = memberProgress.length > 0
    ? Math.round(memberProgress.reduce((sum, m) => sum + m.percent, 0) / memberProgress.length)
    : myProgress;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.heading}>My Book Club</Text>

      <BookCard club={club} />

      <View style={s.clubBanner}>
        <Text style={s.clubBannerText}>
          📍 {memberProgress.length} readers · {totalPercent}% through the book on average
        </Text>
      </View>

      <Text style={s.section}>Reading Progress</Text>
      <View style={s.progressActions}>
        <Text style={s.progressYou}>You're at {myProgress}%</Text>
        <TouchableOpacity
          style={s.logBtn}
          onPress={() => updateProgress(userId, club.id, Math.min(myProgress + 10, 100))}
        >
          <Text style={s.logBtnTxt}>+ Log progress</Text>
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
      <Text style={s.sectionSub}>Prompts unlock as you read — react to see how your club feels</Text>
      {prompts.map(p => (
        <DiscussionPromptCard
          key={p.id}
          prompt={p}
          reactions={reactions}
          myReaction={reactions.find(r => r.prompt_id === p.id && r.user_id === userId)}
          onReact={(reaction: Reaction) => addReaction(p.id, userId, reaction)}
          locked={myProgress < p.unlock_at_percent}
        />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FEFAF4' },
  container: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFAF4' },
  pendingContainer: { flex: 1, backgroundColor: '#FEFAF4', padding: 28, justifyContent: 'center', alignItems: 'center' },
  pendingEmoji: { fontSize: 56, marginBottom: 16 },
  pendingTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E', textAlign: 'center', marginBottom: 10 },
  pendingSub: { fontSize: 16, color: '#6B5A4E', textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  pendingSteps: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', gap: 12, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  pendingStep: { fontSize: 15, color: '#2C2C2E', fontWeight: '500' },
  pendingStepGray: { fontSize: 15, color: '#A89B8C' },
  pendingNote: { fontSize: 13, color: '#A89B8C', textAlign: 'center' },
  heading: { fontSize: 28, fontWeight: '800', color: '#1C1C1E', marginBottom: 16 },
  clubBanner: { backgroundColor: '#E8F4EE', borderRadius: 12, padding: 12, marginTop: 12, marginBottom: 4 },
  clubBannerText: { color: '#2D6A4F', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  section: { fontSize: 19, fontWeight: '700', color: '#1C1C1E', marginTop: 28, marginBottom: 6 },
  sectionSub: { fontSize: 13, color: '#8A7060', marginBottom: 14 },
  progressActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressYou: { fontSize: 15, fontWeight: '600', color: '#4A3728' },
  logBtn: { backgroundColor: '#D4874E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  logBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

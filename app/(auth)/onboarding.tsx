import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { fetchSeedBooks } from '../../src/lib/booksDb';
import type { MnbBook, Pace } from '../../src/lib/types';

const GENRES = ['Literary Fiction', 'Mystery', 'Fantasy', 'Sci-Fi', 'Romance', 'Thriller', 'Historical', 'Non-Fiction'];
const GENRE_COLORS: Record<string, string> = {
  'Literary Fiction': '#7B68EE', 'Mystery': '#E07B39', 'Fantasy': '#9B59B6',
  'Sci-Fi': '#2980B9', 'Romance': '#E91E8C', 'Thriller': '#C0392B',
  'Historical': '#8B6914', 'Non-Fiction': '#16A085',
};
const PACES: { label: string; value: Pace; desc: string }[] = [
  { label: '📖 Leisurely', value: 'slow', desc: 'A chapter or two a week' },
  { label: '📚 Steady', value: 'medium', desc: 'A few chapters a week' },
  { label: '⚡ Fast', value: 'fast', desc: 'I finish books in a weekend' },
];
const BOOK_SAMPLE_SIZE = 6;

const STEP_LABELS = ['Your taste', 'Your genres', 'Your pace'];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'books' | 'genres' | 'pace'>('books');
  const [seedBooks, setSeedBooks] = useState<MnbBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [bookIdx, setBookIdx] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [pace, setPace] = useState<Pace>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSeedBooks(BOOK_SAMPLE_SIZE)
      .then(books => {
        setSeedBooks(books);
        setBooksLoading(false);
        if (books.length === 0) setStep('genres');
      })
      .catch(() => {
        setBooksLoading(false);
        setStep('genres');
      });
  }, []);

  const reactToBook = (bookId: string, isLike: boolean) => {
    if (isLike) setLiked(p => [...p, bookId]);
    else setDisliked(p => [...p, bookId]);
    if (bookIdx < seedBooks.length - 1) {
      setBookIdx(i => i + 1);
    } else {
      setStep('genres');
    }
  };

  const toggleGenre = (g: string) =>
    setSelectedGenres(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);

  const finish = async () => {
    setSaving(true);
    setError(null);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setSaving(false);
      setError('Session expired. Please sign in again.');
      return;
    }

    const { error: upsertError } = await supabase.from('taste_profiles').upsert({
      user_id: user.id,
      genres: selectedGenres,
      pace,
      tone: [],
      liked_book_ids: liked,
      disliked_book_ids: disliked,
    });
    if (upsertError) {
      setSaving(false);
      setError(upsertError.message);
      return;
    }

    await supabase.functions.invoke('match-user', { body: { user_id: user.id } });
    router.replace('/(tabs)/club');
  };

  const stepIndex = step === 'books' ? 0 : step === 'genres' ? 1 : 2;

  const header = (
    <View style={s.stepHeader}>
      <View style={s.stepDots}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[s.dot, i === stepIndex && s.dotActive, i < stepIndex && s.dotDone]} />
        ))}
      </View>
      <Text style={s.stepLabel}>{STEP_LABELS[stepIndex]}</Text>
    </View>
  );

  if (step === 'books') {
    if (booksLoading) {
      return (
        <View style={s.container}>
          {header}
          <ActivityIndicator size="large" color="#D4874E" style={{ marginTop: 60 }} />
        </View>
      );
    }

    const book = seedBooks[bookIdx];
    return (
      <View style={s.container}>
        {header}
        <Text style={s.heading}>Quick taste check</Text>
        <Text style={s.sub}>Swipe through a few books so we can find readers like you</Text>
        <Text style={s.counter}>{bookIdx + 1} / {seedBooks.length}</Text>
        {book && (
          <>
            <View style={s.bookCard}>
              <View style={s.genreBar}>
                {book.genres.slice(0, 2).map(g => (
                  <View key={g} style={[s.genreTag, { backgroundColor: GENRE_COLORS[g] ?? '#2D6A4F' }]}>
                    <Text style={s.genreTagTxt}>{g}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.bookTitle}>{book.title}</Text>
              <Text style={s.bookAuthor}>{book.author}</Text>
              {book.description && (
                <Text style={s.bookDesc} numberOfLines={5}>{book.description}</Text>
              )}
            </View>
            <View style={s.row}>
              <TouchableOpacity style={[s.btn, s.dislike]} onPress={() => reactToBook(book.id, false)}>
                <Text style={s.dislikeTxt}>😐 Not for me</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.like]} onPress={() => reactToBook(book.id, true)}>
                <Text style={s.likeTxt}>❤️ Love it</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  if (step === 'genres') {
    return (
      <View style={s.container}>
        {header}
        <Text style={s.heading}>What do you love to read?</Text>
        <Text style={s.sub}>Pick your genres — we'll find readers who share your taste</Text>
        <View style={s.wrap}>
          {GENRES.map(g => {
            const selected = selectedGenres.includes(g);
            return (
              <TouchableOpacity
                key={g}
                style={[s.chip, selected && { backgroundColor: GENRE_COLORS[g] ?? '#2D6A4F', borderColor: 'transparent' }]}
                onPress={() => toggleGenre(g)}
              >
                <Text style={[s.chipTxt, selected && s.chipTxtSelected]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={() => setStep('pace')}>
          <Text style={s.nextTxt}>Next →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {header}
      <Text style={s.heading}>How fast do you read?</Text>
      <Text style={s.sub}>We'll match you with readers at the same pace so no one feels left behind</Text>
      {PACES.map(p => (
        <TouchableOpacity
          key={p.value}
          style={[s.paceBtn, pace === p.value && s.paceBtnSelected]}
          onPress={() => setPace(p.value)}
        >
          <Text style={s.paceLbl}>{p.label}</Text>
          <Text style={s.paceDesc}>{p.desc}</Text>
        </TouchableOpacity>
      ))}
      {error && <Text style={s.errorText}>{error}</Text>}
      <TouchableOpacity style={[s.nextBtn, saving && s.nextBtnDisabled]} onPress={finish} disabled={saving}>
        <Text style={s.nextTxt}>{saving ? '🔍 Finding your club…' : 'Find My Club →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FEFAF4', paddingTop: 56 },
  stepHeader: { alignItems: 'center', marginBottom: 28 },
  stepDots: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9CEC4' },
  dotActive: { width: 24, backgroundColor: '#D4874E' },
  dotDone: { backgroundColor: '#2D6A4F' },
  stepLabel: { fontSize: 12, color: '#8A7060', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  heading: { fontSize: 26, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
  sub: { color: '#6B5A4E', marginBottom: 20, fontSize: 15, lineHeight: 22 },
  counter: { fontSize: 13, color: '#A89B8C', marginBottom: 16, fontWeight: '600' },
  bookCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  genreBar: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  genreTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  genreTagTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bookTitle: { fontSize: 21, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: '#8A7060', marginBottom: 10 },
  bookDesc: { color: '#4A3728', lineHeight: 22, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  dislike: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5D9CC' },
  like: { backgroundColor: '#2D6A4F' },
  dislikeTxt: { fontWeight: '600', color: '#4A3728', fontSize: 15 },
  likeTxt: { fontWeight: '700', color: '#fff', fontSize: 15 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: '#D9CEC4', backgroundColor: '#fff' },
  chipTxt: { color: '#4A3728', fontWeight: '600', fontSize: 14 },
  chipTxtSelected: { color: '#fff' },
  paceBtn: { padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#D9CEC4', marginBottom: 12, backgroundColor: '#fff' },
  paceBtnSelected: { borderColor: '#D4874E', backgroundColor: '#FFF3E8' },
  paceLbl: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 2 },
  paceDesc: { fontSize: 13, color: '#8A7060' },
  nextBtn: { backgroundColor: '#D4874E', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  nextBtnDisabled: { opacity: 0.6 },
  nextTxt: { color: '#fff', fontWeight: '700', fontSize: 17 },
  errorText: { color: '#C0392B', marginBottom: 8, textAlign: 'center', fontSize: 14 },
});

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { fetchSeedBooks } from '../../src/lib/booksDb';
import type { MnbBook, Pace } from '../../src/lib/types';

const GENRES = ['Literary Fiction', 'Mystery', 'Fantasy', 'Sci-Fi', 'Romance', 'Thriller', 'Historical', 'Non-Fiction'];
const PACES: { label: string; value: Pace }[] = [
  { label: '📖 Leisurely', value: 'slow' },
  { label: '📚 Steady', value: 'medium' },
  { label: '⚡ Fast', value: 'fast' },
];
const BOOK_SAMPLE_SIZE = 6;

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

  useEffect(() => {
    fetchSeedBooks(BOOK_SAMPLE_SIZE).then(books => {
      setSeedBooks(books);
      setBooksLoading(false);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('taste_profiles').upsert({
      user_id: user.id,
      genres: selectedGenres,
      pace,
      tone: [],
      liked_book_ids: liked,
      disliked_book_ids: disliked,
    });

    await supabase.functions.invoke('match-user', { body: { user_id: user.id } });
    router.replace('/(tabs)/club');
  };

  if (step === 'books') {
    if (booksLoading) {
      return (
        <View style={s.container}>
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      );
    }

    const book = seedBooks[bookIdx];
    return (
      <View style={s.container}>
        <Text style={s.heading}>Quick taste check</Text>
        <Text style={s.sub}>{bookIdx + 1} of {seedBooks.length}</Text>
        {book && (
          <>
            <View style={s.bookCard}>
              <Text style={s.bookTitle}>{book.title}</Text>
              <Text style={s.bookGenres}>{book.genres.slice(0, 2).join(' · ')}</Text>
              {book.description && (
                <Text style={s.bookDesc} numberOfLines={4}>{book.description}</Text>
              )}
            </View>
            <View style={s.row}>
              <TouchableOpacity style={[s.btn, s.dislike]} onPress={() => reactToBook(book.id, false)}>
                <Text style={s.btnTxtDark}>Not for me</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.like]} onPress={() => reactToBook(book.id, true)}>
                <Text style={s.btnTxtLight}>Love it!</Text>
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
        <Text style={s.heading}>What do you love to read?</Text>
        <Text style={s.sub}>Pick as many as you like</Text>
        <View style={s.wrap}>
          {GENRES.map(g => (
            <TouchableOpacity
              key={g}
              style={[s.chip, selectedGenres.includes(g) && s.chipSelected]}
              onPress={() => toggleGenre(g)}
            >
              <Text style={selectedGenres.includes(g) ? s.chipTxtSelected : s.chipTxt}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={() => setStep('pace')}>
          <Text style={s.nextTxt}>Next →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.heading}>How fast do you read?</Text>
      <Text style={s.sub}>We'll match you with readers at your pace</Text>
      {PACES.map(p => (
        <TouchableOpacity
          key={p.value}
          style={[s.paceBtn, pace === p.value && s.paceBtnSelected]}
          onPress={() => setPace(p.value)}
        >
          <Text style={s.paceTxt}>{p.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[s.nextBtn, saving && s.nextBtnDisabled]} onPress={finish} disabled={saving}>
        <Text style={s.nextTxt}>{saving ? 'Finding your club…' : 'Find my club →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#999', marginBottom: 24 },
  bookCard: { backgroundColor: '#F5F5F0', borderRadius: 16, padding: 20, marginBottom: 24 },
  bookTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  bookGenres: { color: '#2D6A4F', marginBottom: 8 },
  bookDesc: { color: '#555', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  dislike: { backgroundColor: '#f0f0f0' },
  like: { backgroundColor: '#2D6A4F' },
  btnTxtDark: { fontWeight: '600', color: '#333' },
  btnTxtLight: { fontWeight: '600', color: '#fff' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  chipSelected: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  chipTxt: { color: '#333' },
  chipTxtSelected: { color: '#fff' },
  paceBtn: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginBottom: 12 },
  paceBtnSelected: { borderColor: '#2D6A4F', backgroundColor: '#E8F5E9' },
  paceTxt: { fontSize: 16 },
  nextBtn: { backgroundColor: '#2D6A4F', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  nextBtnDisabled: { opacity: 0.6 },
  nextTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

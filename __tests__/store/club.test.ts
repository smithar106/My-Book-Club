import { scoreCompatibility } from '../../supabase/functions/match-user/logic';
import { scoreBookForClub, buildBookReason } from '../../supabase/functions/select-book/logic';
import { applyInteraction } from '../../supabase/functions/update-taste/logic';
import type { TasteProfile, MnbBook } from '../../src/lib/types';

const profile: TasteProfile = {
  user_id: 'a',
  genres: ['Mystery'],
  pace: 'medium',
  tone: [],
  liked_book_ids: [],
  disliked_book_ids: [],
  updated_at: '',
};

const book: MnbBook = {
  id: 'b1',
  title: 'Test Book',
  author_id: 'au1',
  description: null,
  cover_url: null,
  genres: ['Mystery', 'Thriller'],
  tags: [],
  themes: [],
  page_count: null,
  popularity_score: null,
  taste_vector: {},
};

test('scoreCompatibility smoke test', () => {
  const other: TasteProfile = { ...profile, user_id: 'b' };
  expect(scoreCompatibility(profile, other)).toBe(1.0);
});

test('scoreCompatibility same user returns 0', () => {
  expect(scoreCompatibility(profile, profile)).toBe(0);
});

test('buildBookReason returns readable string', () => {
  const profiles: TasteProfile[] = [
    { ...profile, genres: ['Mystery', 'Thriller'] },
  ];
  expect(buildBookReason(book, profiles)).toContain('Mystery');
});

test('scoreBookForClub returns 0 for unrelated book', () => {
  const scifi: MnbBook = { ...book, genres: ['Sci-Fi'] };
  expect(scoreBookForClub(scifi, [profile])).toBe(0);
});

test('applyInteraction does not duplicate', () => {
  const p1 = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: [] });
  const p2 = applyInteraction(p1, { book_id: 'bk1', action: 'like', genres: [] });
  expect(p2.liked_book_ids.filter(id => id === 'bk1').length).toBe(1);
});

test('applyInteraction like does not affect disliked', () => {
  const updated = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: [] });
  expect(updated.disliked_book_ids).toHaveLength(0);
});

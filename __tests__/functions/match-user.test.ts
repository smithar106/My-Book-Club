import { scoreCompatibility } from '../../supabase/functions/match-user/logic';
import type { TasteProfile } from '../../src/lib/types';

const base: TasteProfile = {
  user_id: 'a', genres: ['Mystery', 'Thriller'], pace: 'medium',
  tone: ['tense'], liked_book_ids: ['b1', 'b2'], disliked_book_ids: [],
  updated_at: '',
};

test('identical profiles score 1.0', () => {
  expect(scoreCompatibility(base, { ...base, user_id: 'b' })).toBe(1.0);
});

test('different pace reduces score', () => {
  const other = { ...base, user_id: 'b', pace: 'fast' as const };
  expect(scoreCompatibility(base, other)).toBeLessThan(1.0);
});

test('no genre overlap scores low', () => {
  const other = { ...base, user_id: 'b', genres: ['Romance', 'Fantasy'] };
  expect(scoreCompatibility(base, other)).toBeLessThan(0.5);
});

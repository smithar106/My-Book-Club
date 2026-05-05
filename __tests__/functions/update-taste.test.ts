import { applyInteraction } from '../../supabase/functions/update-taste/logic';
import type { TasteProfile } from '../../src/lib/types';

const profile: TasteProfile = {
  user_id: 'a', genres: ['Mystery'], pace: 'medium', tone: [],
  liked_book_ids: [], disliked_book_ids: [], updated_at: '',
};

test('liking a book adds to liked_book_ids', () => {
  const updated = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: ['Mystery'] });
  expect(updated.liked_book_ids).toContain('bk1');
});

test('disliking a book adds to disliked_book_ids', () => {
  const updated = applyInteraction(profile, { book_id: 'bk2', action: 'dislike', genres: ['Romance'] });
  expect(updated.disliked_book_ids).toContain('bk2');
});

test('liking does not affect disliked list', () => {
  const updated = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: [] });
  expect(updated.disliked_book_ids).toHaveLength(0);
});

test('no duplicate liked book ids', () => {
  const p1 = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: [] });
  const p2 = applyInteraction(p1, { book_id: 'bk1', action: 'like', genres: [] });
  expect(p2.liked_book_ids.filter(id => id === 'bk1').length).toBe(1);
});

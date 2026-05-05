import { scoreBookForClub, buildBookReason } from '../../supabase/functions/select-book/logic';
import type { MnbBook, TasteProfile } from '../../src/lib/types';

const profiles: TasteProfile[] = [
  { user_id: 'a', genres: ['Mystery'], pace: 'medium', tone: ['tense'], liked_book_ids: [], disliked_book_ids: [], updated_at: '' },
  { user_id: 'b', genres: ['Mystery', 'Thriller'], pace: 'medium', tone: [], liked_book_ids: [], disliked_book_ids: [], updated_at: '' },
];

const book: MnbBook = {
  id: 'bk1', title: 'Gone Girl', author_id: 'au1', description: null,
  cover_url: null, genres: ['Mystery', 'Thriller'], tags: [], themes: [],
  page_count: 400, popularity_score: 90, taste_vector: {},
};

test('book matching member genres scores > 0', () => {
  expect(scoreBookForClub(book, profiles)).toBeGreaterThan(0);
});

test('book in no-member genre scores 0', () => {
  const scifi: MnbBook = { ...book, id: 'bk2', genres: ['Sci-Fi'] };
  expect(scoreBookForClub(scifi, profiles)).toBe(0);
});

test('buildBookReason mentions matched genre', () => {
  expect(buildBookReason(book, profiles)).toContain('Mystery');
});

test('buildBookReason with single genre match', () => {
  const singleProfiles: TasteProfile[] = [
    { user_id: 'a', genres: ['Mystery'], pace: 'medium', tone: [], liked_book_ids: [], disliked_book_ids: [], updated_at: '' },
  ];
  const singleGenreBook: MnbBook = { ...book, genres: ['Mystery'] };
  expect(buildBookReason(singleGenreBook, singleProfiles)).toContain('Mystery');
});

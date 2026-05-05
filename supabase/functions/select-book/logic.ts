import type { MnbBook, TasteProfile } from '../../src/lib/types';

export function scoreBookForClub(book: MnbBook, profiles: TasteProfile[]): number {
  if (profiles.length === 0) return 0;
  const memberGenres = profiles.flatMap(p => p.genres);
  const bookGenreMatches = book.genres.filter(g => memberGenres.includes(g)).length;
  if (bookGenreMatches === 0) return 0;
  const genreScore = bookGenreMatches / book.genres.length;
  const popularityScore = (book.popularity_score ?? 50) / 100;
  return genreScore * 0.6 + popularityScore * 0.4;
}

export function buildBookReason(book: MnbBook, profiles: TasteProfile[]): string {
  const allGenres = profiles.flatMap(p => p.genres);
  const matched = book.genres.filter(g => allGenres.includes(g));
  if (matched.length >= 2) return `Chosen because your group loves ${matched[0]} and ${matched[1]}`;
  if (matched.length === 1) return `Chosen because your group loves ${matched[0]}`;
  return 'A popular pick your group will enjoy';
}

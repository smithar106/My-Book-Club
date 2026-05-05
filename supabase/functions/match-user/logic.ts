import type { TasteProfile } from '../../src/lib/types';

export function scoreCompatibility(a: TasteProfile, b: TasteProfile): number {
  if (a.user_id === b.user_id) return 0;
  const genreOverlap = a.genres.filter(g => b.genres.includes(g)).length;
  const totalGenres = new Set([...a.genres, ...b.genres]).size || 1;
  const genreScore = genreOverlap / totalGenres;
  const paceScore = a.pace === b.pace ? 1 : 0;
  return genreScore * 0.7 + paceScore * 0.3;
}

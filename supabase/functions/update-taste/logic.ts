import type { TasteProfile } from '../../src/lib/types';

interface Interaction {
  book_id: string;
  action: 'like' | 'dislike';
  genres: string[];
}

export function applyInteraction(profile: TasteProfile, interaction: Interaction): TasteProfile {
  const alreadyLiked = profile.liked_book_ids.includes(interaction.book_id);
  const alreadyDisliked = profile.disliked_book_ids.includes(interaction.book_id);

  const liked = (!alreadyLiked && interaction.action === 'like')
    ? [...profile.liked_book_ids, interaction.book_id]
    : profile.liked_book_ids;

  const disliked = (!alreadyDisliked && interaction.action === 'dislike')
    ? [...profile.disliked_book_ids, interaction.book_id]
    : profile.disliked_book_ids;

  return { ...profile, liked_book_ids: liked, disliked_book_ids: disliked };
}

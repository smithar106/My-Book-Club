export type Pace = 'fast' | 'medium' | 'slow';
export type Tone = 'funny' | 'dark' | 'uplifting' | 'tense';
export type Reaction = 'love' | 'confused' | 'bored';

export interface TasteProfile {
  user_id: string;
  genres: string[];
  pace: Pace;
  tone: Tone[];
  liked_book_ids: string[];
  disliked_book_ids: string[];
  updated_at: string;
}

export interface Club {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  book_cover_url: string | null;
  book_reason: string;
  city: string | null;
  region: string | null;
  created_at: string;
}

export interface ClubMember {
  club_id: string;
  user_id: string;
  joined_at: string;
}

export interface ReadingProgress {
  user_id: string;
  club_id: string;
  percent: number;
  updated_at: string;
}

export interface DiscussionPrompt {
  id: string;
  club_id: string;
  prompt_text: string;
  unlock_at_percent: number;
  created_at: string;
}

export interface PromptReaction {
  id: string;
  prompt_id: string;
  user_id: string;
  reaction: Reaction;
  created_at: string;
}

export interface DiscoveryEntry {
  book_id: string;
  book_title: string;
  book_author: string;
  book_cover_url: string | null;
  region: string | null;
  reader_count: number;
}

// Shape of books from My Next Book Supabase
export interface MnbBook {
  id: string;
  title: string;
  author_id: string;
  description: string | null;
  cover_url: string | null;
  genres: string[];
  tags: string[];
  themes: string[];
  page_count: number | null;
  popularity_score: number | null;
  taste_vector: Record<string, number>;
}

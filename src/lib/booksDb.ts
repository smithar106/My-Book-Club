import { createClient } from '@supabase/supabase-js';
import type { MnbBook } from './types';

// Read-only connection to My Next Book's Supabase (books catalog)
const MNB_URL = process.env.EXPO_PUBLIC_MNB_SUPABASE_URL!;
const MNB_ANON_KEY = process.env.EXPO_PUBLIC_MNB_SUPABASE_ANON_KEY!;

const mnbClient = createClient(MNB_URL, MNB_ANON_KEY);

export async function fetchBooks(ids: string[]): Promise<MnbBook[]> {
  const { data, error } = await mnbClient
    .from('books')
    .select('id, title, author_id, description, cover_url, genres, tags, themes, page_count, popularity_score, taste_vector')
    .in('id', ids);
  if (error) throw error;
  return data as MnbBook[];
}

export async function fetchSeedBooks(limit = 200): Promise<MnbBook[]> {
  const { data, error } = await mnbClient
    .from('books')
    .select('id, title, author_id, description, cover_url, genres, tags, themes, page_count, popularity_score, taste_vector')
    .eq('is_seed', true)
    .order('popularity_score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as MnbBook[];
}

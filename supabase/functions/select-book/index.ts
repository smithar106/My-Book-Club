import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scoreBookForClub, buildBookReason } from './logic.ts';
import type { MnbBook, TasteProfile } from '../../src/lib/types.ts';

const MNB_URL = Deno.env.get('MNB_SUPABASE_URL')!;
const MNB_KEY = Deno.env.get('MNB_SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  const { club_id } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const mnb = createClient(MNB_URL, MNB_KEY);

  const { data: members } = await supabase
    .from('club_members').select('user_id').eq('club_id', club_id);
  const memberIds = (members ?? []).map(m => m.user_id);

  const { data: profiles } = await supabase
    .from('taste_profiles').select('*').in('user_id', memberIds);
  const allGenres = [...new Set(((profiles ?? []) as TasteProfile[]).flatMap(p => p.genres))];

  const { data: books } = await mnb.from('books')
    .select('id, title, author_id, description, cover_url, genres, tags, themes, page_count, popularity_score, taste_vector')
    .eq('is_seed', true)
    .overlaps('genres', allGenres)
    .order('popularity_score', { ascending: false })
    .limit(50);

  if (!books || books.length === 0) {
    return new Response(JSON.stringify({ error: 'no books found' }), { status: 404 });
  }

  const scored = (books as MnbBook[])
    .map(b => ({ book: b, score: scoreBookForClub(b, profiles as TasteProfile[]) }))
    .sort((a, b) => b.score - a.score);

  const winner = scored[0].book;
  const { data: author } = await mnb
    .from('authors').select('name').eq('id', winner.author_id).single();
  const reason = buildBookReason(winner, profiles as TasteProfile[]);

  await supabase.from('clubs').update({
    book_id: winner.id,
    book_title: winner.title,
    book_author: author?.name ?? 'Unknown',
    book_cover_url: winner.cover_url,
    book_reason: reason,
  }).eq('id', club_id);

  const prompts = [
    { club_id, prompt_text: 'What were your first impressions of the opening chapter?', unlock_at_percent: 0 },
    { club_id, prompt_text: 'How are you feeling about the main character so far?', unlock_at_percent: 25 },
    { club_id, prompt_text: 'What moment surprised you most at the halfway point?', unlock_at_percent: 50 },
    { club_id, prompt_text: 'How did the ending land for you?', unlock_at_percent: 90 },
  ];
  await supabase.from('discussion_prompts').insert(prompts);

  return new Response(JSON.stringify({ book_id: winner.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

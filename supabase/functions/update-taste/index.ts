import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { applyInteraction } from './logic.ts';
import type { TasteProfile } from '../../src/lib/types.ts';

Deno.serve(async (req) => {
  const { user_id, book_id, action, genres } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: profile } = await supabase
    .from('taste_profiles').select('*').eq('user_id', user_id).single();
  if (!profile) {
    return new Response(JSON.stringify({ error: 'no profile' }), { status: 400 });
  }

  const updated = applyInteraction(profile as TasteProfile, { book_id, action, genres });
  await supabase.from('taste_profiles').update({
    liked_book_ids: updated.liked_book_ids,
    disliked_book_ids: updated.disliked_book_ids,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user_id);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scoreCompatibility } from './logic.ts';

const CLUB_MIN = 5;
const CLUB_MAX = 8;

Deno.serve(async (req) => {
  const { user_id } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: profile } = await supabase
    .from('taste_profiles').select('*').eq('user_id', user_id).single();
  if (!profile) {
    return new Response(JSON.stringify({ error: 'no profile' }), { status: 400 });
  }

  // Find open clubs (under CLUB_MAX) with at least one member
  const { data: openClubs } = await supabase
    .from('clubs')
    .select('id, club_members(user_id)')
    .neq('book_id', 'CLOSED');

  let bestClubId: string | null = null;
  let bestScore = 0;

  for (const club of openClubs ?? []) {
    const members = (club.club_members as { user_id: string }[]);
    if (members.length === 0 || members.length >= CLUB_MAX) continue;
    const { data: memberProfiles } = await supabase
      .from('taste_profiles').select('*').in('user_id', members.map(m => m.user_id));
    const avgScore = (memberProfiles ?? []).reduce(
      (sum, mp) => sum + scoreCompatibility(profile, mp), 0
    ) / members.length;
    if (avgScore > bestScore && avgScore > 0.3) {
      bestScore = avgScore;
      bestClubId = club.id;
    }
  }

  if (!bestClubId) {
    const { data: newClub } = await supabase.from('clubs').insert({
      book_id: 'pending',
      book_title: 'Pending',
      book_author: 'Pending',
      book_reason: 'Pending',
    }).select().single();
    bestClubId = newClub!.id;
  }

  await supabase.from('club_members').insert({ club_id: bestClubId, user_id });

  const { count } = await supabase
    .from('club_members')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', bestClubId);

  if ((count ?? 0) >= CLUB_MIN) {
    const { data: clubData } = await supabase
      .from('clubs').select('book_id').eq('id', bestClubId).single();
    if (clubData?.book_id === 'pending') {
      await supabase.functions.invoke('select-book', { body: { club_id: bestClubId } });
    }
  }

  return new Response(JSON.stringify({ club_id: bestClubId }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

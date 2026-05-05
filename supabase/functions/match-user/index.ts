import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scoreCompatibility } from './logic.ts';

const CLUB_MIN = 5;
const CLUB_MAX = 8;

Deno.serve(async (req) => {
  const { user_id } = await req.json();
  if (!user_id || typeof user_id !== 'string') {
    return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400 });
  }
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

  // Collect all member user_ids from open clubs
  const allMemberIds = [...new Set(
    (openClubs ?? []).flatMap(club =>
      (club.club_members as { user_id: string }[]).map(m => m.user_id)
    )
  )];

  // Batch-fetch all member profiles in a single query
  const { data: allMemberProfiles } = allMemberIds.length > 0
    ? await supabase.from('taste_profiles').select('*').in('user_id', allMemberIds)
    : { data: [] };

  const profileMap = new Map((allMemberProfiles ?? []).map(p => [p.user_id, p]));

  let bestClubId: string | null = null;
  let bestScore = 0;

  for (const club of openClubs ?? []) {
    const members = (club.club_members as { user_id: string }[]);
    if (members.length === 0 || members.length >= CLUB_MAX) continue;
    const memberProfiles = members.map(m => profileMap.get(m.user_id)).filter(Boolean);
    if (memberProfiles.length === 0) continue;
    const avgScore = memberProfiles.reduce(
      (sum, mp) => sum + scoreCompatibility(profile, mp), 0
    ) / memberProfiles.length;
    if (avgScore > bestScore && avgScore > 0.3) {
      bestScore = avgScore;
      bestClubId = club.id;
    }
  }

  if (!bestClubId) {
    const { data: newClub, error: insertError } = await supabase.from('clubs').insert({
      book_id: 'pending',
      book_title: 'Pending',
      book_author: 'Pending',
      book_reason: 'Pending',
    }).select().single();
    if (insertError || !newClub) {
      return new Response(JSON.stringify({ error: 'failed to create club' }), { status: 500 });
    }
    bestClubId = newClub.id;
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

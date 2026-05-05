import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Club, DiscussionPrompt, PromptReaction } from '../lib/types';

interface ClubState {
  club: Club | null;
  myProgress: number;
  memberProgress: { user_id: string; percent: number }[];
  prompts: DiscussionPrompt[];
  reactions: PromptReaction[];
  loading: boolean;
  load: (userId: string) => Promise<void>;
  updateProgress: (userId: string, clubId: string, percent: number) => Promise<void>;
  react: (promptId: string, userId: string, reaction: 'love' | 'confused' | 'bored') => Promise<void>;
}

export const useClubStore = create<ClubState>((set) => ({
  club: null,
  myProgress: 0,
  memberProgress: [],
  prompts: [],
  reactions: [],
  loading: true,

  load: async (userId) => {
    set({ loading: true });
    const { data: membership } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', userId)
      .single();
    if (!membership) {
      set({ loading: false });
      return;
    }

    const clubId = membership.club_id;

    const [{ data: club }, { data: allProgress }, { data: prompts }] = await Promise.all([
      supabase.from('clubs').select('*').eq('id', clubId).single(),
      supabase.from('reading_progress').select('user_id, percent').eq('club_id', clubId),
      supabase.from('discussion_prompts').select('*').eq('club_id', clubId).order('unlock_at_percent'),
    ]);

    const promptIds = (prompts ?? []).map(p => p.id);
    const { data: reactions } = promptIds.length > 0
      ? await supabase.from('prompt_reactions').select('*').in('prompt_id', promptIds)
      : { data: [] };

    const myProgress = (allProgress ?? []).find(p => p.user_id === userId)?.percent ?? 0;
    set({
      club: club as Club,
      myProgress,
      memberProgress: (allProgress ?? []) as { user_id: string; percent: number }[],
      prompts: (prompts ?? []) as DiscussionPrompt[],
      reactions: (reactions ?? []) as PromptReaction[],
      loading: false,
    });
  },

  updateProgress: async (userId, clubId, percent) => {
    await supabase.from('reading_progress').upsert({
      user_id: userId,
      club_id: clubId,
      percent,
      updated_at: new Date().toISOString(),
    });
    set({ myProgress: percent });
  },

  react: async (promptId, userId, reaction) => {
    await supabase.from('prompt_reactions').upsert(
      { prompt_id: promptId, user_id: userId, reaction },
      { onConflict: 'prompt_id,user_id' }
    );
    set(s => ({
      reactions: [
        ...s.reactions.filter(r => !(r.prompt_id === promptId && r.user_id === userId)),
        { id: '', prompt_id: promptId, user_id: userId, reaction, created_at: '' },
      ],
    }));
  },
}));

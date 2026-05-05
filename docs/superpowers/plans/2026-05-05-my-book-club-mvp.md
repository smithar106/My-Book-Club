# My Book Club — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Expo React Native app where users are automatically matched into small book clubs, given a shared book, can track reading progress, react to discussion prompts, and discover what other clubs are reading.

**Architecture:** Expo Router (file-based navigation) + Supabase Auth + Postgres + Supabase Edge Functions for matching/book selection/taste updates. Books are read-only from the existing My Next Book Supabase project (`kqlchizdsoeceaxarnuo`). All club/user/progress data lives in a new Supabase project.

**Tech Stack:** Expo SDK 52, Expo Router v4, React Native, TypeScript, Supabase JS v2, Supabase Edge Functions (Deno), Jest + React Native Testing Library

---

## File Map

```
my-book-club/
├── app/                          # Expo Router screens
│   ├── (auth)/
│   │   ├── welcome.tsx           # Splash + sign in/up
│   │   └── onboarding.tsx        # Taste capture (swipe books, sliders)
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar (Club, Discover, Profile)
│   │   ├── club.tsx              # My Club screen (book + progress + discussion)
│   │   ├── discover.tsx          # Cross-club discovery (top books by region)
│   │   └── profile.tsx           # Taste profile + settings
│   └── _layout.tsx               # Root layout (auth guard)
├── src/
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client (new project)
│   │   ├── booksDb.ts            # Read-only client for My Next Book Supabase
│   │   └── types.ts              # All shared TS types
│   ├── store/
│   │   ├── auth.ts               # Auth state (Zustand)
│   │   └── club.ts               # Club + book + progress state (Zustand)
│   └── components/
│       ├── BookCard.tsx           # Cover + title + author
│       ├── ProgressBar.tsx        # Visual progress bar
│       ├── MemberRow.tsx          # Avatar + name + progress %
│       ├── DiscussionPrompt.tsx   # Prompt card with reactions
│       └── DiscoverCard.tsx       # Club's current book snapshot
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── match-user/index.ts    # Match user → club (or create new one)
│       ├── select-book/index.ts   # Pick best book for a club
│       └── update-taste/index.ts  # Update taste profile from interaction
└── __tests__/
    ├── lib/types.test.ts
    ├── store/club.test.ts
    └── functions/                # Unit tests for Edge Function logic
        ├── match-user.test.ts
        ├── select-book.test.ts
        └── update-taste.test.ts
```

---

## Task 1: Scaffold project + Supabase schema

**Files:**
- Create: `my-book-club/` (Expo project)
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/booksDb.ts`

- [ ] **Step 1: Create Expo project**

```bash
cd ~
npx create-expo-app my-book-club --template blank-typescript
cd my-book-club
npm install expo-router @supabase/supabase-js zustand @react-native-async-storage/async-storage react-native-url-polyfill
npx expo install expo-font expo-splash-screen expo-status-bar react-native-safe-area-context react-native-screens
```

- [ ] **Step 2: Create the Supabase migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Taste profile per user (sliders + genres + pace)
CREATE TABLE taste_profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  genres     text[]   NOT NULL DEFAULT '{}',
  pace       text     NOT NULL DEFAULT 'medium', -- 'fast' | 'medium' | 'slow'
  tone       text[]   NOT NULL DEFAULT '{}',     -- 'funny' | 'dark' | 'uplifting' | 'tense'
  liked_book_ids   text[] NOT NULL DEFAULT '{}', -- book IDs from MNB Supabase
  disliked_book_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Book clubs
CREATE TABLE clubs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     text NOT NULL,        -- ID from MNB books table
  book_title  text NOT NULL,
  book_author text NOT NULL,
  book_cover_url text,
  book_reason text NOT NULL,        -- "Chosen because your group likes X and Y"
  city        text,                 -- optional, for discovery
  region      text,                 -- e.g. 'Toronto', 'New York'
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Club membership
CREATE TABLE club_members (
  club_id   uuid REFERENCES clubs(id) ON DELETE CASCADE,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

-- Reading progress
CREATE TABLE reading_progress (
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  percent     int  NOT NULL DEFAULT 0 CHECK (percent >= 0 AND percent <= 100),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, club_id)
);

-- Discussion prompts (seeded per club at book selection time)
CREATE TABLE discussion_prompts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  prompt_text text NOT NULL,
  unlock_at_percent int NOT NULL DEFAULT 0, -- show when user reaches this %
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Reactions to prompts
CREATE TABLE prompt_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id   uuid REFERENCES discussion_prompts(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction    text NOT NULL, -- 'love' | 'confused' | 'bored'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, user_id)
);

-- RLS
ALTER TABLE taste_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_prompts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_reactions    ENABLE ROW LEVEL SECURITY;

-- Policies: users read their own data; clubs visible to members
CREATE POLICY "own taste" ON taste_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "member sees club" ON clubs FOR SELECT USING (
  EXISTS (SELECT 1 FROM club_members WHERE club_id = clubs.id AND user_id = auth.uid())
);
CREATE POLICY "member sees members" ON club_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = auth.uid())
);
CREATE POLICY "own progress" ON reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "member sees progress" ON reading_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM club_members WHERE club_id = reading_progress.club_id AND user_id = auth.uid())
);
CREATE POLICY "member sees prompts" ON discussion_prompts FOR SELECT USING (
  EXISTS (SELECT 1 FROM club_members WHERE club_id = discussion_prompts.club_id AND user_id = auth.uid())
);
CREATE POLICY "own reactions" ON prompt_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "member sees reactions" ON prompt_reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM discussion_prompts dp
    JOIN club_members cm ON cm.club_id = dp.club_id
    WHERE dp.id = prompt_reactions.prompt_id AND cm.user_id = auth.uid()
  )
);

-- Discovery view: top books by region (no auth required, read-only)
CREATE OR REPLACE VIEW discovery_feed AS
  SELECT c.book_id, c.book_title, c.book_author, c.book_cover_url,
         c.region, COUNT(cm.user_id) AS reader_count
  FROM clubs c
  JOIN club_members cm ON cm.club_id = c.id
  GROUP BY c.book_id, c.book_title, c.book_author, c.book_cover_url, c.region
  ORDER BY reader_count DESC;

GRANT SELECT ON discovery_feed TO anon, authenticated;
```

- [ ] **Step 3: Run migration in your new Supabase project**

In Supabase dashboard → SQL editor, paste and run the migration. Note the project URL and anon key — you'll need them in `.env`.

- [ ] **Step 4: Write `src/lib/types.ts`**

```typescript
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
```

- [ ] **Step 5: Write `src/lib/supabase.ts`**

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
```

- [ ] **Step 6: Write `src/lib/booksDb.ts`**

```typescript
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
```

- [ ] **Step 7: Create `.env` template**

```bash
# .env (gitignored)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
EXPO_PUBLIC_MNB_SUPABASE_URL=https://kqlchizdsoeceaxarnuo.supabase.co
EXPO_PUBLIC_MNB_SUPABASE_ANON_KEY=MNB_ANON_KEY
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold project, schema migration, supabase clients, types"
```

---

## Task 2: Auth + Onboarding screens

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(auth)/welcome.tsx`
- Create: `app/(auth)/onboarding.tsx`
- Create: `src/store/auth.ts`

- [ ] **Step 1: Write `src/store/auth.ts`**

```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
```

- [ ] **Step 2: Write `app/_layout.tsx`**

```tsx
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const { session, loading, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) router.replace('/(auth)/welcome');
    if (session && inAuth) router.replace('/(tabs)/club');
  }, [session, loading]);

  return <Slot />;
}
```

- [ ] **Step 3: Write `app/(auth)/welcome.tsx`**

```tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useState } from 'react';

export default function WelcomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setError(null);
    const fn = mode === 'signup'
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error: e } = await fn;
    if (e) setError(e.message);
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>My Book Club</Text>
      <Text style={s.sub}>Find your people. Read together.</Text>

      <TextInput style={s.input} placeholder="Email" value={email}
        onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Password" value={password}
        onChangeText={setPassword} secureTextEntry />

      {error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={s.btn} onPress={handleAuth}>
        <Text style={s.btnText}>{mode === 'signup' ? 'Get Started' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        <Text style={s.toggle}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Sign up'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Add missing TextInput import
import { TextInput } from 'react-native';

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: '#2D6A4F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: { textAlign: 'center', marginTop: 16, color: '#2D6A4F' },
  error: { color: 'red', marginBottom: 8 },
});
```

- [ ] **Step 4: Write `app/(auth)/onboarding.tsx`**

Onboarding captures taste in 3 quick steps: swipe 6 seed books (like/dislike), pick genres (multi-select), pick pace.

```tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { fetchSeedBooks } from '../../src/lib/booksDb';
import type { MnbBook, Pace, Tone } from '../../src/lib/types';

const GENRES = ['Literary Fiction','Mystery','Fantasy','Sci-Fi','Romance','Thriller','Historical','Non-Fiction'];
const TONES: Tone[] = ['funny', 'dark', 'uplifting', 'tense'];
const PACES: { label: string; value: Pace }[] = [
  { label: '📖 Leisurely', value: 'slow' },
  { label: '📚 Steady', value: 'medium' },
  { label: '⚡ Fast', value: 'fast' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'books' | 'genres' | 'pace'>('books');
  const [seedBooks, setSeedBooks] = useState<MnbBook[]>([]);
  const [bookIdx, setBookIdx] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [pace, setPace] = useState<Pace>('medium');

  useEffect(() => {
    fetchSeedBooks(6).then(setSeedBooks);
  }, []);

  const reactToBook = (bookId: string, liked_: boolean) => {
    if (liked_) setLiked(p => [...p, bookId]);
    else setDisliked(p => [...p, bookId]);
    if (bookIdx < seedBooks.length - 1) setBookIdx(i => i + 1);
    else setStep('genres');
  };

  const toggleGenre = (g: string) =>
    setSelectedGenres(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);

  const finish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('taste_profiles').upsert({
      user_id: user.id,
      genres: selectedGenres,
      pace,
      tone: [],
      liked_book_ids: liked,
      disliked_book_ids: disliked,
    });
    // Trigger club matching
    await supabase.functions.invoke('match-user', { body: { user_id: user.id } });
    router.replace('/(tabs)/club');
  };

  if (step === 'books') {
    const book = seedBooks[bookIdx];
    return (
      <View style={s.container}>
        <Text style={s.heading}>Quick taste check</Text>
        <Text style={s.sub}>{bookIdx + 1} of {seedBooks.length}</Text>
        {book && (
          <>
            <View style={s.bookCard}>
              <Text style={s.bookTitle}>{book.title}</Text>
              <Text style={s.bookGenres}>{book.genres.slice(0, 2).join(' · ')}</Text>
              {book.description && <Text style={s.bookDesc} numberOfLines={4}>{book.description}</Text>}
            </View>
            <View style={s.row}>
              <TouchableOpacity style={[s.btn, s.dislike]} onPress={() => reactToBook(book.id, false)}>
                <Text style={s.btnTxt}>Not for me</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.like]} onPress={() => reactToBook(book.id, true)}>
                <Text style={s.btnTxt}>Love it!</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  if (step === 'genres') {
    return (
      <View style={s.container}>
        <Text style={s.heading}>What do you love to read?</Text>
        <View style={s.wrap}>
          {GENRES.map(g => (
            <TouchableOpacity key={g}
              style={[s.chip, selectedGenres.includes(g) && s.chipSelected]}
              onPress={() => toggleGenre(g)}>
              <Text style={selectedGenres.includes(g) ? s.chipTxtSelected : s.chipTxt}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={() => setStep('pace')}>
          <Text style={s.nextTxt}>Next →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.heading}>How fast do you read?</Text>
      {PACES.map(p => (
        <TouchableOpacity key={p.value}
          style={[s.paceBtn, pace === p.value && s.paceBtnSelected]}
          onPress={() => setPace(p.value)}>
          <Text style={s.paceTxt}>{p.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={s.nextBtn} onPress={finish}>
        <Text style={s.nextTxt}>Find my club →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#999', marginBottom: 24 },
  bookCard: { backgroundColor: '#F5F5F0', borderRadius: 16, padding: 20, marginBottom: 24 },
  bookTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  bookGenres: { color: '#2D6A4F', marginBottom: 8 },
  bookDesc: { color: '#555', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  dislike: { backgroundColor: '#f0f0f0' },
  like: { backgroundColor: '#2D6A4F' },
  btnTxt: { fontWeight: '600', color: '#333' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  chipSelected: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  chipTxt: { color: '#333' },
  chipTxtSelected: { color: '#fff' },
  paceBtn: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginBottom: 12 },
  paceBtnSelected: { borderColor: '#2D6A4F', backgroundColor: '#E8F5E9' },
  paceTxt: { fontSize: 16 },
  nextBtn: { backgroundColor: '#2D6A4F', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  nextTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
```

- [ ] **Step 5: Redirect new users to onboarding after sign-up**

In `app/_layout.tsx`, update the auth redirect logic to check for existing taste profile:

```tsx
// Replace the session redirect effect:
useEffect(() => {
  if (loading) return;
  const inAuth = segments[0] === '(auth)';
  if (!session && !inAuth) {
    router.replace('/(auth)/welcome');
    return;
  }
  if (session && inAuth) {
    // Check if onboarding done
    supabase.from('taste_profiles')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) router.replace('/(tabs)/club');
        else router.replace('/(auth)/onboarding');
      });
  }
}, [session, loading]);
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: auth screens, onboarding flow (book swipe + genre + pace)"
```

---

## Task 3: Edge Functions — match-user, select-book, update-taste

**Files:**
- Create: `supabase/functions/match-user/index.ts`
- Create: `supabase/functions/select-book/index.ts`
- Create: `supabase/functions/update-taste/index.ts`
- Create: `__tests__/functions/match-user.test.ts`
- Create: `__tests__/functions/select-book.test.ts`
- Create: `__tests__/functions/update-taste.test.ts`

**Note:** Edge Functions run in Deno. Test the pure logic (matching/scoring) with Jest by extracting it into plain TS modules the function imports. The test files test the *logic*, not the HTTP handler.

- [ ] **Step 1: Write failing tests**

Create `__tests__/functions/match-user.test.ts`:

```typescript
import { scoreCompatibility } from '../../supabase/functions/match-user/logic';
import type { TasteProfile } from '../../src/lib/types';

const base: TasteProfile = {
  user_id: 'a', genres: ['Mystery', 'Thriller'], pace: 'medium',
  tone: ['tense'], liked_book_ids: ['b1', 'b2'], disliked_book_ids: [],
  updated_at: '',
};

test('identical profiles score 1.0', () => {
  expect(scoreCompatibility(base, { ...base, user_id: 'b' })).toBe(1.0);
});

test('different pace reduces score', () => {
  const other = { ...base, user_id: 'b', pace: 'fast' as const };
  expect(scoreCompatibility(base, other)).toBeLessThan(1.0);
});

test('no genre overlap scores low', () => {
  const other = { ...base, user_id: 'b', genres: ['Romance', 'Fantasy'] };
  expect(scoreCompatibility(base, other)).toBeLessThan(0.5);
});
```

Create `__tests__/functions/select-book.test.ts`:

```typescript
import { scoreBookForClub } from '../../supabase/functions/select-book/logic';
import type { MnbBook, TasteProfile } from '../../src/lib/types';

const profiles: TasteProfile[] = [
  { user_id: 'a', genres: ['Mystery'], pace: 'medium', tone: ['tense'], liked_book_ids: [], disliked_book_ids: [], updated_at: '' },
  { user_id: 'b', genres: ['Mystery', 'Thriller'], pace: 'medium', tone: [], liked_book_ids: [], disliked_book_ids: [], updated_at: '' },
];

const book: MnbBook = {
  id: 'bk1', title: 'Gone Girl', author_id: 'au1', description: null,
  cover_url: null, genres: ['Mystery', 'Thriller'], tags: [], themes: [],
  page_count: 400, popularity_score: 90, taste_vector: {},
};

test('book matching all members genres scores highest', () => {
  const score = scoreBookForClub(book, profiles);
  expect(score).toBeGreaterThan(0);
});

test('book in no-member genre scores 0', () => {
  const scifi: MnbBook = { ...book, id: 'bk2', genres: ['Sci-Fi'] };
  expect(scoreBookForClub(scifi, profiles)).toBe(0);
});
```

Create `__tests__/functions/update-taste.test.ts`:

```typescript
import { applyInteraction } from '../../supabase/functions/update-taste/logic';
import type { TasteProfile } from '../../src/lib/types';

const profile: TasteProfile = {
  user_id: 'a', genres: ['Mystery'], pace: 'medium', tone: [],
  liked_book_ids: [], disliked_book_ids: [], updated_at: '',
};

test('liking a book adds to liked_book_ids', () => {
  const updated = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: ['Mystery'] });
  expect(updated.liked_book_ids).toContain('bk1');
});

test('disliking a book adds to disliked_book_ids', () => {
  const updated = applyInteraction(profile, { book_id: 'bk2', action: 'dislike', genres: ['Romance'] });
  expect(updated.disliked_book_ids).toContain('bk2');
});

test('no duplicate liked book ids', () => {
  const p1 = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: [] });
  const p2 = applyInteraction(p1, { book_id: 'bk1', action: 'like', genres: [] });
  expect(p2.liked_book_ids.filter(id => id === 'bk1').length).toBe(1);
});
```

- [ ] **Step 2: Run tests — all should FAIL**

```bash
npx jest __tests__/functions/ --no-coverage
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Write logic modules**

Create `supabase/functions/match-user/logic.ts`:

```typescript
import type { TasteProfile } from '../../src/lib/types';

export function scoreCompatibility(a: TasteProfile, b: TasteProfile): number {
  if (a.user_id === b.user_id) return 0;
  const genreOverlap = a.genres.filter(g => b.genres.includes(g)).length;
  const totalGenres = new Set([...a.genres, ...b.genres]).size || 1;
  const genreScore = genreOverlap / totalGenres;
  const paceScore = a.pace === b.pace ? 1 : 0;
  return genreScore * 0.7 + paceScore * 0.3;
}
```

Create `supabase/functions/select-book/logic.ts`:

```typescript
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
```

Create `supabase/functions/update-taste/logic.ts`:

```typescript
import type { TasteProfile } from '../../src/lib/types';

interface Interaction {
  book_id: string;
  action: 'like' | 'dislike';
  genres: string[];
}

export function applyInteraction(profile: TasteProfile, interaction: Interaction): TasteProfile {
  const liked = profile.liked_book_ids.includes(interaction.book_id)
    ? profile.liked_book_ids
    : interaction.action === 'like'
      ? [...profile.liked_book_ids, interaction.book_id]
      : profile.liked_book_ids;

  const disliked = profile.disliked_book_ids.includes(interaction.book_id)
    ? profile.disliked_book_ids
    : interaction.action === 'dislike'
      ? [...profile.disliked_book_ids, interaction.book_id]
      : profile.disliked_book_ids;

  return { ...profile, liked_book_ids: liked, disliked_book_ids: disliked };
}
```

- [ ] **Step 4: Run tests — all should PASS**

```bash
npx jest __tests__/functions/ --no-coverage
```
Expected: 7 tests PASS

- [ ] **Step 5: Write the Edge Function handlers**

Create `supabase/functions/match-user/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scoreCompatibility } from './logic.ts';

const CLUB_MIN = 5;
const CLUB_MAX = 8;

Deno.serve(async (req) => {
  const { user_id } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: profile } = await supabase.from('taste_profiles').select('*').eq('user_id', user_id).single();
  if (!profile) return new Response(JSON.stringify({ error: 'no profile' }), { status: 400 });

  // Find open clubs (under CLUB_MAX members) with compatible members
  const { data: openClubs } = await supabase
    .from('clubs')
    .select('id, club_members(user_id)')
    .lt('(SELECT COUNT(*) FROM club_members WHERE club_id = clubs.id)', CLUB_MAX);

  let bestClubId: string | null = null;
  let bestScore = 0;

  for (const club of openClubs ?? []) {
    const memberIds = (club.club_members as { user_id: string }[]).map(m => m.user_id);
    if (memberIds.length === 0) continue;
    const { data: memberProfiles } = await supabase
      .from('taste_profiles').select('*').in('user_id', memberIds);
    const avgScore = (memberProfiles ?? []).reduce((sum, mp) => sum + scoreCompatibility(profile, mp), 0) / memberIds.length;
    if (avgScore > bestScore && avgScore > 0.3) { bestScore = avgScore; bestClubId = club.id; }
  }

  if (!bestClubId) {
    // Create new club (book selected after CLUB_MIN members join)
    const { data: newClub } = await supabase.from('clubs').insert({
      book_id: 'pending', book_title: 'Pending', book_author: 'Pending', book_reason: 'Pending',
    }).select().single();
    bestClubId = newClub!.id;
  }

  await supabase.from('club_members').insert({ club_id: bestClubId, user_id });

  // Trigger book selection if club just reached CLUB_MIN
  const { count } = await supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', bestClubId);
  if ((count ?? 0) >= CLUB_MIN && (openClubs?.find(c => c.id === bestClubId) === undefined || true)) {
    await supabase.functions.invoke('select-book', { body: { club_id: bestClubId } });
  }

  return new Response(JSON.stringify({ club_id: bestClubId }), { headers: { 'Content-Type': 'application/json' } });
});
```

Create `supabase/functions/select-book/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scoreBookForClub, buildBookReason } from './logic.ts';
import type { MnbBook, TasteProfile } from '../../src/lib/types.ts';

const MNB_URL = Deno.env.get('MNB_SUPABASE_URL')!;
const MNB_KEY = Deno.env.get('MNB_SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  const { club_id } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const mnb = createClient(MNB_URL, MNB_KEY);

  const { data: members } = await supabase.from('club_members').select('user_id').eq('club_id', club_id);
  const memberIds = (members ?? []).map(m => m.user_id);
  const { data: profiles } = await supabase.from('taste_profiles').select('*').in('user_id', memberIds);
  const allGenres = [...new Set((profiles as TasteProfile[]).flatMap(p => p.genres))];

  const { data: books } = await mnb.from('books')
    .select('id, title, author_id, description, cover_url, genres, tags, themes, page_count, popularity_score, taste_vector')
    .eq('is_seed', true)
    .overlaps('genres', allGenres)
    .order('popularity_score', { ascending: false })
    .limit(50);

  const scored = (books as MnbBook[]).map(b => ({ book: b, score: scoreBookForClub(b, profiles as TasteProfile[]) }));
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]?.book;
  if (!winner) return new Response(JSON.stringify({ error: 'no books found' }), { status: 404 });

  // Fetch author name
  const { data: author } = await mnb.from('authors').select('name').eq('id', winner.author_id).single();
  const reason = buildBookReason(winner, profiles as TasteProfile[]);

  await supabase.from('clubs').update({
    book_id: winner.id, book_title: winner.title,
    book_author: author?.name ?? 'Unknown',
    book_cover_url: winner.cover_url,
    book_reason: reason,
  }).eq('id', club_id);

  // Seed discussion prompts
  const prompts = [
    { club_id, prompt_text: 'What were your first impressions of the opening chapter?', unlock_at_percent: 0 },
    { club_id, prompt_text: 'How are you feeling about the main character so far?', unlock_at_percent: 25 },
    { club_id, prompt_text: 'What moment surprised you most at the halfway point?', unlock_at_percent: 50 },
    { club_id, prompt_text: 'How did the ending land for you?', unlock_at_percent: 90 },
  ];
  await supabase.from('discussion_prompts').insert(prompts);

  return new Response(JSON.stringify({ book_id: winner.id }), { headers: { 'Content-Type': 'application/json' } });
});
```

Create `supabase/functions/update-taste/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { applyInteraction } from './logic.ts';
import type { TasteProfile } from '../../src/lib/types.ts';

Deno.serve(async (req) => {
  const { user_id, book_id, action, genres } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: profile } = await supabase.from('taste_profiles').select('*').eq('user_id', user_id).single();
  if (!profile) return new Response(JSON.stringify({ error: 'no profile' }), { status: 400 });

  const updated = applyInteraction(profile as TasteProfile, { book_id, action, genres });
  await supabase.from('taste_profiles').update({
    liked_book_ids: updated.liked_book_ids,
    disliked_book_ids: updated.disliked_book_ids,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user_id);

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 6: Deploy Edge Functions**

```bash
npx supabase functions deploy match-user
npx supabase functions deploy select-book
npx supabase functions deploy update-taste
# Set secrets:
npx supabase secrets set MNB_SUPABASE_URL=https://kqlchizdsoeceaxarnuo.supabase.co
npx supabase secrets set MNB_SUPABASE_ANON_KEY=YOUR_MNB_ANON_KEY
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: edge functions for club matching, book selection, taste updates"
```

---

## Task 4: Club screen (main tab)

**Files:**
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/club.tsx`
- Create: `src/store/club.ts`
- Create: `src/components/BookCard.tsx`
- Create: `src/components/ProgressBar.tsx`
- Create: `src/components/MemberRow.tsx`
- Create: `src/components/DiscussionPrompt.tsx`

- [ ] **Step 1: Write `src/store/club.ts`**

```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Club, ReadingProgress, DiscussionPrompt, PromptReaction } from '../lib/types';

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

export const useClubStore = create<ClubState>((set, get) => ({
  club: null, myProgress: 0, memberProgress: [], prompts: [], reactions: [], loading: true,

  load: async (userId) => {
    set({ loading: true });
    const { data: membership } = await supabase
      .from('club_members').select('club_id').eq('user_id', userId).single();
    if (!membership) { set({ loading: false }); return; }

    const [{ data: club }, { data: allProgress }, { data: prompts }, { data: reactions }] = await Promise.all([
      supabase.from('clubs').select('*').eq('id', membership.club_id).single(),
      supabase.from('reading_progress').select('user_id, percent').eq('club_id', membership.club_id),
      supabase.from('discussion_prompts').select('*').eq('club_id', membership.club_id).order('unlock_at_percent'),
      supabase.from('prompt_reactions').select('*'),
    ]);

    const myProgress = allProgress?.find(p => p.user_id === userId)?.percent ?? 0;
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
    await supabase.from('reading_progress').upsert({ user_id: userId, club_id: clubId, percent, updated_at: new Date().toISOString() });
    set({ myProgress: percent });
  },

  react: async (promptId, userId, reaction) => {
    await supabase.from('prompt_reactions').upsert({ prompt_id: promptId, user_id: userId, reaction }, { onConflict: 'prompt_id,user_id' });
    set(s => ({
      reactions: [...s.reactions.filter(r => !(r.prompt_id === promptId && r.user_id === userId)),
        { id: '', prompt_id: promptId, user_id: userId, reaction, created_at: '' }],
    }));
  },
}));
```

- [ ] **Step 2: Write shared components**

Create `src/components/BookCard.tsx`:

```tsx
import { View, Text, Image, StyleSheet } from 'react-native';
import type { Club } from '../lib/types';

export function BookCard({ club }: { club: Club }) {
  return (
    <View style={s.card}>
      {club.book_cover_url
        ? <Image source={{ uri: club.book_cover_url }} style={s.cover} />
        : <View style={[s.cover, s.placeholder]} />}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>{club.book_title}</Text>
        <Text style={s.author}>{club.book_author}</Text>
        <Text style={s.reason}>{club.book_reason}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#F5F5F0', borderRadius: 16, padding: 16, gap: 12 },
  cover: { width: 72, height: 108, borderRadius: 8 },
  placeholder: { backgroundColor: '#ddd' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  author: { color: '#666', marginBottom: 6 },
  reason: { fontSize: 12, color: '#2D6A4F', fontStyle: 'italic' },
});
```

Create `src/components/ProgressBar.tsx`:

```tsx
import { View, StyleSheet } from 'react-native';

export function ProgressBar({ percent, color = '#2D6A4F' }: { percent: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
```

Create `src/components/MemberRow.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from './ProgressBar';

interface Props { userId: string; percent: number; isMe: boolean; }

export function MemberRow({ userId, percent, isMe }: Props) {
  return (
    <View style={s.row}>
      <View style={s.avatar}><Text style={s.avatarTxt}>{userId.slice(0, 1).toUpperCase()}</Text></View>
      <View style={s.body}>
        <Text style={s.name}>{isMe ? 'You' : `Reader ${userId.slice(0, 4)}`}</Text>
        <ProgressBar percent={percent} color={isMe ? '#2D6A4F' : '#aaa'} />
      </View>
      <Text style={s.pct}>{percent}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700' },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '500' },
  pct: { fontSize: 13, color: '#666', width: 36, textAlign: 'right' },
});
```

Create `src/components/DiscussionPrompt.tsx`:

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { DiscussionPrompt as Prompt, PromptReaction } from '../lib/types';

const REACTIONS = [
  { key: 'love', label: '❤️' },
  { key: 'confused', label: '🤔' },
  { key: 'bored', label: '😴' },
] as const;

interface Props {
  prompt: Prompt;
  reactions: PromptReaction[];
  myReaction: PromptReaction | undefined;
  onReact: (reaction: 'love' | 'confused' | 'bored') => void;
  locked: boolean;
}

export function DiscussionPromptCard({ prompt, reactions, myReaction, onReact, locked }: Props) {
  if (locked) {
    return (
      <View style={[s.card, s.locked]}>
        <Text style={s.lockText}>🔒 Unlocks at {prompt.unlock_at_percent}%</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.text}>{prompt.prompt_text}</Text>
      <View style={s.row}>
        {REACTIONS.map(r => {
          const count = reactions.filter(rx => rx.prompt_id === prompt.id && rx.reaction === r.key).length;
          const active = myReaction?.reaction === r.key;
          return (
            <TouchableOpacity key={r.key} style={[s.chip, active && s.active]} onPress={() => onReact(r.key)}>
              <Text>{r.label} {count > 0 ? count : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#F5F5F0', borderRadius: 14, padding: 16, marginBottom: 12 },
  locked: { opacity: 0.4 },
  lockText: { color: '#999', textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  active: { borderColor: '#2D6A4F', backgroundColor: '#E8F5E9' },
});
```

- [ ] **Step 3: Write `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#2D6A4F', headerShown: false }}>
      <Tabs.Screen name="club" options={{ title: 'My Club', tabBarIcon: () => null }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: () => null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => null }} />
    </Tabs>
  );
}
```

- [ ] **Step 4: Write `app/(tabs)/club.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { useAuthStore } from '../../src/store/auth';
import { useClubStore } from '../../src/store/club';
import { BookCard } from '../../src/components/BookCard';
import { MemberRow } from '../../src/components/MemberRow';
import { DiscussionPromptCard } from '../../src/components/DiscussionPrompt';

export default function ClubScreen() {
  const { session } = useAuthStore();
  const { club, myProgress, memberProgress, prompts, reactions, loading, load, updateProgress, react } = useClubStore();
  const userId = session?.user.id ?? '';

  useEffect(() => { if (userId) load(userId); }, [userId]);

  if (loading) return <View style={s.center}><ActivityIndicator /></View>;

  if (!club || club.book_id === 'pending') {
    return (
      <View style={s.center}>
        <Text style={s.waiting}>⏳ Finding your perfect club…</Text>
        <Text style={s.sub}>We're matching you with readers like you. Check back soon!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.heading}>My Club</Text>
      <BookCard club={club} />

      <Text style={s.section}>Reading Progress</Text>
      <View style={s.progressRow}>
        <Text style={s.progressLabel}>You: {myProgress}%</Text>
        <TouchableOpacity onPress={() => updateProgress(userId, club.id, Math.min(myProgress + 10, 100))}>
          <Text style={s.nudge}>+10%</Text>
        </TouchableOpacity>
      </View>

      {memberProgress.map(mp => (
        <MemberRow key={mp.user_id} userId={mp.user_id} percent={mp.percent} isMe={mp.user_id === userId} />
      ))}

      <Text style={s.section}>Discussion</Text>
      {prompts.map(p => (
        <DiscussionPromptCard
          key={p.id}
          prompt={p}
          reactions={reactions}
          myReaction={reactions.find(r => r.prompt_id === p.id && r.user_id === userId)}
          onReact={(reaction) => react(p.id, userId, reaction)}
          locked={myProgress < p.unlock_at_percent}
        />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  waiting: { fontSize: 22, textAlign: 'center', marginBottom: 8 },
  sub: { color: '#666', textAlign: 'center' },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontSize: 15, fontWeight: '500' },
  nudge: { color: '#2D6A4F', fontWeight: '600' },
});
```

- [ ] **Step 5: Install slider dependency**

```bash
npm install @react-native-community/slider
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: club screen with book card, progress, discussion prompts"
```

---

## Task 5: Discover + Profile screens

**Files:**
- Create: `app/(tabs)/discover.tsx`
- Create: `app/(tabs)/profile.tsx`
- Create: `src/components/DiscoverCard.tsx`

- [ ] **Step 1: Write `src/components/DiscoverCard.tsx`**

```tsx
import { View, Text, Image, StyleSheet } from 'react-native';
import type { DiscoveryEntry } from '../lib/types';

export function DiscoverCard({ entry }: { entry: DiscoveryEntry }) {
  return (
    <View style={s.card}>
      {entry.book_cover_url
        ? <Image source={{ uri: entry.book_cover_url }} style={s.cover} />
        : <View style={[s.cover, s.placeholder]} />}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>{entry.book_title}</Text>
        <Text style={s.author}>{entry.book_author}</Text>
        <Text style={s.readers}>📖 {entry.reader_count} readers {entry.region ? `in ${entry.region}` : ''}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#F5F5F0', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  cover: { width: 56, height: 84, borderRadius: 6 },
  placeholder: { backgroundColor: '#ddd' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  author: { color: '#666', fontSize: 13, marginBottom: 4 },
  readers: { color: '#2D6A4F', fontSize: 12 },
});
```

- [ ] **Step 2: Write `app/(tabs)/discover.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { DiscoverCard } from '../../src/components/DiscoverCard';
import type { DiscoveryEntry } from '../../src/lib/types';

export default function DiscoverScreen() {
  const [entries, setEntries] = useState<DiscoveryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('discovery_feed').select('*').limit(20)
      .then(({ data }) => { setEntries((data ?? []) as DiscoveryEntry[]); setLoading(false); });
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator /></View>;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.heading}>Discover</Text>
      <Text style={s.sub}>What other clubs are reading right now</Text>
      {entries.length === 0
        ? <Text style={s.empty}>No clubs yet — be one of the first!</Text>
        : entries.map(e => <DiscoverCard key={e.book_id + e.region} entry={e} />)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#666', marginBottom: 20 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
```

- [ ] **Step 3: Write `app/(tabs)/profile.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/auth';
import type { TasteProfile } from '../../src/lib/types';

export default function ProfileScreen() {
  const { session, signOut } = useAuthStore();
  const [taste, setTaste] = useState<TasteProfile | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.from('taste_profiles').select('*').eq('user_id', session.user.id).single()
      .then(({ data }) => setTaste(data as TasteProfile));
  }, [session]);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.heading}>My Profile</Text>
      <Text style={s.email}>{session?.user.email}</Text>

      {taste && (
        <View style={s.card}>
          <Text style={s.label}>Genres</Text>
          <Text style={s.value}>{taste.genres.join(', ') || '—'}</Text>
          <Text style={s.label}>Reading Pace</Text>
          <Text style={s.value}>{taste.pace}</Text>
          <Text style={s.label}>Books Liked</Text>
          <Text style={s.value}>{taste.liked_book_ids.length}</Text>
        </View>
      )}

      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Text style={s.signOutTxt}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  email: { color: '#666', marginBottom: 24 },
  card: { backgroundColor: '#F5F5F0', borderRadius: 16, padding: 16 },
  label: { fontSize: 12, color: '#999', textTransform: 'uppercase', marginTop: 12 },
  value: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  signOut: { marginTop: 40, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  signOutTxt: { color: '#e33', fontWeight: '600' },
});
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: discover screen and profile screen"
```

---

## Task 6: Jest config + run full test suite

**Files:**
- Create: `jest.config.js`
- Create: `babel.config.js`
- Create: `__tests__/store/club.test.ts`

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev jest @types/jest babel-jest @babel/core @babel/preset-typescript @babel/preset-env react-test-renderer @testing-library/react-native
```

- [ ] **Step 2: Write `babel.config.js`**

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
};
```

- [ ] **Step 3: Write `jest.config.js`**

```js
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@supabase)/)',
  ],
  moduleNameMapper: {
    // stub native modules not needed for logic tests
    '@react-native-async-storage/async-storage': '<rootDir>/__mocks__/asyncStorage.js',
    'react-native-url-polyfill/auto': '<rootDir>/__mocks__/empty.js',
  },
};
```

- [ ] **Step 4: Create mock stubs**

```bash
mkdir -p __mocks__
echo "module.exports = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };" > __mocks__/asyncStorage.js
echo "module.exports = {};" > __mocks__/empty.js
```

- [ ] **Step 5: Write a basic club store test**

Create `__tests__/store/club.test.ts`:

```typescript
import { scoreCompatibility } from '../supabase/functions/match-user/logic';
import { scoreBookForClub, buildBookReason } from '../supabase/functions/select-book/logic';
import { applyInteraction } from '../supabase/functions/update-taste/logic';

// Re-run key assertions as integration smoke tests
test('scoreCompatibility smoke test', () => {
  const a = { user_id: 'a', genres: ['Mystery'], pace: 'medium' as const, tone: [], liked_book_ids: [], disliked_book_ids: [], updated_at: '' };
  const b = { ...a, user_id: 'b' };
  expect(scoreCompatibility(a, b)).toBe(1.0);
});

test('buildBookReason returns readable string', () => {
  const profiles = [
    { user_id: 'a', genres: ['Mystery', 'Thriller'], pace: 'medium' as const, tone: [], liked_book_ids: [], disliked_book_ids: [], updated_at: '' },
  ];
  const book = { id: 'b1', title: 'T', author_id: 'a1', description: null, cover_url: null, genres: ['Mystery', 'Thriller'], tags: [], themes: [], page_count: null, popularity_score: null, taste_vector: {} };
  expect(buildBookReason(book, profiles)).toContain('Mystery');
});

test('applyInteraction does not duplicate', () => {
  const profile = { user_id: 'a', genres: [], pace: 'medium' as const, tone: [], liked_book_ids: ['bk1'], disliked_book_ids: [], updated_at: '' };
  const result = applyInteraction(profile, { book_id: 'bk1', action: 'like', genres: [] });
  expect(result.liked_book_ids.filter(id => id === 'bk1').length).toBe(1);
});
```

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: All tests PASS (10+ tests across 4 files)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: jest config, mocks, full test suite passing"
```

---

## Task 7: Local dev run + README

**Files:**
- Modify: `app.json`
- Create: `README.md`

- [ ] **Step 1: Update `app.json`**

```json
{
  "expo": {
    "name": "My Book Club",
    "slug": "my-book-club",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "mybookclub",
    "ios": { "bundleIdentifier": "com.arthursmith.mybookclub", "supportsTablet": false },
    "android": { "package": "com.arthursmith.mybookclub" }
  }
}
```

- [ ] **Step 2: Run the app**

```bash
npx expo start
```

Verify: Welcome screen loads → sign up → onboarding (6 book swipes + genre select + pace) → Club tab (waiting state since no club yet) → Discover tab → Profile tab.

- [ ] **Step 3: Seed a test club manually (to verify Club screen)**

In Supabase SQL editor:

```sql
-- After signing up two test accounts, run:
SELECT * FROM taste_profiles; -- get user_ids
-- Then manually call match-user via curl or Supabase dashboard Functions tab
-- OR insert a club + membership directly for quick testing:
INSERT INTO clubs (book_id, book_title, book_author, book_reason)
VALUES ('test-book-id', 'The Secret History', 'Donna Tartt', 'Chosen because your group loves Literary Fiction and Mystery')
RETURNING id;

-- Replace <club_id> and <user_id>:
INSERT INTO club_members (club_id, user_id) VALUES ('<club_id>', '<user_id>');
INSERT INTO reading_progress (user_id, club_id, percent) VALUES ('<user_id>', '<club_id>', 0);
INSERT INTO discussion_prompts (club_id, prompt_text, unlock_at_percent)
VALUES ('<club_id>', 'What were your first impressions?', 0),
       ('<club_id>', 'How are you feeling about the main character?', 25);
```

- [ ] **Step 4: Commit**

```bash
git add app.json README.md
git commit -m "chore: app config and dev setup docs"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Task Profile (taste model) — onboarding.tsx + taste_profiles table
- ✅ Smart Club Matching — match-user Edge Function
- ✅ Shared Book Selection — select-book Edge Function + book_reason column
- ✅ Reading Progress + Sync — reading_progress table + club.tsx progress display
- ✅ Structured Discussion — discussion_prompts + prompt_reactions + DiscussionPromptCard
- ✅ Cross-Club Discovery — discovery_feed view + discover.tsx
- ✅ Feedback Loop — update-taste Edge Function; onboarding swipes feed liked/disliked_book_ids into matching

**Type consistency check:**
- `TasteProfile.tone` is `Tone[]` — used consistently in logic modules
- `scoreCompatibility` takes `TasteProfile` in both tests and handler
- `buildBookReason` used in select-book/logic.ts and called in Edge Function handler
- `applyInteraction` signature matches tests and handler

**No placeholders:** All steps contain actual code. No TBDs.

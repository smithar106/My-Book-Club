-- Taste profile per user (sliders + genres + pace)
CREATE TABLE taste_profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  genres     text[]   NOT NULL DEFAULT '{}',
  pace       text     NOT NULL DEFAULT 'medium' CHECK (pace IN ('fast', 'medium', 'slow')),
  tone       text[]   NOT NULL DEFAULT '{}',     -- 'funny' | 'dark' | 'uplifting' | 'tense'
  liked_book_ids   text[] NOT NULL DEFAULT '{}', -- book IDs from MNB Supabase
  disliked_book_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Book clubs
CREATE TABLE clubs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     text NOT NULL,
  book_title  text NOT NULL,
  book_author text NOT NULL,
  book_cover_url text,
  book_reason text NOT NULL,
  city        text,
  region      text,
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
  unlock_at_percent int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, unlock_at_percent)
);

-- Reactions to prompts
CREATE TABLE prompt_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id   uuid REFERENCES discussion_prompts(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction    text NOT NULL CHECK (reaction IN ('love', 'confused', 'bored')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, user_id)
);

-- Indexes for common query patterns
CREATE UNIQUE INDEX ON club_members (user_id);
CREATE INDEX ON discussion_prompts (club_id);
CREATE INDEX ON reading_progress (club_id);

-- RLS
ALTER TABLE taste_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_prompts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_reactions    ENABLE ROW LEVEL SECURITY;

-- Note: clubs are created exclusively by Edge Functions (service_role bypasses RLS).
-- There is intentionally no client-side INSERT policy for clubs.

-- Policies
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

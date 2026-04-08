CREATE TABLE IF NOT EXISTS transcript_sentiment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id integer NOT NULL,
  chunk_id uuid REFERENCES transcript_embeddings(id) ON DELETE CASCADE,
  sentiment text NOT NULL CHECK (sentiment IN ('supportive', 'opposed', 'neutral', 'contentious')),
  intensity float NOT NULL CHECK (intensity >= 0 AND intensity <= 1),
  topics text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON transcript_sentiment (event_id);
ALTER TABLE transcript_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON transcript_sentiment FOR SELECT USING (true);

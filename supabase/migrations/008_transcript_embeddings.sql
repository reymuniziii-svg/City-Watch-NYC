-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Store transcript chunk embeddings for semantic search
CREATE TABLE IF NOT EXISTS transcript_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id integer NOT NULL,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  speaker text,
  chapter_title text,
  chapter_url text,
  timestamp_label text,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

-- IVFFlat index for fast cosine-similarity lookups
CREATE INDEX ON transcript_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- B-tree index for filtering by event
CREATE INDEX ON transcript_embeddings (event_id);

-- Row-level security: public read, no anonymous writes
ALTER TABLE transcript_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON transcript_embeddings FOR SELECT USING (true);

-- RPC function used by the search edge function / client
CREATE OR REPLACE FUNCTION search_transcripts(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
) RETURNS TABLE (
  id uuid,
  event_id integer,
  chunk_text text,
  speaker text,
  chapter_title text,
  chapter_url text,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT id, event_id, chunk_text, speaker, chapter_title, chapter_url,
         1 - (embedding <=> query_embedding) AS similarity
  FROM transcript_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

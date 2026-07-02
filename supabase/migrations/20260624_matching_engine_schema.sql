-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_text TEXT NOT NULL,
  parsed_json JSONB,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create behavioral_signals table
CREATE TABLE IF NOT EXISTS behavioral_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  notice_period_days INT DEFAULT 0,
  open_to_work BOOLEAN DEFAULT false,
  avg_tenure_months INT DEFAULT 0,
  response_rate_percent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create evaluations table for caching and scoring outputs
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  jd_hash TEXT NOT NULL,
  semantic_score FLOAT DEFAULT 0,
  experience_score FLOAT DEFAULT 0,
  trajectory_score FLOAT DEFAULT 0,
  domain_score FLOAT DEFAULT 0,
  company_score FLOAT DEFAULT 0,
  education_score FLOAT DEFAULT 0,
  behavioral_score FLOAT DEFAULT 0,
  availability_score FLOAT DEFAULT 0,
  final_score FLOAT DEFAULT 0,
  fraud_flags JSONB DEFAULT '{}'::jsonb,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS candidates_embedding_idx ON candidates USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

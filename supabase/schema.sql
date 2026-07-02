-- Enable pgvector if using Supabase
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY, -- Supports 'CAND_XXXXXXX'
  name TEXT NOT NULL,
  resume_text TEXT NOT NULL,
  parsed_data JSONB,
  telemetry JSONB, -- Storing all 23 behavioral signals
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, -- Custom UUID or string
  title TEXT NOT NULL,
  jd_text TEXT NOT NULL,
  requirements JSONB,
  jd_embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Layer Scores
  score_semantic NUMERIC(5,2),
  score_experience NUMERIC(5,2),
  score_trajectory NUMERIC(5,2),
  score_domain NUMERIC(5,2),
  score_company NUMERIC(5,2),
  score_education NUMERIC(5,2),
  score_behavioral NUMERIC(5,2),
  score_availability NUMERIC(5,2),
  
  -- Final Metrics
  final_score NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  risk_score TEXT, -- 'Low', 'Medium', 'High'
  hiring_recommendation TEXT, -- 'Strong Hire', 'Hire', 'Lean Hire', 'Lean Reject', 'Strong Reject'
  
  -- Fraud & Reasoning
  fraud_flags JSONB,
  recruiter_reasoning TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS honeypot_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Raw Flags
  timeline_flags JSONB,
  skill_flags JSONB,
  synthetic_flags JSONB,
  
  -- Scores
  trust_score NUMERIC(5,2), -- 0 to 100
  risk_tier TEXT, -- 'SAFE', 'SUSPICIOUS', 'HONEYPOT'
  
  -- Metadata
  scan_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS behavioral_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Raw Inputs (Telemetry)
  recruiter_response_rate NUMERIC(5,2),
  interview_completion_rate NUMERIC(5,2),
  offer_acceptance_rate NUMERIC(5,2),
  activity_frequency_score NUMERIC(5,2),
  profile_quality_score NUMERIC(5,2),
  notice_period_days INTEGER,
  relocation_flexibility BOOLEAN,
  github_activity_score NUMERIC(5,2),
  verification_score NUMERIC(5,2),
  
  -- Computed Outputs
  hireability_score NUMERIC(5,2),
  availability_score NUMERIC(5,2),
  recruiter_interest_score NUMERIC(5,2),
  risk_score NUMERIC(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funnel_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  total_applicants INTEGER NOT NULL,
  stage_1_passed INTEGER NOT NULL,
  stage_2_passed INTEGER NOT NULL,
  finalists INTEGER NOT NULL,
  analytics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_funnel_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES funnel_runs(id) ON DELETE CASCADE,
  candidate_id TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Funnel Tracking
  rank INTEGER,
  stage_reached INTEGER NOT NULL,
  status TEXT NOT NULL,
  
  -- Stage Reports
  stage_1_report JSONB,
  stage_2_report JSONB,
  committee_report JSONB,
  final_decision_report JSONB,
  
  -- Recruiter Transparency
  transparency_report JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

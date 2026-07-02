export interface RedrobSignals {
  profile_completeness_score: number;
  signup_date: string;
  last_active_date: string;
  open_to_work_flag: boolean;
  profile_views_received_30d: number;
  applications_submitted_30d: number;
  recruiter_response_rate: number;
  avg_response_time_hours: number;
  skill_assessment_scores: Record<string, number>;
  connection_count: number;
  endorsements_received: number;
  notice_period_days: number;
  expected_salary_range_inr_lpa: { min: number; max: number };
  preferred_work_mode: "onsite" | "hybrid" | "remote" | "flexible";
  willing_to_relocate: boolean;
  github_activity_score: number;
  search_appearance_30d: number;
  saved_by_recruiters_30d: number;
  interview_completion_rate: number;
  offer_acceptance_rate: number;
  verified_email: boolean;
  verified_phone: boolean;
  linkedin_connected: boolean;
}

export interface CandidateProfile {
  anonymized_name: string;
  headline: string;
  summary: string;
  location: string;
  country: string;
  years_of_experience: number;
  current_title: string;
  current_company: string;
  current_company_size: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001-5000" | "5001-10000" | "10001+";
  current_industry: string;
}

export interface CareerHistoryItem {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  duration_months: number;
  is_current: boolean;
  industry: string;
  company_size: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001-5000" | "5001-10000" | "10001+";
  description: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number;
  end_year: number;
  grade?: string | null;
  tier: "tier_1" | "tier_2" | "tier_3" | "tier_4" | "unknown";
}

export interface SkillItem {
  name: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  endorsements: number;
  duration_months?: number;
}

export interface RedrobCandidate {
  candidate_id: string;
  profile: CandidateProfile;
  career_history: CareerHistoryItem[];
  education: EducationItem[];
  skills: SkillItem[];
  certifications?: { name: string; issuer: string; year: number }[];
  languages?: { language: string; proficiency: "basic" | "conversational" | "professional" | "native" }[];
  redrob_signals: RedrobSignals;
}

export interface EvaluationReport {
  scores: {
    semantic: number;
    experience: number;
    trajectory: number;
    domain: number;
    company: number;
    education: number;
    behavioral: number;
    availability: number;
  };
  final_score: number;
  confidence_score: number;
  risk_score: "Low" | "Medium" | "High";
  hiring_recommendation: "Strong Hire" | "Hire" | "Lean Hire" | "Lean Reject" | "Strong Reject";
  fraud_flags: string[];
  recruiter_reasoning: string;
}

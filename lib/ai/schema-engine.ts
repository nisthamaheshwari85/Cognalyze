import { z } from "zod";
import { RedrobCandidate } from "@/types/matching";

export const RedrobSignalsSchema = z.object({
  profile_completeness_score: z.number().min(0).max(100),
  signup_date: z.string(),
  last_active_date: z.string(),
  open_to_work_flag: z.boolean(),
  profile_views_received_30d: z.number().nonnegative(),
  applications_submitted_30d: z.number().nonnegative(),
  recruiter_response_rate: z.number().min(0).max(1),
  avg_response_time_hours: z.number().nonnegative(),
  skill_assessment_scores: z.record(z.string(), z.number().min(0).max(100)),
  connection_count: z.number().nonnegative(),
  endorsements_received: z.number().nonnegative(),
  notice_period_days: z.number().nonnegative().max(180),
  expected_salary_range_inr_lpa: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative()
  }),
  preferred_work_mode: z.enum(["remote", "hybrid", "onsite", "flexible"]),
  willing_to_relocate: z.boolean(),
  github_activity_score: z.number().min(-1).max(100),
  search_appearance_30d: z.number().nonnegative(),
  saved_by_recruiters_30d: z.number().nonnegative(),
  interview_completion_rate: z.number().min(0).max(1),
  offer_acceptance_rate: z.number().min(-1).max(1),
  verified_email: z.boolean(),
  verified_phone: z.boolean(),
  linkedin_connected: z.boolean()
});

export const CandidateProfileSchema = z.object({
  anonymized_name: z.string(),
  headline: z.string(),
  summary: z.string(),
  location: z.string(),
  country: z.string(),
  years_of_experience: z.number().nonnegative(),
  current_title: z.string(),
  current_company: z.string(),
  current_company_size: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"]),
  current_industry: z.string()
});

export const CareerHistorySchema = z.object({
  company: z.string(),
  title: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  duration_months: z.number().nonnegative(),
  is_current: z.boolean(),
  industry: z.string(),
  company_size: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"]),
  description: z.string()
});

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field_of_study: z.string(),
  start_year: z.number().int().min(1970).max(2030),
  end_year: z.number().int().min(1970).max(2035),
  grade: z.string().nullable().optional(),
  tier: z.enum(["tier_1", "tier_2", "tier_3", "tier_4", "unknown"])
});

export const SkillItemSchema = z.object({
  name: z.string(),
  proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  endorsements: z.number().nonnegative(),
  duration_months: z.number().nonnegative().optional()
});

export const RedrobCandidateSchema = z.object({
  candidate_id: z.string().regex(/^CAND_[0-9]{7}$/),
  profile: CandidateProfileSchema,
  career_history: z.array(CareerHistorySchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillItemSchema),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    year: z.number()
  })).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(["basic", "conversational", "professional", "native"])
  })).optional(),
  redrob_signals: RedrobSignalsSchema
});

export function parseAndNormalizeCandidate(raw: any): RedrobCandidate | null {
  try {
    // Basic structural repairs for malformed data
    if (!raw.candidate_id || typeof raw.candidate_id !== "string") {
      return null;
    }
    
    // Normalize string ID format
    if (!raw.candidate_id.startsWith("CAND_")) {
      const match = raw.candidate_id.match(/\d+/);
      if (match) {
        raw.candidate_id = `CAND_${match[0].padStart(7, "0")}`;
      } else {
        return null;
      }
    }

    // Default missing signals
    if (!raw.redrob_signals) {
      raw.redrob_signals = {
        profile_completeness_score: 50,
        signup_date: "2024-01-01",
        last_active_date: "2024-01-01",
        open_to_work_flag: false,
        profile_views_received_30d: 0,
        applications_submitted_30d: 0,
        recruiter_response_rate: 0.0,
        avg_response_time_hours: 48,
        skill_assessment_scores: {},
        connection_count: 0,
        endorsements_received: 0,
        notice_period_days: 90,
        expected_salary_range_inr_lpa: { min: 0, max: 0 },
        preferred_work_mode: "hybrid",
        willing_to_relocate: false,
        github_activity_score: -1,
        search_appearance_30d: 0,
        saved_by_recruiters_30d: 0,
        interview_completion_rate: 0.0,
        offer_acceptance_rate: -1.0,
        verified_email: false,
        verified_phone: false,
        linkedin_connected: false
      };
    }

    // Default career history if empty
    if (!raw.career_history || !Array.isArray(raw.career_history) || raw.career_history.length === 0) {
      raw.career_history = [{
        company: "Unknown",
        title: raw.profile?.current_title || "Software Engineer",
        start_date: "2023-01-01",
        end_date: null,
        duration_months: 12,
        is_current: true,
        industry: raw.profile?.current_industry || "Technology",
        company_size: "11-50",
        description: "No history provided."
      }];
    }

    // Zod parsing and validation
    const parsed = RedrobCandidateSchema.parse(raw);
    return parsed as RedrobCandidate;
  } catch (error) {
    console.error(`Candidate parsing failed for ${raw?.candidate_id || "unknown"}:`, error);
    return null;
  }
}

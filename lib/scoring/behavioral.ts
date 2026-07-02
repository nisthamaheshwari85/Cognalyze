import { RedrobSignals } from "@/types/matching";

export interface BehavioralInputs {
  recruiterResponseRate: number; // 0.0 to 1.0
  interviewCompletionRate: number; // 0.0 to 1.0
  offerAcceptanceRate: number; // 0.0 to 1.0
  activityFrequencyScore: number; // 0 to 100
  profileQualityScore: number; // 0 to 100
  noticePeriodDays: number; // integer
  relocationFlexibility: boolean;
  githubActivityScore: number; // 0 to 100
  verificationScore: number; // 0 to 100
}

export interface BehavioralOutputs {
  hireabilityScore: number;
  availabilityScore: number;
  recruiterInterestScore: number;
  riskScore: number;
}

export function calculateBehavioralScores(inputs: BehavioralInputs): BehavioralOutputs {
  // A. Hireability Score (0-100)
  const hireabilityScore = Math.max(0, Math.min(100, Math.round(
    (inputs.profileQualityScore * 0.25) +
    (inputs.githubActivityScore * 0.25) +
    (inputs.interviewCompletionRate * 100 * 0.30) +
    (inputs.offerAcceptanceRate * 100 * 0.20)
  )));

  // B. Availability Score (0-100)
  let noticeScore = 25;
  if (inputs.noticePeriodDays <= 15) noticeScore = 100;
  else if (inputs.noticePeriodDays <= 30) noticeScore = 75;
  else if (inputs.noticePeriodDays <= 60) noticeScore = 50;

  const relocationScore = inputs.relocationFlexibility ? 100 : 50;

  const availabilityScore = Math.max(0, Math.min(100, Math.round(
    (noticeScore * 0.40) +
    (relocationScore * 0.30) +
    (inputs.activityFrequencyScore * 0.30)
  )));

  // C. Recruiter Interest Score (0-100)
  const recruiterInterestScore = Math.max(0, Math.min(100, Math.round(
    (inputs.recruiterResponseRate * 100 * 0.60) +
    (inputs.profileQualityScore * 0.20) +
    (inputs.verificationScore * 0.20)
  )));

  // D. Risk Score (0-100)
  const dropoutPenalty = (1.0 - inputs.interviewCompletionRate) * 100;
  const unverifiedPenalty = (100 - inputs.verificationScore);
  const offerRejectPenalty = inputs.offerAcceptanceRate >= 0 ? (1.0 - inputs.offerAcceptanceRate) * 100 : 20; // default 20 if no offer history

  const riskScore = Math.max(0, Math.min(100, Math.round(
    (dropoutPenalty * 0.50) +
    (unverifiedPenalty * 0.30) +
    (offerRejectPenalty * 0.20)
  )));

  return {
    hireabilityScore,
    availabilityScore,
    recruiterInterestScore,
    riskScore
  };
}

export function calculateBehavioralFromSignals(signals?: RedrobSignals): BehavioralOutputs {
  if (!signals) {
    return {
      hireabilityScore: 70,
      availabilityScore: 70,
      recruiterInterestScore: 70,
      riskScore: 20
    };
  }

  const safeSignals = {
    last_active_date: signals.last_active_date || "2026-06-27",
    verified_email: signals.verified_email ?? true,
    verified_phone: signals.verified_phone ?? true,
    linkedin_connected: signals.linkedin_connected ?? true,
    github_activity_score: signals.github_activity_score ?? 50,
    recruiter_response_rate: signals.recruiter_response_rate ?? 0.8,
    interview_completion_rate: signals.interview_completion_rate ?? 0.9,
    offer_acceptance_rate: signals.offer_acceptance_rate ?? 0.85,
    notice_period_days: signals.notice_period_days ?? 30,
    relocation_flexibility: signals.willing_to_relocate ?? true,
    applications_submitted_30d: signals.applications_submitted_30d ?? 3,
    avg_response_time_hours: signals.avg_response_time_hours ?? 4,
    connection_count: signals.connection_count ?? 150,
    endorsements_received: signals.endorsements_received ?? 10
  };

  // Map last active date to an activity score (0-100)
  const lastActive = new Date(safeSignals.last_active_date);
  const now = new Date("2026-06-27"); // Anchor to modern date from metadata
  const diffDays = Math.max(0, Math.ceil((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)));
  
  let activityFrequencyScore = 10;
  if (diffDays <= 3) activityFrequencyScore = 100;
  else if (diffDays <= 14) activityFrequencyScore = 75;
  else if (diffDays <= 30) activityFrequencyScore = 50;

  // Map verification booleans to a single score (0-100)
  let verificationScore = 20; // baseline
  if (safeSignals.verified_email) verificationScore += 30;
  if (safeSignals.verified_phone) verificationScore += 30;
  if (safeSignals.linkedin_connected) verificationScore += 20;

  // Map GitHub score (-1 to 100) to positive score
  const githubScore = safeSignals.github_activity_score >= 0 ? safeSignals.github_activity_score : 10;

  return calculateBehavioralScores({
    recruiterResponseRate: safeSignals.recruiter_response_rate,
    interviewCompletionRate: safeSignals.interview_completion_rate,
    offerAcceptanceRate: safeSignals.offer_acceptance_rate,
    activityFrequencyScore,
    profileQualityScore: 80, // default good layout profile
    noticePeriodDays: safeSignals.notice_period_days,
    relocationFlexibility: safeSignals.relocation_flexibility,
    githubActivityScore: githubScore,
    verificationScore
  });
}

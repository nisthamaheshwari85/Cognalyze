import { RedrobCandidate, EvaluationReport } from "@/types/matching";
import { calculateExperienceScore, calculateTrajectoryScore } from "@/lib/scoring";
import { calculateBehavioralFromSignals } from "@/lib/scoring/behavioral";

export interface RankResult {
  candidate_id: string;
  rank: number;
  score: number;
  reasoning: string;
}

// Disallowed consulting agencies from JD
const SERVICE_COMPANIES = [
  "tcs", "tata consultancy", "infosys", "wipro", "accenture", 
  "cognizant", "capgemini", "hcl", "tech mahindra", "l&t"
];

// Tech release years to catch time-travelers
const TECH_RELEASE_YEARS: Record<string, number> = {
  "react": 2013,
  "kubernetes": 2014,
  "k8s": 2014,
  "pytorch": 2016,
  "tensorflow": 2015,
  "rust": 2015,
  "langchain": 2022,
  "pinecone": 2021,
  "weaviate": 2020,
  "qdrant": 2020
};

export function scoreCandidateLocal(cand: RedrobCandidate, targetYoe: number = 7): { score: number; reasoning: string; isHoneypot: boolean } {
  let score = 0;
  const reasons: string[] = [];
  let isHoneypot = false;

  // 1. Mandatory Core ML Skill Check
  const candSkills = cand.skills.map(s => s.name.toLowerCase());
  let skillMatchCount = 0;
  const coreJdSkills = ["machine learning", "ml", "embeddings", "vector search", "retrieval", "nlp", "ranking", "python"];
  coreJdSkills.forEach(skill => {
    if (candSkills.includes(skill)) skillMatchCount++;
  });
  const skillScore = (skillMatchCount / coreJdSkills.length) * 100;
  score += skillScore * 0.30; // 30% weight

  // 2. Experience Gaussian Match (5-9 YoE target)
  const actualYoe = cand.profile?.years_of_experience ?? 5;
  const experienceScore = calculateExperienceScore(actualYoe, targetYoe);
  score += experienceScore * 0.20; // 20% weight

  // 3. Company Type Disqualifier & Prestige Tiers
  let companyScore = 60; // baseline
  const pastCompanies = cand.career_history.map(c => c.company.toLowerCase());
  
  // Check for service-only history (deal breaker)
  const onlyServices = pastCompanies.length > 0 && pastCompanies.every(c => 
    SERVICE_COMPANIES.some(sc => c.includes(sc))
  );
  if (onlyServices) {
    companyScore = 10;
    reasons.push("disqualified service company background");
  } else {
    // Check for Tier 1 / product history
    const hasProductHistory = cand.career_history.some(c => 
      c.company_size === "10001+" || c.company_size === "5001-10000"
    );
    if (hasProductHistory) companyScore = 95;
  }
  score += companyScore * 0.15; // 15% weight

  // 4. Behavioral & Telemetry Modifier
  const behavioral = calculateBehavioralFromSignals(cand.redrob_signals);
  score += behavioral.availabilityScore * 0.15; // 15% weight
  score += behavioral.hireabilityScore * 0.10; // 10% weight

  // 5. Fraud & Honeypot Checking (Deterministic Traps)
  let penalty = 0;
  
  // Rule A: Time-traveling skills
  cand.skills.forEach(s => {
    const name = s.name.toLowerCase();
    const releaseYear = TECH_RELEASE_YEARS[name];
    if (releaseYear && s.duration_months) {
      const startYearOfSkill = 2026 - (s.duration_months / 12);
      if (startYearOfSkill < releaseYear - 1) { // 1 year grace period
        isHoneypot = true;
        penalty += 40;
        reasons.push(`claimed ${Math.round(s.duration_months/12)} years of ${s.name} (released ${releaseYear})`);
      }
    }
  });

  // Rule B: Unrealistic promotions
  if (cand.career_history.length >= 2) {
    const recent = cand.career_history[0];
    const prev = cand.career_history[1];
    if (recent.title.toLowerCase().includes("vp") && prev.title.toLowerCase().includes("junior") && recent.duration_months <= 12) {
      isHoneypot = true;
      penalty += 40;
      reasons.push("suspicious promotion from junior to VP in under 12 months");
    }
  }

  // Rule C: Overlapping timelines (>2 full-time current roles)
  const currentRoles = cand.career_history.filter(c => c.is_current);
  if (currentRoles.length > 2) {
    isHoneypot = true;
    penalty += 50;
    reasons.push("claimed multiple simultaneous full-time current roles");
  }

  // Apply penalty
  const finalScore = Math.max(0, Math.round(score - penalty));

  // Build specific, non-templated reasoning
  const headline = cand.profile?.headline || "Candidate Profile";
  const noticeDays = cand.redrob_signals?.notice_period_days ?? 30;
  let reasoning = `${headline}. Has ${actualYoe.toFixed(1)} YoE with key skills in ${(cand.skills || []).slice(0, 3).map(s => s.name).join(", ")}.`;
  if (reasons.length > 0) {
    reasoning += ` Concerns: ${reasons.join("; ")}.`;
  } else {
    reasoning += ` Highly responsive candidate with a notice period of ${noticeDays} days.`;
  }

  return {
    score: finalScore / 100, // normalize to 0.0 - 1.0 range for the CSV
    reasoning,
    isHoneypot
  };
}

export function rankCandidates(candidates: RedrobCandidate[], limit: number = 100): RankResult[] {
  const scored = candidates.map(cand => {
    const { score, reasoning, isHoneypot } = scoreCandidateLocal(cand);
    return {
      candidate_id: cand.candidate_id,
      score,
      reasoning,
      isHoneypot
    };
  });

  // Sort: non-honeypots first, then score descending, tiebreak on candidate_id ascending
  scored.sort((a, b) => {
    // Heavily penalize honeypots to ensure they never enter top 100
    if (a.isHoneypot && !b.isHoneypot) return 1;
    if (!a.isHoneypot && b.isHoneypot) return -1;
    
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.candidate_id.localeCompare(b.candidate_id);
  });

  return scored.slice(0, limit).map((s, idx) => ({
    candidate_id: s.candidate_id,
    rank: idx + 1,
    score: s.score,
    reasoning: s.reasoning
  }));
}

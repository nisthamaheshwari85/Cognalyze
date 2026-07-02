import { groqFetch } from "@/lib/groq";
import { RedrobCandidate } from "@/types/matching";
import { redactCandidate } from "./funnel";

export interface EnterpriseWeights {
  technical: number;
  projects: number;
  experience: number;
  problemSolving: number;
  aiml: number;
  leadership: number;
  communication: number;
  learningPotential: number;
  cultureFit: number;
  education: number;
  logistics: number;
}

export const defaultWeights: EnterpriseWeights = {
  technical: 0.20,
  projects: 0.20,
  experience: 0.15,
  problemSolving: 0.10,
  aiml: 0.10,
  leadership: 0.05,
  communication: 0.05,
  learningPotential: 0.05,
  cultureFit: 0.05,
  education: 0.03,
  logistics: 0.02
};

export interface EnterpriseCandidateReport {
  name: string;
  rank?: number;
  stage: string;
  scores: {
    overall: number;
    technical: number;
    experience: number;
    project: number;
    leadership: number;
    communication: number;
    culture: number;
    learningPotential: number;
    futurePotential: number;
    locationCompatibility: number;
    availability: number;
    salaryCompatibility: number;
  };
  strengths: string[];
  weaknesses: string[];
  uniqueAdvantages: string;
  risks: string[];
  missingSkills: string[];
  recommendedInterviewFocus: string;
  probPassingInterviews: number;
  offerProbability: number;
  promotionPotential: "High" | "Medium" | "Low";
  finalVerdict: "Hire" | "Hold" | "Reject";
  recruiterSummary: string;
  improvementRoadmap: string[];
  comparativeRejectionDetails?: string; // comparison text
}

// Stage 1 - Initial Screening (Bias Redacted)
export async function runEnterpriseStage1(cand: RedrobCandidate, jd: string): Promise<any> {
  const redacted = redactCandidate(cand);
  const prompt = `You are a Senior FAANG Recruiter. Run Stage 1 Screening on this bias-redacted candidate profile against the Job Description.
  
  JOB DESCRIPTION:
  ${jd.slice(0, 800)}
  
  CANDIDATE:
  ${JSON.stringify(redacted)}
  
  Evaluate if they pass core mandatory requirements. If they fail, list missing mandatory qualifications.
  Return ONLY JSON matching this format:
  {
    "decision": "PASS" | "REJECT",
    "missingMandatory": ["string"],
    "score": number, // 0 to 100
    "reasons": "string"
  }`;

  try {
    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return { decision: "REJECT", missingMandatory: ["Technical matching failure"], score: 40, reasons: "Screening error fallback." };
  }
}

// Stage 2 - Technical Evaluation
export async function runEnterpriseStage2(cand: RedrobCandidate, stage1Data: any): Promise<any> {
  const redacted = redactCandidate(cand);
  const prompt = `You are a Technical Interview Panel Lead. Run Stage 2 Technical Screen.
  
  CANDIDATE:
  ${JSON.stringify(redacted)}
  
  STAGE 1 DATA:
  ${JSON.stringify(stage1Data)}
  
  Evaluate technical competencies, projects originality, coding design, GitHub quality, and AI/ML metrics.
  Return ONLY JSON matching this format:
  {
    "technicalScore": number, // 0 to 100
    "projectScore": number, // 0 to 100
    "problemSolvingScore": number, // 0 to 100
    "aimlScore": number, // 0 to 100
    "uniqueAdvantages": "string",
    "missingSkills": ["string"],
    "recommendedFocus": "string",
    "decision": "PASS" | "REJECT"
  }`;

  try {
    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.15
      })
    });
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return { technicalScore: 50, projectScore: 50, problemSolvingScore: 50, aimlScore: 50, uniqueAdvantages: "None", missingSkills: [], recommendedFocus: "General", decision: "REJECT" };
  }
}

// Stage 3 - Simulated Hiring Committee Review
export async function runEnterpriseStage3(cand: RedrobCandidate, stage2Data: any): Promise<any> {
  const redacted = redactCandidate(cand);
  const prompt = `You are a simulated 10-persona Hiring Committee reviewing a candidate.
  Members: Recruiter, HM, Engineering Director, HR, Culture Lead.
  
  CANDIDATE:
  ${JSON.stringify(redacted)}
  
  STAGE 2 METRICS:
  ${JSON.stringify(stage2Data)}
  
  Determine opinions, leadership, culture, learning scores, future potential, and retention probability.
  Return ONLY JSON matching this format:
  {
    "recruiterSummary": "string",
    "leadershipScore": number,
    "communicationScore": number,
    "cultureScore": number,
    "learningPotentialScore": number,
    "futurePotentialScore": number,
    "probPassingInterviews": number,
    "offerProbability": number,
    "promotionPotential": "High" | "Medium" | "Low",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "risks": ["string"],
    "improvementRoadmap": ["string"],
    "verdict": "HIRE" | "HOLD" | "REJECT"
  }`;

  try {
    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return { recruiterSummary: "Error", leadershipScore: 40, communicationScore: 40, cultureScore: 40, learningPotentialScore: 40, futurePotentialScore: 40, probPassingInterviews: 30, offerProbability: 30, promotionPotential: "Low", strengths: [], weaknesses: [], risks: [], improvementRoadmap: [], verdict: "REJECT" };
  }
}

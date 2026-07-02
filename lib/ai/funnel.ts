import { groqFetch } from "@/lib/groq";
import { RedrobCandidate } from "@/types/matching";

// Helper to redact personal details (Bias Prevention)
export function redactCandidate(cand: RedrobCandidate): any {
  return {
    candidate_id: cand.candidate_id,
    profile: {
      headline: cand.profile.headline,
      summary: cand.profile.summary,
      years_of_experience: cand.profile.years_of_experience,
      current_title: cand.profile.current_title,
      current_company: "[REDACTED COMPANY]",
      current_company_size: cand.profile.current_company_size,
      current_industry: cand.profile.current_industry
    },
    career_history: cand.career_history.map(c => ({
      title: c.title,
      duration_months: c.duration_months,
      company_size: c.company_size,
      description: c.description
    })),
    education: cand.education.map(e => ({
      degree: e.degree,
      field_of_study: e.field_of_study,
      tier: e.tier
    })),
    skills: cand.skills,
    redrob_signals: cand.redrob_signals
  };
}

// STAGE 1 - Resume Screening
export async function runStage1Screening(cand: RedrobCandidate, jdText: string): Promise<any> {
  const redacted = redactCandidate(cand);
  const prompt = `You are a Senior FAANG Recruiter. Evaluate this redacted candidate profile against the Job Description. Be brutally honest. Do not use generic statements.
  
  JOB DESCRIPTION:
  ${jdText.slice(0, 800)}
  
  CANDIDATE PROFILE (Redacted to prevent bias):
  ${JSON.stringify(redacted)}
  
  INSTRUCTIONS:
  Evaluate technical skills, experience quality, achievements, domain match, and learning ability.
  Provide scores (0-100) and decide PASS or REJECT. If REJECT, explain precisely why (e.g. tutorial-based projects, lack of production scaling).
  
  Return ONLY JSON matching this format:
  {
    "decision": "PASS" | "REJECT",
    "scores": {
      "overall": number,
      "technical": number,
      "experience": number,
      "communication": number,
      "learningAbility": number,
      "cultureFit": number,
      "confidence": number
    },
    "reasons": "string",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "hiddenPotential": "string",
    "riskLevel": "Low" | "Medium" | "High",
    "improvementAreas": ["string"]
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
    return {
      decision: "REJECT",
      scores: { overall: 20, technical: 20, experience: 20, communication: 30, learningAbility: 30, cultureFit: 40, confidence: 50 },
      reasons: "API screening failure — default reject.",
      strengths: [], weaknesses: ["Screening error"], hiddenPotential: "None", riskLevel: "High", improvementAreas: []
    };
  }
}

// STAGE 2 - Deep Screening
export async function runStage2Screening(cand: RedrobCandidate, stage1Data: any): Promise<any> {
  const redacted = redactCandidate(cand);
  const prompt = `You are a Hiring Manager evaluating a shortlisted candidate. Check their project originality, GitHub activity, coding credibility, timeline consistency, and exaggeration risk.
  
  CANDIDATE DATA:
  ${JSON.stringify(redacted)}
  
  STAGE 1 METRICS:
  ${JSON.stringify(stage1Data)}
  
  INSTRUCTIONS:
  Decide to ADVANCE, HOLD, or REJECT. If REJECT, explain exactly why (e.g. portfolio matches generic tutorials, low commit frequency).
  
  Return ONLY JSON matching this format:
  {
    "decision": "ADVANCE" | "HOLD" | "REJECT",
    "timelineConsistency": "string",
    "exaggerationProbability": number, // 0 to 100
    "aiGeneratedContentProbability": number, // 0 to 100
    "githubQuality": "Strong" | "Moderate" | "Weak",
    "reasonForDecision": "string"
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
    return { decision: "REJECT", timelineConsistency: "Unknown", exaggerationProbability: 80, aiGeneratedContentProbability: 50, githubQuality: "Weak", reasonForDecision: "System failure." };
  }
}

// STAGE 3 - Hiring Committee
export async function runStage3Committee(cand: RedrobCandidate, stage2Data: any): Promise<any> {
  const redacted = redactCandidate(cand);
  const prompt = `You are a 5-member Hiring Committee simulating a review.
  Members: Recruiter, Hiring Manager, Technical Lead, Engineering Director, HR.
  
  CANDIDATE DETAILS:
  ${JSON.stringify(redacted)}
  
  STAGE 2 METRICS:
  ${JSON.stringify(stage2Data)}
  
  INSTRUCTIONS:
  Formulate opinions for each role and generate a final verdict: HIRE, HOLD, or REJECT.
  Provide scores (0-100) for expected metrics.
  
  Return ONLY JSON matching this format:
  {
    "recruiterOpinion": "string",
    "hiringManagerOpinion": "string",
    "technicalLeadOpinion": "string",
    "engineeringDirectorOpinion": "string",
    "hrOpinion": "string",
    "probClearingInterviews": number,
    "probAcceptingOffer": number,
    "retentionProbability": number,
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
    return { recruiterOpinion: "System error", hiringManagerOpinion: "System error", technicalLeadOpinion: "System error", engineeringDirectorOpinion: "System error", hrOpinion: "System error", probClearingInterviews: 20, probAcceptingOffer: 50, retentionProbability: 50, verdict: "REJECT" };
  }
}

// STAGE 4 - Final Decision
export async function runStage4Decision(cand: RedrobCandidate, committeeData: any): Promise<any> {
  const prompt = `Formulate the final hiring decision details for this candidate who has reached the final committee round.
  
  CANDIDATE HEADLINE: ${cand.profile.headline}
  COMMITTEE DECISION: ${JSON.stringify(committeeData)}
  
  Return ONLY JSON matching this format:
  {
    "recommendedSalaryBand": "string", // e.g. "INR 35 - 45 LPA"
    "expectedPerformance": "High" | "Medium" | "Low",
    "promotionPotential": "High" | "Medium" | "Low",
    "riskLevel": "High" | "Medium" | "Low",
    "managerConfidence": number // 0 to 100
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
    return { recommendedSalaryBand: "INR 20 - 25 LPA", expectedPerformance: "Medium", promotionPotential: "Medium", riskLevel: "Medium", managerConfidence: 50 };
  }
}

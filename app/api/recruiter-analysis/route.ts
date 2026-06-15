import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { jd, resume } = await req.json();
    const jdClean = (jd || "").trim();
    const resumeClean = (resume || "").trim();

    // Hard validation — no hallucination allowed
    if (jdClean.length < 80) {
      return NextResponse.json({
        error: "insufficient_jd",
        message: "Job description is too short. Please provide a complete job description (minimum 80 characters).",
        decision: "INSUFFICIENT_DATA",
        decision_confidence: 0, ats_match_score: 0, overall_fit: 0,
        experience_match: "Unknown", seniority_level: "Unknown", years_experience: "Unknown",
        must_have_skills: { required: [], present: [], missing: [], match_percent: 0 },
        good_to_have_skills: { listed: [], candidate_has: [], match_percent: 0 },
        red_flags: [{ flag: "Incomplete job description provided", severity: "Critical", evidence: "JD has less than 80 characters — cannot perform analysis" }],
        green_flags: [], education_assessment: { score: 0, institution_tier: "Unknown", relevance: "Unknown", notes: "Insufficient data" },
        interview_questions: [], salary_assessment: { estimated_expectation: "Unknown", market_fit: "Unknown", notes: "Need complete JD to estimate" },
        next_steps: { action: "Provide complete JD", timeline: "Before analysis", focus_areas: ["Complete job description required"], interviewer_recommendation: "Add detailed job requirements" },
        shortlist_summary: "Cannot analyze — job description is incomplete. Please provide the full job description.", comparable_benchmark: "N/A"
      });
    }

    if (resumeClean.length < 80) {
      return NextResponse.json({
        error: "insufficient_resume",
        message: "Resume is too short. Please provide the complete resume text (minimum 80 characters).",
        decision: "INSUFFICIENT_DATA",
        decision_confidence: 0, ats_match_score: 0, overall_fit: 0,
        experience_match: "Unknown", seniority_level: "Unknown", years_experience: "Unknown",
        must_have_skills: { required: [], present: [], missing: [], match_percent: 0 },
        good_to_have_skills: { listed: [], candidate_has: [], match_percent: 0 },
        red_flags: [{ flag: "Incomplete resume provided", severity: "Critical", evidence: "Resume has less than 80 characters — cannot perform analysis" }],
        green_flags: [], education_assessment: { score: 0, institution_tier: "Unknown", relevance: "Unknown", notes: "Insufficient data" },
        interview_questions: [], salary_assessment: { estimated_expectation: "Unknown", market_fit: "Unknown", notes: "Need complete resume to estimate" },
        next_steps: { action: "Provide complete resume", timeline: "Before analysis", focus_areas: ["Complete resume required"], interviewer_recommendation: "Request full resume from candidate" },
        shortlist_summary: "Cannot analyze — resume is incomplete. Please paste the full resume text.", comparable_benchmark: "N/A"
      });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a FAANG Senior Recruiter (15 years experience, Google/Meta/Amazon). Analyze this candidate with EXTREME honesty.

CRITICAL RULES:
1. ONLY use information explicitly stated in the resume and JD. Never assume or invent.
2. If something is NOT in the resume, mark it as missing — never assume it exists.
3. Give REAL scores based on actual match quality. A weak resume gets low scores (20-40). A strong resume gets high scores (75-95).
4. Your decision must match the scores — low scores = REJECT, medium = HOLD, high = SHORTLIST.
5. If the resume barely matches the JD, be honest about it.

JOB DESCRIPTION:
${jdClean.slice(0, 800)}

CANDIDATE RESUME:
${resumeClean.slice(0, 1200)}

Based ONLY on the above content, provide your analysis. Return ONLY this JSON:
{
  "decision": "SHORTLIST|HOLD|REJECT",
  "decision_confidence": 85,
  "ats_match_score": 72,
  "overall_fit": 68,
  "experience_match": "Strong|Moderate|Weak|None",
  "seniority_level": "Senior|Mid-Level|Junior|Entry",
  "years_experience": "3-4 years",
  "must_have_skills": {
    "required": ["skill1 from JD", "skill2 from JD"],
    "present": ["skills actually found in resume"],
    "missing": ["skills in JD but NOT in resume"],
    "match_percent": 67
  },
  "good_to_have_skills": {
    "listed": ["skills mentioned in JD as nice-to-have"],
    "candidate_has": ["which of these are in resume"],
    "match_percent": 50
  },
  "red_flags": [
    { "flag": "specific concern", "severity": "High|Medium|Low", "evidence": "exact quote or specific observation from resume" }
  ],
  "green_flags": [
    { "flag": "specific strength", "strength": "High|Medium", "evidence": "exact quote or specific evidence from resume" }
  ],
  "education_assessment": {
    "score": 75,
    "institution_tier": "Tier 1|Tier 2|Tier 3|Unknown",
    "relevance": "High|Medium|Low",
    "notes": "specific note about their education from resume"
  },
  "interview_questions": [
    { "question": "specific question probing their actual resume gap/claim", "type": "Technical|Behavioral|System Design|Culture", "probes": "what gap or claim this tests", "difficulty": "Hard|Medium|Easy" }
  ],
  "salary_assessment": {
    "estimated_expectation": "$X - $Y or INR X - Y",
    "market_fit": "Within Range|Above Range|Below Range",
    "notes": "based on their experience level and role"
  },
  "next_steps": {
    "action": "Phone Screen|Technical Round|Reject|Request More Info",
    "timeline": "Within X business days",
    "focus_areas": ["specific thing to verify", "another area"],
    "interviewer_recommendation": "who should interview them"
  },
  "shortlist_summary": "2-3 honest sentences about this specific candidate",
  "comparable_benchmark": "Top X% or Bottom X% of candidates for this role"
}`
        }],
        max_tokens: 2000,
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `API ${res.status}`);
    const raw = data.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON parse failed");
    const parsed = JSON.parse(match[0]);

    // Sanity check: if scores are unrealistically high for short inputs, cap them
    const jdWords = jdClean.split(/\s+/).length;
    const resumeWords = resumeClean.split(/\s+/).length;
    if (jdWords < 20 || resumeWords < 20) {
      parsed.ats_match_score = Math.min(parsed.ats_match_score, 30);
      parsed.overall_fit = Math.min(parsed.overall_fit, 30);
      parsed.decision = "REJECT";
      parsed.decision_confidence = Math.min(parsed.decision_confidence, 40);
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error("Recruiter analysis error:", e.message);
    return NextResponse.json({ error: e.message, decision: "ERROR", decision_confidence: 0, ats_match_score: 0, overall_fit: 0 }, { status: 500 });
  }
}
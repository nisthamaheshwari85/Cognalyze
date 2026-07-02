import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { groqFetch } from "@/lib/groq";

// ── Strip <think> / <thinking> blocks that leak from reasoning models ──
function stripThinkTags(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

// ── Robust JSON extractor ──
function extractJSON(raw: string): any {
  const stripped = stripThinkTags(raw);
  const clean = stripped.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  const jsonStr = clean.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return JSON.parse(
      jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/\n/g, " ")
        .replace(/\t/g, " ")
    );
  }
}

// ── Semantic keyword matching ──
const SEMANTIC_MAP: Record<string, string[]> = {
  "data structures and algorithms": ["dsa","leetcode","competitive programming","solved.*problems","algorithms","data structures","codeforces","codechef","hackerrank","binary search","dynamic programming","trees","graphs","sorting","hashing","striver","neetcode"],
  "rest apis": ["rest","api","restful","endpoint","axios","fetch","postman","express","fastapi","flask","integrated api","api integration","full.?stack","http","backend","server"],
  "databases": ["mysql","mongodb","postgresql","sqlite","supabase","firebase","redis","sql","nosql","orm","prisma","mongoose","database"],
  "system design": ["microservice","distributed","scalab","architect","load balanc","cache","kafka","queue","sharding","replication"],
  "cloud platforms": ["aws","azure","gcp","cloud","ec2","s3","lambda","vercel","netlify","heroku","docker","kubernetes","k8s"],
  "problem solving": ["solved","problems","leetcode","hackathon","debug","optimized","performance","competitive","top.*hackathon"],
  "communication": ["collaborated","team","cross.functional","presented","documentation","mentored","led","coordinated","taught"],
  "full-stack": ["frontend","backend","full.?stack","react.*node","next.*express","end.to.end"],
};

function semanticMatch(keyword: string, resumeText: string): boolean {
  const lower = resumeText.toLowerCase();
  if (lower.includes(keyword.toLowerCase())) return true;
  const synonyms = SEMANTIC_MAP[keyword.toLowerCase()];
  if (synonyms) return synonyms.some((s) => new RegExp(s, "i").test(resumeText));
  return false;
}

// ── Seniority detection ──
function detectSeniority(jd: string, title: string): "intern" | "junior" | "mid" | "senior" | "staff" {
  const text = (jd + " " + title).toLowerCase();
  if (/intern|internship|co.?op|trainee|apprentice/i.test(text)) return "intern";
  if (/staff|principal|distinguished|fellow/i.test(text)) return "staff";
  if (/senior|sr\.|lead|architect|director/i.test(text)) return "senior";
  if (/mid.?level|3.?[–-].?6\s*year/i.test(text)) return "mid";
  if (/junior|entry.?level|0.?[–-].?2\s*year|fresher|new.?grad/i.test(text)) return "junior";
  return "junior";
}

// ── Role calibration (weights + thresholds per seniority) ──
const CALIBRATION = {
  intern: { w: { skills:0.25, projects:0.40, experience:0.08, education:0.15, achievements:0.12 }, shortlist:58, hold:44, salaryUnit:"stipend (INR/month)" },
  junior: { w: { skills:0.28, projects:0.30, experience:0.20, education:0.12, achievements:0.10 }, shortlist:62, hold:47, salaryUnit:"INR LPA" },
  mid:    { w: { skills:0.25, projects:0.22, experience:0.35, education:0.08, achievements:0.10 }, shortlist:65, hold:50, salaryUnit:"INR LPA" },
  senior: { w: { skills:0.22, projects:0.18, experience:0.40, education:0.05, achievements:0.15 }, shortlist:68, hold:54, salaryUnit:"INR LPA" },
  staff:  { w: { skills:0.20, projects:0.15, experience:0.45, education:0.05, achievements:0.15 }, shortlist:72, hold:58, salaryUnit:"INR LPA" },
};

// ══════════════════════════════════════════════════════════════════
// MASTER SYSTEM PROMPT — Enterprise AI Recruiter
// Based on: Google, Meta, Amazon, Microsoft, OpenAI hiring committees
// ══════════════════════════════════════════════════════════════════
function buildSystemPrompt(mode: string, seniority: string, cal: typeof CALIBRATION["intern"]): string {
  const personas: Record<string, string> = {
    faang: "You are the Lead Recruiter of a 9-person hiring committee at Google (30+ years, 50,000+ resumes reviewed). Your committee includes: Senior Technical Recruiter, Hiring Manager, Engineering Director, Technical Interview Panel, AI/ML Domain Expert, HR Business Partner, Compensation Specialist, Behavioral Psychologist, and Talent Intelligence Analyst.",
    startup: "You are Head of Talent at a high-growth Series B startup (30+ years across startups and FAANG). Your committee evaluates: shipping ability, ownership, adaptability, and day-one productivity.",
    product: "You are VP of Product at a top tech firm (30+ years hiring PMs and APMs). Your committee evaluates: product sense, user empathy, metric-driven thinking, and cross-functional leadership.",
    service: "You are Director of Talent at a top IT services firm (30+ years). Your committee evaluates: delivery track record, client management, technical breadth, and ramp speed.",
  };

  const internNote = seniority === "intern" ? `
INTERN EVALUATION SPECIAL RULES:
- Do NOT penalize for lack of production experience. They are students.
- Evaluate: project technical depth, DSA fundamentals (even via "solved 300+ problems"), learning velocity, tool maturity.
- A student who built a full-stack AI app with real APIs and won a hackathon = strong intern.
- "Solved 300+ DSA problems" or "LeetCode" = DSA skill IS present. Never mark it missing.
- Salary must be expressed as monthly stipend (INR), never as LPA.
` : "";

  return `${personas[mode] || personas.faang}

You are NOT a keyword matcher. You are an Enterprise Hiring Intelligence System simulating the complete hiring process of world-class technology companies.

EVALUATION PHILOSOPHY — EVALUATE THE WHOLE CANDIDATE:
You consider ALL evidence: technical competence, practical experience, project quality, education, leadership, learning velocity, communication, career growth, cultural fit, future potential, and logistics.

ENTERPRISE WEIGHTED SCORING (transparently applied):
Technical Skills .......... 20%
Projects ................. 20%
Experience ............... 15%
Problem Solving .......... 10%
AI/ML Knowledge .......... 10%
Leadership ............... 5%
Communication ............ 5%
Learning Potential ....... 5%
Culture Fit .............. 5%
Education ................ 3%
Logistics & Availability . 2%

FAIRNESS MANDATE — IGNORE COMPLETELY:
College prestige bias, gender, name, photo, resume design, age, religion.
Evaluate ONLY: evidence, skills, impact, growth, and role suitability.
${internNote}
CALIBRATED SCORING FOR THIS SPECIFIC ROLE (${seniority.toUpperCase()}):
- 90-100: Competing offers from Google/Meta/OpenAI. 1 in 100. You fight for them in every committee.
- 75-89: Strong. Would personally vouch in committee. 1 in 10.
- ${cal.shortlist}-89: SHORTLIST. Clear evidence they can do the job at this seniority.
- ${cal.hold}-${cal.shortlist - 1}: HOLD. Potential exists but gaps need deeper evaluation.
- ${Math.max(cal.hold - 15, 20)}-${cal.hold - 1}: HOLD leaning REJECT. Missing fundamentals or evidence.
- 20-${Math.max(cal.hold - 16, 21)}: REJECT. Underqualified for this specific role.
- Under 20: Wrong role entirely.

These thresholds (SHORTLIST at ${cal.shortlist}, HOLD at ${cal.hold}) are specific to ${seniority} roles — do not use generic thresholds from other seniority levels.

FORBIDDEN WORDS: passionate, driven, dynamic, results-oriented, exceptional, outstanding, motivated, enthusiastic, spearheaded, leveraged, synergized, robust, scalable, seamless, comprehensive, proficient, detail-oriented.

REJECTION RULES (never generic):
Never say "not shortlisted." Always explain:
- Which mandatory requirements are missing with evidence
- Which skills prevented advancement  
- Whether to reconsider later with a specific improvement roadmap

EVERY score needs evidence. EVERY verdict must be explainable. EVERY recommendation must be defensible.

Respond ONLY with valid JSON. No markdown. No preamble. No <think> tags. No text outside JSON.`;
}

// ── Debate persona prompts (distinct evaluation lenses, no forced score bias) ──
const DEBATE_PERSONAS = {
  champion:       { tone: "You are the CANDIDATE ADVOCATE on this hiring committee. Find every legitimate signal of ability and potential in the resume and argue honestly for the candidate — but you cannot invent evidence. If the resume is genuinely weak, say so. Your role is honest advocacy, not cheerleading." },
  skeptic:        { tone: "You are the DEVIL'S ADVOCATE on this hiring committee. Stress-test every claim — what's unproven, what's inflated, what could go wrong. But if the evidence is genuinely strong, acknowledge it. Your role is rigor, not reflexive negativity." },
  tech_lead:      { tone: "You are the TECHNICAL INTERVIEWER who will work with this person daily. Evaluate technical depth, code quality signals, and day-one productivity strictly from resume evidence." },
  bar_raiser:     { tone: "You are the BAR RAISER (Amazon-style). Your only question: does this hire raise the team's average? Compare the candidate's demonstrated evidence against what a genuinely strong hire in this role looks like — no credit for unproven potential." },
  hiring_manager: { tone: "You are the HIRING MANAGER. Balance team fit, ramp time, and role coverage against the direct evidence in this resume." },
};

// ── Step 1: Evidence extraction (cold, factual, no scoring) ──
async function extractEvidence(jd: string, resume: string, title: string): Promise<any> {
  const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a strict evidence extractor. Extract ONLY what is explicitly present. Do NOT evaluate or score. Do NOT infer. If something is not stated, it is absent.

SEMANTIC EXTRACTION RULES:
- "Solved 300+ DSA problems" OR "LeetCode" OR "competitive programming" → DSA skill = PRESENT
- MongoDB + MySQL anywhere → "databases" = PRESENT  
- Full-stack project (frontend + backend together) → REST API experience = LIKELY PRESENT
- Skills listed in a Skills section ARE valid evidence — they are not worthless
- Only mark MISSING if there is ZERO evidence anywhere (skills, projects, experience, achievements)

Return ONLY valid JSON. No markdown.`,
        },
        {
          role: "user",
          content: `${title ? `ROLE: ${title}\n` : ""}
JOB DESCRIPTION:
${jd.slice(0, 1000)}

RESUME:
${resume.slice(0, 1800)}

Return ONLY this JSON:
{
  "jd_requires": {
    "must_have_skills": ["skill1"],
    "nice_to_have_skills": ["skill1"],
    "experience_years": "X years",
    "seniority": "intern|junior|mid|senior",
    "education_requirement": "degree requirement",
    "role_type": "what kind of role"
  },
  "resume_shows": {
    "skills_with_evidence": [{"skill": "React", "evidence": "Built Cognalyze using Next.js and TypeScript"}],
    "skills_listed_no_project_evidence": ["skill listed but no project shows usage"],
    "total_experience_years": "X years or student",
    "companies_worked": ["company1"],
    "projects": [{"name": "name", "stack": ["tech1"], "complexity": "High|Medium|Low", "has_metrics": false}],
    "quantified_achievements": ["exact quote or NONE"],
    "dsa_evidence": "exact quote showing DSA or NONE",
    "leadership_evidence": "exact quote or NONE",
    "education": "actual degree, institution, CGPA"
  },
  "gaps": {
    "missing_must_have_skills": ["skill required but ZERO evidence anywhere"],
    "experience_gap": "JD wants X, resume shows Y",
    "seniority_alignment": "JD wants X, candidate appears Y level",
    "no_quantified_metrics": true,
    "other_gaps": ["gap1"]
  },
  "standout_signals": ["most impressive thing — specific"]
}`,
        },
      ],
      max_tokens: 1400,
      temperature: 0.0,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  try { return extractJSON(data.choices?.[0]?.message?.content || "{}"); } catch { return {}; }
}

// ── Step 2: Score from evidence, full enterprise report ──
async function scoreFromEvidence(
  evidence: any, jd: string, resume: string, title: string,
  seniority: string, cal: typeof CALIBRATION["intern"], systemPrompt: string
): Promise<any> {
  const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `You are making a REAL hiring decision with REAL consequences for ${title || "this role"}.

ROLE SENIORITY: ${seniority.toUpperCase()}
SHORTLIST THRESHOLD: ${cal.shortlist}/100
HOLD THRESHOLD: ${cal.hold}/100
SALARY FORMAT: ${cal.salaryUnit}

SCORE WEIGHTS FOR THIS ROLE:
Skills: ${Math.round(cal.w.skills * 100)}% | Projects: ${Math.round(cal.w.projects * 100)}% | Experience: ${Math.round(cal.w.experience * 100)}% | Education: ${Math.round(cal.w.education * 100)}% | Achievements: ${Math.round(cal.w.achievements * 100)}%

PRE-EXTRACTED EVIDENCE (objective — trust this completely):
${JSON.stringify(evidence, null, 2)}

ORIGINAL JD (for context):
${jd.slice(0, 700)}

ORIGINAL RESUME (for context only — score from evidence above):
${resume.slice(0, 900)}

SCORING RULES:
1. Score EACH dimension independently first. Derive overall_fit from weighted average. NEVER decide verdict first then justify it.
2. For ${seniority} role: ${seniority === "intern" ? "projects and skills dominate. Experience near-zero is expected." : seniority === "senior" ? "experience and system design depth dominate." : "balance skills, projects, and experience."}
3. Every red/green flag needs exact resume evidence — no generics.
4. Interview questions must target specific claims or gaps in THIS resume.
5. Write like a real recruiter in a private hiring committee Slack — blunt, evidence-based, specific.
6. RESPONSE DIVERSITY: This report must read as independently written — not templated.
7. candidate_dna MUST be filled with real evidence from THIS resume — every score needs a matching evidence field. If no evidence exists for a trait, score it low and say "NONE FOUND" in the evidence field. Never leave it as a generic default.
8. overall_fit MUST equal the weighted sum of your score_breakdown's weighted_contribution values. Compute the breakdown first, sum it, then write that sum as overall_fit — do not pick a separate number.

Return ONLY this JSON (no markdown, no <think>, no text outside):
{
  "decision": "SHORTLIST|HOLD|REJECT",
  "decision_confidence": 72,
  "ats_match_score": 68,
  "overall_fit": 62,
  "jd_coverage_percent": 65,
  "interview_readiness_score": 58,
  "success_probability": 55,
  "candidate_percentile": "Top 38% — above average for this role",
  "comparable_benchmark": "Honest benchmark vs other ${seniority} candidates",
  "experience_match": "Strong|Moderate|Weak|None",
  "seniority_level": "Intern|Entry|Junior|Mid-Level|Senior|Staff",
  "years_experience": "e.g. 1 year internship + 2 projects",
  "score_breakdown": {
    "skills":       { "score": 65, "weight_applied": ${Math.round(cal.w.skills*100)}, "weighted_contribution": 13, "notes": "specific evidence from resume" },
    "projects":     { "score": 72, "weight_applied": ${Math.round(cal.w.projects*100)}, "weighted_contribution": 14, "notes": "specific project quality note" },
    "experience":   { "score": 38, "weight_applied": ${Math.round(cal.w.experience*100)}, "weighted_contribution": 3, "notes": "specific experience note" },
    "education":    { "score": 68, "weight_applied": ${Math.round(cal.w.education*100)}, "weighted_contribution": 10, "notes": "specific education note" },
    "achievements": { "score": 45, "weight_applied": ${Math.round(cal.w.achievements*100)}, "weighted_contribution": 5, "notes": "specific achievement note" }
  },
  "verdict_score_math": "Skills(65×0.${Math.round(cal.w.skills*100)}) + Projects(72×0.${Math.round(cal.w.projects*100)}) + ... = overall_fit explanation",
  "must_have_skills": {
    "required": ["from JD"],
    "present": ["with evidence — apply semantic matching"],
    "missing": ["ZERO evidence anywhere in resume"],
    "match_percent": 70
  },
  "good_to_have_skills": {
    "listed": ["from JD"],
    "candidate_has": ["found in resume"],
    "match_percent": 60
  },
  "skills_matrix": [
    { "skill": "React", "candidate_proficiency": 70, "required_level": 80, "evidence": "specific", "gap": "Low|Medium|High|None" }
  ],
  "red_flags": [
    { "flag": "specific — not generic", "severity": "High|Medium|Low", "evidence": "exact quote from resume", "deal_breaker": false }
  ],
  "green_flags": [
    { "flag": "specific strength", "strength": "High|Medium", "evidence": "exact quote from resume" }
  ],
  "education_assessment": {
    "score": 68,
    "institution_tier": "Tier 1|Tier 2|Tier 3|Unknown",
    "relevance": "High|Medium|Low",
    "notes": "specific — actual degree and institution"
  },
  "salary_assessment": {
    "estimated_expectation": "${seniority === "intern" ? "INR 20,000–45,000 per month" : "INR X–Y LPA"}",
    "market_fit": "Within Range|Above Range|Below Range",
    "notes": "grounded in YoE and role type"
  },
  "hiring_risks": [
    { "risk": "specific risk", "severity": "High|Medium|Low", "mitigation": "how to probe or mitigate" }
  ],
  "strengths": [
    { "title": "specific strength", "evidence": "exact quote", "impact": "High|Medium" }
  ],
  "concerns": [
    { "title": "specific gap", "evidence": "what is missing or weak", "severity": "High|Medium|Low", "deal_breaker": false }
  ],
  "interview_questions": {
    "dsa": [
      { "question": "specific to this resume/role", "difficulty": "Hard|Medium|Easy", "why_asked": "which gap this probes", "expected_points": ["key point 1", "key point 2"], "topic": "topic" }
    ],
    "core_cs": [
      { "question": "specific", "difficulty": "Hard|Medium|Easy", "why_asked": "specific gap", "expected_points": ["point1"], "topic": "OS|Networking|DBMS|System Design" }
    ],
    "project_specific": [
      { "question": "targets specific project in THIS resume", "difficulty": "Hard|Medium|Easy", "why_asked": "what claim this probes", "expected_points": ["what strong answer includes"], "references": "which project" }
    ],
    "behavioral": [
      { "question": "behavioral for specific signal", "difficulty": "Medium|Easy", "why_asked": "specific concern", "expected_points": ["STAR element"], "framework": "STAR" }
    ]
  },
  "next_steps": {
    "action": "Phone Screen|Technical Round|Reject|Request More Info",
    "timeline": "Within X business days",
    "focus_areas": ["specific verification point from THIS resume"],
    "interviewer_recommendation": "who should interview and why"
  },
  "how_to_become_hire": [
    { "action": "specific gap to close", "impact": "High|Medium|Low", "effort": "High|Medium|Low", "timeline": "X months" }
  ],
  "promotion_potential": {
    "score": 60,
    "timeline": "e.g. 18-24 months to next level",
    "evidence": "specific resume trajectory signal",
    "ceiling": "specific limitation"
  },
  "candidate_dna": {
    "ownership": 60, "ownership_evidence": "specific evidence or NONE FOUND",
    "innovation": 55, "innovation_evidence": "specific evidence or NONE FOUND",
    "adaptability": 65, "adaptability_evidence": "specific evidence or NONE FOUND",
    "collaboration": 60, "collaboration_evidence": "specific evidence or NONE FOUND",
    "leadership_potential": 45, "leadership_evidence": "specific evidence or NONE FOUND",
    "learning_velocity": 75, "learning_evidence": "specific evidence or NONE FOUND",
    "faang_readiness": 50, "faang_readiness_notes": "what they have and specifically lack for FAANG",
    "startup_readiness": 65, "startup_readiness_notes": "what they have and lack for startup",
    "strength_zones": ["strongest area from resume"],
    "development_areas": ["area needing most growth"]
  },
  "recruiter_mode_analysis": {
    "faang":   { "verdict": "REJECT|HOLD|SHORTLIST", "reasoning": "FAANG bar assessment", "key_concern": "biggest FAANG gap" },
    "startup": { "verdict": "REJECT|HOLD|SHORTLIST", "reasoning": "shipping ability assessment", "key_concern": "biggest startup gap" },
    "product": { "verdict": "REJECT|HOLD|SHORTLIST", "reasoning": "product sense check", "key_concern": "biggest product gap" },
    "service": { "verdict": "REJECT|HOLD|SHORTLIST", "reasoning": "delivery check", "key_concern": "biggest service gap" }
  },
  "missing_keywords": {
    "critical": ["JD keyword completely absent"],
    "important": ["keyword2"],
    "nice_to_have": ["keyword3"]
  },
  "jd_heatmap": [
    { "jd_requirement": "specific requirement", "coverage": "Full|Partial|None", "resume_evidence": "what addresses it or MISSING" }
  ],
  "shortlist_summary": "2-3 honest sentences about THIS candidate — specific, evidence-based, not templated. Reference actual resume content.",
  "ats_private_note": "Private recruiter note. First person, past tense. 2 sentences max. Blunt and honest.",
  "improvement_roadmap": [
    { "priority": "High|Medium|Low", "action": "specific action", "timeline": "X months", "impact_on_score": "+X points" }
  ]
}`,
        },
      ],
      max_tokens: 4500,
      temperature: 0.12,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Groq API ${res.status}`);
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from AI");
  return extractJSON(raw);
}

// ── Debate committee (distinct evaluation lenses, honest independent scoring) ──
async function runDebate(
  evidence: any, jd: string, resume: string,
  title: string, seniority: string, mainScore: number
): Promise<Record<string, any>> {
  const calls = Object.entries(DEBATE_PERSONAS).map(async ([key, p]) => {
    try {
      const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{
            role: "user",
            content: `${p.tone}

CONTEXT: A separate neutral analysis scored this ${seniority} candidate ${mainScore}/100. You may agree, disagree, or land close to it — score honestly from your own persona's evaluation lens and the evidence below. Do not anchor to the neutral score; if your lens genuinely sees it differently, say so and justify with evidence.

Your response should reflect your persona's distinct priorities, not a forced number.

ROLE: ${title || "Software Engineer"}
SENIORITY: ${seniority}

KEY EVIDENCE:
${JSON.stringify({ skills: evidence?.resume_shows?.skills_with_evidence?.slice(0,4), projects: evidence?.resume_shows?.projects?.slice(0,2), gaps: evidence?.gaps, standout: evidence?.standout_signals }, null, 2)}

JD KEY REQUIREMENTS: ${jd.slice(0, 300)}
RESUME SNAPSHOT: ${resume.slice(0, 400)}

IMPORTANT: No <think> tags. No markdown. Return ONLY valid JSON:
{
  "persona": "${key.toUpperCase().replace("_", " ")}",
  "score": 0,
  "verdict": "SHORTLIST|HOLD|REJECT",
  "vote": "HIRE|HOLD|REJECT",
  "confidence": 70,
  "bottom_line": "1-2 sentences — your honest take as this specific persona",
  "strongest_signal": "single most important signal — specific, evidence-based",
  "biggest_concern": "your primary concern — specific, evidence-based",
  "supporting_evidence": ["point with evidence", "point 2", "point 3"],
  "honest_concern": "thing you are genuinely worried about",
  "what_saves_them": "what prevents clear reject/shortlist",
  "what_would_change_vote": ["specific action 1", "specific action 2"],
  "verdict_reasoning": "1-2 sentences connecting score to verdict"
}`,
          }],
          max_tokens: 700,
          temperature: 0.40,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content;
      return [key, raw ? extractJSON(raw) : null];
    } catch {
      return [key, null];
    }
  });

  const results = await Promise.all(calls);
  return Object.fromEntries(results.filter(([, v]) => v !== null));
}

// ══════════════════════════════════════════════════════════════════
// MAIN POST HANDLER
// ══════════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const { jd, resume, candidateName, jobTitle, jobDescription, recruiterMode } = await req.json();

    const jdClean     = (jd || jobDescription || "").trim();
    const resumeClean = (resume || "").trim();
    const nameClean   = (candidateName || "Unknown Candidate").trim();
    const titleClean  = (jobTitle || "").trim();
    const mode        = ((recruiterMode || "faang") as string).toLowerCase();

    // ── Input validation ──
    if (jdClean.length < 80) {
      return NextResponse.json({ error: "insufficient_jd", message: "Job description too short (min 80 chars).", decision: "INSUFFICIENT_DATA", decision_confidence: 0, ats_match_score: 0, overall_fit: 0 }, { status: 400 });
    }
    if (resumeClean.length < 80) {
      return NextResponse.json({ error: "insufficient_resume", message: "Resume too short (min 80 chars).", decision: "INSUFFICIENT_DATA", decision_confidence: 0, ats_match_score: 0, overall_fit: 0 }, { status: 400 });
    }

    // ── Detect seniority and calibration ──
    const seniority = detectSeniority(jdClean, titleClean);
    const cal       = CALIBRATION[seniority];
    const sysPrompt = buildSystemPrompt(mode, seniority, cal);

    // ── Step 1: Evidence extraction (cold, unbiased) ──
    const evidence = await extractEvidence(jdClean, resumeClean, titleClean);

    // ── Step 2: Score from evidence ──
    const parsed = await scoreFromEvidence(evidence, jdClean, resumeClean, titleClean, seniority, cal, sysPrompt);

    // ── Post-processing: semantic keyword fix ──
    if (parsed.must_have_skills?.missing) {
      const stillMissing: string[] = [];
      const nowPresent: string[]   = [...(parsed.must_have_skills.present || [])];
      for (const kw of parsed.must_have_skills.missing) {
        if (semanticMatch(kw, resumeClean)) {
          nowPresent.push(kw);
        } else {
          stillMissing.push(kw);
        }
      }
      parsed.must_have_skills.missing  = stillMissing;
      parsed.must_have_skills.present  = [...new Set(nowPresent)];
      const total = (parsed.must_have_skills.required || []).length;
      if (total > 0) parsed.must_have_skills.match_percent = Math.round((nowPresent.length / total) * 100);
    }

    // ── Post-processing: recompute overall_fit from the weighted breakdown ──
    // Never trust a freestanding overall_fit number — derive it from the
    // per-category weighted_contribution values the model itself produced,
    // so the score is always auditable and never drifts from its own math.
    if (parsed.score_breakdown) {
      const computedFit = Object.values(parsed.score_breakdown).reduce(
        (sum: number, cat: any) => sum + (Number(cat?.weighted_contribution) || 0),
        0
      );
      if (Math.abs(computedFit - (parsed.overall_fit ?? 0)) > 3) {
        console.warn(
          `[recruiter-analysis] overall_fit mismatch — model said ${parsed.overall_fit}, weighted breakdown sums to ${computedFit}. Using weighted sum.`
        );
      }
      parsed.overall_fit = Math.round(computedFit);
    }

    // ── Post-processing: enforce decision-score consistency ──
    const fit = parsed.overall_fit ?? 0;
    if (fit < cal.hold)          parsed.decision = "REJECT";
    else if (fit < cal.shortlist) parsed.decision = "HOLD";
    else                          parsed.decision = "SHORTLIST";

    // ── Intern salary fix ──
    if (seniority === "intern" && parsed.salary_assessment) {
      const s = parsed.salary_assessment.estimated_expectation ?? "";
      if (/lpa/i.test(s) && !/month|stipend/i.test(s)) {
        parsed.salary_assessment.estimated_expectation = "INR 20,000–50,000 per month";
        parsed.salary_assessment.notes = "Intern stipend range for software engineering roles in India (NCR). Monthly, not annual.";
      }
    }

    // ── Step 3: Debate committee (parallel) ──
    const debateResults = await runDebate(evidence, jdClean, resumeClean, titleClean, seniority, fit);

    // ── Committee consensus ──
    const votes    = Object.values(debateResults).map((d: any) => d?.vote || d?.verdict).filter(Boolean);
    const hireVotes = votes.filter((v) => v === "HIRE" || v === "SHORTLIST").length;
    const rejectVotes = votes.filter((v) => v === "REJECT").length;
    const holdVotes = votes.filter((v) => v === "HOLD").length;

    const committeeDecision =
      hireVotes   >= Math.ceil(votes.length * 0.6) ? "SHORTLIST" :
      rejectVotes >= Math.ceil(votes.length * 0.6) ? "REJECT"    : "HOLD";

    const committeeScores = Object.values(debateResults)
      .map((d: any) => typeof d?.score === "number" ? d.score : null)
      .filter((s): s is number => s !== null);
    const committeeAvgScore = committeeScores.length
      ? Math.round(committeeScores.reduce((a, b) => a + b, 0) / committeeScores.length)
      : fit;

    // ── DNA Profile: use the AI's own evidence-grounded candidate_dna ──
    // scoreFromEvidence already returns a full candidate_dna object with
    // per-trait scores AND evidence citations. Use that directly instead of
    // recomputing generic fallback numbers. Only synthesize a fallback if
    // the model genuinely omitted the field.
    const dna = parsed.candidate_dna ?? {
      ownership: 0, ownership_evidence: "Not returned by model",
      innovation: 0, innovation_evidence: "Not returned by model",
      adaptability: 0, adaptability_evidence: "Not returned by model",
      collaboration: 0, collaboration_evidence: "Not returned by model",
      leadership_potential: 0, leadership_evidence: "Not returned by model",
      learning_velocity: 0, learning_evidence: "Not returned by model",
      faang_readiness: 0, faang_readiness_notes: "Not returned by model",
      startup_readiness: 0, startup_readiness_notes: "Not returned by model",
      strength_zones: [], development_areas: [],
    };
    if (!parsed.candidate_dna) {
      console.warn("[recruiter-analysis] Model omitted candidate_dna — using empty fallback. Check max_tokens / prompt compliance.");
    }

    // ── Assemble final response ──
    const finalResponse = {
      ...parsed,
      seniority_detected:    seniority,
      evidence_extracted:    evidence,
      debate_analysis:       debateResults,
      committee_decision:    committeeDecision,
      committee_avg_score:   committeeAvgScore,
      committee_vote_breakdown: { hire: hireVotes, hold: holdVotes, reject: rejectVotes, total: votes.length },
      dna_profile:           dna,
    };

    // ── Supabase save ──
    try {
      const { data: candidate } = await supabase
        .from("candidates")
        .insert({ name: nameClean, clerk_user_id: "anonymous_user" })
        .select().single();
      if (candidate?.id) {
        await supabase.from("analyses").insert({
          candidate_id:    candidate.id,
          job_description: jdClean.slice(0, 500),
          final_verdict:   finalResponse.committee_decision ?? null,
          full_report:     finalResponse,
        });
      }
    } catch (dbErr) {
      console.error("[candidate] Supabase save failed:", dbErr);
    }

    return NextResponse.json(finalResponse);

  } catch (e: any) {
    console.error("[candidate-analysis] Error:", e.message);
    return NextResponse.json(
      { error: e.message || "Analysis failed.", decision: "ERROR", decision_confidence: 0, ats_match_score: 0, overall_fit: 0 },
      { status: 500 }
    );
  }
}
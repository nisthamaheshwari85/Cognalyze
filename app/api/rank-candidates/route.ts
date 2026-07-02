import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { groqFetch } from "@/lib/groq";

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

function stripThink(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

function extractJSON(raw: string): any {
  const clean = stripThink(raw)
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON object found");
  const slice = clean.slice(s, e + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return JSON.parse(
      slice
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    );
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function detectSeniority(text: string): "intern" | "junior" | "mid" | "senior" | "staff" {
  if (/intern|internship|trainee|co.?op|apprentice/i.test(text)) return "intern";
  if (/staff|principal|distinguished|fellow/i.test(text)) return "staff";
  if (/senior|sr\.|lead|architect|director/i.test(text)) return "senior";
  if (/mid.?level|3.?[-–].?6\s*year/i.test(text)) return "mid";
  return "junior";
}

// ═══════════════════════════════════════════════════════════════════
// SENIORITY-AWARE CALIBRATION
// ═══════════════════════════════════════════════════════════════════

const CAL = {
  intern: {
    shortlist: 58, hold: 42,
    w: { skills: 0.28, projects: 0.40, experience: 0.06, education: 0.14, achievements: 0.12 },
    salary: "INR 20,000–50,000/month (stipend)",
    notes: "Students — penalize ZERO for no work experience. Projects + DSA + learning velocity are the signals.",
  },
  junior: {
    shortlist: 62, hold: 46,
    w: { skills: 0.28, projects: 0.30, experience: 0.20, education: 0.12, achievements: 0.10 },
    salary: "INR 4–8 LPA",
    notes: "Light experience expected. Projects and fundamentals are primary signal.",
  },
  mid: {
    shortlist: 65, hold: 50,
    w: { skills: 0.25, projects: 0.22, experience: 0.35, education: 0.08, achievements: 0.10 },
    salary: "INR 12–22 LPA",
    notes: "Experience + depth + real impact required.",
  },
  senior: {
    shortlist: 68, hold: 54,
    w: { skills: 0.22, projects: 0.15, experience: 0.42, education: 0.05, achievements: 0.16 },
    salary: "INR 25–45 LPA",
    notes: "System design, leadership, measurable scale required.",
  },
  staff: {
    shortlist: 72, hold: 58,
    w: { skills: 0.18, projects: 0.12, experience: 0.48, education: 0.05, achievements: 0.17 },
    salary: "INR 50–90 LPA",
    notes: "Cross-team impact, architecture decisions, org-level influence required.",
  },
} as const;

type Seniority = keyof typeof CAL;

// ═══════════════════════════════════════════════════════════════════
// SEMANTIC KEYWORD MAP
// ═══════════════════════════════════════════════════════════════════

const SEMANTIC_MAP: Record<string, RegExp[]> = {
  "data structures and algorithms": [/dsa/i, /leetcode/i, /competitive.?programming/i, /solved.{0,10}\d+.{0,10}(problem|question)/i, /codeforces/i, /codechef/i, /hackerrank/i, /striver/i, /neetcode/i, /binary.?search/i, /dynamic.?programming/i],
  "rest apis":     [/rest.?api/i, /restful/i, /api.?integration/i, /axios/i, /fetch.?api/i, /express/i, /fastapi/i, /flask/i, /http.?endpoint/i, /backend.?api/i],
  "databases":     [/mysql/i, /mongodb/i, /postgresql/i, /sqlite/i, /supabase/i, /firebase/i, /redis/i, /nosql/i, /prisma/i, /mongoose/i],
  "cloud":         [/aws/i, /azure/i, /gcp/i, /ec2/i, /s3\b/i, /lambda/i, /vercel/i, /netlify/i, /heroku/i, /docker/i, /kubernetes/i],
  "system design": [/microservice/i, /distributed/i, /load.?balanc/i, /cach/i, /kafka/i, /message.?queue/i, /architect/i],
};

function semanticPresent(kw: string, text: string): boolean {
  if (text.toLowerCase().includes(kw.toLowerCase())) return true;
  const patterns = SEMANTIC_MAP[kw.toLowerCase()];
  return patterns ? patterns.some((p) => p.test(text)) : false;
}

// ═══════════════════════════════════════════════════════════════════
// MASTER SYSTEM PROMPT — 9-Person Hiring Committee
// ═══════════════════════════════════════════════════════════════════

const MASTER_PROMPT = `You are an Enterprise Hiring Intelligence System replicating the exact hiring process used by Google, Meta, Amazon, Microsoft, OpenAI, Anthropic, Stripe, and Databricks.

You are a complete 9-person hiring committee operating simultaneously:
1. Senior Technical Recruiter (30+ years, 50,000+ resumes reviewed)
2. Hiring Manager (owns team productivity and delivery)
3. Engineering Director (evaluates long-term technical trajectory)
4. Technical Interview Panel (evaluates code quality and CS fundamentals)
5. AI/ML Domain Expert (evaluates AI/ML depth and research awareness)
6. HR Business Partner (evaluates culture, communication, retention risk)
7. Compensation Specialist (evaluates market fit and offer strategy)
8. Behavioral Psychologist (evaluates ownership, resilience, collaboration)
9. Talent Intelligence Analyst (evaluates market benchmarks and percentile)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOU ARE NOT AN ATS KEYWORD MATCHER.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You evaluate the WHOLE candidate across 11 dimensions:
→ Technical competence (languages, frameworks, AI/ML, cloud, DSA, system design)
→ Practical experience (internships, production deployments, ownership, startup work)
→ Project quality (originality, complexity, measurable impact, real deployment)
→ Education (degree relevance, CGPA as minor signal only, certifications)
→ Leadership (team leadership, mentoring, hackathons, community contributions)
→ Learning velocity (upskilling speed, tech adoption, growth trajectory)
→ Communication (resume clarity, documentation quality, collaboration signals)
→ Career growth (progression consistency, increasing responsibility)
→ Cultural fit (ownership mindset, accountability, curiosity)
→ Future potential (adaptability ceiling, leadership trajectory)
→ Logistics (location fit, salary alignment, availability)

FAIRNESS MANDATE — STRICTLY IGNORE:
College prestige, gender, name, photo, resume design, age, religion, nationality.
Evaluate ONLY: demonstrated skills, project evidence, measurable impact, growth signals.

CALIBRATED SCORING (internalized from 30 years of real hiring committees):
• 88–100 : Exceptional. Competing offers from FAANG. Seen 1 in 100 candidates.
• 75–87  : Strong. Would personally fight for them in committee. 1 in 10.
• 62–74  : SHORTLIST. Clear evidence they can do the job well.
• 48–61  : HOLD. Potential exists but key gaps need interview validation.
• 32–47  : HOLD leaning REJECT. Missing fundamentals or critical evidence.
• 15–31  : REJECT. Clearly underqualified for this specific role.
• Under 15: REJECT. Wrong role entirely.

SCORE DIFFERENTIATION IS MANDATORY:
It is statistically impossible for two different resumes to produce identical scores.
If candidate A and candidate B have different projects, skills, and experience — their scores MUST differ.
Identical scores = assessment failure. Be granular: 63, 71, 58, 44 — not 60, 60, 60, 60.

INTERN/TRAINEE SPECIAL RULES:
• NEVER penalize for zero work experience — they are students.
• Primary signals: project technical depth, DSA evidence, learning velocity, tool maturity.
• "Solved 300+ DSA problems" or "LeetCode" = DSA IS PRESENT. Never mark as missing.
• MongoDB/MySQL anywhere = databases IS PRESENT. Never mark as missing.
• A student who built a full-stack AI app with real APIs + won a hackathon = strong intern.

REJECTION RULES (mandatory):
Never say "not shortlisted." Always specify:
• Which JD requirements are missing with exact resume evidence
• Which stronger candidates outperformed them and why
• A specific improvement roadmap with realistic timeline

RESPONSE DIVERSITY:
Every report is unique. No copy-paste wording across candidates.
Reference specific resume content in every field.
Write each assessment as if it was the only resume you reviewed today.

FORBIDDEN WORDS (never use):
passionate, driven, dynamic, results-oriented, exceptional, outstanding, motivated,
enthusiastic, spearheaded, leveraged, synergized, robust, scalable, seamless,
comprehensive, proficient, detail-oriented, go-getter, team player.

Return ONLY valid JSON. No markdown. No <think> tags. No text outside JSON.`;

// ═══════════════════════════════════════════════════════════════════
// GROQ API HELPER (uses groqFetch with key rotation + fallback)
// ═══════════════════════════════════════════════════════════════════

const RETRY_DELAYS = [2000, 4000, 8000]; // ms between retries on rate limit

async function groq(messages: any[], opts: { max_tokens: number; temperature: number }): Promise<string> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          max_tokens: opts.max_tokens,
          temperature: opts.temperature,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error?.message || `Groq API ${res.status}`;
        // If rate-limited and we have retries left, wait and retry
        if ((res.status === 429 || errMsg.includes("Rate limit") || errMsg.includes("rate limit")) && attempt < RETRY_DELAYS.length) {
          console.warn(`[rank-candidates] Rate limited (attempt ${attempt + 1}), retrying in ${RETRY_DELAYS[attempt]}ms...`);
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          lastError = new Error(errMsg);
          continue;
        }
        throw new Error(errMsg);
      }
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty Groq response");
      return content;
    } catch (err: any) {
      lastError = err;
      if ((err.message?.includes("Rate limit") || err.message?.includes("rate limit") || err.message?.includes("429")) && attempt < RETRY_DELAYS.length) {
        console.warn(`[rank-candidates] Error with rate limit (attempt ${attempt + 1}), retrying in ${RETRY_DELAYS[attempt]}ms...`);
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error("All retry attempts failed");
}

// Small delay helper to prevent TPM exhaustion between sequential calls
function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 1 — Parse resume into structured evidence (temperature 0.0)
// Pure extraction, zero evaluation, zero inference
// ═══════════════════════════════════════════════════════════════════

async function parseResume(id: string, text: string, jd: string, title: string): Promise<any> {
  try {
    const raw = await groq([
      {
        role: "system",
        content: `You are a strict evidence extractor. Extract ONLY what is explicitly stated in the resume.
DO NOT evaluate, score, infer, or assume anything.
DO NOT say "probably" or "likely" — state facts only.

SEMANTIC EXTRACTION RULES (apply these exactly):
• Any of these → dsa_present: true: "solved X problems", "LeetCode", "HackerRank", "competitive programming", "Codeforces", "CodeChef", "Striver", "NeetCode", DSA, algorithms
• MongoDB OR MySQL OR PostgreSQL OR SQLite OR Supabase OR Firebase anywhere → databases_present: true
• Any project with both frontend (React/Next.js/HTML) AND backend (Node/Express/API) → rest_api_likely: true
• Skills listed in a Skills section = valid evidence (skill IS known)
• Hackathon placement/win = leadership_signal AND achievement
• Multiple projects in different tech stacks = adaptability signal

Return ONLY valid JSON, no markdown.`,
      },
      {
        role: "user",
        content: `ROLE: ${title}
JD REQUIREMENTS: ${jd.slice(0, 500)}

RESUME:
${text.slice(0, 2200)}

Return ONLY:
{
  "candidate_id": "${id}",
  "extracted_name": "full name from resume header or Unknown",
  "skills_with_evidence": [
    {"skill": "React", "evidence": "Built Cognalyze using Next.js and TypeScript — listed in Projects section"}
  ],
  "skills_listed_no_project_evidence": ["Python — listed in skills but no project uses it"],
  "experience_years": "0 (student) or X years",
  "companies": ["company name and role"],
  "projects": [
    {
      "name": "Cognalyze",
      "tech_stack": ["Next.js", "MongoDB", "TypeScript", "Groq API"],
      "complexity": "High",
      "has_quantified_metrics": false,
      "description": "AI-powered career intelligence platform with resume analysis and mock interviews",
      "is_ai_ml": true,
      "is_deployed": false
    }
  ],
  "quantified_achievements": ["improved website performance by 25% (Web Dev Intern, ABC Technologies)"],
  "dsa_present": false,
  "dsa_evidence": "Solved 300+ DSA problems — stated in Achievements section",
  "databases_present": false,
  "rest_api_likely": false,
  "leadership_signals": ["Top 10 in College Hackathon — stated in Achievements"],
  "certifications": ["Google AI Essentials", "Introduction to Machine Learning - Coursera"],
  "education": "B.Tech CSE (AI & ML), ABES Engineering College, CGPA 8.5/10",
  "institution_name": "ABES Engineering College",
  "cgpa": "8.5",
  "standout_signals": ["Built full-stack AI platform Cognalyze with Next.js + Groq API as a student — high complexity for intern level"],
  "obvious_jd_gaps": ["no cloud platform experience mentioned", "no system design projects"],
  "resume_quality": "High",
  "total_word_count": 0
}`,
      },
    ], { max_tokens: 1100, temperature: 0.0 });

    return extractJSON(raw);
  } catch (err: any) {
    console.error(`[rank-candidates] parseResume failed for candidate ${id}:`, err);
    return { candidate_id: id, extracted_name: "Parse Failed", parse_error: true, parse_error_details: err?.message || String(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 2 — Score from evidence (temperature 0.18)
// Evidence-first scoring with weighted math enforced server-side
// ═══════════════════════════════════════════════════════════════════

async function scoreCandidate(
  evidence: any,
  resumeText: string,
  jd: string,
  title: string,
  seniority: Seniority,
  poolNames: string[]
): Promise<any> {
  const cal = CAL[seniority];
  const id  = evidence.candidate_id;
  const name = evidence.extracted_name || "Unknown";

  try {
    const raw = await groq([
      { role: "system", content: MASTER_PROMPT },
      {
        role: "user",
        content: `Score this ${seniority.toUpperCase()} candidate for: "${title}"

CANDIDATE: ${name} (1 of ${poolNames.length} candidates being evaluated)
POOL CONTEXT: [${poolNames.slice(0, 8).join(", ")}${poolNames.length > 8 ? "..." : ""}]

━━━ SCORING WEIGHTS (${seniority.toUpperCase()} role) ━━━
Skills:       ${Math.round(cal.w.skills * 100)}%
Projects:     ${Math.round(cal.w.projects * 100)}%
Experience:   ${Math.round(cal.w.experience * 100)}%
Education:    ${Math.round(cal.w.education * 100)}%
Achievements: ${Math.round(cal.w.achievements * 100)}%

SHORTLIST threshold: ${cal.shortlist}/100
HOLD threshold:      ${cal.hold}/100
${cal.notes}

━━━ PRE-EXTRACTED EVIDENCE (objective — score from THIS) ━━━
${JSON.stringify(evidence, null, 2)}

━━━ ORIGINAL RESUME (for exact quotes) ━━━
${resumeText.slice(0, 900)}

━━━ JD ━━━
${jd.slice(0, 600)}

MANDATORY SCORING RULES:
1. Score each dimension independently FIRST. Compute overall_fit as weighted average LAST.
2. NEVER decide SHORTLIST/HOLD/REJECT before computing scores — let scores drive verdict.
3. Scores must be integers. Be granular: 63, 71, 44 — not 60, 60, 60.
4. If dsa_present=true → DSA is NOT a missing skill. If databases_present=true → databases NOT missing.
5. Every strength/concern/flag must quote specific evidence from THIS resume.
6. recruiter_summary must be specific to THIS person — not reusable for any other candidate.
7. ${seniority === "intern" ? "This is an intern role. Experience score should be 0–25 range. Projects + skills dominate." : seniority === "senior" ? "Senior role. Experience + system design + scale dominate." : "Balance skills, projects, and experience."}

Return ONLY this JSON:
{
  "candidate_id": "${id}",
  "name": "${name}",
  "overall_fit": 0,
  "ats_match_score": 0,
  "decision": "SHORTLIST|HOLD|REJECT",
  "decision_confidence": 0,
  "score_breakdown": {
    "technical_skills": {
      "score": 0,
      "weight": ${Math.round(cal.w.skills * 100)},
      "weighted_contribution": 0,
      "notes": "specific evidence — e.g. JavaScript, React, Next.js, MongoDB listed with project usage in Cognalyze"
    },
    "projects": {
      "score": 0,
      "weight": ${Math.round(cal.w.projects * 100)},
      "weighted_contribution": 0,
      "notes": "specific project quality note — e.g. Cognalyze is full-stack AI app; Smart Resume Builder has PDF generation"
    },
    "experience": {
      "score": 0,
      "weight": ${Math.round(cal.w.experience * 100)},
      "weighted_contribution": 0,
      "notes": "specific note — e.g. 3-month internship at ABC Technologies; no production role history"
    },
    "education": {
      "score": 0,
      "weight": ${Math.round(cal.w.education * 100)},
      "weighted_contribution": 0,
      "notes": "specific note — e.g. B.Tech CSE AI&ML, ABES Engineering College, CGPA 8.5"
    },
    "achievements": {
      "score": 0,
      "weight": ${Math.round(cal.w.achievements * 100)},
      "weighted_contribution": 0,
      "notes": "specific note — e.g. Top 10 hackathon, 300+ DSA problems, Google AI Essentials cert"
    }
  },
  "technical_score": 0,
  "project_score": 0,
  "experience_score": 0,
  "education_score": 0,
  "achievement_score": 0,
  "leadership_score": 0,
  "communication_score": 0,
  "culture_score": 0,
  "learning_potential": 0,
  "future_potential": 0,
  "strengths": [
    {"title": "specific strength title", "evidence": "exact resume quote or observation", "impact": "High|Medium"}
  ],
  "concerns": [
    {"title": "specific concern", "evidence": "what is missing or insufficient", "severity": "High|Medium|Low", "deal_breaker": false}
  ],
  "red_flags": [
    {"flag": "specific — not generic", "severity": "High|Medium|Low", "evidence": "exact observation from resume"}
  ],
  "green_flags": [
    {"flag": "specific strength signal", "strength": "High|Medium", "evidence": "exact resume evidence"}
  ],
  "missing_skills": ["skill from JD with ZERO evidence in resume — after applying semantic rules"],
  "unique_advantage": "what makes THIS candidate stand out from others in the pool — specific and evidence-based",
  "standout_factor": "single most impressive thing about this candidate — must be specific",
  "deal_breaker": "NONE or specific deal breaker with evidence",
  "candidate_percentile": "Top X% — calibrated honestly vs real ${seniority} candidates",
  "preliminary_verdict": "2 honest sentences — specific to THIS person, not reusable template",
  "recruiter_summary": "3 sentences written as a senior recruiter's private committee note. Specific to this resume. Evidence-based. Blunt.",
  "improvement_roadmap": [
    {"priority": "High|Medium|Low", "action": "specific skill or experience to build", "timeline": "X months", "impact": "High|Medium|Low"}
  ],
  "interview_focus": ["specific thing to probe in interview — tied to a claim or gap in THIS resume"],
  "offer_probability": 0,
  "promotion_potential": 0,
  "salary_expectation": "${CAL[seniority].salary}",
  "location_compatibility": "High|Medium|Low|Unknown",
  "availability": "Immediate|Notice period X weeks|Unknown"
}`,
      },
    ], { max_tokens: 2000, temperature: 0.18 });

    const parsed = extractJSON(raw);
    const bd = parsed.score_breakdown || {};

    // ── Server-side weighted math (source of truth) ──
    const skillScore = clamp(bd.technical_skills?.score ?? 0, 0, 100);
    const projScore  = clamp(bd.projects?.score          ?? 0, 0, 100);
    const expScore   = clamp(bd.experience?.score        ?? 0, 0, 100);
    const eduScore   = clamp(bd.education?.score         ?? 0, 0, 100);
    const achScore   = clamp(bd.achievements?.score      ?? 0, 0, 100);

    const computedFit = clamp(
      skillScore  * cal.w.skills   +
      projScore   * cal.w.projects +
      expScore    * cal.w.experience +
      eduScore    * cal.w.education  +
      achScore    * cal.w.achievements,
      5, 97
    );

    // Use computed if model drifted >8 points
    if (Math.abs((parsed.overall_fit || 0) - computedFit) > 8) {
      parsed.overall_fit = computedFit;
    }
    parsed.overall_fit = clamp(parsed.overall_fit || computedFit, 5, 97);

    // Fill flat score fields for frontend mapping
    parsed.technical_score  = skillScore;
    parsed.project_score    = projScore;
    parsed.experience_score = expScore;
    parsed.education_score  = eduScore;
    parsed.achievement_score = achScore;

    // Update weighted_contribution fields
    bd.technical_skills.weighted_contribution = Math.round(skillScore * cal.w.skills);
    bd.projects.weighted_contribution         = Math.round(projScore  * cal.w.projects);
    bd.experience.weighted_contribution       = Math.round(expScore   * cal.w.experience);
    bd.education.weighted_contribution        = Math.round(eduScore   * cal.w.education);
    bd.achievements.weighted_contribution     = Math.round(achScore   * cal.w.achievements);

    // ── Decision from score (server-side, not LLM) ──
    const fit = parsed.overall_fit;
    parsed.decision =
      fit >= cal.shortlist ? "SHORTLIST" :
      fit >= cal.hold      ? "HOLD"      : "REJECT";

    parsed.candidate_id = id; // Ensure ID is never mutated/lost by LLM drift
    return parsed;
  } catch (err: any) {
    return {
      candidate_id: id,
      name,
      overall_fit: 0,
      technical_score: 0, project_score: 0, experience_score: 0,
      education_score: 0, achievement_score: 0,
      decision: "ERROR",
      error: err.message,
      score_breakdown: {
        technical_skills: { score: 0, weight: Math.round(cal.w.skills*100), weighted_contribution: 0, notes: "Score failed" },
        projects:         { score: 0, weight: Math.round(cal.w.projects*100), weighted_contribution: 0, notes: "Score failed" },
        experience:       { score: 0, weight: Math.round(cal.w.experience*100), weighted_contribution: 0, notes: "Score failed" },
        education:        { score: 0, weight: Math.round(cal.w.education*100), weighted_contribution: 0, notes: "Score failed" },
        achievements:     { score: 0, weight: Math.round(cal.w.achievements*100), weighted_contribution: 0, notes: "Score failed" },
      },
      strengths: [], concerns: [], red_flags: [], green_flags: [],
      missing_skills: [], recruiter_summary: "Analysis failed — retry.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 3 — Deep analysis for top-N candidates (temperature 0.12)
// ═══════════════════════════════════════════════════════════════════

async function deepAnalyze(
  quick: any, evidence: any, resumeText: string,
  jd: string, title: string, seniority: Seniority,
  rank: number, mode: string
): Promise<any> {
  const modeCtx: Record<string, string> = {
    faang:   "Google/Meta/Amazon bar. Evaluate: CS fundamentals depth, system design awareness, code quality signals, FAANG bar calibration.",
    startup: "Series B startup bar. Evaluate: shipping speed, ownership, independent debugging, full-stack capability, day-one contribution.",
    product: "Product role bar. Evaluate: product sense, user empathy, metric-driven thinking, cross-functional leadership.",
    service: "IT services bar. Evaluate: delivery track record, client management ability, technical breadth, domain adaptability.",
  };

  try {
    const raw = await groq([
      {
        role: "system",
        content: `${MASTER_PROMPT}

RECRUITER MODE: ${modeCtx[mode] || modeCtx.faang}

This is a DEEP ANALYSIS for the #${rank} ranked candidate.
Every single field must contain specific evidence from THIS resume.
This report must read as independently written — no template language, no copy-paste across candidates.`,
      },
      {
        role: "user",
        content: `DEEP ANALYSIS — Rank #${rank} | ${title} | ${seniority.toUpperCase()}

QUICK SCORE (already computed — do not change overall_fit or decision):
Overall: ${quick.overall_fit}/100 | Decision: ${quick.decision}
Skills: ${quick.technical_score} | Projects: ${quick.project_score} | Experience: ${quick.experience_score}
Top strength: ${(quick.strengths || [])[0]?.evidence || "N/A"}
Top concern: ${(quick.concerns  || [])[0]?.evidence || "N/A"}

PARSED EVIDENCE:
${JSON.stringify(evidence, null, 2)}

RESUME:
${resumeText.slice(0, 1300)}

JD:
${jd.slice(0, 600)}

Return ONLY JSON:
{
  "candidate_id": "${quick.candidate_id}",
  "name": "${quick.name}",
  "overall_rank": ${rank},
  "must_have_skills": {
    "required": ["JS", "React", "Node.js", "DSA", "REST APIs", "databases", "Git"],
    "present": ["skills from required with evidence — apply semantic rules: DSA present if dsa_present=true"],
    "missing": ["skills from required with ZERO evidence anywhere"],
    "match_percent": 0
  },
  "skills_matrix": [
    {"skill": "React", "candidate_proficiency": 70, "required_level": 80, "evidence": "specific", "gap": "Low|Medium|High|None"}
  ],
  "interview_questions": {
    "dsa": [
      {"question": "specific to gaps in THIS resume", "difficulty": "Hard|Medium|Easy", "why_asked": "specific gap this probes", "expected_points": ["point1", "point2"], "topic": "Arrays|Trees|DP|Graphs|etc"}
    ],
    "project_specific": [
      {"question": "about a SPECIFIC project from THIS resume", "difficulty": "Hard|Medium|Easy", "why_asked": "what unverified claim this probes", "expected_points": ["what strong answer covers"], "references": "project name"}
    ],
    "behavioral": [
      {"question": "STAR question for a specific signal in this resume", "why_asked": "specific concern", "expected_points": ["STAR element"], "framework": "STAR"}
    ],
    "core_cs": [
      {"question": "CS fundamentals gap from evidence", "difficulty": "Hard|Medium|Easy", "why_asked": "gap identified", "expected_points": ["point1"], "topic": "OS|DBMS|Networking|System Design"}
    ]
  },
  "candidate_dna": {
    "ownership": 0,         "ownership_evidence": "specific evidence or NONE FOUND",
    "innovation": 0,        "innovation_evidence": "specific evidence or NONE FOUND",
    "adaptability": 0,      "adaptability_evidence": "specific evidence or NONE FOUND",
    "learning_velocity": 0, "learning_evidence": "specific evidence or NONE FOUND",
    "leadership_potential": 0, "leadership_evidence": "specific evidence or NONE FOUND",
    "communication": 0,     "communication_evidence": "resume clarity + collaboration signals",
    "culture_fit": 0,       "culture_evidence": "specific behavioral signals",
    "faang_readiness": 0,   "faang_notes": "what they have and specifically lack for FAANG bar",
    "startup_readiness": 0, "startup_notes": "what they have and lack for startup environment"
  },
  "hiring_risks": [
    {"risk": "specific risk", "severity": "High|Medium|Low", "mitigation": "how to probe or de-risk in interview"}
  ],
  "salary_assessment": {
    "expectation": "${CAL[seniority].salary}",
    "market_fit": "Within Range|Above Range|Below Range",
    "negotiation_notes": "specific — based on their experience level and market"
  },
  "next_steps": {
    "action": "Phone Screen|Technical Round|System Design Round|Reject|Immediate Offer",
    "timeline": "Within X business days",
    "focus_areas": ["specific thing to verify in THIS resume"],
    "interviewer_recommendation": "who should interview and specifically why"
  },
  "promotion_potential": {
    "score": 0,
    "timeline": "X months to next level",
    "trajectory_evidence": "specific resume signal showing growth potential",
    "ceiling": "what limits their long-term growth based on current evidence"
  },
  "comparative_note": "How THIS candidate compares to the ranked pool — specific differences, not generic praise or criticism"
}`,
      },
    ], { max_tokens: 2200, temperature: 0.12 });

    const parsed = extractJSON(raw);
    parsed.candidate_id = quick.candidate_id; // Enforce ID alignment
    return parsed;
  } catch (err: any) {
    console.error(`[rank-candidates] deepAnalyze failed for candidate ${quick.candidate_id}:`, err);
    return { ...quick, overall_rank: rank, deep_analysis_error: true };
  }
}

// ═══════════════════════════════════════════════════════════════════
// STAGE 4 — Analytics (pure computation, no LLM)
// ═══════════════════════════════════════════════════════════════════

function computeAnalytics(scores: any[], seniority: Seniority, totalInput: number): any {
  const cal = CAL[seniority];
  const shortlisted = scores.filter((c) => c.decision === "SHORTLIST");
  const held        = scores.filter((c) => c.decision === "HOLD");
  const rejected    = scores.filter((c) => c.decision === "REJECT");

  const fits    = scores.map((c) => c.overall_fit || 0).filter((s) => s > 0);
  const avg     = fits.length ? Math.round(fits.reduce((a, b) => a + b, 0) / fits.length) : 0;
  const top     = fits.length ? Math.max(...fits) : 0;
  const bottom  = fits.length ? Math.min(...fits) : 0;
  const spread  = top - bottom;

  const dist = {
    "88-100": fits.filter((s) => s >= 88).length,
    "75-87":  fits.filter((s) => s >= 75 && s < 88).length,
    "62-74":  fits.filter((s) => s >= 62 && s < 75).length,
    "48-61":  fits.filter((s) => s >= 48 && s < 62).length,
    "32-47":  fits.filter((s) => s >= 32 && s < 48).length,
    "0-31":   fits.filter((s) => s < 32).length,
  };

  const gapMap: Record<string, number> = {};
  scores.forEach((c) => {
    (c.missing_skills || []).forEach((sk: string) => {
      const k = sk.toLowerCase().trim();
      gapMap[k] = (gapMap[k] || 0) + 1;
    });
  });
  const topGaps = Object.entries(gapMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([skill, count]) => ({
      skill,
      count,
      percent: `${Math.round((count / scores.length) * 100)}%`,
    }));

  const quality =
    avg >= 70 ? "Strong pool" :
    avg >= 55 ? "Average pool" :
    avg >= 40 ? "Below average pool" :
    "Weak pool";

  const insights: string[] = [
    `${scores.length} ${seniority} candidates evaluated. Pool averaged ${avg}/100 — ${quality.toLowerCase()}.`,
    `${shortlisted.length} candidates cleared the ${seniority} bar (>${cal.shortlist}). ${held.length} are borderline and need phone screen.`,
  ];
  if (topGaps[0]) insights.push(`Most common gap: "${topGaps[0].skill}" — missing in ${topGaps[0].count}/${scores.length} resumes (${topGaps[0].percent}).`);
  if (spread > 0) insights.push(`Score spread: ${bottom}–${top} (${spread} points) — ${spread > 25 ? "strong differentiation across the pool" : "candidates are clustered — consider tightening JD requirements"}.`);

  return {
    total_input:        totalInput,
    total_scored:       scores.length,
    shortlisted_count:  shortlisted.length,
    hold_count:         held.length,
    rejected_count:     rejected.length,
    shortlist_rate:     `${Math.round((shortlisted.length / Math.max(scores.length, 1)) * 100)}%`,
    average_pool_score: avg,
    top_score:          top,
    bottom_score:       bottom,
    score_spread:       spread,
    score_distribution: dist,
    hiring_funnel: {
      stage_1_received:    totalInput,
      stage_2_screened:    scores.length,
      stage_3_shortlisted: shortlisted.length + held.length,
      stage_4_advanced:    shortlisted.length,
    },
    common_skill_gaps:  topGaps,
    pool_quality:       quality,
    recruiter_insights: insights,
    recommended_action:
      shortlisted.length >= 5 ? "Proceed to technical interviews immediately — strong pipeline" :
      shortlisted.length >= 2 ? "Proceed with shortlisted + top HOLD candidates in parallel" :
      shortlisted.length === 1 ? "One strong candidate — proceed + re-evaluate top HOLDs carefully" :
      "No candidates clear bar — consider: (1) widening sourcing, (2) relaxing non-critical JD requirements, (3) promoting top HOLDs",
    top_candidate:      { name: scores[0]?.name || "N/A", score: scores[0]?.overall_fit || 0 },
  };
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSE MAPPER — frontend-ready ranked entry
// ═══════════════════════════════════════════════════════════════════

function mapToRanked(c: any, deep: any | null, idx: number): any {
  const bd  = c.score_breakdown || {};

  // Pull scores — ALWAYS from score_breakdown (never fallback to 60)
  const techScore = c.technical_score  ?? bd.technical_skills?.score ?? 0;
  const projScore = c.project_score    ?? bd.projects?.score         ?? 0;
  const expScore  = c.experience_score ?? bd.experience?.score       ?? 0;
  const eduScore  = c.education_score  ?? bd.education?.score        ?? 0;
  const achScore  = c.achievement_score ?? bd.achievements?.score    ?? 0;

  // DNA scores from deep analysis if available
  const dna = deep?.candidate_dna || {};
  const leaderScore = c.leadership_score    ?? dna.leadership_potential ?? clamp(techScore * 0.3 + achScore * 0.4 + projScore * 0.3, 0, 100);
  const commScore   = c.communication_score ?? dna.communication        ?? clamp(eduScore  * 0.3 + expScore  * 0.4 + achScore * 0.3, 0, 100);
  const cultureScore = c.culture_score      ?? dna.culture_fit          ?? clamp(techScore * 0.3 + expScore  * 0.4 + achScore * 0.3, 0, 100);
  const growthScore = c.learning_potential  ?? dna.learning_velocity    ?? clamp(projScore * 0.4 + achScore  * 0.3 + techScore * 0.3, 0, 100);
  const futureScore = c.future_potential    ?? dna.faang_readiness      ?? clamp(techScore * 0.4 + growthScore * 0.3 + leaderScore * 0.3, 0, 100);

  return {
    // ── Identity ──
    id:           c.candidate_id,
    name:         c.name,
    rank:         idx + 1,

    // ── Core scores ──
    overall_score:  c.overall_fit,
    decision:       c.decision,
    decision_confidence: c.decision_confidence ?? 70,

    // ── Verdict label for UI ──
    verdict:
      c.decision === "SHORTLIST" ? "Strong Hire" :
      c.decision === "HOLD"      ? "Lean Hire"   : "Lean Reject",

    // ── Summary text ──
    summary: c.recruiter_summary || c.preliminary_verdict || `${c.name} scored ${c.overall_fit}/100.`,

    // ── Strengths & concerns (string arrays for UI) ──
    strengths:  (c.strengths  || []).map((s: any) => (typeof s === "string" ? s : s.title)).filter(Boolean),
    weaknesses: (c.concerns   || []).map((w: any) => (typeof w === "string" ? w : w.title)).filter(Boolean),

    // ── UI Score bars (all computed from real data) ──
    scores: {
      technical:        clamp(techScore,   0, 100),
      experience:       clamp(expScore,    0, 100),
      leadership:       clamp(leaderScore, 0, 100),
      culture_fit:      clamp(cultureScore,0, 100),
      growth_potential: clamp(growthScore, 0, 100),
    },

    // ── Detailed breakdown (for expanded view) ──
    score_breakdown: {
      technical_skills: { score: techScore,  evidence: bd.technical_skills?.notes || "" },
      projects:         { score: projScore,  evidence: bd.projects?.notes          || "" },
      experience:       { score: expScore,   evidence: bd.experience?.notes        || "" },
      education:        { score: eduScore,   evidence: bd.education?.notes         || "" },
      achievements:     { score: achScore,   evidence: bd.achievements?.notes      || "" },
    },

    // ── All other fields ──
    red_flags:            c.red_flags       || [],
    green_flags:          c.green_flags     || [],
    missing_skills:       c.missing_skills  || [],
    unique_advantage:     c.unique_advantage  || "",
    standout_factor:      c.standout_factor   || "",
    deal_breaker:         c.deal_breaker      || "NONE",
    candidate_percentile: c.candidate_percentile || "",
    preliminary_verdict:  c.preliminary_verdict  || "",
    recruiter_summary:    c.recruiter_summary    || "",
    improvement_roadmap:  c.improvement_roadmap  || [],
    interview_focus:      c.interview_focus      || [],
    offer_probability:    c.offer_probability    ?? 0,
    promotion_potential:  c.promotion_potential  ?? 0,
    salary_expectation:   c.salary_expectation   || "",
    location_compatibility: c.location_compatibility || "Unknown",
    availability:         c.availability          || "Unknown",

    // ── Extended DNA scores ──
    dna_scores: {
      ownership:          clamp(dna.ownership          ?? 0, 0, 100),
      innovation:         clamp(dna.innovation         ?? 0, 0, 100),
      adaptability:       clamp(dna.adaptability       ?? 0, 0, 100),
      learning_velocity:  clamp(dna.learning_velocity  ?? 0, 0, 100),
      leadership_potential: clamp(dna.leadership_potential ?? 0, 0, 100),
      communication:      clamp(commScore,  0, 100),
      culture_fit:        clamp(cultureScore, 0, 100),
      future_potential:   clamp(futureScore, 0, 100),
      faang_readiness:    clamp(dna.faang_readiness   ?? 0, 0, 100),
      startup_readiness:  clamp(dna.startup_readiness ?? 0, 0, 100),
    },

    // ── Interview questions from deep analysis ──
    predicted_questions: [
      ...(deep?.interview_questions?.project_specific || []).map((q: any) => q.question),
      ...(deep?.interview_questions?.dsa              || []).map((q: any) => q.question),
      ...(deep?.interview_questions?.behavioral       || []).map((q: any) => q.question),
    ].filter(Boolean).slice(0, 6),

    hire_recommendation: c.standout_factor || deep?.comparative_note || "Proceed to technical screen",

    // ── Full deep analysis attached ──
    deep_analysis: deep || null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN POST HANDLER
// ═══════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  try {
    const {
      jd,
      candidates,
      jobTitle,
      jobDescription,
      recruiterMode = "faang",
      topN = 5,
    } = await req.json();

    const jdClean    = (jd || jobDescription || "").trim();
    const titleClean = (jobTitle || "").trim();
    const mode       = (recruiterMode as string).toLowerCase() as string;

    // ── Validation ──
    if (jdClean.length < 80) {
      return NextResponse.json({ error: "insufficient_jd", message: "Job description too short (min 80 chars)" }, { status: 400 });
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: "no_candidates", message: "Provide candidates array: [{id, name, resume}]" }, { status: 400 });
    }
    if (candidates.length > 50) {
      return NextResponse.json({ error: "too_many", message: "Max 50 candidates per batch. Use pagination for larger sets." }, { status: 400 });
    }

    const seniority = detectSeniority(jdClean + " " + titleClean);
    const cal       = CAL[seniority];

    // Normalize input
    const resumeList = candidates.map((r: any, i: number) => ({
      id:   (r.id   || `candidate_${i + 1}`).toString(),
      name: r.name  || `Candidate ${i + 1}`,
      text: (r.resume || r.text || "").trim(),
    }));

    const resumeMap: Record<string, string> = {};
    resumeList.forEach((r) => { resumeMap[r.id] = r.text; });

    // ─── STAGE 1: Parse all resumes (batches of 2 to avoid rate limits) ───
    const BATCH = 2;
    const parsedAll: any[] = [];
    for (let i = 0; i < resumeList.length; i += BATCH) {
      if (i > 0) await delay(800);
      const batch = resumeList.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (r) => {
          const res = await parseResume(r.id, r.text, jdClean, titleClean);
          if (res) {
            res.candidate_id = r.id; // Force alignment with original candidate ID
          }
          return res;
        })
      );
      parsedAll.push(...results);
    }
    const parsedMap: Record<string, any> = {};
    parsedAll.forEach((p) => { if (p?.candidate_id) parsedMap[p.candidate_id] = p; });

    // ─── STAGE 2: Score all candidates (batches of 2 with delay) ───
    const poolNames = parsedAll.map((p) => p.extracted_name || p.candidate_id);
    const allScores: any[] = [];

    for (let i = 0; i < parsedAll.length; i += BATCH) {
      if (i > 0) await delay(1000);
      const batch = parsedAll.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((p) => {
          if (p.parse_error || !resumeMap[p.candidate_id]?.trim()) {
            return Promise.resolve({
              candidate_id: p.candidate_id,
              name: p.extracted_name || "Unknown",
              overall_fit: 0,
              technical_score: 0, project_score: 0, experience_score: 0,
              education_score: 0, achievement_score: 0,
              decision: "REJECT",
              red_flags: [{ flag: "Resume could not be parsed or is empty", severity: "High", evidence: "No parseable content" }],
              strengths: [], concerns: [], green_flags: [], missing_skills: [],
              recruiter_summary: "Resume was empty or could not be parsed.",
              score_breakdown: {
                technical_skills: { score:0, weight: Math.round(cal.w.skills*100),      weighted_contribution:0, notes:"Parse failed" },
                projects:         { score:0, weight: Math.round(cal.w.projects*100),     weighted_contribution:0, notes:"Parse failed" },
                experience:       { score:0, weight: Math.round(cal.w.experience*100),   weighted_contribution:0, notes:"Parse failed" },
                education:        { score:0, weight: Math.round(cal.w.education*100),    weighted_contribution:0, notes:"Parse failed" },
                achievements:     { score:0, weight: Math.round(cal.w.achievements*100), weighted_contribution:0, notes:"Parse failed" },
              },
            });
          }
          return scoreCandidate(p, resumeMap[p.candidate_id], jdClean, titleClean, seniority, poolNames)
            .catch((err) => ({
              candidate_id: p.candidate_id,
              name: p.extracted_name || "Unknown",
              overall_fit: 0, decision: "ERROR", error: err.message,
              technical_score: 0, project_score: 0, experience_score: 0,
              education_score: 0, achievement_score: 0,
              strengths: [], concerns: [], red_flags: [], green_flags: [], missing_skills: [],
              score_breakdown: {
                technical_skills: { score:0, weight:0, weighted_contribution:0, notes:"Error" },
                projects:         { score:0, weight:0, weighted_contribution:0, notes:"Error" },
                experience:       { score:0, weight:0, weighted_contribution:0, notes:"Error" },
                education:        { score:0, weight:0, weighted_contribution:0, notes:"Error" },
                achievements:     { score:0, weight:0, weighted_contribution:0, notes:"Error" },
              },
            }));
        })
      );
      allScores.push(...results);
    }

    // Semantic post-fix: remove false "missing" skills
    allScores.forEach((c) => {
      const resumeTxt = resumeMap[c.candidate_id] || "";
      if (c.missing_skills) {
        c.missing_skills = c.missing_skills.filter((kw: string) => !semanticPresent(kw, resumeTxt));
      }
    });

    // Sort descending by overall_fit
    allScores.sort((a, b) => (b.overall_fit || 0) - (a.overall_fit || 0));

    // ─── STAGE 3: Deep analyze top N (batches of 2 with delay) ───
    const topNClamped   = Math.min(Math.max(topN, 1), 10, allScores.length);
    const topCandidates = allScores.slice(0, topNClamped);

    const deepResults: any[] = [];
    for (let i = 0; i < topCandidates.length; i += BATCH) {
      if (i > 0) await delay(1000);
      const batch = topCandidates.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((c, batchIdx) => {
          const idx = i + batchIdx;
          return deepAnalyze(
            c,
            parsedMap[c.candidate_id] || {},
            resumeMap[c.candidate_id] || "",
            jdClean, titleClean, seniority, idx + 1, mode
          ).catch(() => ({ ...c, overall_rank: idx + 1, deep_analysis_error: true }));
        })
      );
      deepResults.push(...results);
    }

    const deepMap: Record<string, any> = {};
    deepResults.forEach((d) => { if (d?.candidate_id) deepMap[d.candidate_id] = d; });

    // ─── STAGE 4: Analytics (no LLM) ───
    const analytics = computeAnalytics(allScores, seniority, candidates.length);

    // ─── Build final response ───
    const ranked = allScores.map((c, i) => mapToRanked(c, deepMap[c.candidate_id] || null, i));

    const finalResponse = {
      job_title:          titleClean || "Position",
      seniority_detected: seniority,
      recruiter_mode:     mode,
      analytics,

      // Primary ranked list (frontend uses this)
      ranked,

      // Aliases for different frontend consumers
      ranked_candidates:  ranked,
      comparison_summary: analytics.recruiter_insights.join(" "),
      top_pick_reason:    deepResults[0]?.comparative_note || `${allScores[0]?.name || "Top candidate"} leads with ${allScores[0]?.overall_fit || 0}/100.`,

      // Full deep analysis for top candidates
      top_candidates_deep_analysis: deepResults,

      hiring_funnel_narrative: `${candidates.length} received → ${analytics.shortlisted_count + analytics.hold_count} pass screen → ${analytics.shortlisted_count} shortlisted → Top ${topNClamped} deep analyzed`,
    };

    // ─── Supabase save ───
    try {
      await supabase.from("analyses").insert({
        candidate_id:    null,
        job_description: jdClean.slice(0, 500),
        final_verdict:   `BATCH: ${analytics.shortlisted_count}/${candidates.length} shortlisted`,
        full_report: {
          analytics,
          ranked_summary: ranked.slice(0, 10).map((r) => ({
            rank: r.rank, name: r.name, score: r.overall_score, verdict: r.verdict,
          })),
        },
      });
    } catch (dbErr) {
      console.error("[rank-candidates] Supabase save failed:", dbErr);
    }

    return NextResponse.json(finalResponse);

  } catch (e: any) {
    console.error("[rank-candidates] Fatal error:", e.message);
    return NextResponse.json(
      { error: e.message || "Ranking failed.", details: "Check server logs" },
      { status: 500 }
    );
  }
}
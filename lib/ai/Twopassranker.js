/**
 * lib/ai/twoPassRanker.ts
 * FAANG Hiring Committee Engine — v3
 * 3-phase pipeline: Parse → Score → Rank
 * Uses existing groqFetch pattern from groq.ts
 */

import { groqFetch } from "../groq"; // adjust path if needed

const GROQ_MODEL = "llama-3.3-70b-versatile";
const CONCURRENCY = 5;
const MAX_RETRIES = 4;
const BACKOFF_MS = 2000;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface CandidateInput {
  id: string;
  name: string;
  resumeText: string;
}

export interface RankedResult {
  candidate_id: string;
  candidateName: string;
  final_score: number;
  verdict: string;
  rank: number;
  committee_note: string;
  vs_next: string;
  interview_pipeline: {
    recruiter_screen: string;
    technical_round: string;
    hiring_committee: string;
    offer_probability: string;
  };
  strengths: string[];
  weaknesses: string[];
  red_flags: string[];
  jd_skill_gaps: string[];
  technical_match: number;
  resume_match: number;
  growth_potential: string;
  interview_readiness: string;
  recruiter_confidence: number;
  risk_analysis: string;
  score_breakdown: Record<string, any>;
  parsed_name: string;
  parse_confidence: number;
}

export interface RankingResult {
  ranked: RankedResult[];
  failed: any[];
}

export interface ProgressUpdate {
  completed: number;
  total: number;
  phase: "parsing" | "scoring" | "ranking";
}

// ─── GROQ CALLER ─────────────────────────────────────────────────────────────

async function callGroqJSON(
  system: string,
  user: string,
  maxTokens = 1500,
  attempt = 1
): Promise<any> {
  try {
    const res = await groqFetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.1,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user",   content: user   },
          ],
        }),
      }
    );

    if (!res.ok) {
      const e: any = new Error(`Groq ${res.status}`);
      e.status = res.status;
      throw e;
    }

    const data = await res.json();
    const text: string = data.choices[0].message.content;
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e: any) {
    if ([429, 503, 529].includes(e.status) && attempt <= MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * 2 ** (attempt - 1)));
      return callGroqJSON(system, user, maxTokens, attempt + 1);
    }
    throw e;
  }
}

// ─── PHASE 1: RESUME PARSING ─────────────────────────────────────────────────

const PARSE_SYSTEM = `You are an expert resume parser trained to extract information from ANY resume format — two-column layouts, tables, Canva designs, ATS templates, poorly formatted PDFs, graphic-heavy resumes, broken formatting.

RULES:
- Extract ONLY what is actually present in the resume. NEVER invent or assume missing information.
- If something cannot be found, set it to null or empty array.
- Handle sidebars, headers, footers, tables, bullets, icons, hyperlinks.
- Output ONLY valid JSON. No other text.

JSON format:
{
  "candidate_name": "",
  "current_role": "",
  "years_experience": 0,
  "education": [{ "degree": "", "university": "", "year": "", "cgpa": "" }],
  "skills": {
    "programming_languages": [],
    "frameworks": [],
    "databases": [],
    "cloud": [],
    "devops": [],
    "ai_ml": [],
    "other": []
  },
  "projects": [{ "name": "", "description": "", "tech_used": [], "impact": "", "ownership_level": "" }],
  "internships": [{ "company": "", "role": "", "duration": "", "responsibilities": "", "impact": "" }],
  "work_experience": [{ "company": "", "role": "", "duration": "", "responsibilities": "", "impact": "" }],
  "achievements": [],
  "certifications": [],
  "github": "",
  "linkedin": "",
  "open_source": [],
  "hackathons": [],
  "missing_info": [],
  "resume_quality": "excellent|good|average|poor",
  "parsing_confidence": 0,
  "red_flags_noticed": [],
  "parsing_notes": ""
}`;

async function parseResume(candidate: CandidateInput): Promise<any> {
  try {
    const parsed = await callGroqJSON(
      PARSE_SYSTEM,
      `Parse this resume completely. Extract every piece of information present.\n\nRESUME:\n${candidate.resumeText.slice(0, 4000)}\n\nReturn ONLY the JSON object.`,
      1500
    );
    return { ...candidate, parsedData: parsed, parseStatus: "ok" };
  } catch (e: any) {
    // Graceful fallback — never crash
    return {
      ...candidate,
      parsedData: {
        candidate_name: candidate.name,
        parsing_confidence: 15,
        parsing_notes: `Parse failed: ${e.message}`,
        resume_quality: "poor",
        skills: { programming_languages: [], frameworks: [], other: [] },
        projects: [],
        internships: [],
        work_experience: [],
        missing_info: ["full resume content"],
      },
      parseStatus: "fallback",
    };
  }
}

// ─── PHASE 2: FAANG SCORECARD ─────────────────────────────────────────────────

const SCORE_SYSTEM = `You are a FAANG Hiring Committee — Principal Technical Recruiter (30+ years), Engineering Director, Staff Engineer, HR Business Partner. You have collectively hired 20,000+ candidates at Google, Meta, Amazon, Microsoft, Apple, Netflix.

YOUR REPUTATION DEPENDS ON SELECTING THE STRONGEST CANDIDATES — NOT MAKING EVERYONE LOOK GOOD.

FAANG HIRING SCORECARD (MANDATORY — use ONLY this rubric):
- Technical Skill Match:        30 points
- Relevant Projects:            20 points
- Internship/Experience Quality: 15 points
- Business Impact & Achievements: 10 points
- Problem Solving Evidence:     10 points
- Resume Quality & ATS Score:    5 points
- Leadership & Ownership:        5 points
- Education Relevance:           5 points
TOTAL: 100 points

SCORING TIERS — DO NOT INFLATE:
95-100 = Exceptional (RARE)
90-94  = Outstanding
80-89  = Strong
70-79  = Good
60-69  = Borderline
< 60   = Reject

DEDUCT POINTS FOR:
- Keyword stuffing (skills listed, no evidence of use)
- Generic project descriptions ("built a web app using React")
- No measurable impact or metrics anywhere
- Vague responsibilities ("worked on", "assisted", "helped")
- No ownership signals — everything is team effort
- Buzzword-heavy with no technical depth
- Skill listed without any project/work evidence
- Suspicious inflated claims

DO NOT reward skill lists. Reward DEMONSTRATED ability with evidence.
A candidate with only college projects and no internship CANNOT score 80+.

Output ONLY valid JSON:
{
  "candidate_id": "",
  "scores": {
    "technical_skill_match":   { "score": 0, "max": 30, "evidence": "", "deductions": "" },
    "relevant_projects":       { "score": 0, "max": 20, "evidence": "", "deductions": "" },
    "experience_quality":      { "score": 0, "max": 15, "evidence": "", "deductions": "" },
    "business_impact":         { "score": 0, "max": 10, "evidence": "", "deductions": "" },
    "problem_solving":         { "score": 0, "max": 10, "evidence": "", "deductions": "" },
    "resume_quality":          { "score": 0, "max": 5,  "evidence": "", "deductions": "" },
    "leadership_ownership":    { "score": 0, "max": 5,  "evidence": "", "deductions": "" },
    "education_relevance":     { "score": 0, "max": 5,  "evidence": "", "deductions": "" }
  },
  "total_score": 0,
  "technical_match_percent": 0,
  "resume_match_percent": 0,
  "strengths": [],
  "weaknesses": [],
  "red_flags": [],
  "jd_skill_gaps": [],
  "hiring_verdict": "Strong Hire|Hire|Lean Hire|Borderline|Lean Reject|Reject",
  "interview_readiness": "Ready|Needs Prep|Not Ready",
  "growth_potential": "High|Medium|Low",
  "recruiter_confidence": 0,
  "recruiter_notes": "",
  "risk_analysis": ""
}`;

async function scoreCandidate(candidate: any, jd: string): Promise<any> {
  try {
    const scored = await callGroqJSON(
      SCORE_SYSTEM,
      `JOB DESCRIPTION:\n${jd.slice(0, 800)}\n\nCANDIDATE ID: ${candidate.id}\nPARSED RESUME DATA:\n${JSON.stringify(candidate.parsedData, null, 2).slice(0, 3000)}\n\nScore strictly per the FAANG rubric. Every score needs evidence. Return only the JSON object.`,
      1500
    );
    return { ...candidate, scored, scoreStatus: "ok" };
  } catch (e: any) {
    return {
      ...candidate,
      scored: {
        total_score: 0,
        hiring_verdict: "Reject",
        strengths: [],
        weaknesses: ["Could not process this resume"],
        red_flags: ["Scoring failed"],
        recruiter_notes: `Error: ${e.message}`,
        scores: {},
      },
      scoreStatus: "failed",
    };
  }
}

// ─── PHASE 3: COMPARATIVE RANKING ─────────────────────────────────────────────

const RANK_SYSTEM = `You are the Head of Recruiting running a FAANG hiring committee calibration debrief.

You have independent FAANG scorecards for multiple candidates. Your job: FINAL COMPARATIVE RANKING.

MANDATORY RULES:
1. Rank candidates RELATIVE TO EACH OTHER — not against an imaginary perfect candidate.
2. NO TIES — every candidate gets a unique final_score.
3. Spread scores across the full range. Best candidate in batch gets the highest, worst gets the lowest.
4. If all candidates are weak, best still ranks first but at an appropriately low score.
5. Compare #1 vs #2, #2 vs #3, etc. — vs_next must explain the specific ranking difference.
6. committee_note = what you say out loud in the debrief meeting. Direct, honest, comparative.
7. interview_pipeline = realistic prediction of where they clear/fail.

Return ONLY valid JSON:
{
  "ranked": [
    {
      "candidate_id": "",
      "final_score": 0,
      "verdict": "Strong Hire|Hire|Lean Hire|Borderline|Lean Reject|Reject",
      "rank": 1,
      "vs_next": "Why this candidate ranked above the next one. Specific evidence.",
      "committee_note": "What you say in the debrief. Direct, honest, comparative.",
      "interview_pipeline": {
        "recruiter_screen": "Pass|Fail|Maybe",
        "technical_round": "Pass|Fail|Maybe",
        "hiring_committee": "Pass|Fail|Maybe",
        "offer_probability": "High|Medium|Low|Very Low"
      }
    }
  ]
}
Sort by final_score descending. Include ALL candidates from input.`;

function buildRankPrompt(group: any[], jd: string): string {
  const summaries = group.map((c) => ({
    candidate_id:         c.id,
    name:                 c.parsedData?.candidate_name || c.name,
    total_score:          c.scored?.total_score || 0,
    technical_match:      c.scored?.technical_match_percent || 0,
    hiring_verdict:       c.scored?.hiring_verdict || "Unknown",
    strengths:            (c.scored?.strengths || []).slice(0, 3),
    weaknesses:           (c.scored?.weaknesses || []).slice(0, 3),
    red_flags:            c.scored?.red_flags || [],
    jd_gaps:              c.scored?.jd_skill_gaps || [],
    growth_potential:     c.scored?.growth_potential || "Unknown",
    recruiter_confidence: c.scored?.recruiter_confidence || 0,
    score_breakdown: {
      technical:  c.scored?.scores?.technical_skill_match?.score || 0,
      projects:   c.scored?.scores?.relevant_projects?.score || 0,
      experience: c.scored?.scores?.experience_quality?.score || 0,
      impact:     c.scored?.scores?.business_impact?.score || 0,
    },
  }));

  return `JOB DESCRIPTION (context):\n${jd.slice(0, 500)}\n\n${group.length} CANDIDATES TO RANK:\n${JSON.stringify(summaries, null, 2)}\n\nRank ALL ${group.length} candidates. No ties. Spread scores. Be direct.`;
}

// ─── BATCH RUNNER ─────────────────────────────────────────────────────────────

async function runBatch<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  onProgress?: (p: ProgressUpdate) => void,
  phase: ProgressUpdate["phase"] = "scoring",
  total = 0
): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((item) => processor(item)));
    results.push(...batchResults);
    onProgress?.({ completed: results.length, total, phase });
  }
  return results;
}

function normalizeScores(allRanked: any[]): any[] {
  const scores = allRanked.map((c) => c.final_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return allRanked;
  return allRanked.map((c) => ({
    ...c,
    final_score: Math.round(((c.final_score - min) / (max - min)) * 85 + 10),
  }));
}

function verdictFromScore(s: number): string {
  if (s >= 85) return "Strong Hire";
  if (s >= 70) return "Hire";
  if (s >= 60) return "Lean Hire";
  if (s >= 50) return "Borderline";
  if (s >= 35) return "Lean Reject";
  return "Reject";
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function rankAllCandidates(
  candidates: CandidateInput[],
  jd: string,
  onProgress?: (p: ProgressUpdate) => void
): Promise<RankingResult> {
  const total = candidates.length;

  // Phase 1: Parse
  const parsed = await runBatch(
    candidates,
    (c) => parseResume(c),
    (p) => onProgress?.({ ...p, phase: "parsing" }),
    "parsing",
    total
  );

  // Phase 2: Score
  const scored = await runBatch(
    parsed,
    (c) => scoreCandidate(c, jd),
    (p) => onProgress?.({ ...p, phase: "scoring" }),
    "scoring",
    total
  );

  const successful = scored.filter((c) => c.scoreStatus === "ok");
  const failed     = scored.filter((c) => c.scoreStatus === "failed");

  // Phase 3: Rank (groups of 20)
  successful.sort((a, b) => (b.scored?.total_score || 0) - (a.scored?.total_score || 0));
  const GROUP = 20;
  const groups: any[][] = [];
  for (let i = 0; i < successful.length; i += GROUP) groups.push(successful.slice(i, i + GROUP));

  let allRanked: any[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    try {
      const result = await callGroqJSON(RANK_SYSTEM, buildRankPrompt(group, jd), 2000);
      const lookup = Object.fromEntries(group.map((c) => [c.id, c]));

      (result.ranked || []).forEach((r: any) => {
        const orig = lookup[r.candidate_id] || {};
        allRanked.push({
          candidate_id:        r.candidate_id,
          candidateName:       orig.parsedData?.candidate_name || orig.name || r.candidate_id,
          final_score:         r.final_score || orig.scored?.total_score || 0,
          verdict:             r.verdict || verdictFromScore(r.final_score || 0),
          rank:                r.rank,
          committee_note:      r.committee_note || "",
          vs_next:             r.vs_next || "",
          interview_pipeline:  r.interview_pipeline || {},
          strengths:           orig.scored?.strengths || [],
          weaknesses:          orig.scored?.weaknesses || [],
          red_flags:           orig.scored?.red_flags || [],
          jd_skill_gaps:       orig.scored?.jd_skill_gaps || [],
          technical_match:     orig.scored?.technical_match_percent || 0,
          resume_match:        orig.scored?.resume_match_percent || 0,
          growth_potential:    orig.scored?.growth_potential || "Unknown",
          interview_readiness: orig.scored?.interview_readiness || "Unknown",
          recruiter_confidence:orig.scored?.recruiter_confidence || 0,
          risk_analysis:       orig.scored?.risk_analysis || "",
          score_breakdown:     orig.scored?.scores || {},
          parsed_name:         orig.parsedData?.candidate_name || orig.name,
          parse_confidence:    orig.parsedData?.parsing_confidence || 0,
        });
      });
    } catch (e: any) {
      // Fallback: use pass2 scores directly for this group
      group.forEach((c) => {
        allRanked.push({
          candidate_id:    c.id,
          candidateName:   c.parsedData?.candidate_name || c.name,
          final_score:     c.scored?.total_score || 0,
          verdict:         c.scored?.hiring_verdict || verdictFromScore(c.scored?.total_score || 0),
          committee_note:  c.scored?.recruiter_notes || "",
          strengths:       c.scored?.strengths || [],
          weaknesses:      c.scored?.weaknesses || [],
          red_flags:       c.scored?.red_flags || [],
          jd_skill_gaps:   c.scored?.jd_skill_gaps || [],
          technical_match: c.scored?.technical_match_percent || 0,
          score_breakdown: c.scored?.scores || {},
          growth_potential: c.scored?.growth_potential || "Unknown",
        });
      });
    }
    onProgress?.({ completed: gi + 1, total: groups.length, phase: "ranking" });
  }

  // Cross-group normalization when multiple groups
  if (groups.length > 1) allRanked = normalizeScores(allRanked);

  // Final sort + assign global ranks
  allRanked.sort((a, b) => b.final_score - a.final_score);
  allRanked.forEach((c, i) => {
    c.rank    = i + 1;
    c.verdict = verdictFromScore(c.final_score);
  });

  // Failed at the bottom
  const mappedFailed = failed.map((c, i) => ({
    candidate_id:  c.id,
    candidateName: c.name,
    final_score:   0,
    verdict:       "Reject",
    rank:          allRanked.length + i + 1,
    committee_note: c.scored?.recruiter_notes || "Resume could not be processed.",
    strengths: [], weaknesses: ["Failed to process"], red_flags: [],
  }));

  return { ranked: allRanked, failed: mappedFailed };
}
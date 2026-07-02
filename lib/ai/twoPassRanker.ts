/**
 * FAANG RECRUITER RANKING ENGINE — v3
 * Two-pass system: deep individual analysis → comparative committee debrief.
 * Produces real granular sub-scores, multiple strengths/concerns, and predicted questions.
 */

import { groqFetch } from "@/lib/groq";

const GROQ_MODEL_PASS1 = "llama-3.1-8b-instant";
const GROQ_MODEL_PASS2 = "llama-3.3-70b-versatile";
const CONCURRENCY  = 12;
const MAX_RETRIES  = 4;
const BACKOFF_MS   = 1500;

export interface CandidateResult {
  id: string;
  name: string;
  resumeText: string;
}

// ─── GROQ CALLER ─────────────────────────────────────────────────────────────

function stripThinkTags(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

async function callGroq(system: string, user: string, model: string): Promise<any> {
  const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
    }),
  });

  if (!res.ok) {
    const e: any = new Error(`Groq ${res.status}`);
    e.status = res.status;
    throw e;
  }
  const d = await res.json();
  const raw = d.choices?.[0]?.message?.content || "{}";
  const cleaned = stripThinkTags(raw).replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in response");
  const jsonStr = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return JSON.parse(
      jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/\n/g, " ")
    );
  }
}

async function callGroqRetry(sys: string, usr: string, model: string, attempt = 1): Promise<any> {
  try {
    return await callGroq(sys, usr, model);
  } catch (e: any) {
    if ([429, 503, 529].includes(e.status) && attempt <= MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BACKOFF_MS * 2 ** (attempt - 1)));
      return callGroqRetry(sys, usr, model, attempt + 1);
    }
    throw e;
  }
}

// ─── PASS 1: DEEP INDIVIDUAL ANALYSIS ────────────────────────────────────────

const PASS1_SYSTEM = `You are a Principal Recruiter with over 30 years of technical hiring experience at FAANG companies (Google, Meta, Amazon, Apple, Microsoft, Netflix). You have personally screened more than 500,000 resumes and participated in thousands of hiring committees.

Your responsibility is NOT to be nice. Your responsibility is NOT to encourage candidates. Your responsibility is to evaluate this candidate exactly how an elite FAANG hiring committee would.

Every decision must be evidence-based. Never inflate scores. Never give random scores. Never assume anything not written in the resume.

--------------------------------------------------
SCORING METHODOLOGY (6 DIMENSIONS)
--------------------------------------------------
You must assign scores from 0-100 for each of these 6 dimensions:
1. "technical_skills" (30% weight): Python, ML, Deep Learning, LLMs, NLP, CV, TensorFlow, PyTorch, SQL, FastAPI, Cloud, Git.
2. "project_quality" (20% weight): Complexity, deployment, impact, production-readiness, scalability, research, open source.
3. "experience" (15% weight): Internships, research, freelancing, industry work, hackathons.
4. "education" (10% weight): Degree, specialization, CGPA, coursework.
5. "jd_match" (15% weight): How closely the resume aligns with the JD.
6. "resume_quality" (10% weight): ATS friendliness, formatting, clarity, achievements, metrics.

Calculate the "overall_score" as the weighted sum:
overall_score = (technical_skills * 0.30) + (project_quality * 0.20) + (experience * 0.15) + (education * 0.10) + (jd_match * 0.15) + (resume_quality * 0.10)

SCORING SCALE:
- 95-100: Exceptional Hire
- 90-94: Strong Hire
- 85-89: Hire
- 78-84: Lean Hire
- 70-77: Borderline
- 60-69: Lean Reject
- Below 60: Reject

Return ONLY valid JSON (no markdown, no preamble, no <think> tags):
{
  "candidate_id": "",
  "overall_score": 0,
  "scores": {
    "technical_skills": 0,
    "project_quality": 0,
    "experience": 0,
    "education": 0,
    "jd_match": 0,
    "resume_quality": 0
  },
  "verdict": "Exceptional Hire | Strong Hire | Hire | Lean Hire | Borderline | Lean Reject | Reject",
  "trajectory": "rising | flat | declining | unclear",
  "impact_quality": "exceptional | solid | weak | none",
  "strengths": [
    "Strength #1 with specific evidence/quotes from resume",
    "Strength #2 with specific evidence/quotes from resume",
    "Strength #3 with specific evidence/quotes from resume"
  ],
  "concerns": [
    "Concern #1 with specific evidence/quotes from resume",
    "Concern #2 with specific evidence/quotes from resume"
  ],
  "red_flags": ["Specific red flag with evidence from resume"],
  "hidden_signal": "Hidden signal or observation from the resume.",
  "predicted_questions": [
    "Targeted interview question #1",
    "Targeted interview question #2",
    "Targeted interview question #3"
  ],
  "recruiter_verdict": "recruiter summary (max 60 words) explaining exactly why the candidate achieved this rank. Avoid generic phrases.",
  "hire_instinct": "yes | lean_yes | lean_no | no"
}`;

function pass1UserPrompt(candidateId: string, jd: string, resume: string): string {
  return `ROLE WE ARE HIRING FOR:
${jd.slice(0, 1200)}

---
CANDIDATE ID: ${candidateId}

FULL RESUME:
${resume.slice(0, 3000)}

Give me your deep, honest recruiter analysis. Remember: every score must be justified with specific evidence. Every strength and concern must reference something concrete from the resume. Score them where they truly belong — don't be generous just to be nice.`;
}

// ─── PASS 1: score each candidate independently ───────────────────────────────

async function scoreOne(candidate: CandidateResult, jd: string): Promise<any> {
  try {
    const result = await callGroqRetry(
      PASS1_SYSTEM,
      pass1UserPrompt(candidate.id, jd, candidate.resumeText),
      GROQ_MODEL_PASS1
    );
    return { id: candidate.id, name: candidate.name, status: "ok", p1: result };
  } catch (e: any) {
    return { id: candidate.id, name: candidate.name, status: "fail", error: e.message };
  }
}

async function runPass1(
  candidates: CandidateResult[],
  jd: string,
  onProgress?: (progress: { completed: number; total: number; phase: string }) => void
): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const out   = await Promise.all(batch.map(c => scoreOne(c, jd)));
    results.push(...out);
    onProgress?.({ completed: results.length, total: candidates.length, phase: "scoring" });
  }
  return results;
}

// ─── PASS 2: COMPARATIVE COMMITTEE DEBRIEF ───────────────────────────────────

const PASS2_SYSTEM = `You are running a final hiring committee debrief at Google. You have received independent recruiter deep-analyses on multiple candidates for the SAME role.

Your job: produce a FINAL COMPARATIVE RANKING that is brutally honest and differentiating, and generate a final committee report summary.

RULES OF THE DEBRIEF:
1. Candidates must be ranked RELATIVE TO EACH OTHER — not against an abstract perfect candidate.
2. The best candidate gets 85-98. The worst gets 10-35. Everyone else SPREADS between. No clustering.
3. NO TIES. Every candidate gets a unique final_score.
4. Your committee_note MUST be comparative — reference other candidates by ID ("stronger than C3 because...", "unlike C1, this candidate actually...")
5. Verdict must be one of: "Exceptional Hire", "Strong Hire", "Hire", "Lean Hire", "Borderline", "Lean Reject", "Reject" (strictly aligned with the scoring scale: 95-100 Exceptional, 90-94 Strong, 85-89 Hire, 78-84 Lean Hire, 70-77 Borderline, 60-69 Lean Reject, <60 Reject).
6. Generate a unified "committee_report" (Markdown format) summarizing the overall batch:
   - Top 5 hires (with IDs and brief details)
   - Borderline candidates worth interviewing
   - Candidates rejected immediately
   - Average candidate quality
   - Common missing skills
   - Most impressive resume
   - Biggest resume mistakes
   - Overall hiring recommendation

Return ONLY valid JSON (no markdown wrapper, no preamble, no <think> tags):
{
  "ranked": [
    {
      "candidate_id": "",
      "final_score": 0,
      "verdict": "Exceptional Hire | Strong Hire | Hire | Lean Hire | Borderline | Lean Reject | Reject",
      "committee_note": "Comparative, direct, honest. 2-4 sentences. Reference other candidates by ID to explain why this candidate ranked here relative to them.",
      "hire_instinct": "yes | lean_yes | lean_no | no",
      "hire_recommendation": "Specific next step for this candidate — not generic"
    }
  ],
  "committee_report": "Formatted markdown text of the FINAL HIRING COMMITTEE REPORT summarizing the entire batch."
}
Sort by final_score descending. Include ALL candidates from input. No ties.`;

function pass2UserPrompt(candidates: any[], jd: string): string {
  const summaries = candidates.map(c => ({
    candidate_id:     c.id,
    name:             c.name,
    pass1_score:      c.p1.overall_score || c.p1.score || 0,
    scores:           c.p1.scores || {},
    trajectory:       c.p1.trajectory,
    impact_quality:   c.p1.impact_quality,
    strengths:        c.p1.strengths || [c.p1.biggest_strength],
    concerns:         c.p1.concerns || [c.p1.biggest_concern],
    red_flags:        c.p1.red_flags || [],
    hidden_signal:    c.p1.hidden_signal,
    hire_instinct:    c.p1.hire_instinct,
    recruiter_verdict:c.p1.recruiter_verdict,
  }));

  return `ROLE WE ARE HIRING FOR:
${jd.slice(0, 600)}

INDEPENDENT RECRUITER ANALYSES (${candidates.length} candidates):
${JSON.stringify(summaries, null, 2)}

Run the committee debrief. Rank them relative to each other. No ties. Spread the scores widely. Be honest and comparative — the hiring manager is reading this to decide who gets interview slots this week.`;
}
async function runPass2(
  pass1Results: any[],
  jd: string,
  onProgress?: (progress: { completed: number; total: number; phase: string }) => void
): Promise<{ ranked: any[]; failed: any[]; committeeReport: string }> {
  const ok   = pass1Results.filter(r => r.status === "ok");
  const fail = pass1Results.filter(r => r.status === "fail");

  // pre-sort by pass1 score so groups are coherent
  ok.sort((a, b) => (b.p1.overall_score || b.p1.score || 0) - (a.p1.overall_score || a.p1.score || 0));

  const GROUP = 20;
  const groups: any[][] = [];
  for (let i = 0; i < ok.length; i += GROUP) groups.push(ok.slice(i, i + GROUP));

  let allRanked: any[] = [];
  let finalReport = "";

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    try {
      const result = await callGroqRetry(PASS2_SYSTEM, pass2UserPrompt(group, jd), GROQ_MODEL_PASS2);
      const nameMap = Object.fromEntries(group.map(c => [c.id, c.name]));
      const p1Map   = Object.fromEntries(group.map(c => [c.id, c.p1]));

      if (result.committee_report) {
        finalReport = result.committee_report;
      }

      (result.ranked || []).forEach((r: any) => {
        const p1 = p1Map[r.candidate_id] || {};
        allRanked.push({
          candidate_id:      r.candidate_id,
          candidateName:     nameMap[r.candidate_id] || r.candidate_id,
          final_score:       r.final_score,
          verdict:           r.verdict,
          committee_note:    r.committee_note,
          hire_instinct:     r.hire_instinct,
          hire_recommendation: r.hire_recommendation || r.committee_note,
          // Pass-through all rich pass1 data
          scores:            p1.scores || {},
          strengths:         p1.strengths || (p1.biggest_strength ? [p1.biggest_strength] : []),
          concerns:          p1.concerns || (p1.biggest_concern ? [p1.biggest_concern] : []),
          red_flags:         p1.red_flags || [],
          hidden_signal:     p1.hidden_signal,
          predicted_questions: p1.predicted_questions || [],
          trajectory:        p1.trajectory,
          impact_quality:    p1.impact_quality,
          recruiter_verdict: p1.recruiter_verdict,
        });
      });
    } catch (e) {
      // fallback: use pass1 data directly
      group.forEach(c => {
        const p1 = c.p1 || {};
        allRanked.push({
          candidate_id:      c.id,
          candidateName:     c.name,
          final_score:       p1.overall_score || p1.score || 0,
          verdict:           scoreToVerdict(p1.overall_score || p1.score || 0),
          committee_note:    p1.recruiter_verdict || "",
          hire_instinct:     p1.hire_instinct,
          hire_recommendation: p1.recruiter_verdict || "Review manually",
          scores:            p1.scores || {},
          strengths:         p1.strengths || (p1.biggest_strength ? [p1.biggest_strength] : []),
          concerns:          p1.concerns || (p1.biggest_concern ? [p1.biggest_concern] : []),
          red_flags:         p1.red_flags || [],
          hidden_signal:     p1.hidden_signal,
          predicted_questions: p1.predicted_questions || [],
          trajectory:        p1.trajectory,
          impact_quality:    p1.impact_quality,
          recruiter_verdict: p1.recruiter_verdict,
        });
      });
    }
    onProgress?.({ completed: gi + 1, total: groups.length, phase: "ranking" });
  }

  // cross-group normalization when multiple groups exist
  if (groups.length > 1) allRanked = normalize(allRanked);

  // final global sort + rank numbers
  allRanked.sort((a, b) => b.final_score - a.final_score);
  allRanked.forEach((c, i) => {
    c.rank    = i + 1;
    c.verdict = scoreToVerdict(c.final_score);
  });

  if (!finalReport && allRanked.length > 0) {
    const top5 = allRanked.slice(0, 5).map((c, idx) => `${idx+1}. **${c.candidateName}** (Score: ${c.final_score}/100 - ${c.verdict})`).join("\n");
    const borderline = allRanked.filter(c => c.verdict === "Borderline").map(c => `- ${c.candidateName}`).join("\n");
    const rejected = allRanked.filter(c => c.verdict === "Reject" || c.verdict === "Lean Reject").map(c => `- ${c.candidateName}`).join("\n");
    finalReport = `### FAANG Hiring Committee Report\n\n**Top Picks & Recommended Hires:**\n${top5 || "None"}\n\n**Borderline Candidates:**\n${borderline || "None"}\n\n**Rejected Candidates:**\n${rejected || "None"}\n\n*Auto-generated report based on individual scorecards.*`;
  }

  return { ranked: allRanked, failed: fail, committeeReport: finalReport };
}

function normalize(candidates: any[]): any[] {
  const scores = candidates.map(c => c.final_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return candidates;
  return candidates.map(c => ({
    ...c,
    final_score: Math.round(((c.final_score - min) / (max - min)) * 88 + 8),
  }));
}

function scoreToVerdict(s: number): string {
  if (s >= 95) return "Exceptional Hire";
  if (s >= 90) return "Strong Hire";
  if (s >= 85) return "Hire";
  if (s >= 78) return "Lean Hire";
  if (s >= 70) return "Borderline";
  if (s >= 60) return "Lean Reject";
  return "Reject";
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function rankAllCandidates(
  candidates: CandidateResult[],
  jd: string,
  onProgress?: (progress: { completed: number; total: number; phase: string }) => void
): Promise<{ ranked: any[]; failed: any[]; committeeReport: string }> {
  const pass1 = await runPass1(candidates, jd, onProgress);
  return runPass2(pass1, jd, onProgress);
}

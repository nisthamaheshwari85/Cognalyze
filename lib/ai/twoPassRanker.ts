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

const PASS1_SYSTEM = `You are the Lead Recruiter of a 9-person hiring committee at Google — 30 years of technical hiring, 50,000+ resumes reviewed across Google, Meta, Amazon, Microsoft, and OpenAI. You have personally made final hire/no-hire calls that shaped entire engineering orgs.

You are reviewing ONE candidate against a specific job description. Your analysis will be used to compare this candidate against others, so you MUST be brutally precise, specific, and differentiated.

HOW YOU ACTUALLY EVALUATE (real recruiter instincts, not a checklist):

1. TECHNICAL DEPTH — not "do they list React" but "can they architect something real?"
   - Look for: system design evidence, performance optimization, scale handled, debugging war stories
   - Red flag: listing 15 technologies with zero depth on any
   - Signal: "built X handling Y requests/sec" or "reduced latency by Z%"

2. EXPERIENCE QUALITY — not years, but what those years contained
   - 2 years at Google building infra > 8 years at unknown company doing maintenance
   - Look for: scope of ownership, team size managed, revenue/user impact
   - Red flag: only responsibilities listed, zero outcomes
   - Signal: quantified impact ("grew DAU from X to Y", "saved $X/month")

3. LEADERSHIP & OWNERSHIP
   - Did they lead or follow? Did they own outcomes or execute tasks?
   - Look for: "led", "designed", "proposed", "owned", "architected"
   - Red flag: everything is passive voice ("was part of team that...")
   - Signal: evidence of driving decisions, mentoring, cross-team influence

4. CULTURE FIT & COMMUNICATION
   - Can they articulate what they did clearly? Is the resume well-structured?
   - Look for: clarity, specificity, evidence of collaboration
   - Red flag: buzzword soup with no substance
   - Signal: teaching, open source, blog posts, conference talks

5. GROWTH POTENTIAL & TRAJECTORY
   - Is their career arc going up, flat, or down?
   - Look for: increasing scope, harder problems, faster promotions
   - Red flag: lateral moves only, same level for 5+ years
   - Signal: rapid promotion, increasing ownership, learning new domains

SCORING CALIBRATION (use the FULL range — clustered scores = you failed):
- 90-100: Would fight to hire. Top 1%. Competing offers from Google/Meta.
- 75-89:  Strong. Would personally vouch in committee. Top 10%.
- 60-74:  Decent match with real gaps. Needs deeper evaluation.
- 40-59:  Significant concerns. Missing fundamentals for this role.
- 20-39:  Clear gaps. Would not advance to technical screen.
- 0-19:   Wrong role entirely.

CRITICAL RULES:
- Every strength must cite SPECIFIC resume evidence (quote or paraphrase the actual line)
- Every concern must explain WHY it matters for THIS specific role
- Red flags must be specific, not generic ("no production experience" not "could be stronger")
- Predicted questions must target gaps or unverified claims in THIS resume
- DO NOT give all candidates similar scores. If someone is clearly weaker, score them 30 lower, not 5 lower.

Return ONLY valid JSON (no markdown, no preamble, no <think> tags):
{
  "candidate_id": "",
  "overall_score": 0,
  "scores": {
    "technical": 0,
    "experience": 0,
    "leadership": 0,
    "culture_fit": 0,
    "growth_potential": 0
  },
  "trajectory": "rising | flat | declining | unclear",
  "impact_quality": "exceptional | solid | weak | none",
  "strengths": [
    "Specific strength #1 with evidence from resume",
    "Specific strength #2 with evidence from resume",
    "Specific strength #3 with evidence from resume"
  ],
  "concerns": [
    "Specific concern #1 — why it matters for this role",
    "Specific concern #2 — why it matters for this role"
  ],
  "red_flags": ["specific red flag with evidence"],
  "hidden_signal": "Something most recruiters would miss — positive or negative. Be specific.",
  "predicted_questions": [
    "Targeted interview question #1 that probes a specific gap or unverified claim",
    "Targeted interview question #2",
    "Targeted interview question #3"
  ],
  "recruiter_verdict": "What you would literally say in a hiring committee. 2-3 sentences. Direct, honest, comparative. The way senior recruiters actually talk — not polished HR speak.",
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

Your job: produce a FINAL COMPARATIVE RANKING that is brutally honest and differentiating.

RULES OF THE DEBRIEF:
1. Candidates must be ranked RELATIVE TO EACH OTHER — not against an abstract perfect candidate.
2. The best candidate gets 85-98. The worst gets 10-35. Everyone else SPREADS between. No clustering.
3. NO TIES. Every candidate gets a unique final_score.
4. Your committee_note MUST be comparative — reference other candidates by ID ("stronger than C3 because...", "unlike C1, this candidate actually...")
5. The summary is what the hiring manager reads to make a final call. It must be 2-4 sentences, specific, and actionable.
6. hire_recommendation is what you'd tell the hiring manager to do RIGHT NOW with this candidate.

VERDICT RULES:
- STRONGLY_RECOMMEND: Top pick. Schedule final round immediately. Would be upset if we lost them.
- RECOMMEND: Strong enough to advance. Worth investing interview time.
- HOLD: Real potential but significant gaps. Consider if pipeline is thin.
- REJECT: Does not meet the bar for this role. Be specific about why.

Return ONLY valid JSON (no markdown, no preamble, no <think> tags):
{
  "ranked": [
    {
      "candidate_id": "",
      "final_score": 0,
      "verdict": "STRONGLY_RECOMMEND | RECOMMEND | HOLD | REJECT",
      "committee_note": "Comparative, direct, honest. 2-4 sentences. Reference other candidates.",
      "hire_instinct": "yes | lean_yes | lean_no | no",
      "hire_recommendation": "Specific next step for this candidate — not generic"
    }
  ]
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

// ─── PASS 2: relative ranking in groups of 20 ────────────────────────────────

async function runPass2(
  pass1Results: any[],
  jd: string,
  onProgress?: (progress: { completed: number; total: number; phase: string }) => void
): Promise<{ ranked: any[]; failed: any[] }> {
  const ok   = pass1Results.filter(r => r.status === "ok");
  const fail = pass1Results.filter(r => r.status === "fail");

  // pre-sort by pass1 score so groups are coherent
  ok.sort((a, b) => (b.p1.overall_score || b.p1.score || 0) - (a.p1.overall_score || a.p1.score || 0));

  const GROUP = 20;
  const groups: any[][] = [];
  for (let i = 0; i < ok.length; i += GROUP) groups.push(ok.slice(i, i + GROUP));

  let allRanked: any[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    try {
      const result = await callGroqRetry(PASS2_SYSTEM, pass2UserPrompt(group, jd), GROQ_MODEL_PASS2);
      const nameMap = Object.fromEntries(group.map(c => [c.id, c.name]));
      const p1Map   = Object.fromEntries(group.map(c => [c.id, c.p1]));

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

  return { ranked: allRanked, failed: fail };
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
  if (s >= 85) return "STRONGLY_RECOMMEND";
  if (s >= 70) return "RECOMMEND";
  if (s >= 50) return "HOLD";
  return "REJECT";
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function rankAllCandidates(
  candidates: CandidateResult[],
  jd: string,
  onProgress?: (progress: { completed: number; total: number; phase: string }) => void
): Promise<{ ranked: any[]; failed: any[] }> {
  const pass1 = await runPass1(candidates, jd, onProgress);
  return runPass2(pass1, jd, onProgress);
}

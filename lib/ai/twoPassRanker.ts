/**
 * FAANG RECRUITER RANKING ENGINE — v2
 * relative re-ranking and cross-group calibration.
 */

import { groqFetch } from "@/lib/groq";

const GROQ_MODEL   = "llama-3.3-70b-versatile";
const CONCURRENCY  = 4; // conservative concurrency for free key limits
const MAX_RETRIES  = 4;
const BACKOFF_MS   = 1500;

export interface Pass1Result {
  candidate_id: string;
  score: number;
  trajectory: "rising" | "flat" | "declining" | "unclear";
  impact_quality: "exceptional" | "solid" | "weak" | "none";
  biggest_strength: string;
  biggest_concern: string;
  hidden_signal: string;
  red_flags: string[];
  recruiter_verdict: string;
  hire_instinct: "yes" | "lean_yes" | "lean_no" | "no";
}

export interface CandidateResult {
  id: string;
  name: string;
  resumeText: string;
}

// ─── GROQ CALLER ─────────────────────────────────────────────────────────────

async function callGroq(system: string, user: string): Promise<any> {
  const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
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
  const content = d.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content.replace(/```json|```/g, "").trim());
}

async function callGroqRetry(sys: string, usr: string, attempt = 1): Promise<any> {
  try {
    return await callGroq(sys, usr);
  } catch (e: any) {
    if ([429, 503, 529].includes(e.status) && attempt <= MAX_RETRIES) {
      await new Promise(r => setTimeout(r, BACKOFF_MS * 2 ** (attempt - 1)));
      return callGroqRetry(sys, usr, attempt + 1);
    }
    throw e;
  }
}

// ─── PASS 1 SYSTEM PROMPT ────────────────────────────────────────────────────

const PASS1_SYSTEM = `You are Alex Chen, a Staff Recruiter at Google with 14 years of technical hiring experience. You have personally closed 400+ engineers at FAANG companies. You are known for being brutally honest internally — you say what you actually think, not what sounds nice.

You are reviewing ONE candidate for a specific role.

HOW YOU ACTUALLY THINK (not a rubric — real recruiter instincts):

1. TRAJECTORY over titles
   Does their career show upward momentum? Are they taking on harder problems over time?
   A junior at a great company growing fast beats a senior at a mediocre company stagnating.

2. IMPACT over technologies listed
   Anyone can write "used React". Did they build something that 10 people used or 10 million?
   Look for numbers, scale, ownership signals: "led", "built from scratch", "reduced X by Y%".
   Vague impact = red flag. Specific numbers = signal.

3. COMPANY/INSTITUTION SIGNAL
   Where someone worked tells you what bar they cleared to get in.
   Top-tier company → they already passed a hard filter. Weight their work accordingly.
   Unknown company → judge purely on what they built, no halo effect.

4. RED FLAGS (things candidates try to hide):
   - Job hopping under 1 year at multiple places (loyalty/performance concern)
   - Big gaps with vague explanation
   - Lots of technologies listed, zero depth on any
   - Only personal/college projects, no professional validation
   - Responsibilities listed but zero outcomes or numbers
   - Role inflation ("co-founded" a startup with 0 users)

5. HIDDEN GEMS (things weak resumes accidentally reveal):
   - Open source contributions with real users
   - Self-taught skills with shipped products
   - Academic research with real citations
   - Competitive programming rankings
   - Teaching/mentoring — shows mastery

6. CULTURE AND ROLE FIT
   Beyond skills — does this person's background suggest they'd thrive in the specific environment of this role?

SCORING (use the FULL range — this is critical):
- 85-100: I would fight to hire this person. Clear top talent.
- 70-84: Strong candidate. Recommend with confidence.
- 50-69: Mixed signals. Has potential but real concerns. Hold.
- 30-49: Significant gaps. Likely reject unless desperate.
- 0-29: Clear reject. Does not meet bar.

DO NOT cluster scores. If you give 5 candidates 72-75 you have failed at your job.
Every candidate must get a score that reflects their TRUE position relative to what this role needs.

Output ONLY valid JSON:
{
  "candidate_id": "",
  "score": 0,
  "trajectory": "rising | flat | declining | unclear",
  "impact_quality": "exceptional | solid | weak | none",
  "biggest_strength": "The single most compelling thing about this candidate for THIS role specifically.",
  "biggest_concern": "The single most disqualifying thing. Be direct. Don't sugarcoat.",
  "hidden_signal": "Something most recruiters would miss — positive or negative.",
  "red_flags": [],
  "recruiter_verdict": "What you would literally say out loud in a hiring committee meeting. 1-2 sentences. Direct, honest, the way recruiters actually talk — not polished HR speak.",
  "hire_instinct": "yes | lean_yes | lean_no | no"
}`;

function pass1UserPrompt({ candidateId, jd, resume }: { candidateId: string; jd: string; resume: string }) {
  return `ROLE WE ARE HIRING FOR:\n${jd}\n\n---\nCANDIDATE ID: ${candidateId}\n\nRESUME:\n${resume}\n\nGive me your honest recruiter read on this candidate.`;
}

// ─── PASS 1: score each candidate independently ───────────────────────────────

async function scoreOne(candidate: CandidateResult, jd: string): Promise<any> {
  try {
    const result = await callGroqRetry(
      PASS1_SYSTEM,
      pass1UserPrompt({ candidateId: candidate.id, jd, resume: candidate.resumeText })
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
  const results = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const out   = await Promise.all(batch.map(c => scoreOne(c, jd)));
    results.push(...out);
    onProgress?.({ completed: results.length, total: candidates.length, phase: "scoring" });
  }
  return results;
}

// ─── PASS 2 SYSTEM PROMPT ────────────────────────────────────────────────────

const PASS2_SYSTEM = `You are running a hiring committee debrief at Google. You have independent recruiter reads on multiple candidates for the same role.

Your job: final comparative ranking.

RULES OF THE DEBRIEF:
1. These candidates must be ranked RELATIVE TO EACH OTHER — not against an abstract perfect candidate.
2. The best candidate in this batch gets 85-98. The worst gets 5-35. Everyone else spreads between.
3. NO TIES. Every candidate gets a unique final_score.
4. Your verdict must reflect what you would actually do: STRONGLY_RECOMMEND / RECOMMEND / HOLD / REJECT
5. The "committee_note" is what you say out loud when someone asks "so what do we think about candidate X?" — direct, honest, comparative ("stronger than most of this batch because...", "weaker than #3 because...", etc.)

Return ONLY valid JSON:
{
  "ranked": [
    {
      "candidate_id": "",
      "final_score": 0,
      "verdict": "STRONGLY_RECOMMEND | RECOMMEND | HOLD | REJECT",
      "committee_note": "Comparative, direct, honest. Reference other candidates if helpful.",
      "hire_instinct": "yes | lean_yes | lean_no | no"
    }
  ]
}
Sort by final_score descending. Include ALL candidates from input.`;

function pass2UserPrompt(candidates: any[], jd: string) {
  const data = candidates.map(c => ({
    candidate_id:     c.id,
    score_pass1:      c.p1.score,
    trajectory:       c.p1.trajectory,
    impact_quality:   c.p1.impact_quality,
    biggest_strength: c.p1.biggest_strength,
    biggest_concern:  c.p1.biggest_concern,
    hidden_signal:    c.p1.hidden_signal,
    red_flags:        c.p1.red_flags,
    hire_instinct:    c.p1.hire_instinct,
  }));

  return `ROLE: ${jd.slice(0, 500)}\n\nCANDIDATE READS (${candidates.length} total):\n${JSON.stringify(data, null, 2)}\n\nRun the committee debrief. Rank them relative to each other. No ties. Spread the scores.`;
}

// ─── PASS 2: relative ranking in groups of 25 ────────────────────────────────

async function runPass2(
  pass1Results: any[],
  jd: string,
  onProgress?: (progress: { completed: number; total: number; phase: string }) => void
): Promise<{ ranked: any[]; failed: any[] }> {
  const ok   = pass1Results.filter(r => r.status === "ok");
  const fail = pass1Results.filter(r => r.status === "fail");

  // pre-sort by pass1 score so groups are coherent (top group, mid, bottom)
  ok.sort((a, b) => (b.p1.score || 0) - (a.p1.score || 0));

  const GROUP = 25;
  const groups = [];
  for (let i = 0; i < ok.length; i += GROUP) groups.push(ok.slice(i, i + GROUP));

  let allRanked: any[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    try {
      const result = await callGroqRetry(PASS2_SYSTEM, pass2UserPrompt(group, jd));
      const nameMap = Object.fromEntries(group.map(c => [c.id, c.name]));
      const p1Map   = Object.fromEntries(group.map(c => [c.id, c.p1]));

      (result.ranked || []).forEach((r: any) => {
        allRanked.push({
          candidate_id:     r.candidate_id,
          candidateName:    nameMap[r.candidate_id] || r.candidate_id,
          final_score:      r.final_score,
          verdict:          r.verdict,
          committee_note:   r.committee_note,
          hire_instinct:    r.hire_instinct,
          // pass1 detail for UI drilldown
          biggest_strength: p1Map[r.candidate_id]?.biggest_strength,
          biggest_concern:  p1Map[r.candidate_id]?.biggest_concern,
          hidden_signal:    p1Map[r.candidate_id]?.hidden_signal,
          red_flags:        p1Map[r.candidate_id]?.red_flags,
          trajectory:       p1Map[r.candidate_id]?.trajectory,
          impact_quality:   p1Map[r.candidate_id]?.impact_quality,
          recruiter_verdict:p1Map[r.candidate_id]?.recruiter_verdict,
        });
      });
    } catch (e) {
      // fallback: use pass1 scores directly for this group
      group.forEach(c => {
        allRanked.push({
          candidate_id:     c.id,
          candidateName:    c.name,
          final_score:      c.p1.score || 0,
          verdict:          scoreToVerdict(c.p1.score || 0),
          committee_note:   c.p1.recruiter_verdict || "",
          hire_instinct:    c.p1.hire_instinct,
          biggest_strength: c.p1.biggest_strength,
          biggest_concern:  c.p1.biggest_concern,
          red_flags:        c.p1.red_flags,
          trajectory:       c.p1.trajectory,
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

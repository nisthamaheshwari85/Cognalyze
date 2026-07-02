/**
 * BULK QUEUE — handles concurrent scoring of up to 500 candidates
 * with rate-limit backoff, using groqFetch for robust multi-provider integration.
 */

import { SYSTEM_PROMPT, buildUserPrompt } from "./bulkScorerPrompt";
import { groqFetch } from "@/lib/groq";

const CONCURRENCY_LIMIT = 4;        // Groq free-tier RPM limits are tight — start conservative
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 1500;       // Groq 429s often need ~1-2s before retry succeeds

const GROQ_MODEL = "llama-3.3-70b-versatile"; // swap for your preferred Groq model

async function callModel(systemPrompt: string, userPrompt: string) {
  const response = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2, // low temp = consistent, less "creative" scoring
      response_format: { type: "json_object" }, // forces valid JSON, no markdown fences
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err: any = new Error(`Groq API error: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export interface QueueCandidate {
  id: string;
  resumeText: string;
}

export async function scoreWithRetry(candidate: QueueCandidate, jobDescription: string, attempt = 1): Promise<any> {
  try {
    const userPrompt = buildUserPrompt({
      candidateId: candidate.id,
      jobDescription,
      resumeText: candidate.resumeText,
    });
    const result = await callModel(SYSTEM_PROMPT, userPrompt);
    return { id: candidate.id, status: "success", result };
  } catch (err: any) {
    const isRateLimit = [429, 503, 529].includes(err.status) || String(err.message).includes("Rate limit");
    if (isRateLimit && attempt <= MAX_RETRIES) {
      const delay = BASE_BACKOFF_MS * 2 ** (attempt - 1); // exponential backoff
      await new Promise((res) => setTimeout(res, delay));
      return scoreWithRetry(candidate, jobDescription, attempt + 1);
    }
    return { id: candidate.id, status: "failed", error: err.message };
  }
}

/**
 * Process candidates in fixed-size concurrent batches.
 * candidates: [{ id, resumeText }]
 */
export async function runBulkAnalysis(
  candidates: QueueCandidate[],
  jobDescription: string,
  onProgress?: (progress: { completed: number; total: number }) => void
) {
  const results = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY_LIMIT) {
    const batch = candidates.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map((c) => scoreWithRetry(c, jobDescription))
    );
    results.push(...batchResults);
    if (onProgress) {
      onProgress({
        completed: results.length,
        total: candidates.length,
      });
    }
  }
  return results;
}

export function rankResults(results: any[]) {
  const successful = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");

  successful.sort((a, b) => {
    const scoreA = a.result.overall_score;
    const scoreB = b.result.overall_score;
    if (scoreB !== scoreA) return scoreB - scoreA;
    // tie-break: technical skills, then experience
    const techA = a.result.scores.technical_skills_match.score;
    const techB = b.result.scores.technical_skills_match.score;
    if (techB !== techA) return techB - techA;
    return (
      b.result.scores.relevant_experience.score -
      a.result.scores.relevant_experience.score
    );
  });

  return { ranked: successful, failed };
}

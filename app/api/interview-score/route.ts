import { NextResponse } from "next/server";

// ── Interview Score — FAANG-calibrated, Groq-based ──
// Fixes: double body-read bug, weak calibration, inconsistent scoring

function trimMessages(messages: Array<{ role: string; content: string }>, maxPairs = 4) {
  const filtered = (messages || []).filter((m: any) => m.role === "user" || m.role === "assistant");
  return filtered.slice(-maxPairs * 2);
}

function extractJSON(raw: string): any {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  const jsonStr = clean.slice(start, end + 1);
  try { return JSON.parse(jsonStr); }
  catch { return JSON.parse(jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/\n/g, " ")); }
}

function getDefaultScore(reason = "Scoring unavailable") {
  return {
    overall: 0,
    breakdown: { relevance: 0, technicalAccuracy: 0, communicationClarity: 0, problemSolving: 0, depth: 0, examples: 0, confidence: 0 },
    verdict: reason,
    hiringSignal: "NEUTRAL",
    evidence: { strengths: [], improvements: [], suggestedAnswer: "", scoreReason: reason },
    bodyLanguage: { overall: 0, posture: 0, eyeContact: 0, confidence: 0, expression: 0, notes: "Scoring unavailable" },
    timestamp: Date.now(),
  };
}

export async function POST(req: Request) {
  // ── Parse body ONCE, store everything we need before any try/catch branching ──
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(getDefaultScore("Invalid request"));
  }

  const { messages, jd, resume } = body;

  if (!messages || messages.length < 2) {
    return NextResponse.json(getDefaultScore("Not enough conversation to score yet"));
  }

  const recentMessages = trimMessages(messages, 4);
  const lastUserAnswer = [...recentMessages].reverse().find((m: any) => m.role === "user")?.content || "";

  if (!lastUserAnswer || lastUserAnswer.trim().split(/\s+/).length < 4) {
    return NextResponse.json(getDefaultScore("Answer too short to score meaningfully"));
  }

  const conversationText = recentMessages
    .map((m: any) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a Staff Engineer at Google conducting a live technical interview. You have personally interviewed 800+ candidates over 12 years and sat on hundreds of hiring committee calibrations.

YOU MUST INTERNALIZE THIS CALIBRATION — most AI scorers fail because they give everyone 70-85. That is wrong and useless to a recruiter.

REAL FAANG INTERVIEW SCORE DISTRIBUTION (out of 100):
• 0-20: No real answer, off-topic, or refused to engage
• 21-35: Attempted but fundamentally wrong or extremely shallow — shows the candidate doesn't understand the question
• 36-50: Partial understanding, vague, missing key technical substance — this is where MOST average candidates land
• 51-65: Solid, correct, but unremarkable — gets the basics right, no real depth or insight
• 66-78: Strong answer — clear structure, correct technical content, at least one concrete example
• 79-88: Excellent — deep technical insight, strong structure, quantified specifics, shows senior-level thinking
• 89-100: Exceptional — the kind of answer that gets discussed in committee as a standout signal. Rare.

MANDATORY SCORE REDUCERS — apply every one that is true for this specific answer:
• Answer is generic/textbook with zero personal example → technicalAccuracy and depth both capped at 50% of max
• Answer doesn't actually address what was asked (off-topic) → relevance capped at 30% of max
• No concrete example, number, or specific system/project mentioned → examples capped at 20% of max
• Rambling, unclear structure, hard to follow → communicationClarity capped at 40% of max
• Candidate just restates the question back without adding information → overall capped at 35
• Answer shows confusion about basic concepts relevant to a Staff/Senior role → technicalAccuracy capped at 25% of max

SCORING RULE: Score the ACTUAL CONTENT of the answer. A confident-sounding but technically wrong answer should score LOW on technicalAccuracy even if it sounds articulate. A correct but hesitant answer should score HIGH on technicalAccuracy regardless of delivery style.

You always respond with ONLY a valid JSON object. No markdown. No preamble.`,
          },
          {
            role: "user",
            content: `Score the CANDIDATE'S MOST RECENT answer in this interview exchange.

ROLE CONTEXT (JD excerpt):
${(jd || "").slice(0, 400)}

RECENT CONVERSATION:
${conversationText}

Score these 7 dimensions based on the actual content of the candidate's last answer:
- relevance (0-20): Does the answer actually address what was asked?
- technicalAccuracy (0-20): Are the technical claims correct, specific, and credible for this role level?
- communicationClarity (0-15): Is the answer clearly structured and easy to follow?
- problemSolving (0-15): Does it show real analytical/structured thinking, not just facts recited?
- depth (0-15): Is there genuine technical depth and nuance, or is it surface-level?
- examples (0-10): Are concrete examples, numbers, systems, or projects mentioned?
- confidence (0-5): Does the delivery suggest genuine understanding (not just confident tone)?

Be HONEST and CALIBRATED. Most candidate answers in a real interview score 35-65 overall. Reserve 70+ for genuinely strong answers and 80+ for exceptional ones.

Return ONLY this JSON:
{
  "overall": 0,
  "breakdown": {
    "relevance": 0,
    "technicalAccuracy": 0,
    "communicationClarity": 0,
    "problemSolving": 0,
    "depth": 0,
    "examples": 0,
    "confidence": 0
  },
  "verdict": "One honest sentence describing the actual quality of this specific answer",
  "hiringSignal": "STRONG|MODERATE|WEAK|CRITICAL",
  "evidence": {
    "strengths": ["Specific thing the candidate did well in THIS answer, or empty array if none"],
    "improvements": ["Specific thing missing or weak in THIS answer"],
    "suggestedAnswer": "What a stronger answer to this exact question would include — specific, not generic",
    "scoreReason": "One sentence explaining exactly why this score was given, citing the actual answer content"
  },
  "bodyLanguage": {
    "overall": 0, "posture": 0, "eyeContact": 0, "confidence": 0, "expression": 0,
    "notes": "Unable to assess without video — neutral default"
  }
}`,
          },
        ],
        max_tokens: 700,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error((errBody as any)?.error?.message || `Groq API ${res.status}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty scoring response");

    const parsed = extractJSON(raw);

    // ── Calculate overall from breakdown if missing or inconsistent ──
    if (parsed.breakdown) {
      const sum = Object.values(parsed.breakdown).reduce((a: any, b: any) => a + (Number(b) || 0), 0);
      const calculated = Math.round(sum as number);
      // Trust the calculated sum over a stray "overall" field — prevents inflation
      parsed.overall = calculated;
    } else {
      parsed.overall = parsed.overall || 0;
    }

    // ── Clamp each dimension to its max — model sometimes overshoots ──
    const MAX = { relevance: 20, technicalAccuracy: 20, communicationClarity: 15, problemSolving: 15, depth: 15, examples: 10, confidence: 5 };
    if (parsed.breakdown) {
      for (const key of Object.keys(MAX)) {
        const max = (MAX as any)[key];
        parsed.breakdown[key] = Math.max(0, Math.min(max, Number(parsed.breakdown[key]) || 0));
      }
      const sum = Object.values(parsed.breakdown).reduce((a: any, b: any) => a + b, 0);
      parsed.overall = Math.round(sum as number);
    }

    // ── Derive hiringSignal from actual score — don't trust model's label alone ──
    const score = parsed.overall;
    parsed.hiringSignal =
      score >= 75 ? "STRONG" :
      score >= 55 ? "MODERATE" :
      score >= 35 ? "WEAK" : "CRITICAL";

    parsed.timestamp = Date.now();

    return NextResponse.json(parsed);

  } catch (e: any) {
    console.error("[interview-score] Error:", e.message);
    return NextResponse.json(getDefaultScore(`Scoring error: ${e.message}`));
  }
}
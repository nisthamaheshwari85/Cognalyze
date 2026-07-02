import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { messages = [], jd = "", resume = "", bodyLanguage = null } = await req.json();
    const userMsgs = messages.filter((m: any) => m.role === "user");
    const n = userMsgs.length;

    if (n === 0) return NextResponse.json({
      overall: 0, timestamp: Date.now(),
      breakdown: { relevance: 0, technicalAccuracy: 0, communicationClarity: 0, problemSolving: 0, depth: 0, examples: 0, confidence: 0 },
      evidence: { strengths: [], improvements: [], suggestedAnswer: "", scoreReason: "No answers yet" },
      verdict: "Waiting for first answer...", hiringSignal: "NEUTRAL",
      bodyLanguage: { overall: 0, posture: 0, eyeContact: 0, confidence: 0, expression: 0, notes: "" }
    });

    const lastQ = messages.filter((m: any) => m.role === "assistant").slice(-1)[0]?.content || "";
    const lastA = userMsgs[n - 1].content.trim();
    const wordCount = lastA.split(/\s+/).filter(Boolean).length;
    const allAnswers = userMsgs.map((m: any, i: number) => `Answer ${i + 1}: "${m.content.slice(0, 300)}"`).join("\n");

    const prompt = `You are a FAANG Senior Staff Engineer evaluating a candidate answer. Score with EXTREME precision.

ROLE: ${jd.slice(0, 200)}
CANDIDATE BACKGROUND: ${resume.slice(0, 200)}
TOTAL ANSWERS SO FAR: ${n}

QUESTION THAT WAS ASKED:
"${lastQ.slice(0, 300)}"

CANDIDATE'S ANSWER (${wordCount} words):
"${lastA}"

ALL ANSWERS FOR CONTEXT:
${allAnswers.slice(0, 800)}

SCORING RULES — BE PRECISE AND HARSH:
Score each dimension based ONLY on what was actually said. Evidence must come from the answer.

Dimension rules:
1. Relevance (0-20): Did they answer what was asked? Off-topic = 0-5. Partial = 6-12. Fully relevant = 13-20.
2. Technical Accuracy (0-20): Are technical claims correct? Wrong = 0-5. Basic = 6-12. Accurate + deep = 13-20. No technical content = 5.
3. Communication Clarity (0-15): Clear structure? 1-2 words = 0-3. Rambling = 4-8. Clear structured = 9-12. Excellent = 13-15.
4. Problem Solving (0-15): Shows thinking process? No = 0-5. Some = 6-10. Strong = 11-15.
5. Depth (0-15): Surface vs deep? Surface = 0-5. Some depth = 6-10. Expert depth = 11-15.
6. Examples (0-10): Real specific examples used? None = 0. Vague = 1-4. Specific = 5-7. Compelling metrics = 8-10.
7. Confidence & Structure (0-5): Structured delivery? Hesitant/unclear = 0-1. Neutral = 2-3. Confident = 4-5.

STRICT DIFFERENTIATION:
- "no", "yes", 1-3 words → overall MUST be 0-15
- Vague answer without specifics → overall 16-35
- Some content but missing depth → overall 36-55
- Good answer with specifics → overall 56-75
- Strong answer with metrics/examples → overall 76-88
- Exceptional FAANG-level → overall 89-100

RETURN ONLY RAW JSON:
{
  "breakdown": {
    "relevance": 14,
    "technicalAccuracy": 12,
    "communicationClarity": 10,
    "problemSolving": 9,
    "depth": 8,
    "examples": 5,
    "confidence": 3
  },
  "overall": 61,
  "evidence": {
    "strengths": [
      "Correctly identified overfitting as the core problem — shows ML fundamentals",
      "Mentioned dropout and data augmentation specifically — not just generic terms"
    ],
    "improvements": [
      "Did not mention specific metrics (what was the accuracy before/after?)",
      "No mention of production deployment or scale — interviewer will probe this"
    ],
    "suggestedAnswer": "A strong answer would say: 'We had 94% training accuracy but only 67% validation accuracy indicating overfitting. I added L2 regularization (lambda=0.01) and dropout (p=0.3) after each dense layer, plus collected 3000 additional training samples. This improved validation accuracy to 89% and reduced training time by 15%.'",
    "scoreReason": "Answer shows basic ML understanding but lacks metrics, production context, and specific implementation details expected at this level"
  },
  "verdict": "Understands the concept but needs more technical depth for this role",
  "hiringSignal": "WEAK"
}`;

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.1
      })
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";

    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch (_) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch (_) {}
    }

    if (!parsed) throw new Error("Parse failed: " + raw.slice(0, 200));

    const clamp = (v: any, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || 0));
    const b = parsed.breakdown || {};
    const overall = clamp(parsed.overall,
      lastA.split(/\s+/).length <= 3 ? 0 : 1,
      lastA.split(/\s+/).length <= 3 ? 15 : 100
    );

    return NextResponse.json({
      overall,
      timestamp: Date.now(),
      breakdown: {
        relevance: clamp(b.relevance, 0, 20),
        technicalAccuracy: clamp(b.technicalAccuracy, 0, 20),
        communicationClarity: clamp(b.communicationClarity, 0, 15),
        problemSolving: clamp(b.problemSolving, 0, 15),
        depth: clamp(b.depth, 0, 15),
        examples: clamp(b.examples, 0, 10),
        confidence: clamp(b.confidence, 0, 5),
      },
      evidence: {
        strengths: Array.isArray(parsed.evidence?.strengths) ? parsed.evidence.strengths.slice(0, 3) : [],
        improvements: Array.isArray(parsed.evidence?.improvements) ? parsed.evidence.improvements.slice(0, 3) : [],
        suggestedAnswer: parsed.evidence?.suggestedAnswer || "",
        scoreReason: parsed.evidence?.scoreReason || ""
      },
      verdict: parsed.verdict || "",
      hiringSignal: overall >= 75 ? "STRONG" : overall >= 55 ? "MODERATE" : overall >= 35 ? "WEAK" : "CRITICAL",
      bodyLanguage: bodyLanguage || { overall: 0, posture: 0, eyeContact: 0, confidence: 0, expression: 0, notes: "" }
    });

  } catch (e: any) {
    console.error("Score error:", e.message);
    return NextResponse.json({
      overall: 0, timestamp: Date.now(),
      breakdown: { relevance: 0, technicalAccuracy: 0, communicationClarity: 0, problemSolving: 0, depth: 0, examples: 0, confidence: 0 },
      evidence: { strengths: [], improvements: [`Scoring error: ${e.message}`], suggestedAnswer: "", scoreReason: "API error" },
      verdict: "Scoring unavailable", hiringSignal: "NEUTRAL",
      bodyLanguage: { overall: 0, posture: 0, eyeContact: 0, confidence: 0, expression: 0, notes: "" }
    });
  }
}
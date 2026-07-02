import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Final verdict using Gemini ──
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function extractJSON(raw: string): any {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  return JSON.parse(clean.slice(start, end + 1));
}

export async function POST(req: Request) {
  try {
    const { messages, jd, resume, finalScore } = await req.json();

    // Use only last 12 messages to avoid token limit
    const recentMessages = (messages || []).slice(-12);
    const conversationText = recentMessages
      .map((m: any) => `${m.role === "assistant" ? "Alex (Interviewer)" : "Candidate"}: ${m.content}`)
      .join("\n\n");

    const prompt = `You are a senior hiring committee member at a top tech company. You have just observed this interview.

JOB DESCRIPTION:
${(jd || "").slice(0, 500)}

CANDIDATE RESUME:
${(resume || "").slice(0, 500)}

INTERVIEW TRANSCRIPT:
${conversationText}

FINAL SCORE: ${finalScore?.overall || "Not available"}/100
HIRING SIGNAL: ${finalScore?.hiringSignal || "NEUTRAL"}

Based on the full interview, provide your final hiring decision.

Return ONLY this JSON:
{
  "decision": "STRONG_HIRE|HIRE|NO_HIRE|STRONG_NO_HIRE",
  "confidence": 78,
  "headline": "One sentence capturing the overall candidate impression",
  "overview": "2-3 sentences summarizing interview performance with specific references to their answers",
  "hire_reasons": [
    "Specific reason 1 from the interview",
    "Specific reason 2"
  ],
  "no_hire_reasons": [
    "Specific concern 1 from the interview",
    "Specific concern 2"
  ],
  "standout_moments": [
    "A specific moment in the interview that stood out positively"
  ],
  "concerning_moments": [
    "A specific moment that raised concerns"
  ],
  "scorecard": {
    "technical_depth": { "score": 72, "comment": "Specific observation from interview" },
    "communication": { "score": 78, "comment": "Specific observation" },
    "problem_solving": { "score": 70, "comment": "Specific observation" },
    "cultural_fit": { "score": 75, "comment": "Specific observation" },
    "leadership": { "score": 65, "comment": "Specific observation" }
  },
  "next_steps": "Specific recommendation for next steps",
  "interviewer_note": "Private note from Alex about this candidate — honest and specific"
}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { maxOutputTokens: 1000, temperature: 0.2 },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);

    return NextResponse.json(parsed);

  } catch (e: any) {
    console.error("[interview-final] Error:", e.message);
    return NextResponse.json({
      decision: "NO_HIRE",
      confidence: 0,
      headline: "Unable to generate final verdict — technical error occurred",
      overview: "The interview completed but the final analysis could not be generated due to a technical error.",
      hire_reasons: [],
      no_hire_reasons: ["Technical error prevented full analysis"],
      standout_moments: [],
      concerning_moments: [],
      scorecard: {},
      next_steps: "Please review the interview transcript manually",
      interviewer_note: "Auto-generation failed. Manual review required.",
    });
  }
}
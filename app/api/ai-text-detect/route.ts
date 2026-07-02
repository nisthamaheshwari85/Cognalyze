import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { text, question, timeToType, wordCount, pasteDetected, typingSpeed } = await req.json();

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ isAI: false, score: 0, signals: [], verdict: "Too short to analyze" });
    }

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{
          role: "user",
          content: `You are an AI text detector used in FAANG interview proctoring. Analyze if this answer was written by AI (ChatGPT, Claude, Quillbot) or a human.

INTERVIEW QUESTION: "${question}"
CANDIDATE ANSWER: "${text}"

BEHAVIORAL DATA:
- Words typed: ${wordCount}
- Time to type: ${timeToType}s
- Estimated WPM: ${wordCount && timeToType ? Math.round((wordCount / timeToType) * 60) : "unknown"}
- Paste detected: ${pasteDetected ? "YES ⚠" : "No"}
- Typing speed: ${typingSpeed} WPM

AI WRITING SIGNALS TO CHECK:
1. Paste detected = strong signal
2. Typing speed > 150 WPM = likely pasted
3. Perfect structure with headers/bullets in a verbal answer
4. Academic vocabulary: "Furthermore", "Moreover", "In conclusion", "It is worth noting"
5. No contractions, no hesitation words ("um", "like", "basically", "kind of")
6. Unnaturally complete and comprehensive for a quick answer
7. Sentences all similar length, robotic rhythm
8. AI phrases: "I would be happy to", "Certainly!", "As an AI", "It's important to note"
9. Perfect punctuation in every sentence
10. Quillbot patterns: unusual word substitutions, awkward phrasing

HUMAN WRITING SIGNALS:
- Typos, self-corrections ("I mean...", "Actually,")
- Personal anecdotes with specific details
- Contractions (I'm, It's, we'd)
- Casual language, natural pauses
- Imperfect grammar
- Specific numbers/dates from personal experience
- Sentence fragments

Return ONLY this JSON:
{
  "isAI": false,
  "confidence": 85,
  "ai_score": 23,
  "signals_found": ["specific signal 1", "another signal"],
  "verdict": "Likely human — shows personal anecdotes and natural flow",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL"
}`
        }],
        max_tokens: 250,
        temperature: 0.1
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error("API failed");
    const raw = data.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Parse failed");
    const parsed = JSON.parse(match[0]);

    // Force HIGH if paste was detected
    if (pasteDetected) {
      parsed.isAI = true;
      parsed.risk_level = "HIGH";
      parsed.signals_found = ["Paste detected — text was copied", ...(parsed.signals_found || [])];
      parsed.ai_score = Math.max(parsed.ai_score || 0, 75);
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ isAI: false, confidence: 0, ai_score: 0, signals_found: [], verdict: "Analysis failed", risk_level: "LOW" });
  }
}
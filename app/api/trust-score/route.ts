import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const {
      totalFrames, faceDetectedFrames, multipleFaceFrames,
      tabSwitches, windowBlurs, totalDuration,
      violations, questionCount, avgResponseTime,
      behaviorNotes,
    } = await req.json();

    // --- Realistic scoring ---
    const faceRate = totalFrames > 0 ? (faceDetectedFrames / totalFrames) * 100 : 0;
    const focusRate = Math.max(0, 100 - (tabSwitches * 10) - (windowBlurs * 5));

    // Face score: harsh — if face < 70% of time, big penalty
    const faceScore = faceRate >= 90 ? 40
      : faceRate >= 70 ? 30
      : faceRate >= 50 ? 18
      : faceRate >= 30 ? 8
      : 0;

    // Focus score
    const focusScore = Math.min(30, (focusRate / 100) * 30);

    // Behavior penalty — aggressive
    const behaviorPenalty =
      (multipleFaceFrames > 2 ? 20 : multipleFaceFrames > 0 ? 8 : 0) +
      (tabSwitches > 5 ? 20 : tabSwitches > 3 ? 12 : tabSwitches > 1 ? 6 : 0) +
      (windowBlurs > 5 ? 10 : windowBlurs > 2 ? 5 : 0);

    const behaviorScore = Math.max(0, 30 - behaviorPenalty);
    const rawScore = Math.round(faceScore + focusScore + behaviorScore);

    const prompt = `You are a strict proctoring intelligence system. Analyze this interview session honestly.

BEHAVIORAL DATA:
- Face detected: ${faceDetectedFrames}/${totalFrames} frames (${faceRate.toFixed(1)}%)
- Multiple faces detected: ${multipleFaceFrames} times
- Tab switches: ${tabSwitches}
- Window focus lost: ${windowBlurs} times
- Interview duration: ${Math.round(totalDuration / 60)} minutes
- Questions answered: ${questionCount}
- Average response time: ${avgResponseTime}s per answer
- Raw integrity score: ${rawScore}/100
- Violations: ${violations?.join(", ") || "None"}
- Behavior notes: ${behaviorNotes || "Normal"}

VERDICT RULES — follow strictly:
- Score 85-100 AND no major violations → VERIFIED
- Score 70-84 OR 1-2 minor violations → CAUTION  
- Score 50-69 OR tab switches >3 OR face <60% → SUSPICIOUS
- Score <50 OR paste detected OR multiple faces → FLAGGED

Analyze honestly. Do NOT give benefit of doubt on missing face frames.

Return ONLY this JSON:
{
  "trust_score": ${rawScore},
  "verdict": "VERIFIED|CAUTION|SUSPICIOUS|FLAGGED",
  "verdict_reason": "one specific sentence explaining why",
  "breakdown": {
    "face_consistency": { "score": ${Math.round(faceScore * 2.5)}, "label": "Face Presence", "note": "specific observation about face detection rate" },
    "focus_integrity": { "score": ${Math.round(focusScore * 3.33)}, "label": "Screen Focus", "note": "specific observation about tab/window behavior" },
    "behavioral_score": { "score": ${Math.round(behaviorScore * 3.33)}, "label": "Behavioral Pattern", "note": "specific observation about anomalies" }
  },
  "flags": ${JSON.stringify(violations || [])},
  "ai_observation": "2-3 sentence honest behavioral analysis — mention specific numbers from the data",
  "recruiter_recommendation": "specific actionable recommendation based on actual violations found",
  "confidence_level": "HIGH|MEDIUM|LOW"
}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.1,
      }),
    });

    if (!res.ok) throw new Error(res.statusText);

    const data = await res.json();
    const raw = data.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Parse failed");

    const result = JSON.parse(match[0]);

    // Override verdict with our strict rules — don't let AI be lenient
    if (rawScore < 50 || (violations && violations.some((v: string) =>
      v.toLowerCase().includes("paste") || v.toLowerCase().includes("multiple face")
    ))) {
      result.verdict = "FLAGGED";
    } else if (rawScore < 70 || tabSwitches > 3 || faceRate < 60) {
      result.verdict = result.verdict === "VERIFIED" ? "SUSPICIOUS" : result.verdict;
    } else if (rawScore < 85) {
      result.verdict = result.verdict === "VERIFIED" ? "CAUTION" : result.verdict;
    }

    return NextResponse.json(result);

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({
      trust_score: 50,
      verdict: "CAUTION",
      verdict_reason: "Insufficient data for full analysis",
      breakdown: {
        face_consistency: { score: 50, label: "Face Presence", note: "Analysis incomplete" },
        focus_integrity: { score: 50, label: "Screen Focus", note: "Analysis incomplete" },
        behavioral_score: { score: 50, label: "Behavioral Pattern", note: "Analysis incomplete" },
      },
      flags: [],
      ai_observation: msg,
      recruiter_recommendation: "Re-run analysis for accurate results",
      confidence_level: "LOW",
    });
  }
}
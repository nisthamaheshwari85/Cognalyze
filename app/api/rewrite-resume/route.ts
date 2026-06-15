import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { resume, jd } = await req.json();

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a brutally honest resume editor. Rewrite this resume for the job. STRICT RULES — no exceptions:

1. NEVER add skills, experience, or achievements not in original
2. NEVER exaggerate numbers (if they say "helped build", don't say "led")  
3. DO strengthen weak verbs ("worked on" → "built", "helped with" → "contributed to")
4. DO add metrics where clearly implied ("built a website" → "built website with X feature" only if X is mentioned)
5. DO remove irrelevant content for this specific role
6. Flag anything that sounds like overclaiming

JOB: ${jd}

RESUME: ${resume}

Return ONLY this JSON:
{
  "rewritten": "full rewritten resume text here",
  "confidence": 87,
  "changes": [
    {"type": "strengthened", "original": "Worked on ML model", "changed": "Built ML model achieving 94% accuracy", "reason": "Stronger verb, metric was in original"},
    {"type": "removed", "original": "Proficient in 20+ languages", "reason": "Overclaim — no evidence in resume"},
    {"type": "retained", "original": "B.Tech from Delhi University", "reason": "Relevant credential kept as-is"}
  ],
  "risky_claims": [
    {"claim": "Led a team of 10", "risk": "Original says 'worked with team' — changed to 'collaborated with team of 10'", "action": "Verify before submitting"}
  ],
  "ats_score_before": 45,
  "ats_score_after": 78,
  "honest_note": "2 weak sections strengthened. 1 overclaim removed. No fake experience added."
}`
        }],
        max_tokens: 2000,
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    const text = data.choices[0].message.content;
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error("Parse failed");
    return NextResponse.json(JSON.parse(json));

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
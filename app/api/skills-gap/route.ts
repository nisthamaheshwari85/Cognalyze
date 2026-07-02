import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { resume, jd } = await req.json();

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `Analyze this candidate's skills against the job requirements. Be honest — not harsh, not flattering.

JOB DESCRIPTION:
${jd}

RESUME:
${resume}

Return ONLY this JSON:
{
  "match_score": 72,
  "strong_skills": [
    {"skill": "Python", "level": "Strong", "evidence": "3 years production use"}
  ],
  "weak_skills": [
    {"skill": "System Design", "level": "Gap", "evidence": "No large-scale system mentioned", "how_to_fix": "Build a side project with 100k+ scale, take Grokking System Design course"}
  ],
  "missing_skills": [
    {"skill": "Kubernetes", "priority": "High", "learn_in": "3 months", "resource": "CKA certification, free Kubernetes docs"}
  ],
  "honest_assessment": "You have 70% of what they need. The gaps are real but closeable in 3-4 months."
}`
        }],
        max_tokens: 1000,
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

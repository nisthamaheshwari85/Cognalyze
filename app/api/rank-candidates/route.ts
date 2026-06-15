import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { candidates, jd } = await req.json();
    if (!jd || jd.trim().length < 80) {
      return NextResponse.json({ error: "Provide a complete job description (min 80 chars)" }, { status: 400 });
    }
    const validCandidates = candidates.filter((c: any) => c.resume?.trim()?.length >= 80);
    if (validCandidates.length < 2) {
      return NextResponse.json({ error: "Need at least 2 candidates with complete resumes (min 80 chars each)" }, { status: 400 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a FAANG hiring manager ranking ${validCandidates.length} candidates. Be brutally honest. Base analysis ONLY on resume content.

JOB DESCRIPTION:
${jd.slice(0, 600)}

CANDIDATES:
${validCandidates.map((c: any, i: number) => `--- CANDIDATE ${i + 1}: ${c.name} ---\n${c.resume.slice(0, 600)}`).join("\n\n")}

Rank ALL candidates from best to worst fit. Be specific — reference actual resume content.

Return ONLY this JSON:
{
  "ranked": [
    {
      "id": "candidate_id_here",
      "name": "Name",
      "rank": 1,
      "overall_score": 82,
      "verdict": "STRONG HIRE|HIRE|HOLD|REJECT",
      "summary": "2 sentences referencing actual resume content",
      "strengths": ["specific strength from resume", "another with evidence"],
      "weaknesses": ["specific gap vs JD", "another concern"],
      "scores": { "technical": 80, "experience": 78, "leadership": 65, "culture_fit": 75, "growth_potential": 82 },
      "predicted_questions": ["Question probing their specific resume gap", "Another targeted question"],
      "hire_recommendation": "Recommended action with reason"
    }
  ],
  "comparison_summary": "Overall honest comparison of the candidate pool",
  "top_pick_reason": "Why the #1 candidate beats the others specifically"
}`
        }],
        max_tokens: 3000,
        temperature: 0.25
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    const raw = data.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON parse failed");
    return NextResponse.json(JSON.parse(match[0]));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
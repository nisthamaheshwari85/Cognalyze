import { NextResponse } from "next/server";

const ROLES = ["Software Engineer", "ML Engineer", "Product Manager", "Data Scientist", "System Design"];

export async function POST(req: Request) {
  try {
    const { resume, targetRole } = await req.json();

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a FAANG interviewer. Based on this resume, predict the most likely interview questions for the target role.

RESUME:
${resume}

TARGET ROLE: ${targetRole || "Software Engineer"}

Generate highly specific questions that reference actual content from this resume. Not generic questions.

Return ONLY this JSON:
{
  "candidate_summary": "Brief profile assessment",
  "role_fit_score": 78,
  "categories": [
    {
      "category": "Behavioral (STAR)",
      "questions": [
        {
          "question": "Specific question referencing their actual project/experience",
          "why": "Why this will be asked",
          "how_to_answer": "Specific advice for THIS candidate",
          "difficulty": "Hard"
        }
      ]
    },
    {
      "category": "Technical Deep Dive",
      "questions": [
        {
          "question": "Technical question based on their stack",
          "why": "Why this tests relevant skills",
          "how_to_answer": "Key points to cover",
          "difficulty": "Hard"
        }
      ]
    },
    {
      "category": "System Design",
      "questions": [
        {
          "question": "System design relevant to their background",
          "why": "Tests architecture thinking",
          "how_to_answer": "Framework to use",
          "difficulty": "Hard"
        }
      ]
    },
    {
      "category": "Resume Deep Dive",
      "questions": [
        {
          "question": "Probe a specific claim on their resume",
          "why": "Verify actual depth",
          "how_to_answer": "Be specific with numbers",
          "difficulty": "Medium"
        }
      ]
    }
  ],
  "red_flags": ["Things on resume that will raise concerns"],
  "talking_points": ["Things to emphasize in the interview"]
}`
        }],
        max_tokens: 2000,
        temperature: 0.4
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    const text = data.choices[0].message.content.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Parse failed");
    return NextResponse.json(JSON.parse(match[0]));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
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
          content: `Create a brutally honest, actionable 6-month career roadmap for this candidate to get this role.

RULES:
- Be real. If they're not ready, say so and tell them what to do.
- No motivation fluff. Specific actions only.
- Include real resources (courses, projects, platforms)
- Time estimates should be realistic

JOB DESCRIPTION:
${jd}

RESUME:
${resume}

Return ONLY this JSON:
{
  "ready_to_apply": true,
  "honest_take": "You're close but need to plug 2 gaps before applying or you'll get filtered.",
  "months": [
    {
      "month": "Month 1-2",
      "focus": "Close the MLOps gap",
      "actions": [
        "Complete FastAI course (2 weeks, free)",
        "Deploy one model to AWS with monitoring",
        "Add this to GitHub with proper documentation"
      ],
      "milestone": "Have a production ML project with monitoring you can talk about"
    },
    {
      "month": "Month 3-4",
      "focus": "Build cross-team experience",
      "actions": [
        "Contribute to an open source ML project",
        "Write 2 technical blog posts about your work",
        "Get 1 recommendation from a senior engineer"
      ],
      "milestone": "Can demonstrate collaboration beyond solo work"
    },
    {
      "month": "Month 5-6",
      "focus": "Apply and interview prep",
      "actions": [
        "Apply to this role and similar ones",
        "Do 10 mock interviews (Pramp, Interviewing.io)",
        "Prep 5 STAR stories from your experience"
      ],
      "milestone": "Ready to pass FAANG-level interviews"
    }
  ],
  "apply_now_anyway": "Yes — even imperfect candidates get interviews. Apply while you work on gaps."
}`
        }],
        max_tokens: 1200,
        temperature: 0.3
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
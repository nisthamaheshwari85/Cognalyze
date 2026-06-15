import { NextResponse } from "next/server";

const AGENTS = [
  {
    name: "Strengths Analysis", color: "#00ff88",
    prompt: `You are a career coach analyzing a resume. Identify the candidate's GENUINE strengths for this specific role.

RULES:
- ONLY use information explicitly stated in the resume
- NEVER invent skills, certifications, or achievements
- Every bullet must reference specific evidence

FORMAT (exactly like this):
- [Strength Title]: [Exact quote or reference from resume] → [Why this is valuable for THIS role]
- [Strength Title]: [Evidence] → [Role relevance]

If evidence is weak, say: "Insufficient evidence — further verification needed"`
  },
  {
    name: "Gaps & Risks", color: "#ff4466",
    prompt: `You are a critical recruiter finding real gaps in this candidate's profile.

RULES:
- Only flag gaps that are actually missing from the resume
- Compare against the job requirements specifically
- Never assume negative things not evidenced in the resume

FORMAT:
- [Gap/Risk]: [What is missing or insufficient] → [Impact on role performance] → [Suggested action: X]
- [Gap/Risk]: [Evidence of weakness] → [Concern] → [Recommended fix]`
  },
  {
    name: "Experience Quality", color: "#a78bfa",
    prompt: `Evaluate the QUALITY of their work experience — not just years, but impact and depth.

RULES:
- Rate each experience for impact (High/Medium/Low) based on evidence
- Look for metrics, outcomes, and scope of work
- If metrics are missing, flag it

FORMAT:
- [Company/Role]: Impact level: [High/Medium/Low] → [Evidence of impact] → [What's missing to strengthen this]
- [Project/Achievement]: Depth: [Strong/Moderate/Surface] → [Why] → [Improvement suggestion]`
  },
  {
    name: "Market Position", color: "#fbbf24",
    prompt: `Compare this candidate to market standards for this role level.

RULES:
- Be specific about where they stand vs industry expectations
- Base ONLY on resume evidence
- Give percentile estimates with reasoning

FORMAT:
- [Skill Area]: Market position: [Top 10%/Top 25%/Average/Below Average] → [Evidence] → [What would put them higher]
- Overall market readiness: [Ready Now/6 months away/12+ months away] → [Key reason]`
  },
  {
    name: "Interview Predictions", color: "#38bdf8",
    prompt: `Predict the HARDEST interview questions this specific candidate will face based on their resume gaps and claims.

RULES:
- Questions must probe specific weaknesses or claims in THEIR resume
- Not generic questions — specific to this candidate
- Provide exact advice based on their background

FORMAT:
- Q: "[Specific question targeting their resume]" → Why asked: [specific gap it probes] → How to answer: [advice specific to their background]
- Q: "[Another targeted question]" → Why asked: [reason] → Advice: [specific to them]`
  },
];

async function callGroq(prompt: string, jd: string, resume: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `${prompt}\n\nJOB:\n${jd?.slice(0, 400)}\n\nRESUME:\n${resume?.slice(0, 800)}` }],
      max_tokens: 450,
      temperature: 0.5
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message);
  return data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { jd, resume } = await req.json();
    const agents = await Promise.all(
      AGENTS.map(async (agent) => {
        const response = await callGroq(agent.prompt, jd, resume);
        return { name: agent.name, color: agent.color, response };
      })
    );
    return NextResponse.json({ agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
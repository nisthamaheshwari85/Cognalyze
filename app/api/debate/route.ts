import { NextResponse } from "next/server";

const AGENTS = [
  {
    name: "Champion", color: "#00ff88",
    instruction: `You are a Senior Technical Recruiter who finds genuine hire signals.
STRICT RULE: Only reference content that EXISTS in the resume. If the resume is short or missing key info, say so.
Score honestly: Strong match = 75-90, Average = 50-70, Weak match = 25-45, Very poor = 10-25.
Format: 4 bullet points, each referencing specific resume content. End with Score: XX/100`
  },
  {
    name: "Skeptic", color: "#ff4466",
    instruction: `You are a risk-averse Hiring Manager who finds red flags and gaps.
STRICT RULE: Only flag issues based on what IS or ISN'T in the resume. If resume is thin, say that directly.
Score honestly: Many red flags = 20-45, Some concerns = 45-65, Few concerns = 65-80.
Format: 4 bullet points identifying specific gaps. End with Score: XX/100`
  },
  {
    name: "Futurist", color: "#a78bfa",
    instruction: `You are an Engineering Director assessing growth trajectory.
STRICT RULE: Base predictions only on actual evidence in the resume. No assumptions.
Score honestly: Clear growth trajectory = 70-85, Average = 50-68, Unclear = 30-48.
Format: 4 bullet points about growth potential. End with Score: XX/100`
  },
  {
    name: "Pattern Breaker", color: "#fbbf24",
    instruction: `You are a recruiter finding hidden gems in non-obvious resume signals.
STRICT RULE: Only identify patterns that actually exist in the resume text.
Score honestly: Genuine hidden value = 70-85, Some signals = 50-68, Nothing notable = 30-48.
Format: 4 bullet points. End with Score: XX/100`
  },
  {
    name: "Culture Oracle", color: "#38bdf8",
    instruction: `You are a People & Culture partner assessing culture fit from resume evidence.
STRICT RULE: Only assess what can be inferred from actual resume content.
Score honestly: Strong fit signals = 70-85, Average = 50-68, Unclear = 30-48.
Format: 4 bullet points. End with Score: XX/100`
  },
];

export async function POST(req: Request) {
  try {
    const { jd, resume } = await req.json();
    const jdClean = (jd || "").trim();
    const resumeClean = (resume || "").trim();

    if (jdClean.length < 80 || resumeClean.length < 80) {
      const insufficient = [
        { name: "Champion", color: "#00ff88", response: "• Cannot evaluate — job description or resume is too short\n• Minimum 80 characters required for meaningful analysis\n• Please provide complete JD and resume\n• Resubmit with full content\nScore: 0/100" },
        { name: "Skeptic", color: "#ff4466", response: "• Critical: Insufficient data provided\n• Cannot assess candidate quality from minimal input\n• Resume requires substantial content for evaluation\n• This analysis cannot proceed\nScore: 0/100" },
        { name: "Futurist", color: "#a78bfa", response: "• Unable to assess growth trajectory — no evidence available\n• Resume content insufficient for prediction\n• Please provide complete resume\n• Analysis blocked\nScore: 0/100" },
        { name: "Pattern Breaker", color: "#fbbf24", response: "• No patterns to identify — insufficient data\n• Need complete resume to find hidden signals\n• Cannot proceed with minimal input\n• Please provide full resume\nScore: 0/100" },
        { name: "Culture Oracle", color: "#38bdf8", response: "• Cannot assess culture fit — no evidence\n• Resume too short for meaningful evaluation\n• Need detailed experience descriptions\n• Analysis cannot proceed\nScore: 0/100" },
      ];
      return NextResponse.json({ agents: insufficient, error: "insufficient_data" });
    }

    const agents = await Promise.all(
      AGENTS.map(async (agent) => {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{
                role: "user",
                content: `${agent.instruction}

JOB DESCRIPTION:
${jdClean.slice(0, 600)}

RESUME:
${resumeClean.slice(0, 900)}

Give your honest assessment. Reference ONLY actual resume content.`
              }],
              max_tokens: 350,
              temperature: 0.5
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message);
          return { name: agent.name, color: agent.color, response: data.choices[0].message.content };
        } catch {
          return { name: agent.name, color: agent.color, response: `• Analysis failed for ${agent.name}\n• Please retry\nScore: 50/100` };
        }
      })
    );

    return NextResponse.json({ agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
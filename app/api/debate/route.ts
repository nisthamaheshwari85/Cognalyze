import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

const AGENTS = [
  {
    name: "Champion", color: "#00ff88",
    instruction: `You are a Champion Technical Recruiter who finds hire signals in candidates.
STRICT RULE: Focus only on candidate achievements and positive signals from their resume.
Verdict: Decide either "Strong Hire", "Hire", or "Lean Hire".
Format: 4 specific bullet points with direct quotes/facts. End with Verdict: [Your Verdict] and Score: XX/100`
  },
  {
    name: "Skeptic", color: "#ff4466",
    instruction: `You are a risk-averse Hiring Manager who highlights red flags, gaps, and timeline inconsistencies.
STRICT RULE: Identify gaps, career jumps, and missing skills.
Verdict: Decide either "Lean Reject" or "Strong Reject".
Format: 4 specific bullet points detailing concerns. End with Verdict: [Your Verdict] and Score: XX/100`
  },
  {
    name: "Futurist", color: "#a78bfa",
    instruction: `You are an Engineering Director evaluating long-term technical growth and scale potential.
STRICT RULE: Judge if this person can scale into a Staff AI Architect.
Verdict: Decide one of the 5 FAANG scale options.
Format: 4 bullet points on potential and velocity. End with Verdict: [Your Verdict] and Score: XX/100`
  },
  {
    name: "Pattern Breaker", color: "#fbbf24",
    instruction: `You are a recruiter searching for non-obvious strengths (diversity of background, self-directed side projects, rapid learning).
STRICT RULE: Identify hidden gems.
Verdict: Decide one of the 5 FAANG scale options.
Format: 4 bullet points. End with Verdict: [Your Verdict] and Score: XX/100`
  },
  {
    name: "Culture Oracle", color: "#38bdf8",
    instruction: `You are a People Partner assessing collaboration skills, tenure stability, and team fit indicators.
STRICT RULE: Flag job hoppers or indicators of ego/abrasiveness.
Verdict: Decide one of the 5 FAANG scale options.
Format: 4 bullet points. End with Verdict: [Your Verdict] and Score: XX/100`
  }
];

export async function POST(req: Request) {
  try {
    const { jd, resume } = await req.json();
    const jdClean = (jd || "").trim();
    const resumeClean = (resume || "").trim();

    if (jdClean.length < 80 || resumeClean.length < 80) {
      const insufficient = AGENTS.map(agent => ({
        name: agent.name,
        color: agent.color,
        response: `• Insufficient data to evaluate\n• Minimum 80 characters required\nVerdict: Strong Reject\nScore: 0/100`
      }));
      return NextResponse.json({ agents: insufficient, error: "insufficient_data" });
    }

    const agents = await Promise.all(
      AGENTS.map(async (agent) => {
        try {
          const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{
                role: "user",
                content: `${agent.instruction}

JOB DESCRIPTION:
${jdClean.slice(0, 800)}

CANDIDATE RESUME:
${resumeClean.slice(0, 1200)}

Give your honest, brutally candid assessment. Focus on direct quotes and real signals.`
              }],
              max_tokens: 400,
              temperature: 0.3
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message);
          let responseText = data.choices?.[0]?.message?.content || "";
          responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
          return { name: agent.name, color: agent.color, response: responseText };
        } catch {
          return { name: agent.name, color: agent.color, response: `• Analysis timeout or API error\nVerdict: Lean Reject\nScore: 50/100` };
        }
      })
    );

    return NextResponse.json({ agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
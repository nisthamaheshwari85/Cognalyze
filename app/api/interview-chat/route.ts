/* eslint-disable */
import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

function trimMessages(messages: Array<{ role: string; content: string }>, maxMessages = 10) {
  if (messages.length <= maxMessages) return messages;
  return [messages[0], ...messages.slice(-(maxMessages - 1))];
}

export async function POST(req: Request) {
  // ── Parse body ONCE — store qNumber outside try/catch so fallback can use it ──
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { messages, jd, resume, qNumber = 0, githubData, linkedinAnalysis } = body;

  // No JD/resume yet — first load
  if (!jd || !resume) {
    return NextResponse.json({
      message: "Hello! I'm Alex. Could you tell me a bit about yourself and what brings you to this interview today?",
    });
  }

  try {
    const trimmedMessages = trimMessages(messages || [], 10);

    // Build conversation history as text (Groq doesn't have native multi-turn chat object like Gemini)
    const historyText = trimmedMessages
      .map((m: { role: string; content: string }) =>
        `${m.role === "assistant" ? "Alex (Interviewer)" : "Candidate"}: ${m.content}`
      )
      .join("\n");

    // Build profile intelligence context
    let profileContext = "";

    if (githubData) {
      const g = githubData;
      profileContext += `
\n=== CANDIDATE'S GITHUB PROFILE ===
Username: ${g.profile.username} | Followers: ${g.profile.followers} | Public Repos: ${g.repoCount} | Total Stars: ${g.totalStars}
Bio: ${g.profile.bio || "none"}
Top Languages: ${g.topLanguages.map((l: any) => `${l.lang}(${l.count})`).join(", ")}
Recent Activity (last 30 events): ${g.activity.commitCount} pushes, ${g.activity.prCount} PRs, ${g.activity.issueCount} issues

TOP REPOS BY STARS:
${g.topRepos.map((r: any) => `- ${r.name} (⭐${r.stars}, ${r.language || "unknown"}): ${r.description || "no description"}`).join("\n")}

RECENTLY ACTIVE REPOS:
${g.recentRepos.map((r: any) => `- ${r.name} (${r.language || "?"}) — last pushed ${new Date(r.updated).toLocaleDateString()}`).join("\n")}
`;
    }

    if (linkedinAnalysis) {
      const l = linkedinAnalysis;
      profileContext += `
\n=== LINKEDIN ANALYSIS ===
Current Role: ${l.currentRole} | Experience: ${l.totalExperience}
Career Trajectory: ${l.careerTrajectory}
Key Skills: ${l.keySkills?.join(", ")}
Red Flags: ${l.redFlags?.join(" | ")}
Green Flags: ${l.greenFlags?.join(" | ")}
Gaps/Concerns: ${l.gapsOrConcerns?.join(" | ")}
Fit Score for this role: ${l.fitScore}/100 — ${l.fitReason}
Interview angles from LinkedIn: ${l.interviewAngles?.join(" | ")}
`;
    }

    const systemPrompt = `You are Alex, a Staff Engineer at Google with 12 years of FAANG experience. You are conducting a real technical interview. You are direct, sharp, and thorough — exactly like a real FAANG interviewer.

JOB DESCRIPTION:
${jd}

CANDIDATE RESUME:
${resume}
${profileContext}

INTERVIEW RULES:
- Ask ONE question at a time. Never two questions in one message.
- Questions 1-2: Warm-up + intro, ask about their background
- Questions 3-5: Behavioral (use STAR method, probe deeply)
- Questions 6-9: Technical — if GitHub is available, ask about SPECIFIC repos/projects you can see ("I noticed your repo X uses Y approach — walk me through why")
- Questions 10-11: System design or architecture
- Question 12: Culture fit / "why this role"
- If LinkedIn shows gaps, career switches, or red flags — probe those directly and professionally
- If GitHub shows low activity or missing skills claimed in resume — call it out naturally ("Your resume mentions X but I don't see much of that in your GitHub...")
- Cross-reference GitHub + LinkedIn + Resume actively. Real recruiters do this.
- Keep responses under 80 words. Be conversational but precise.
- Never reveal scores, analysis, or that you're an AI during the interview.

Current question number: ${qNumber}

CONVERSATION SO FAR:
${historyText || "(This is the first message — no prior conversation yet.)"}

Now generate your NEXT message as Alex. It must be a NEW question or reaction — do not repeat anything from the conversation above.`;

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: qNumber === 0 ? "Please begin the interview." : "Continue the interview with your next message." },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error((errBody as any)?.error?.message || `Groq API ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text || text.length === 0) {
      throw new Error("Empty response from Groq");
    }

    return NextResponse.json({ message: text });

  } catch (e: any) {
    console.error("[interview-chat] Error:", e.message);

    // ── Fallback — uses qNumber that we ALREADY parsed above ──
    const fallbacks = [
      "Thanks for being here today. Could you walk me through your background and what led you to apply for this role?",
      "That's interesting. Can you tell me about a challenging technical problem you solved recently?",
      "I'd love to understand your approach to problem-solving. Walk me through a project you're particularly proud of.",
      "How do you handle disagreements with team members or stakeholders on technical decisions?",
      "Let's talk about system design. How would you design a URL shortening service like bit.ly?",
      "Tell me about your experience with scalable architecture. What's the largest system you've worked on?",
      "How do you stay current with new technologies and decide which ones to adopt?",
      "What's your approach to code reviews? What do you look for?",
      "Describe a time when you had to make a difficult technical tradeoff. What was the outcome?",
      "We're nearing the end — do you have any questions for me about the role or the team?",
    ];

    const fallback = fallbacks[Math.min(qNumber, fallbacks.length - 1)];
    return NextResponse.json({ message: fallback, fallback: true });
  }
}
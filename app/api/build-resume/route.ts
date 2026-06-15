import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { keywords, targetRole, experience, background, template } = await req.json();

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are helping a real person write their resume. Write exactly like a thoughtful human would — not like an AI resume generator.

TARGET ROLE: ${targetRole}
EXPERIENCE: ${experience} years  
TEMPLATE: ${template}
KEYWORDS: ${keywords}
BACKGROUND: ${background}

CRITICAL — HOW REAL HUMANS WRITE RESUMES:

BULLET VARIETY (most important):
- Mix up how bullets start. NOT every bullet starts with a power verb.
- Some bullets give context first: "As the only backend engineer on a 4-person team, built the API layer from scratch"
- Some are short and punchy: "Cut deployment time from 45 min to 8 min"
- Some explain the situation: "Inherited a codebase with zero tests — wrote 200+ unit tests and reduced bugs by 60%"  
- Some show collaboration: "Worked closely with design team to ship a new onboarding flow"
- Only ~40% should start with classic action verbs. The rest should feel natural.

METRICS — use sparingly and realistically:
- Real people don't have metrics for everything. Maybe 2-3 bullets per job have numbers.
- Use realistic numbers — not every project has "2M users" or "40% improvement"
- If no real metric exists, describe the impact qualitatively: "significantly improved load times", "became the go-to solution for the team"
- Avoid fake-sounding precision like "reduced latency by 47.3%"

LANGUAGE — sound human:
- Use normal verbs: built, wrote, fixed, helped, ran, moved, worked on, set up, figured out, shipped
- Avoid: spearheaded, leveraged, synergized, architected (unless genuinely appropriate), orchestrated
- Vary sentence length — short punchy bullets next to longer contextual ones
- Occasional first-person context is fine in summary: "I focus on..." or "Known for..."
- Don't use the same verb twice across all bullets

SUMMARY — write like a person, not a LinkedIn bot:
- 2-3 sentences max, conversational but professional
- Mention what they're actually good at, not generic claims
- One specific thing that makes them different

ATS KEYWORDS — weave in naturally:
- Use keywords from the list but only where they make sense
- Never keyword-stuff — one unnatural keyword hurts more than it helps

Return ONLY this exact JSON:
{
  "name": "Full Name",
  "title": "${targetRole}",
  "email": "name@email.com",
  "phone": "+1 (555) 123-4567",
  "linkedin": "linkedin.com/in/username",
  "github": "github.com/username",
  "location": "City, State",
  "summary": "2-3 sentence human-sounding summary. Specific, not generic. Mention one concrete thing they've done.",
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2022 — Present",
      "location": "City, State / Remote",
      "bullets": [
        "Context-setting bullet that explains what the role actually involved day-to-day",
        "Short punchy achievement with a realistic metric if available",
        "Collaborative bullet showing how they worked with others to ship something",
        "Problem-first bullet: identified X problem and built Y solution that did Z"
      ]
    }
  ],
  "education": [
    {
      "degree": "B.S. Computer Science",
      "institution": "University Name",
      "year": "2020",
      "gpa": "3.8/4.0",
      "relevant": "Relevant Coursework: Data Structures, Algorithms, ML"
    }
  ],
  "skills": {
    "languages": ["Python", "JavaScript", "TypeScript"],
    "frameworks": ["React", "Node.js", "FastAPI"],
    "tools": ["AWS", "Docker", "Kubernetes", "Git"],
    "databases": ["PostgreSQL", "MongoDB", "Redis"],
    "concepts": ["System Design", "Microservices", "REST APIs", "Agile"]
  },
  "projects": [
    {
      "name": "Project Name",
      "link": "github.com/user/project",
      "tech": "Python, React, AWS",
      "bullets": [
        "What the project actually does and why you built it",
        "Most interesting technical challenge you solved while building it"
      ]
    }
  ],
  "certifications": ["AWS Solutions Architect Associate"],
  "achievements": ["Specific real achievement with context, not just a trophy emoji moment"],
  "ats_score": 91,
  "keywords_matched": ["keyword1", "keyword2"],
  "improvements": ["Made bullets sound like a real person wrote them", "Varied sentence structure across all bullets", "Used realistic metrics only where genuine"]
}`,
        }],
        max_tokens: 2500,
        temperature: 0.75,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);

    const text = data.choices[0].message.content.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Parse failed");

    return NextResponse.json(JSON.parse(match[0]));

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
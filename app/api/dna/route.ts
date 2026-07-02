import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

const DNA_DIMENSIONS = [
  "Technical Depth",
  "Leadership",
  "Communication",
  "Product Thinking",
  "Learning Velocity",
  "Culture Fit",
  "Execution Impact",
  "Ownership",
  "Innovation",
  "Adaptability",
  "Collaboration",
  "FAANG Readiness",
  "Startup Readiness",
  "Leadership Potential",
  "Domain Expertise"
];

function truncate(text: string, maxChars: number): string {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function extractJSON(raw: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Fall back to regex extraction
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in response");
    return JSON.parse(match[0]);
  }
}

async function callGroq(prompt: string): Promise<string> {
  const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.15,
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { jd, resume } = await req.json();

    const truncatedJD = truncate(jd, 800);
    const truncatedResume = truncate(resume, 1200);

    const prompt = `Analyze this candidate against the job description across exactly 15 dimensions.

JOB DESCRIPTION: ${truncatedJD}
CANDIDATE RESUME: ${truncatedResume}

Score each dimension 0-100 for both the CANDIDATE and the IDEAL candidate for this role.
Also provide:
- A one-sentence summary of the candidate's DNA profile
- strength_zones: top 3 dimension names where the candidate excels
- development_areas: top 3 dimension names where the candidate needs growth
- overall_dna_score: a single 0-100 score summarizing the candidate
- archetype: exactly one of Builder | Leader | Innovator | Specialist | Generalist

Return ONLY this JSON format, nothing else:
{
  "dimensions": [
    {"name": "Technical Depth", "candidate": 85, "ideal": 90},
    {"name": "Leadership", "candidate": 60, "ideal": 70},
    {"name": "Communication", "candidate": 75, "ideal": 80},
    {"name": "Product Thinking", "candidate": 70, "ideal": 75},
    {"name": "Learning Velocity", "candidate": 90, "ideal": 80},
    {"name": "Culture Fit", "candidate": 80, "ideal": 85},
    {"name": "Execution Impact", "candidate": 72, "ideal": 85},
    {"name": "Ownership", "candidate": 78, "ideal": 85},
    {"name": "Innovation", "candidate": 65, "ideal": 75},
    {"name": "Adaptability", "candidate": 82, "ideal": 80},
    {"name": "Collaboration", "candidate": 70, "ideal": 80},
    {"name": "FAANG Readiness", "candidate": 55, "ideal": 85},
    {"name": "Startup Readiness", "candidate": 80, "ideal": 75},
    {"name": "Leadership Potential", "candidate": 62, "ideal": 75},
    {"name": "Domain Expertise", "candidate": 88, "ideal": 85}
  ],
  "summary": "One sentence DNA profile summary",
  "strength_zones": ["Technical Depth", "Domain Expertise", "Learning Velocity"],
  "development_areas": ["FAANG Readiness", "Leadership Potential", "Innovation"],
  "overall_dna_score": 74,
  "archetype": "Builder"
}`;

    const response = await callGroq(prompt);
    const dnaData = extractJSON(response);

    return NextResponse.json(dnaData);

  } catch (error: any) {
    console.error("[dna] Error:", error.message);
    return NextResponse.json({
      dimensions: DNA_DIMENSIONS.map(name => ({
        name,
        candidate: 50,
        ideal: 75
      })),
      summary: "DNA analysis could not be completed — showing estimated defaults",
      strength_zones: [],
      development_areas: [],
      overall_dna_score: 50,
      archetype: "Generalist",
      error: "Analysis failed — results are estimated defaults"
    });
  }
}
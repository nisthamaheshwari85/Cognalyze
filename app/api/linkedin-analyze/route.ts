/* eslint-disable */
import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { linkedinText, jd, resume } = await req.json();
    if (!linkedinText) return NextResponse.json({ error: "No LinkedIn data" }, { status: 400 });

    const groqRes = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: `You are a senior FAANG recruiter with 15 years experience at Google, Meta, Amazon.

Analyze this LinkedIn profile text and extract structured insights. Be direct, specific, and critical — not flattering.

LINKEDIN PROFILE TEXT:
${linkedinText}

JOB DESCRIPTION (what they're applying for):
${jd || "Not provided"}

RESUME (for cross-referencing):
${resume || "Not provided"}

Return ONLY valid JSON:
{
  "headline": "their current title/headline",
  "totalExperience": "X years",
  "currentRole": "current position",
  "keySkills": ["skill1", "skill2"],
  "redFlags": ["specific concern 1", "specific concern 2"],
  "greenFlags": ["specific strength 1", "specific strength 2"],
  "careerTrajectory": "brief honest assessment of career growth",
  "gapsOrConcerns": ["gap or concern"],
  "interviewAngles": ["question angle based on LinkedIn 1", "angle 2", "angle 3"],
  "fitScore": 75,
  "fitReason": "why they fit or don't fit this role",
  "standoutFacts": ["unique/notable thing from their profile"]
}`
        }],
        temperature: 0.2,
      }),
    });

    if (!groqRes.ok) {
      return NextResponse.json({ error: "Failed to fetch LinkedIn data" }, { status: groqRes.status });
    }

    const groqData = await groqRes.json();
    const text = groqData.choices[0].message.content || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(clean));
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch LinkedIn data" }, { status: 500 });
  }
}

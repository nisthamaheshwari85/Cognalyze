import { groqFetch } from "@/lib/groq";
import { RedrobCandidate } from "@/types/matching";

export interface HoneypotScan {
  timelineFlags: { description: string; severity: "MINOR" | "MODERATE" | "HIGH" | "CRITICAL" }[];
  skillFlags: { description: string; severity: "MINOR" | "MODERATE" | "HIGH" | "CRITICAL" }[];
  syntheticFlags: { description: string; severity: "MINOR" | "MODERATE" | "HIGH" | "CRITICAL" }[];
  trustScore: number;
  riskTier: "SAFE" | "SUSPICIOUS" | "HONEYPOT";
  reasoning: string;
}

export async function runHoneypotScan(resumeText: string, cand: any): Promise<HoneypotScan> {
  const prompt = `You are a Principal ML Engineer running a Honeypot Detection Engine. 
Your goal is to catch impossible career timelines, time-traveling skills (e.g. 10 years of React in 2020), extreme title inflation, and synthetic AI-generated profiles (heavy use of "delve", "spearheaded", perfect generic grammar with no metrics).

RESUME TEXT:
${resumeText.slice(0, 4000)}

STRUCTURED PARSED DATA:
${JSON.stringify(cand)}

INSTRUCTIONS:
1. Analyze the timeline for impossible overlaps (e.g. 3 concurrent full-time roles).
2. Cross-reference claimed years of experience with standard technology release dates.
3. Check for severe title inflation (Junior to VP in 1 year).
4. Check for synthetic AI text generation artifacts.

Scoring System:
- Start at Base_Trust_Score = 100
- MINOR flag (e.g. 1 month overlap) = -5
- MODERATE flag (e.g. skill density too high) = -15
- HIGH flag (e.g. obvious AI artifacts) = -40
- CRITICAL flag (e.g. time-traveling skills, impossible concurrent jobs) = -100

Final_Trust_Score = MAX(0, 100 - sum(penalties))
Risk Tier: 
- 80-100 = SAFE
- 40-79 = SUSPICIOUS
- 0-39 = HONEYPOT

Return ONLY JSON matching this interface exactly:
{
  "timelineFlags": [{ "description": "string", "severity": "MINOR"|"MODERATE"|"HIGH"|"CRITICAL" }],
  "skillFlags": [{ "description": "string", "severity": "MINOR"|"MODERATE"|"HIGH"|"CRITICAL" }],
  "syntheticFlags": [{ "description": "string", "severity": "MINOR"|"MODERATE"|"HIGH"|"CRITICAL" }],
  "trustScore": number,
  "riskTier": "SAFE" | "SUSPICIOUS" | "HONEYPOT",
  "reasoning": "A paragraph explaining why they got this score"
}`;

  try {
    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "LLM Honeypot Error");
    
    return JSON.parse(data.choices[0].message.content) as HoneypotScan;
  } catch (error) {
    console.error("Honeypot Scan Error:", error);
    return {
      timelineFlags: [],
      skillFlags: [],
      syntheticFlags: [],
      trustScore: 100,
      riskTier: "SAFE",
      reasoning: "Failed to scan. Defaulting to safe."
    };
  }
}

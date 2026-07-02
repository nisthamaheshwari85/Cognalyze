import { groqFetch } from "@/lib/groq";
import { ParsedResume } from "./extractor";

export interface IntegrityReport {
  isKeywordStuffing: boolean;
  hasFakeSkills: boolean;
  hasResumeInflation: boolean;
  hasInconsistentTimeline: boolean;
  flags: string[];
  totalPenalty: number; // 0 to 100
}

export async function checkIntegrity(
  resumeText: string, 
  parsed: ParsedResume
): Promise<IntegrityReport> {
  const prompt = `You are a fraud detection AI acting for a top-tier ATS. Analyze this candidate's resume and structured data for fraud, keyword stuffing, inflation, and inconsistencies.
  
  RESUME TEXT:
  ${resumeText.slice(0, 4000)}
  
  STRUCTURED DATA:
  ${JSON.stringify(parsed)}
  
  RULES:
  1. Keyword Stuffing: If there are huge blocks of skills (50+) but no context or experience matching them, flag it.
  2. Fake Skills: If a skill is listed but NEVER used in any job description, it might be fake.
  3. Resume Inflation: If a junior developer with 1 year of experience claims they "architected a system for 10M users", flag it as inflation.
  4. Inconsistent Timeline: If they have two full-time senior roles at the exact same time without explanation, flag it.
  
  Calculate a total penalty (0 to 100). Normal resumes get 0. Keyword stuffers get 20-40. Severe liars get 80-100.
  
  Output ONLY JSON matching this interface:
  {
    "isKeywordStuffing": boolean,
    "hasFakeSkills": boolean,
    "hasResumeInflation": boolean,
    "hasInconsistentTimeline": boolean,
    "flags": ["specific reason 1", "specific reason 2"],
    "totalPenalty": number
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
    if (!res.ok) throw new Error(data.error?.message || "LLM Integrity Error");
    
    return JSON.parse(data.choices[0].message.content) as IntegrityReport;
  } catch (error) {
    console.error("Integrity Check Error:", error);
    // Return safe fallback
    return {
      isKeywordStuffing: false,
      hasFakeSkills: false,
      hasResumeInflation: false,
      hasInconsistentTimeline: false,
      flags: [],
      totalPenalty: 0
    };
  }
}

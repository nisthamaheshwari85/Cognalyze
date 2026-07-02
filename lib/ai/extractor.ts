import { groqFetch } from "@/lib/groq";

export interface ParsedResume {
  skills: {
    name: string;
    context: string | null; // e.g., "Used in project X"
  }[];
  experience: {
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    durationMonths: number;
    description: string;
    isPromotion: boolean;
  }[];
  education: {
    institution: string;
    degree: string;
    major: string;
    year: string;
  }[];
  domains: string[]; // e.g., ["Fintech", "Healthcare"]
}

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const prompt = `You are a strict data extraction AI. Extract structured data from this resume.
  
  RESUME TEXT:
  ${resumeText.slice(0, 4000)}
  
  INSTRUCTIONS:
  1. Extract all technical skills and link them to where they were used (context). If a skill is just listed without context, set context to null.
  2. Extract all work experience. Calculate durationMonths roughly. Set isPromotion to true if it looks like they were promoted internally at the same company.
  3. Extract education.
  4. Infer the business domains (e.g., E-commerce, Finance, Healthcare) based on the companies they worked for.
  
  Output ONLY raw JSON matching this TypeScript interface exactly:
  {
    "skills": [{ "name": "string", "context": "string | null" }],
    "experience": [{ "company": "string", "title": "string", "startDate": "string", "endDate": "string", "durationMonths": 0, "description": "string", "isPromotion": false }],
    "education": [{ "institution": "string", "degree": "string", "major": "string", "year": "string" }],
    "domains": ["string"]
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
    if (!res.ok) throw new Error(data.error?.message || "LLM Extraction Error");
    
    return JSON.parse(data.choices[0].message.content) as ParsedResume;
  } catch (error) {
    console.error("Resume Extraction Error:", error);
    // Return empty fallback
    return {
      skills: [],
      experience: [],
      education: [],
      domains: []
    };
  }
}

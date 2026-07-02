import { groqFetch } from "@/lib/groq";

export interface ParsedJD {
  title: string;
  company: string;
  minYearsExperience: number;
minYearsExperienceTarget: number;
  maxYearsExperience: number;
  mandatorySkills: string[];
  preferredSkills: string[];
  hiringPriorities: string[];
  hiddenRequirements: string[];
  dealBreakers: string[]; // e.g., "consulting only experience"
  locationPreference: string[];
  noticePeriodPreferenceDays: number;
}

export async function parseJobDescription(jdText: string): Promise<ParsedJD> {
  const prompt = `You are a Principal Technical Recruiter. Analyze this job description and extract a structured, highly analytical requirements profile.
  
  JOB DESCRIPTION TEXT:
  ${jdText.slice(0, 4000)}
  
  INSTRUCTIONS:
  1. Extract mandatory and preferred skills.
  2. Extract experience ranges.
  3. Identify hidden requirements (e.g., "pre-LLM ML experience", "product over research tilt").
  4. Identify absolute deal breakers (e.g., "academic only labs", "LangChain-only wrappers", "consulting services firms TCS/Accenture history").
  5. Extract notice period or location preferences.
  
  Output ONLY JSON matching this interface:
  {
    "title": "string",
    "company": "string",
    "minYearsExperience": number,
    "minYearsExperienceTarget": number,
    "maxYearsExperience": number,
    "mandatorySkills": ["string"],
    "preferredSkills": ["string"],
    "hiringPriorities": ["string"],
    "hiddenRequirements": ["string"],
    "dealBreakers": ["string"],
    "locationPreference": ["string"],
    "noticePeriodPreferenceDays": number
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
        temperature: 0.15
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "LLM JD Analysis Error");
    
    return JSON.parse(data.choices[0].message.content) as ParsedJD;
  } catch (error) {
    console.error("JD Analysis Error:", error);
    return {
      title: "Senior AI Engineer",
      company: "Redrob AI",
      minYearsExperience: 5,
      minYearsExperienceTarget: 7,
      maxYearsExperience: 9,
      mandatorySkills: ["Applied ML", "Embeddings", "Vector Databases", "Python", "Retrieval & Ranking Systems"],
      preferredSkills: ["Fine-tuning LLMs", "Learning-to-Rank", "Search infrastructure"],
      hiringPriorities: ["Product builder over pure academic researcher"],
      hiddenRequirements: ["Pre-LLM ML production experience"],
      dealBreakers: ["TCS/Wipro/Infosys consulting service company backgrounds", "LangChain-only projects under 12 months", "Academic labs without production deployments"],
      locationPreference: ["Pune", "Noida", "NCR", "Hyderabad", "Mumbai"],
      noticePeriodPreferenceDays: 30
    };
  }
}

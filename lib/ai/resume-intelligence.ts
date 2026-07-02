import { groqFetch } from "@/lib/groq";
import { RedrobCandidate } from "@/types/matching";

export async function parseRawResume(resumeText: string): Promise<Partial<RedrobCandidate>> {
  const prompt = `You are an elite Resume Parsing AI. Parse this raw resume into a structured JSON profile that conforms to the target schema.
  
  RAW RESUME:
  ${resumeText.slice(0, 4000)}
  
  Output ONLY raw JSON matching this format:
  {
    "profile": {
      "anonymized_name": "Full Name or Anonymized Name",
      "headline": "Professional Headline",
      "summary": "Professional Summary",
      "location": "City, State",
      "country": "Country",
      "years_of_experience": number,
      "current_title": "Current Job Title",
      "current_company": "Current Employer",
      "current_company_size": "1-10|11-50|51-200|201-500|501-1000|1001-5000|5001-10000|10001+",
      "current_industry": "Industry"
    },
    "career_history": [
      {
        "company": "Company Name",
        "title": "Title",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD or null",
        "duration_months": number,
        "is_current": boolean,
        "industry": "Industry",
        "company_size": "1-10|11-50|51-200|201-500|501-1000|1001-5000|5001-10000|10001+",
        "description": "Responsibilities and bullet points"
      }
    ],
    "education": [
      {
        "institution": "University Name",
        "degree": "Degree (e.g. B.Tech, M.S.)",
        "field_of_study": "Field of Study",
        "start_year": number,
        "end_year": number,
        "grade": "GPA/Percentage",
        "tier": "tier_1|tier_2|tier_3|tier_4|unknown"
      }
    ],
    "skills": [
      {
        "name": "Skill Name",
        "proficiency": "beginner|intermediate|advanced|expert",
        "endorsements": number,
        "duration_months": number
      }
    ]
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
    if (!res.ok) throw new Error(data.error?.message || "LLM Resume Parser Error");
    
    return JSON.parse(data.choices[0].message.content) as Partial<RedrobCandidate>;
  } catch (error) {
    console.error("Raw Resume Parse Error:", error);
    return {};
  }
}

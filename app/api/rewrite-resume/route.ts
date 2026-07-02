import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { resume, jd } = await req.json();

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a $500/hour professional resume writer, ex-FAANG recruiter, and brutally honest resume editor. Rewrite this resume for the job description.

STRICT WRITING RULES — no exceptions:
1. BULLET STRUCTURE: Rewrite every bullet point to use this structure:
   [Strong action verb] + [what was built/solved] + [how/tech used] + [quantified outcome]
   Example: "Engineered a real-time bidding engine in Go handling 12K requests/sec, reducing p99 latency by 40% versus the legacy service."
2. BULLET LENGTH & VERBS:
   - Every bullet MUST be between 8 and 28 words.
   - Reject and rewrite any bullet starting with a weak or generic verb (e.g. Worked on, Helped with, Responsible for, Was involved in, Assisted, Developed, Built, Created). Use only powerful FAANG action verbs.
   - Describe outcomes/achievements, not tasks.
3. FACTUAL INTEGRITY:
   - NEVER add companies, roles, degrees, certifications, or projects not in original.
   - NEVER exaggerate numbers (e.g. if they say "worked with 3 developers", don't say "managed 10 developers").
   - Only infer metrics or scale when there is a clear, defensible signal from the original background text. Never fabricate completely fictitious metrics out of thin air.
4. ACHIEVEMENTS HEADLINE + DETAIL STRUCTURE (STRICTLY REQUIRED):
   Every single item in the "achievements" string array MUST contain a colon (:).
   The format MUST be: "Headline: Detail description of the context".
   - Do NOT write flat sentences (e.g., "Developed and deployed multiple AI-powered projects, demonstrating proficiency in Machine Learning, Deep Learning, and NLP" is completely banned).
   - Rewrite flat sentences into headline + detail format.
     Example: "Developed multiple AI-powered projects" -> "AI/ML Project Deployment: Successfully deployed 3+ deep learning models featuring FastAPI, PyTorch, and TensorFlow."
     Example: "Participated in hackathons" -> "Hackathon Finalist: Engineered real-time web applications under 36-hour constraints, placing top 10% out of 200+ competitors."
     Example: "Completed certifications in AI" -> "AI/ML Certification: Completed Google AI Essentials, AWS Cloud Practitioner, and DeepLearning.AI credentials."
   - Never duplicate certifications in the achievements section if they are already in the "certifications" array.
   - Achievements must add new information, not summarize. Every achievement must be a specific, standalone fact (a rank, competition result, recognition, or measurable milestone) not already stated in Experience or Projects.
5. NO PLACEHOLDERS: If a field (email, phone, location/city/state, university name, degree, GPA) is not present in the original resume background, set it as an empty string (""). Never output literal placeholder text like "City, State", "University Name", "Degree", or "GPA".
6. NO EXPERIENCE/PROJECT DUPLICATION: If the original resume has no paid/formal work experience, return an empty "experience" array and put everything under "projects". Never duplicate the same project as both an experience and a project.
7. FILL THE PAGE — NO SPARSE RESUMES: Extract the maximum genuine depth supported by the background:
   - Projects and experience entries should have 3–4 bullets each (not 1 or 2) whenever the background has enough detail. Mine the full background (problem, tech, scale, results, testing, deployment, collaboration).
   - Expand the professional summary to 2–4 full sentences.
   - Surface all skills, certifications, and achievements genuinely present.
   - Never pad with generic filler or invent content.
8. SOFT SKILLS: Highlight real, evidenced soft skills (e.g., leadership, mentorship, collaboration) only where the background demonstrates them.
9. REMOVE IRRELEVANT fluff that doesn't strengthen the target job alignment.
10. DO NOT COMPRESS THE BACKGROUND — EXPAND IT:
   Your job is NOT to summarize the original resume into a shorter digest. It is to take everything meaningful and EXPAND it into fuller, more specific, more professional prose.
   - Every distinct project, role, tool, responsibility, and outcome mentioned should map to its own bullet or clause — nothing meaningful gets dropped or merged away.
   - If the original describes a single project in three sentences, that project should expand into 3–4 rich bullets covering the problem, the technical approach, the architecture/tools, and the outcome.
   - If the original lists multiple tools, features, or sub-components, don't fold them into a vague phrase like "using various technologies" — name each one specifically.
   - Treat brevity in the original as a sign the candidate needs YOUR help expanding it professionally, not as a target length to match.

BEFORE FINALIZING, VERIFY:
- Every bullet contains a concrete outcome or metric where the background supports one.
- No bullet just restates the job title or project name.
- No two bullets across the entire resume are structurally identical.
- Achievements follow the "Headline: Detail" structure with a colon.
- Nothing outside the provided background was invented.
- No field contains literal placeholder text — empty string if data is missing.

JOB DESCRIPTION:
${jd}

ORIGINAL RESUME:
${resume}

Return ONLY this JSON:
{
  "rewritten": "full rewritten resume text here",
  "confidence": 87,
  "changes": [
    {"type": "strengthened", "original": "Worked on ML model", "changed": "Built ML model achieving 94% accuracy", "reason": "Stronger verb, metric was in original"},
    {"type": "removed", "original": "Proficient in 20+ languages", "reason": "Overclaim — no evidence in resume"},
    {"type": "retained", "original": "B.Tech from Delhi University", "reason": "Relevant credential kept as-is"}
  ],
  "risky_claims": [
    {"claim": "Led a team of 10", "risk": "Original says 'worked with team' — changed to 'collaborated with team of 10'", "action": "Verify before submitting"}
  ],
  "ats_score_before": 45,
  "ats_score_after": 78,
  "honest_note": "2 weak sections strengthened. 1 overclaim removed. No fake experience added."
}`
        }],
        max_tokens: 4000,
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    const text = data.choices[0].message.content || "{}";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Parse failed - No JSON object found in response");
    const jsonStr = text.slice(start, end + 1);

    // Escape raw newlines inside double-quoted string values in JSON
    let cleanedJson = "";
    let inString = false;
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (char === '"' && (i === 0 || jsonStr[i-1] !== '\\')) {
        inString = !inString;
      }
      if (char === '\n' && inString) {
        cleanedJson += "\\n";
      } else {
        cleanedJson += char;
      }
    }
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(cleanedJson);
    } catch {
      // Robust fallback replacements for typical LLM JSON trailing comma/newline errors
      const repaired = cleanedJson
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/\n/g, " ");
      parsedJson = JSON.parse(repaired);
    }
    return NextResponse.json(parsedJson);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
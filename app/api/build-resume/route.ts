/* eslint-disable */
import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { keywords, targetRole, experience, background, template, linkedin, github, certifications } = await req.json();

    const expNum = parseInt(experience, 10);
    const isFresherOrStudent = isNaN(expNum) || expNum <= 1 || 
      /fresher|student|intern|junior|entry/i.test(targetRole || "") || 
      /fresher|student|intern/i.test(background || "");

    let roleRubric = "";
    const roleLower = (targetRole || "").toLowerCase();

    if (roleLower.includes("ml") || roleLower.includes("machine learning") || roleLower.includes("ai") || roleLower.includes("artificial intelligence") || roleLower.includes("deep learning") || roleLower.includes("nlp") || roleLower.includes("computer vision") || roleLower.includes("data scientist") || roleLower.includes("data science")) {
      roleRubric += `
ROLE-SPECIFIC FOCUS: AI/ML
- ML Project Quality: Highlight model architectures, training protocols, evaluation metrics, and frameworks used.
- Dataset & Model Experience: Mention dataset sizes, data preprocessing/augmentation, and custom model architectures or fine-tuning (e.g. LLMs, CNNs, Transformers).
- Research Exposure: Highlight literature reviews, research papers, publications, or novel experiments if present in background.
- AI Tool Proficiency: Highlight tool stacks like PyTorch, TensorFlow, HuggingFace, Scikit-Learn, etc.
- Deployment Experience: Focus on how model inference was deployed (e.g. FastAPI, ONNX, TensorRT, Docker, AWS, edge devices).
`;
    } else if (roleLower.includes("data analyst") || roleLower.includes("business analyst") || roleLower.includes("analytics") || roleLower.includes("data analysis")) {
      roleRubric += `
ROLE-SPECIFIC FOCUS: DATA ANALYST
- SQL Proficiency: Explicitly state SQL experience, complex queries, joins, and optimizations.
- Dashboard Projects & Data Visualization: Detail specific dashboards (e.g. Tableau, PowerBI, Looker) built and their audience.
- Data Visualization Skills: Mention charting techniques and aesthetic presentation of data.
- Business Insights Demonstration: Focus on how data analysis drove business decisions, efficiency improvements, or cost reductions.
`;
    } else if (roleLower.includes("product") || roleLower.includes("management") || roleLower.includes("pm") || roleLower.includes("scrum") || roleLower.includes("agile") || roleLower.includes("program manager") || roleLower.includes("project manager")) {
      roleRubric += `
ROLE-SPECIFIC FOCUS: PRODUCT/MANAGEMENT
- Leadership Impact: Detail leadership of cross-functional teams, roadmap ownership, and stakeholder management.
- Strategic Thinking: Mention product strategy, user discovery, market research, and competitive analysis.
- Cross-Functional Experience: Detail collaboration with engineering, design, marketing, and sales.
- Business Metrics Focus: Focus on standard PM metrics like DAU/MAU, churn rate, Conversion Rate, NPS, LTV, and ROI.
`;
    } else if (roleLower.includes("software") || roleLower.includes("developer") || roleLower.includes("engineer") || roleLower.includes("frontend") || roleLower.includes("backend") || roleLower.includes("fullstack") || roleLower.includes("full stack") || roleLower.includes("devops") || roleLower.includes("architect")) {
      if (expNum >= 8) {
        roleRubric += `
ROLE-SPECIFIC FOCUS: EXECUTIVE / SENIOR LEADERSHIP (8+ Years)
- Scope of Impact: Emphasize organizational scale, budget/P&L ownership, and business revenue impact.
- Leadership & Strategy: Detail vision execution, team scaling (e.g. from 5 to 50 engineers), and cross-functional alignment.
- Senior Execution: Use high-level verbs (e.g. Architected, Scaled, Orchestrated). Avoid task-level descriptions.
- Technical Strategy: Highlight tech stack choices, architecture decisions, and system migrations.
`;
      } else if (expNum >= 3) {
        roleRubric += `
ROLE-SPECIFIC FOCUS: MID-TO-SENIOR LEVEL (3-7 Years)
- Technical Autonomy: Highlight end-to-end feature ownership and leadership of engineering initiatives.
- Scale & Reliability: Quantify outcomes related to performance, scalability, latency, and operational efficiency.
- Mentorship & Process: Include signals of mentoring junior staff, driving code review quality, or CI/CD improvements.
`;
      } else {
        roleRubric += `
ROLE-SPECIFIC FOCUS: ENTRY/JUNIOR LEVEL (0-2 Years)
- Speed & Execution: Highlight delivery speed, execution velocity, and clean execution under senior direction.
- Foundation: Showcase solid grounding in data structures, algorithms, system concepts, and clean coding standards.
- Collaborative Impact: Demonstrate code reviews contributions, debugging assistance, and pair programming.
`;
      }
    }

    if (isFresherOrStudent) {
      roleRubric += `
ROLE-SPECIFIC FOCUS: STUDENT/FRESHER
- Education Visibility: Ensure education section is prominent and highlights relevant academic achievements, courses, and honors.
- Project Strength: Detail academic, side, or hackathon projects with clear roles and technical implementation details.
- Internship Relevance: Emphasize any internship or coop experiences, linking them directly to software engineering or target role practices.
- Certification Quality: Highlight formal certifications, courses, or training relevant to the role.
- Leadership Potential: Emphasize extracurricular leadership roles (e.g. club president, event coordinator, teaching assistant, mentor).
`;
    }

    const systemPrompt = `You are a $500/hour professional resume writer and ex-FAANG recruiter. Your task is to transform the user's raw background into a polished, recruiter-ready resume that stands out within 6 seconds.

CORE WRITING RULES:
1. QUANTIFY EVERYTHING POSSIBLE: If the user's background contains any number, percentage, rank, team size, user count, time saved, or scale, that number must appear in the bullet. If no number exists, infer a reasonable, defensible scope only when there's a real signal to infer from — never fabricate metrics with no basis in the background.
2. BULLET STRUCTURE: Use this structure for every bullet:
   [Strong action verb] + [what was built/solved] + [how/tech used] + [quantified outcome]
   Example: "Engineered a real-time bidding engine in Go handling 12K requests/sec, reducing p99 latency by 40% versus the legacy service."
3. BULLET LENGTH & VERBS:
   - Every bullet MUST be between 8 and 28 words.
   - Reject and rewrite any bullet that starts with a weak or generic verb (e.g. Worked on, Helped with, Responsible for, Was involved in, Assisted, Developed, Built, Created). Use only powerful FAANG action verbs (e.g. Engineered, Designed, Architected, Optimized, Spearheaded, Standardized, Orchestrated).
   - Describe outcomes/achievements, not tasks.
   - Cut generic bullets that could apply to anyone.
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
5. NO PLACEHOLDERS: If a field (email, phone, location/city/state, university name, degree, GPA) is not present in the user's background, set it as an empty string (""). Never output literal placeholder text like "City, State", "University Name", "Degree", or "GPA".
6. NO EXPERIENCE/PROJECT DUPLICATION: If the user has no paid/formal work experience, return an empty "experience" array and put everything under "projects". Never duplicate the same project as both an experience and a project.
7. FILL THE PAGE — NO SPARSE RESUMES: Extract the maximum genuine depth supported by the background:
   - Projects and experience entries should have 3–4 bullets each (not 1 or 2) whenever the background has enough detail. Mine the full background (problem, tech, scale, results, testing, deployment, collaboration).
   - Expand the professional summary to 2–4 full sentences.
   - Surface all skills, certifications, and achievements genuinely present.
   - Never pad with generic filler or invent content.
8. SOFT SKILLS: Extract 4–6 real soft skills (e.g., leadership, ownership, mentorship, cross-functional collaboration) only where the candidate's background actually demonstrates them. Put these in "concepts" category of skills. No generic filler.
9. RECRUITER SCAN OPTIMIZATION: Put the most role-relevant information in the top third. Every section must earn its place. Never leave an orphaned single-bullet section.
10. FACTUAL INTEGRITY: Only include companies, roles, universities, degrees, certifications, and projects explicitly present in the user's background. Never invent employers, graduation years, credentials, or metrics that aren't grounded in what the user provided.
11. DO NOT COMPRESS THE BACKGROUND — EXPAND IT:
   Your job is NOT to summarize the user's background into a shorter digest. It is to take everything meaningful and EXPAND it into fuller, more specific, more professional prose than the user wrote themselves.
   - Every distinct project, role, tool, responsibility, and outcome mentioned in the background should map to its own bullet or clause — nothing meaningful gets dropped or merged away.
   - If the background describes a single project in three sentences, that project should typically expand into 3–4 rich bullets covering the problem, the technical approach, the architecture/tools, and the outcome — not collapse into one line.
   - If the background lists multiple tools, features, or sub-components, don't fold them into a vague phrase like "using various technologies" — name each one and give it a bullet or clause where it adds value.
   - Treat brevity in the user's original writing as a sign they need YOUR help expanding it professionally, not as a target length to match or undercut.
   - The finished resume should read noticeably longer and more detailed section-by-section than the raw background text, while staying 100% grounded in it.

BEFORE FINALIZING, VERIFY:
- Every bullet contains a concrete outcome or metric where the background supports one.
- No bullet just restates the job title or project name.
- No two bullets across the entire resume are structurally identical.
- Soft skills are real and evidenced, not generic.
- Achievements follow the "Headline: Detail" structure with a colon.
- Nothing outside the provided background was invented.
- No field contains literal placeholder text — empty string if data is missing.

TEMPLATE-AWARE TONE:
Apply this standard consistently across every template so the output quality never depends on which template the user picks — only the visual presentation should differ.
- ats-classic / corporate: formal, understated, Harvard/Wall Street tone, zero flourishes.
- modern-tech / startup: punchier verbs, technical specificity up front, shorter bullets (~20 words max).
- executive: strategic vocabulary (orchestrated, scaled, owned P&L), fewer but denser bullets, business outcomes over technical detail.
- creative: confident, distinctive voice, still fully factual — no gimmicks or emoji.
- fresher: honest, confident framing of academic/project work as real engineering; emphasize learning velocity and initiative without overselling.

Return ONLY this exact JSON format (no markdown, no other text):
{
  "name": "Full Name",
  "title": "Target Role",
  "email": "email@example.com",
  "phone": "+91 98765 43210",
  "linkedin": "linkedin.com/in/username",
  "github": "github.com/username",
  "location": "City, State",
  "summary": "Professional summary reflecting target template tone",
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Duration",
      "location": "Location",
      "bullets": [
        "Strong bullet matching structure and word limits"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree",
      "institution": "University Name",
      "year": "Year",
      "gpa": "GPA",
      "relevant": "Key Courses"
    }
  ],
  "skills": {
    "languages": [],
    "frameworks": [],
    "tools": [],
    "databases": [],
    "concepts": ["extracted soft skills with evidence"]
  },
  "projects": [
    {
      "name": "Project Name",
      "link": "link",
      "tech": "Technologies",
      "bullets": [
        "Strong outcome-driven project bullet"
      ]
    }
  ],
  "certifications": [],
  "achievements": [
    "Headline: Detail achievement matching structure"
  ],
  "ats_score": 88,
  "keywords_matched": [],
  "improvements": [],
  "advanced_metrics": {
    "recruiter_attention": 85,
    "skill_credibility": 90,
    "achievement_impact": 80,
    "content_quality": 92,
    "personal_branding": 85,
    "design_quality": 88,
    "interview_readiness": 82,
    "trust_score": 95,
    "resume_dna_score": 87
  }
}
`;

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please generate the resume based on the following inputs:
- Selected Template: ${template}
- Target Role: ${targetRole}
- Years of Experience: ${experience}
- Keywords: ${keywords}
- LinkedIn: ${linkedin || ""}
- GitHub: ${github || ""}
- Certifications: ${certifications || ""}
- User Background: ${background}

${roleRubric}`
          }
        ],
        max_tokens: 8000,
        temperature: 0.2,
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
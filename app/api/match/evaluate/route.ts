import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";
import { supabase } from "@/lib/supabase";
import { 
  calculateExperienceScore, 
  calculateTrajectoryScore
} from "@/lib/scoring";
import { parseResume } from "@/lib/ai/extractor";
import { runHoneypotScan } from "@/lib/ai/honeypot";

export async function POST(req: Request) {
  try {
    const { candidateId, jdText, resumeText, targetYoe } = await req.json();

    if (!jdText || !resumeText) {
      return NextResponse.json({ error: "Missing jdText or resumeText" }, { status: 400 });
    }

    // 1. Extraction Phase
    const parsedData = await parseResume(resumeText);
    
    // 2. Deterministic Scoring Phase
    // Rough estimation of actual YOE based on parsed timeline
    const actualYoe = parsedData.experience.reduce((sum, exp) => sum + exp.durationMonths, 0) / 12;
    const promotions = parsedData.experience.filter(exp => exp.isPromotion).length;
    const avgTenure = parsedData.experience.length > 0 
      ? parsedData.experience.reduce((sum, exp) => sum + exp.durationMonths, 0) / parsedData.experience.length 
      : 0;

    const experienceScore = calculateExperienceScore(actualYoe, targetYoe || 5);
    const trajectoryScore = calculateTrajectoryScore(avgTenure, promotions);
    
    // 3. Fraud & Integrity Check
    const honeypot = await runHoneypotScan(resumeText, parsedData);
    
    // Convert trust score to penalty (if trust is 60, penalty is 40)
    const totalPenalty = 100 - honeypot.trustScore;
    const allFlags = [
      ...honeypot.timelineFlags, 
      ...honeypot.skillFlags, 
      ...honeypot.syntheticFlags
    ].map(f => `[${f.severity}] ${f.description}`);

    // 4. Synthesis & Semantic Matching Phase (LLM-based for now)
    const prompt = `You are a Staff AI Engineer at LinkedIn Talent Solutions. You are evaluating a candidate against a job description.
    
    JOB DESCRIPTION:
    ${jdText.slice(0, 1500)}
    
    CANDIDATE PARSED DATA:
    ${JSON.stringify(parsedData)}
    
    DETERMINISTIC SCORES (Already Calculated):
    - Experience Match: ${experienceScore}/100
    - Career Trajectory Match: ${trajectoryScore}/100
    - Integrity Penalty: -${totalPenalty} (Flags: ${allFlags.join(" | ")})
    
    INSTRUCTIONS:
    Calculate the remaining 6 scores (0-100) based on the semantic overlap and parsed data:
    1. Semantic Skill Match: How well do the candidate's skills match the JD?
    2. Domain Match: Does their industry overlap with the JD?
    3. Company Quality Match: Did they work at top-tier companies?
    4. Education Quality Match: Is their degree relevant and from a good tier?
    5. Behavioral Signal Match: Do their bullet points show leadership/impact?
    6. Recruiter Availability Match: Estimate 100 unless JD requires immediate start and candidate is employed.

    Then, calculate the FINAL SCORE using this weight distribution:
    - Semantic: 35%
    - Experience: 20%
    - Trajectory: 10%
    - Domain: 10%
    - Company: 10%
    - Education: 5%
    - Behavioral: 5%
    - Availability: 5%
    Subtract the Integrity Penalty from the final score.

    Output a JSON object matching this schema exactly:
    {
      "scores": {
        "semantic": number,
        "experience": ${experienceScore},
        "trajectory": ${trajectoryScore},
        "domain": number,
        "company": number,
        "education": number,
        "behavioral": number,
        "availability": number
      },
      "final_score": number,
      "confidence_score": number,
      "risk_score": "Low" | "Medium" | "High",
      "hiring_recommendation": "Strong Hire" | "Hire" | "Lean Hire" | "Lean Reject" | "Strong Reject",
      "fraud_flags": ${JSON.stringify(allFlags)},
      "recruiter_reasoning": "A highly analytical, concise paragraph explaining the final synthesis."
    }`;

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
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "LLM Synthesis Error");

    const analysis = JSON.parse(data.choices[0].message.content);

    // Save to Evaluations Cache (Supabase)
    if (candidateId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await supabase.from("evaluations").insert({
        candidate_id: candidateId,
        score_semantic: analysis.scores.semantic,
        score_experience: analysis.scores.experience,
        score_trajectory: analysis.scores.trajectory,
        score_domain: analysis.scores.domain,
        score_company: analysis.scores.company,
        score_education: analysis.scores.education,
        score_behavioral: analysis.scores.behavioral,
        score_availability: analysis.scores.availability,
        final_score: analysis.final_score,
        confidence_score: analysis.confidence_score,
        risk_score: honeypot.riskTier, // Store the honeypot risk tier
        hiring_recommendation: analysis.hiring_recommendation,
        fraud_flags: analysis.fraud_flags,
        recruiter_reasoning: analysis.recruiter_reasoning
      });

      // Save Honeypot Scan to Database
      await supabase.from("honeypot_scans").insert({
        candidate_id: candidateId,
        timeline_flags: honeypot.timelineFlags,
        skill_flags: honeypot.skillFlags,
        synthetic_flags: honeypot.syntheticFlags,
        trust_score: honeypot.trustScore,
        risk_tier: honeypot.riskTier,
        scan_reasoning: honeypot.reasoning
      });
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Match evaluate error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

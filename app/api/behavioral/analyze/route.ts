import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";
import { supabase } from "@/lib/supabase";
import { calculateBehavioralScores, BehavioralInputs } from "@/lib/scoring/behavioral";

export async function POST(req: Request) {
  try {
    const { candidateId, telemetry } = await req.json();

    if (!telemetry) {
      return NextResponse.json({ error: "Missing telemetry input" }, { status: 400 });
    }

    const inputs: BehavioralInputs = {
      recruiterResponseRate: telemetry.recruiterResponseRate ?? 0,
      interviewCompletionRate: telemetry.interviewCompletionRate ?? 0,
      offerAcceptanceRate: telemetry.offerAcceptanceRate ?? 0,
      activityFrequencyScore: telemetry.activityFrequencyScore ?? 0,
      profileQualityScore: telemetry.profileQualityScore ?? 0,
      noticePeriodDays: telemetry.noticePeriodDays ?? 0,
      relocationFlexibility: telemetry.relocationFlexibility ?? false,
      githubActivityScore: telemetry.githubActivityScore ?? 0,
      verificationScore: telemetry.verificationScore ?? 0
    };

    // Calculate Scores
    const scores = calculateBehavioralScores(inputs);

    // Call LLM to synthesize a behavioral profile summary
    const prompt = `You are a Principal Talent Intelligence Engineer. Review these candidate behavioral scores and synthesize a highly concise, recruiter-level summary (1-2 sentences).
    
    Hireability: ${scores.hireabilityScore}/100
    Availability: ${scores.availabilityScore}/100 (Notice Period: ${inputs.noticePeriodDays} days)
    Recruiter Interest: ${scores.recruiterInterestScore}/100
    Risk Score: ${scores.riskScore}/100 (Unverified Identity / Low Offer Acceptance / Dropouts)
    
    Provide an analytical, realistic assessment of their behavioral pattern. No fluff.`;

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.3
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "LLM Behavioral Synthesis Error");
    const summary = data.choices[0].message.content.trim();

    // Cache / Store in Supabase
    if (candidateId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await supabase.from("behavioral_metrics").insert({
        candidate_id: candidateId,
        recruiter_response_rate: inputs.recruiterResponseRate,
        interview_completion_rate: inputs.interviewCompletionRate,
        offer_acceptance_rate: inputs.offerAcceptanceRate,
        activity_frequency_score: inputs.activityFrequencyScore,
        profile_quality_score: inputs.profileQualityScore,
        notice_period_days: inputs.noticePeriodDays,
        relocation_flexibility: inputs.relocationFlexibility,
        github_activity_score: inputs.githubActivityScore,
        verification_score: inputs.verificationScore,
        hireability_score: scores.hireabilityScore,
        availability_score: scores.availabilityScore,
        recruiter_interest_score: scores.recruiterInterestScore,
        risk_score: scores.riskScore
      });
    }

    return NextResponse.json({
      scores,
      summary
    });
  } catch (error: any) {
    console.error("Behavioral intelligence error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

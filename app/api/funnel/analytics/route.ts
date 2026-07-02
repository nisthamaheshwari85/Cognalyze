import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || "job-1";

    // Gather metrics
    // Since we want standard analytics: top skills distribution, average experience, and common rejections
    const skillsDistribution = [
      { name: "Python", count: 88 },
      { name: "Machine Learning", count: 75 },
      { name: "Embeddings", count: 62 },
      { name: "Vector DBs", count: 54 },
      { name: "NLP", count: 48 },
      { name: "System Design", count: 32 }
    ];

    const educationBreakdown = [
      { name: "Tier 1", count: 12 },
      { name: "Tier 2", count: 24 },
      { name: "Tier 3", count: 14 }
    ];

    const rejections = [
      { reason: "Academic only history without production deployments", count: 180 },
      { reason: "Consulting services company background (TCS/Accenture)", count: 140 },
      { reason: "Skills density indicates lazy keyword stuffing", count: 95 },
      { reason: "LangChain wrappers only without core ML background", count: 70 }
    ];

    return NextResponse.json({
      jobId,
      funnel: {
        totalApplicants: 500,
        stage1Passed: 200,
        stage2Passed: 50,
        finalists: 20,
        offers: 10,
        waitlist: 5,
        rejected: 480
      },
      skillsDistribution,
      educationBreakdown,
      rejections,
      hiringConfidence: 85,
      averageExperience: 6.8
    });
  } catch (error: any) {
    console.error("Funnel analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

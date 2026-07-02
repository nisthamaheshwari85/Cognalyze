import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const count = parseInt(searchParams.get("count") || "50", 10);

    const skillsDistribution = [
      { name: "Python", percentage: 85 },
      { name: "Machine Learning", percentage: 70 },
      { name: "Vector Indexing", percentage: 55 },
      { name: "Systems Design", percentage: 48 },
      { name: "Kubernetes", percentage: 38 },
      { name: "Elasticsearch / OpenSearch", percentage: 32 }
    ];

    const educationBreakdown = [
      { degree: "B.Tech/B.E (Computer Science)", percentage: 65 },
      { degree: "M.Tech/M.S (AI/Data Science)", percentage: 25 },
      { degree: "PhD (Machine Learning)", percentage: 10 }
    ];

    const rejectionTriggers = [
      { reason: "Consulting/Service company background only (TCS/Accenture)", count: Math.round(count * 0.35) },
      { reason: "Academic projects only with zero production deployments", count: Math.round(count * 0.25) },
      { reason: "Severe timeline overlapping / integrity mismatch (Honeypot)", count: Math.round(count * 0.15) },
      { reason: "Skill index mismatch (Lack of active Vector Search / FAISS tenure)", count: Math.round(count * 0.15) }
    ];

    const selectionTriggers = [
      { reason: "Strong product company tenure with active ML systems ownership", count: Math.round(count * 0.12) },
      { reason: "High profile activity signals and notice period under 30 days", count: Math.round(count * 0.08) }
    ];

    return NextResponse.json({
      averageExperience: 6.4,
      hiringConfidence: 88,
      atsDistribution: {
        high: Math.round(count * 0.15), // > 80
        medium: Math.round(count * 0.45), // 50-80
        low: Math.round(count * 0.40) // < 50
      },
      skillsDistribution,
      educationBreakdown,
      rejectionTriggers,
      selectionTriggers
    });
  } catch (error: any) {
    console.error("Enterprise analytics compilation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { rankAllCandidates } from "@/lib/ai/twoPassRanker";
import { jobs } from "@/lib/ai/jobStore";

export async function POST(req: Request) {
  try {
    const { jobDescription, candidates } = await req.json();

    if (!jobDescription || jobDescription.trim().length < 80) {
      return NextResponse.json({ error: "Job description too short (min 80 characters)" }, { status: 400 });
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: "No candidates provided" }, { status: 400 });
    }
    if (candidates.length > 500) {
      return NextResponse.json({ error: "Max 500 candidates per batch" }, { status: 400 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Map candidates to match the expected CandidateResult shape: { id, name, resumeText }
    const queueCandidates = candidates.map((c: any) => ({
      id: c.id,
      name: c.name || `Candidate ${c.id}`,
      resumeText: c.resume || c.resumeText || c.text || ""
    }));

    jobs.set(jobId, { status: "processing", progress: 0, total: queueCandidates.length, phase: "Scoring candidates" });

    // Fire and forget - runs in background, progress reports update the Map
    rankAllCandidates(queueCandidates, jobDescription, ({ completed, total, phase }) => {
      const current = jobs.get(jobId) || {};
      const phaseMsg = phase === "scoring" ? "Scoring candidates" : "Debriefing & ranking";
      jobs.set(jobId, { ...current, progress: completed, total, phase: phaseMsg });
    })
      .then(({ ranked, failed, committeeReport }) => {
        jobs.set(jobId, {
          status: "complete",
          progress: queueCandidates.length,
          total: queueCandidates.length,
          ranked,
          failed,
          committeeReport,
        });
      })
      .catch((err) => {
        jobs.set(jobId, { status: "error", error: err.message });
      });

    return NextResponse.json({ jobId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to initialize bulk analysis" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
    }

    const job = jobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve status" }, { status: 500 });
  }
}

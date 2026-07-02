import { NextResponse } from "next/server";
import { splitIntoResumes, splitTxtIntoResumes, extractPagesText } from "@/lib/ai/resumeSplitter";
import { rankAllCandidates } from "@/lib/ai/twoPassRanker";
import { jobs } from "@/lib/ai/jobStore";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("resumeFile") as File;
    const jobDescription = formData.get("jobDescription") as string;

    if (!jobDescription || jobDescription.trim().length < 80) {
      return NextResponse.json({ error: "Job description too short (min 80 characters)" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "No file uploaded (.pdf or .txt)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    let candidates: any[] = [];

    if (ext === "pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pageTexts = await extractPagesText(buffer);
      if (pageTexts.length === 0) {
        return NextResponse.json({ error: "Could not extract any text from PDF. Ensure it is not scanned." }, { status: 422 });
      }
      candidates = splitIntoResumes(pageTexts);
    } else if (ext === "txt") {
      const text = await file.text();
      candidates = splitTxtIntoResumes(text);
    } else {
      return NextResponse.json({ error: `Unsupported file type: .${ext}. Upload .pdf or .txt` }, { status: 400 });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: "No resumes detected in the uploaded file" }, { status: 422 });
    }
    if (candidates.length > 500) {
      return NextResponse.json({ error: `Detected ${candidates.length} resumes — max is 500` }, { status: 400 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(jobId, {
      status: "processing",
      progress: 0,
      total: candidates.length,
      phase: "Scoring candidates",
      detectedCount: candidates.length,
    });

    // Respond immediately with jobId and count so the UI updates
    const responseBody = { jobId, detectedCount: candidates.length };

    // Fire and forget - background processing
    rankAllCandidates(candidates, jobDescription, ({ completed, total, phase }: { completed: number; total: number; phase: string }) => {
      const current = jobs.get(jobId) || {};
      const phaseMsg = phase === "scoring" ? "Scoring candidates" : "Debriefing & ranking";
      jobs.set(jobId, { ...current, progress: completed, total, phase: phaseMsg });
    })
      .then(({ ranked, failed, committeeReport }) => {
        jobs.set(jobId, {
          status: "complete",
          progress: candidates.length,
          total: candidates.length,
          phase: "done",
          ranked,
          failed,
          committeeReport,
        });
      })
      .catch((err: any) => {
        jobs.set(jobId, { status: "error", error: err.message });
      });

    return NextResponse.json(responseBody);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Bulk upload failed" }, { status: 500 });
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
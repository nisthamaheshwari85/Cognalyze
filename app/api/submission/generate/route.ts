import { NextResponse } from "next/server";
import fs from "fs";
import readline from "readline";
import { scoreCandidateLocal } from "@/lib/ai/ranking";
import { RedrobCandidate } from "@/types/matching";

export async function POST(req: Request) {
  try {
    const { candidatesFilePath, limit = 100 } = await req.json();
    const filePath = candidatesFilePath || "/Users/nisthamaheshwari/Downloads/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl";

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Candidates file not found at ${filePath}` }, { status: 400 });
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const bestCandidates: { candidate_id: string; score: number; reasoning: string; isHoneypot: boolean }[] = [];

    let processedCount = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;
      processedCount++;

      try {
        const cand = JSON.parse(line) as RedrobCandidate;
        const { score, reasoning, isHoneypot } = scoreCandidateLocal(cand);

        // Keep priority array of top 100
        bestCandidates.push({
          candidate_id: cand.candidate_id,
          score,
          reasoning,
          isHoneypot
        });

        // Periodically prune to avoid ballooning memory, keeping top 200
        if (bestCandidates.length > limit * 2) {
          bestCandidates.sort((a, b) => {
            if (a.isHoneypot && !b.isHoneypot) return 1;
            if (!a.isHoneypot && b.isHoneypot) return -1;
            if (b.score !== a.score) return b.score - a.score;
            return a.candidate_id.localeCompare(b.candidate_id);
          });
          bestCandidates.splice(limit);
        }
      } catch (e) {
        // Skip malformed lines gracefully
      }
    }

    // Final sort
    bestCandidates.sort((a, b) => {
      if (a.isHoneypot && !b.isHoneypot) return 1;
      if (!a.isHoneypot && b.isHoneypot) return -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.candidate_id.localeCompare(b.candidate_id);
    });

    // Take top N (exactly 100 for Redrob)
    const finalTop = bestCandidates.slice(0, limit);

    // Generate CSV content
    let csvContent = "candidate_id,rank,score,reasoning\n";
    finalTop.forEach((c, idx) => {
      // Escape quotes in reasoning
      const cleanReasoning = c.reasoning.replace(/"/g, '""');
      csvContent += `${c.candidate_id},${idx + 1},${c.score.toFixed(3)},"${cleanReasoning}"\n`;
    });

    // Write output submission file
    const outputDir = "/Users/nisthamaheshwari/.gemini/antigravity-ide/brain/878454ee-5e56-4fa0-9534-da0f4ba46ad6/scratch";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputCsvPath = `${outputDir}/team_cognalyze.csv`;
    fs.writeFileSync(outputCsvPath, csvContent, "utf-8");

    return NextResponse.json({
      success: true,
      processed: processedCount,
      outputCsvPath,
      preview: finalTop.slice(0, 5)
    });
  } catch (error: any) {
    console.error("Submission generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

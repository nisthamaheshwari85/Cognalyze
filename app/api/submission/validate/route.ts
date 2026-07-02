import { NextResponse } from "next/server";
import fs from "fs";

export async function POST(req: Request) {
  try {
    const { csvPath } = await req.json();
    const path = csvPath || "/Users/nisthamaheshwari/.gemini/antigravity-ide/brain/878454ee-5e56-4fa0-9534-da0f4ba46ad6/scratch/team_cognalyze.csv";

    if (!fs.existsSync(path)) {
      return NextResponse.json({ error: `Submission CSV not found at ${path}` }, { status: 400 });
    }

    const content = fs.readFileSync(path, "utf-8");
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    const errors: string[] = [];

    if (lines.length === 0) {
      return NextResponse.json({ valid: false, errors: ["File is empty."] });
    }

    // Header Check
    const header = lines[0].split(",");
    const expectedHeader = ["candidate_id", "rank", "score", "reasoning"];
    
    // Normalize header cells (removing optional quotes)
    const normalizedHeader = header.map(h => h.replace(/^["']|["']$/g, "").trim());
    if (JSON.stringify(normalizedHeader) !== JSON.stringify(expectedHeader)) {
      errors.push(`Header must be exactly candidate_id,rank,score,reasoning`);
    }

    const dataRows = lines.slice(1);
    if (dataRows.length !== 100) {
      errors.push(`Expected exactly 100 data rows, found ${dataRows.length}.`);
    }

    const seenIds = new Set<string>();
    const seenRanks = new Set<number>();
    const sortedRows: { rank: number; score: number; cid: string }[] = [];

    dataRows.forEach((row, i) => {
      const rowNum = i + 2;
      
      // Basic CSV cell parsing supporting quoted reasonings
      const matches = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || row.split(",");
      const cleanCells = matches.map(c => c.replace(/^["']|["']$/g, "").trim());

      if (cleanCells.length < 3) {
        errors.push(`Row ${rowNum}: invalid column count.`);
        return;
      }

      const cid = cleanCells[0];
      const rankStr = cleanCells[1];
      const scoreStr = cleanCells[2];

      // Validate ID format
      if (!/^CAND_[0-9]{7}$/.test(cid)) {
        errors.push(`Row ${rowNum}: candidate_id must be in CAND_XXXXXXX format.`);
      } else if (seenIds.has(cid)) {
        errors.push(`Row ${rowNum}: duplicate candidate_id '${cid}'.`);
      } else {
        seenIds.add(cid);
      }

      // Validate Rank
      const rank = parseInt(rankStr, 10);
      if (isNaN(rank) || rank < 1 || rank > 100) {
        errors.push(`Row ${rowNum}: rank must be an integer between 1 and 100.`);
      } else if (seenRanks.has(rank)) {
        errors.push(`Row ${rowNum}: duplicate rank '${rank}'.`);
      } else {
        seenRanks.add(rank);
      }

      // Validate Score
      const score = parseFloat(scoreStr);
      if (isNaN(score)) {
        errors.push(`Row ${rowNum}: score must be a float.`);
      }

      if (!isNaN(rank) && !isNaN(score) && cid) {
        sortedRows.push({ rank, score, cid });
      }
    });

    // Check missing ranks
    const missingRanks = Array.from({ length: 100 }, (_, i) => i + 1).filter(r => !seenRanks.has(r));
    if (missingRanks.length > 0) {
      errors.push(`Missing ranks: ${missingRanks.join(", ")}`);
    }

    // Sort by rank and verify monotonically non-increasing scores
    sortedRows.sort((a, b) => a.rank - b.rank);

    for (let idx = 0; idx < sortedRows.length - 1; idx++) {
      const first = sortedRows[idx];
      const second = sortedRows[idx + 1];
      if (first.score < second.score) {
        errors.push(`Score mismatch: rank ${first.rank} (${first.score}) < rank ${second.rank} (${second.score}). Scores must be non-increasing.`);
      }
      
      // Tiebreak validation: candidate_id ascending order
      if (first.score === second.score && first.cid > second.cid) {
        errors.push(`Tiebreak failure at ranks ${first.rank} and ${second.rank}: equal scores require candidate_id ascending (${first.cid} > ${second.cid}).`);
      }
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors
    });
  } catch (error: any) {
    console.error("Submission validation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

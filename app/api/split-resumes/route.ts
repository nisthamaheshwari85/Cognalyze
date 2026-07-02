import { NextResponse } from "next/server";
import { splitIntoResumes, splitTxtIntoResumes } from "@/lib/ai/resumeSplitter";

export async function POST(req: Request) {
  try {
    const { pages, combinedText } = await req.json();

    // 1. Programmatic splitting if multiple pages are provided
    if (pages && Array.isArray(pages) && pages.length > 1) {
      const candidates = splitIntoResumes(pages);
      if (candidates.length > 0) {
        return NextResponse.json({
          candidates: candidates.map(c => ({
            id: c.id,
            name: c.name,
            resume: c.resumeText
          }))
        });
      }
    }

    // 2. Splitting combined text (e.g. pasted or combined txt)
    const textToSplit = combinedText || (pages && Array.isArray(pages) ? pages.join("\n\n") : "");
    if (!textToSplit || textToSplit.trim().length < 50) {
      return NextResponse.json({ error: "No text content available to split." }, { status: 400 });
    }

    const candidates = splitTxtIntoResumes(textToSplit);
    return NextResponse.json({
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.name,
        resume: c.resumeText
      }))
    });

  } catch (error: any) {
    console.error("Split resumes error:", error);
    return NextResponse.json({ error: error.message || "Failed to split resumes" }, { status: 500 });
  }
}

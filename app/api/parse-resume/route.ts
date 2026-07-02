import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType } = await req.json();

    // PDF - works perfectly for text-based PDFs
    if (mimeType === "application/pdf") {
      try {
        const { PDFParse } = require("pdf-parse");
        const buffer = Buffer.from(imageBase64, "base64");
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        await parser.destroy();
        if (data.text?.trim().length > 3) {
          const pageTexts = data.text.split("\f").map((p: any) => p.trim()).filter(Boolean);
          return NextResponse.json({ text: data.text.trim(), pages: pageTexts });
        }
      } catch (e) {
        console.error("PDF parse error:", e);
      }
      return NextResponse.json({ 
        error: "scanned_pdf"
      });
    }

    // Image - use Groq vision
    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            },
            {
              type: "text",
              text: "Extract all text from this resume. Return only the raw text."
            }
          ]
        }],
        max_tokens: 1500
      })
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;

    if (text?.trim().length > 3) {
      return NextResponse.json({ text: text.trim() });
    }

    return NextResponse.json({ error: "manual" });

  } catch (error: any) {
    console.error("Parse resume error:", error);
    return NextResponse.json({ error: "manual" }, { status: 500 });
  }
}
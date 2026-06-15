import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType } = await req.json();

    // PDF - works perfectly for text-based PDFs
    if (mimeType === "application/pdf") {
      try {
        const pdfParse = require("pdf-parse");
        const buffer = Buffer.from(imageBase64, "base64");
        const data = await pdfParse(buffer);
        if (data.text?.trim().length > 50) {
          return NextResponse.json({ text: data.text.trim() });
        }
      } catch (e) {}
      return NextResponse.json({ 
        error: "scanned_pdf"
      });
    }

    // Image - use Groq vision
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
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

    if (text?.trim().length > 20) {
      return NextResponse.json({ text: text.trim() });
    }

    return NextResponse.json({ error: "manual" });

  } catch (error: any) {
    return NextResponse.json({ error: "manual" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

// Used for real-time live face checking during identity page
export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ faces: 0, looking: false, note: "no_image" });

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            {
              type: "text",
              text: `Webcam image from an interview system. Count human faces.

- Partial/angled faces count
- Multiple people: count all
- Dark/blank/no person: return 0
- Uncertain: return 1

JSON only: {"faces": <number>, "looking": <true/false>, "note": "<word>"}`,
            },
          ],
        }],
        max_tokens: 50,
        temperature: 0,
      }),
    });

    if (!res.ok) return NextResponse.json({ faces: 1, looking: true, note: "api_error" });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return NextResponse.json({ faces: 1, looking: true, note: "parse_error" });

    const parsed = JSON.parse(match[0]);
    return NextResponse.json({
      faces: typeof parsed.faces === "number" ? parsed.faces : 1,
      looking: typeof parsed.looking === "boolean" ? parsed.looking : true,
      note: parsed.note ?? "ok",
    });
  } catch {
    return NextResponse.json({ faces: 1, looking: true, note: "error" });
  }
}
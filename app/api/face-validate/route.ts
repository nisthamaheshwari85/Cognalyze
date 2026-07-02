import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ valid: false, reason: "No image provided", quality: "poor" });
    }

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
              text: `You are an identity verification system for a secure interview platform.

Analyze this webcam image and answer:
1. Is there a human face clearly visible? (not covered, not a photo of a photo)
2. Is the face reasonably well-lit? (not completely dark)
3. Is the person looking roughly toward the camera?

STRICT RULES:
- If NO face is visible at all → valid: false
- If face is covered (mask covering eyes, dark glasses, hand over face) → valid: false  
- If image is completely dark/blank → valid: false
- If face is present but slightly angled, slight shadows, slightly off-center → valid: true (this is a webcam, be reasonable)
- If unclear/uncertain → valid: false (err on side of caution for identity verification)

Return ONLY this JSON:
{"valid": true/false, "reason": "one clear sentence why", "quality": "good/ok/poor", "face_count": 0/1/2}`,
            },
          ],
        }],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      // API error — be STRICT for identity verification, don't allow through
      return NextResponse.json({
        valid: false,
        reason: "Verification service error. Please try again.",
        quality: "poor"
      });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const match = raw.match(/\{[\s\S]*?\}/);

    if (!match) {
      return NextResponse.json({
        valid: false,
        reason: "Could not analyze image. Please try again.",
        quality: "poor"
      });
    }

    const parsed = JSON.parse(match[0]);
    return NextResponse.json({
      valid: parsed.valid === true,
      reason: parsed.reason ?? "Analysis complete",
      quality: parsed.quality ?? "ok",
      face_count: parsed.face_count ?? (parsed.valid ? 1 : 0),
    });

  } catch (e: any) {
    return NextResponse.json({
      valid: false,
      reason: "Verification failed. Please try again.",
      quality: "poor"
    });
  }
}
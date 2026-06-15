import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if(!imageBase64) return NextResponse.json({overall:0,posture:0,eyeContact:0,confidence:0,expression:0,notes:"No image"});

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.GROQ_API_KEY}`},
      body:JSON.stringify({
        model:"llama-3.2-11b-vision-preview",
        messages:[{role:"user",content:[
          {type:"image_url",image_url:{url:`data:image/jpeg;base64,${imageBase64}`}},
          {type:"text",text:`Analyze this person's body language for a job interview. Score 0-100 for each dimension.

Return ONLY this JSON:
{"overall":72,"posture":75,"eyeContact":68,"confidence":70,"expression":74,"notes":"Sitting straight, appears engaged but slightly nervous"}`}
        ]}],
        max_tokens:150,
        temperature:0.2
      })
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim()||"";
    const match = raw.match(/\{[\s\S]*\}/);
    if(!match) throw new Error("No JSON");
    return NextResponse.json(JSON.parse(match[0]));
  } catch(e){
    return NextResponse.json({overall:60,posture:60,eyeContact:55,confidence:58,expression:62,notes:"Analysis unavailable"});
  }
}
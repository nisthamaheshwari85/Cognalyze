import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, jd, resume, finalScore } = await req.json();
    const userMsgs = messages.filter((m:any)=>m.role==="user");
    const conversation = messages.map((m:any)=>`${m.role==="user"?"CANDIDATE":"INTERVIEWER"}: ${m.content}`).join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.GROQ_API_KEY}`},
      body:JSON.stringify({
        model:"llama-3.3-70b-versatile",
        messages:[{role:"user",content:`You are a Senior Engineering Manager at a FAANG company. Give a detailed, honest hiring decision based on this interview.

JOB: ${(jd||"").slice(0,400)}
RESUME: ${(resume||"").slice(0,400)}
FINAL SCORE: ${finalScore?.overall||50}/100

INTERVIEW TRANSCRIPT:
${conversation.slice(0,3000)}

Give a genuine FAANG-level hiring decision. Be specific — reference actual things they said.

Return ONLY this JSON:
{
  "decision": "HIRE" or "NO_HIRE" or "STRONG_HIRE" or "STRONG_NO_HIRE",
  "confidence": 85,
  "headline": "One powerful sentence summarizing the decision",
  "overview": "2-3 sentence overall assessment",
  "hire_reasons": [
    "Specific reason with example from interview",
    "Another specific strength with quote or reference"
  ],
  "no_hire_reasons": [
    "Specific gap or red flag with example",
    "Another concern"  
  ],
  "standout_moments": [
    "Best answer they gave — quote it",
    "Another impressive moment"
  ],
  "concerning_moments": [
    "Weakest answer — be specific",
    "Another concern"
  ],
  "scorecard": {
    "technical": {"score": 72, "comment": "Specific technical assessment"},
    "behavioral": {"score": 68, "comment": "Specific behavioral assessment"},
    "communication": {"score": 80, "comment": "Specific communication note"},
    "problemSolving": {"score": 65, "comment": "Problem solving assessment"},
    "cultureFit": {"score": 75, "comment": "Culture fit assessment"}
  },
  "next_steps": "What happens next if hired / what to improve if not",
  "interviewer_note": "Personal note from interviewer to candidate"
}`}],
        max_tokens:1200,
        temperature:0.5
      })
    });

    const data = await res.json();
    if(!res.ok) throw new Error("API failed");
    const raw = data.choices?.[0]?.message?.content?.trim()||"";
    const match = raw.match(/\{[\s\S]*\}/);
    if(!match) throw new Error("No JSON");
    return NextResponse.json(JSON.parse(match[0]));
  } catch(e:any){
    return NextResponse.json({
      decision:"NO_HIRE",confidence:60,
      headline:"Insufficient data to make a strong determination",
      overview:"The interview did not provide enough signal for a definitive decision.",
      hire_reasons:["Showed up and engaged with questions"],
      no_hire_reasons:["Need more answers to assess properly"],
      standout_moments:[],concerning_moments:[],
      scorecard:{technical:{score:50,comment:"Unable to assess"},behavioral:{score:50,comment:"Unable to assess"},communication:{score:50,comment:"Unable to assess"},problemSolving:{score:50,comment:"Unable to assess"},cultureFit:{score:50,comment:"Unable to assess"}},
      next_steps:"Complete more interview questions for accurate assessment",
      interviewer_note:"Please answer at least 5-6 questions for a proper evaluation."
    });
  }
}
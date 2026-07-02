import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const { jd, resume } = await req.json();

    const res = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a FAANG interviewer. Based on this resume and job description, predict the 6 most likely interview questions this candidate will face.

JOB: ${(jd||"").slice(0,400)}
RESUME: ${(resume||"").slice(0,400)}

Make questions SPECIFIC to their actual resume — reference their real projects and skills.

Return ONLY this JSON:
{"questions":[
  {"question":"Tell me about [specific project from resume] — what was the hardest technical challenge?","why":"Tests depth of experience","lookFor":"Specific technical details, trade-offs made","difficulty":"Hard"},
  {"question":"Walk me through how you'd scale [their actual system] to handle 100x traffic","why":"System design based on their work","lookFor":"Load balancing, caching, DB sharding","difficulty":"Hard"},
  {"question":"Describe a time you disagreed with your team on a technical decision. What happened?","why":"Behavioral — collaboration","lookFor":"STAR format, outcome, relationship preserved","difficulty":"Medium"},
  {"question":"What's the time complexity of [algorithm they likely used in their work]?","why":"Technical depth","lookFor":"Clear explanation with examples","difficulty":"Medium"},
  {"question":"How would you debug a memory leak in [their tech stack]?","why":"Practical debugging skills","lookFor":"Systematic approach, tools used","difficulty":"Medium"},
  {"question":"Why do you want this role specifically, and what will you contribute in 90 days?","why":"Motivation and planning","lookFor":"Specific, researched answer","difficulty":"Easy"}
]}`
        }],
        max_tokens: 800,
        temperature: 0.4
      })
    });

    const data = await res.json();
    const text = data.choices[0].message.content.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return NextResponse.json(JSON.parse(match[0]));

  } catch (e) {
    return NextResponse.json({
      questions: [
        { question: "Tell me about your most technically challenging project. What made it hard?", why: "Tests depth", lookFor: "Specific technical details", difficulty: "Hard" },
        { question: "How would you design a system to handle 1M concurrent users?", why: "System design", lookFor: "Architecture thinking", difficulty: "Hard" },
        { question: "Tell me about a time you had to learn a new technology quickly under pressure.", why: "Adaptability", lookFor: "Learning process, outcome", difficulty: "Medium" },
        { question: "What's your approach to code reviews? What do you look for?", why: "Engineering culture", lookFor: "Quality mindset", difficulty: "Easy" },
        { question: "Describe a failure. What did you learn and what would you do differently?", why: "Self-awareness", lookFor: "Ownership, growth mindset", difficulty: "Medium" },
        { question: "Why this role? What will you accomplish in your first 90 days?", why: "Motivation", lookFor: "Specific, researched answer", difficulty: "Easy" }
      ]
    });
  }
}
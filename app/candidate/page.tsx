"use client";
import { useState, useEffect, useRef } from "react";

interface FeedbackResult { name: string; color: string; response: string; typing?: boolean; }
interface SkillItem { skill: string; level: string; evidence: string; how_to_fix?: string; }
interface MissingSkill { skill: string; priority: string; learn_in: string; resource: string; }
interface SkillsData { match_score: number; strong_skills: SkillItem[]; weak_skills: SkillItem[]; missing_skills: MissingSkill[]; honest_assessment: string; }
interface RoadmapMonth { month: string; focus: string; actions: string[]; milestone: string; }
interface RoadmapData { ready_to_apply: boolean; honest_take: string; months: RoadmapMonth[]; apply_now_anyway: string; }
interface RewriteChange { type: string; original: string; changed?: string; reason: string; }
interface RiskyClaim { claim: string; risk: string; action: string; }
interface RewriteData { rewritten: string; confidence: number; changes: RewriteChange[]; risky_claims: RiskyClaim[]; ats_score_before: number; ats_score_after: number; honest_note: string; }
interface InterviewQ { question: string; why: string; lookFor: string; difficulty: string; }

function GradientBg() {
  return (
    <>
      <style>{`
        @keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,-40px) scale(1.1)}66%{transform:translate(-30px,60px) scale(0.9)}}
        @keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-80px,40px) scale(1.2)}66%{transform:translate(50px,-60px) scale(0.85)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
        .glass{background:rgba(255,255,255,0.04);backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,0.08);}
        .btn-main{background:linear-gradient(135deg,#ec4899,#8b5cf6,#6366f1);transition:all 0.3s;border:none;cursor:pointer;color:white;font-weight:800;letter-spacing:2px;}
        .btn-main:hover{transform:translateY(-2px);box-shadow:0 20px 40px rgba(236,72,153,0.4);}
        .tab-btn{transition:all 0.2s;border:none;cursor:pointer;font-weight:600;font-family:inherit;}
        textarea:focus{outline:none;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(168,85,247,0.3);border-radius:2px;}
      `}</style>
      <div style={{position:"fixed",inset:0,overflow:"hidden",zIndex:0,background:"#06030f"}}>
        <div style={{position:"absolute",top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(circle,rgba(236,72,153,0.15) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(80px)",animation:"blob1 12s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"-20%",right:"-10%",width:"55%",height:"55%",background:"radial-gradient(circle,rgba(168,85,247,0.2) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(80px)",animation:"blob2 15s ease-in-out infinite"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(236,72,153,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(236,72,153,0.03) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,#ec4899,#a855f7,#6366f1,transparent)"}}/>
      </div>
    </>
  );
}

function Typewriter({text,speed=10,onDone}:{text:string;speed?:number;onDone?:()=>void}) {
  const [d,setD]=useState("");
  const [done,setDone]=useState(false);
  useEffect(()=>{
    setD("");setDone(false);
    let i=0;
    const t=setInterval(()=>{i++;setD(text.slice(0,i));if(i>=text.length){clearInterval(t);setDone(true);onDone?.();}},speed);
    return()=>clearInterval(t);
  },[text]);
  return <span>{d}{!done&&<span style={{animation:"blink 0.8s infinite"}}>|</span>}</span>;
}

type Step = "input"|"loading"|"results";
type Tab = "feedback"|"skills"|"rewrite"|"roadmap"|"interview";

const TABS = [
  {id:"feedback", label:"💬 Feedback"},
  {id:"skills", label:"🎯 Skills Gap"},
  {id:"rewrite", label:"✍️ Rewriter"},
  {id:"roadmap", label:"🗺️ Roadmap"},
  {id:"interview", label:"🎤 Interview"},
];

export default function CandidatePage() {
  const [step,setStep] = useState<Step>("input");
  const [jd,setJd] = useState("");
  const [resume,setResume] = useState("");
  const [results,setResults] = useState<FeedbackResult[]>([]);
  const [currentIdx,setCurrentIdx] = useState(0);
  const [loadMsg,setLoadMsg] = useState("Reading your resume");
  const [resumeFile,setResumeFile] = useState<File|null>(null);
  const [parsing,setParsing] = useState(false);
  const [error,setError] = useState("");
  const [tab,setTab] = useState<Tab>("feedback");
  const [skills,setSkills] = useState<SkillsData|null>(null);
  const [rewriteData,setRewriteData] = useState<RewriteData|null>(null);
  const [roadmap,setRoadmap] = useState<RoadmapData|null>(null);
  const [interviewQs,setInterviewQs] = useState<InterviewQ[]>([]);
  const [loadingSkills,setLoadingSkills] = useState(false);
  const [loadingRewrite,setLoadingRewrite] = useState(false);
  const [loadingRoadmap,setLoadingRoadmap] = useState(false);
  const [loadingInterview,setLoadingInterview] = useState(false);
  const [copied,setCopied] = useState(false);
  const rawRef = useRef<FeedbackResult[]>([]);
  const msgs = ["Reading your resume","Analyzing your skills","Identifying gaps","Finding hidden gems","Preparing feedback"];

  const handleFileUpload = async(file:File) => {
    setResumeFile(file); setParsing(true); setError("");
    try {
      const base64 = await new Promise<string>((resolve)=>{
        const reader = new FileReader();
        reader.onload = ()=>resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/parse-resume",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64:base64,mimeType:file.type})});
      const data = await res.json();
      if(data.text) setResume(data.text);
      else setError("Auto-extract failed — paste text manually ↓");
    } catch { setError("Please paste resume text manually ↓"); }
    setParsing(false);
  };

  const analyze = async() => {
    setStep("loading");
    let i = 0;
    const lt = setInterval(()=>{i++;if(i<msgs.length)setLoadMsg(msgs[i]);},700);
    try {
      const res = await fetch("/api/candidate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jd,resume})});
      const data = await res.json();
      clearInterval(lt);
      if(data.agents?.length>0){
        rawRef.current = data.agents;
        setResults([]); setCurrentIdx(0); setStep("results");
      }
    } catch { clearInterval(lt); setStep("input"); }
  };

  useEffect(()=>{
    if(step!=="results") return;
    if(currentIdx>=rawRef.current.length) return;
    setTimeout(()=>setResults(prev=>[...prev,{...rawRef.current[currentIdx],typing:true}]),300);
  },[currentIdx,step]);

  const handleDone = (i:number) => {
    setResults(prev=>prev.map((r,idx)=>idx===i?{...r,typing:false}:r));
    if(i+1<rawRef.current.length) setTimeout(()=>setCurrentIdx(i+1),600);
  };

  const loadSkills = async() => {
    if(skills) return;
    setLoadingSkills(true);
    try {
      const res = await fetch("/api/skills-gap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jd,resume})});
      setSkills(await res.json());
    } catch {}
    setLoadingSkills(false);
  };

  const loadRewrite = async() => {
    if(rewriteData) return;
    setLoadingRewrite(true);
    try {
      const res = await fetch("/api/rewrite-resume",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jd,resume})});
      setRewriteData(await res.json());
    } catch {}
    setLoadingRewrite(false);
  };

  const loadRoadmap = async() => {
    if(roadmap) return;
    setLoadingRoadmap(true);
    try {
      const res = await fetch("/api/roadmap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jd,resume})});
      setRoadmap(await res.json());
    } catch {}
    setLoadingRoadmap(false);
  };

  const loadInterview = async() => {
    if(interviewQs.length>0) return;
    setLoadingInterview(true);
    try {
      const res = await fetch("/api/interview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jd,resume,agentDebate:""})});
      const data = await res.json();
      setInterviewQs(data.questions||[]);
    } catch {}
    setLoadingInterview(false);
  };

  const handleTabChange = (t:Tab) => {
    setTab(t);
    if(t==="skills") loadSkills();
    if(t==="rewrite") loadRewrite();
    if(t==="roadmap") loadRoadmap();
    if(t==="interview") loadInterview();
  };

  const copyResume = () => {
    navigator.clipboard.writeText(rewriteData?.rewritten||"");
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  const resetAll = () => {
    setStep("input"); setResults([]); setCurrentIdx(0);
    setResumeFile(null); setResume(""); setSkills(null);
    setRewriteData(null); setRoadmap(null); setInterviewQs([]);
    setTab("feedback");
  };

  // Loading spinner component
  const Spinner = ({msg}:{msg:string}) => (
    <div style={{textAlign:"center",padding:"4rem",color:"rgba(255,255,255,0.4)"}}>
      <div style={{fontSize:"24px",animation:"spin 1s linear infinite",display:"inline-block",marginBottom:"1rem"}}>⟳</div>
      <div style={{letterSpacing:"2px",fontSize:"13px"}}>{msg}</div>
    </div>
  );

  // ─── INPUT PAGE ───
  if(step==="input") return (
    <div style={{minHeight:"100vh",color:"white",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative"}}>
      <GradientBg/>
      <div style={{position:"relative",zIndex:10,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.25rem 2rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"32px",height:"32px",background:"linear-gradient(135deg,#ec4899,#a855f7)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>✦</div>
          <span style={{fontWeight:800,background:"linear-gradient(135deg,#fff,#f9a8d4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>COGNALYZE</span>
          <span style={{fontSize:"10px",padding:"2px 8px",border:"1px solid rgba(236,72,153,0.3)",borderRadius:"20px",color:"rgba(236,72,153,0.7)"}}>CANDIDATE</span>
        </div>
        <a href="/" style={{color:"rgba(255,255,255,0.3)",textDecoration:"none",fontSize:"13px"}}>← Back</a>
      </div>
      <div style={{position:"relative",zIndex:10,maxWidth:"900px",margin:"0 auto",padding:"3rem 2rem",animation:"fadeUp 0.7s ease"}}>
        <div style={{textAlign:"center",marginBottom:"3rem"}}>
          <div style={{fontSize:"11px",letterSpacing:"4px",color:"rgba(236,72,153,0.8)",marginBottom:"1rem",fontWeight:600}}>CANDIDATE MODE</div>
          <h1 style={{fontSize:"clamp(2rem,5vw,3.5rem)",fontWeight:900,letterSpacing:"-2px",lineHeight:1.1,marginBottom:"1rem",background:"linear-gradient(135deg,#fff 30%,#f9a8d4 70%,#a855f7 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            See yourself through<br/>a hiring committee's eyes
          </h1>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:"15px"}}>Honest feedback • Skills gap • Resume rewrite • Roadmap • Interview prep</p>
        </div>
        <div className="glass" style={{borderRadius:"28px",padding:"2.5rem",marginBottom:"1.5rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2rem"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#ec4899",boxShadow:"0 0 8px #ec4899"}}/>
                <span style={{fontSize:"11px",letterSpacing:"2px",color:"#ec4899",fontWeight:700}}>TARGET JOB</span>
              </div>
              <textarea value={jd} onChange={e=>setJd(e.target.value)} style={{width:"100%",height:"200px",background:"rgba(236,72,153,0.06)",border:"1px solid rgba(236,72,153,0.2)",borderRadius:"16px",padding:"16px",color:"rgba(255,255,255,0.85)",fontSize:"13px",resize:"none",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="rgba(236,72,153,0.6)"} onBlur={e=>e.target.style.borderColor="rgba(236,72,153,0.2)"} placeholder="Paste the job description..."/>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#a855f7",boxShadow:"0 0 8px #a855f7"}}/>
                <span style={{fontSize:"11px",letterSpacing:"2px",color:"#a855f7",fontWeight:700}}>YOUR RESUME</span>
              </div>
              <div onClick={()=>document.getElementById("resumeUp")?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFileUpload(f);}} style={{border:"2px dashed rgba(168,85,247,0.35)",borderRadius:"12px",padding:"14px",textAlign:"center",cursor:"pointer",marginBottom:"10px",transition:"all 0.2s",background:"rgba(168,85,247,0.04)"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(168,85,247,0.7)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(168,85,247,0.35)"}>
                <input id="resumeUp" type="file" accept="image/*,.pdf,application/pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileUpload(f);}}/>
                {parsing?<div style={{color:"#a855f7",fontSize:"12px"}}><span style={{animation:"spin 1s linear infinite",display:"inline-block",marginRight:"8px"}}>⟳</span>Extracting...</div>:resumeFile?<div style={{color:"#00ff88",fontSize:"12px"}}>✓ {resumeFile.name}</div>:<div><div style={{fontSize:"20px",marginBottom:"4px"}}>📄</div><div style={{color:"rgba(168,85,247,0.8)",fontSize:"12px",fontWeight:600}}>Upload Resume</div><div style={{color:"rgba(255,255,255,0.3)",fontSize:"11px",marginTop:"2px"}}>PDF or Image</div></div>}
              </div>
              <div style={{textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:"11px",marginBottom:"8px"}}>— OR TYPE —</div>
              <textarea value={resume} onChange={e=>setResume(e.target.value)} style={{width:"100%",height:"110px",background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:"16px",padding:"16px",color:"rgba(255,255,255,0.85)",fontSize:"13px",resize:"none",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="rgba(168,85,247,0.6)"} onBlur={e=>e.target.style.borderColor="rgba(168,85,247,0.2)"} placeholder="Or paste your resume text..."/>
            </div>
          </div>
        </div>
        {error&&<p style={{color:"#ff6b6b",textAlign:"center",marginBottom:"1rem",fontSize:"13px"}}>⚠ {error}</p>}
        <button className="btn-main" onClick={analyze} disabled={!jd||!resume} style={{width:"100%",padding:"1.1rem",borderRadius:"16px",fontSize:"15px",letterSpacing:"3px",opacity:!jd||!resume?0.3:1,cursor:!jd||!resume?"not-allowed":"pointer",boxShadow:"0 0 60px rgba(236,72,153,0.2)"}}>
          ANALYZE MY PROFILE →
        </button>
      </div>
    </div>
  );

  // ─── LOADING PAGE ───
  if(step==="loading") return (
    <div style={{minHeight:"100vh",background:"#06030f",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <GradientBg/>
      <div style={{position:"relative",zIndex:10,textAlign:"center"}}>
        <div style={{position:"relative",width:"100px",height:"100px",margin:"0 auto 2.5rem"}}>
          <div style={{position:"absolute",inset:0,border:"1px solid rgba(236,72,153,0.2)",borderTop:"1px solid #ec4899",borderRadius:"50%",animation:"spin 1.2s linear infinite"}}/>
          <div style={{position:"absolute",inset:"12px",border:"1px solid rgba(168,85,247,0.15)",borderBottom:"1px solid #a855f7",borderRadius:"50%",animation:"spin 0.8s linear infinite reverse"}}/>
          <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px"}}>✦</span>
        </div>
        <div style={{fontSize:"14px",letterSpacing:"3px",color:"rgba(255,255,255,0.6)"}}>{loadMsg}...</div>
      </div>
    </div>
  );

  // ─── RESULTS PAGE ───
  return (
    <div style={{minHeight:"100vh",color:"white",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",position:"relative"}}>
      <GradientBg/>
      {/* Nav */}
      <div style={{position:"relative",zIndex:10,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.25rem 2rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"32px",height:"32px",background:"linear-gradient(135deg,#ec4899,#a855f7)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>✦</div>
          <span style={{fontWeight:800,background:"linear-gradient(135deg,#fff,#f9a8d4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>COGNALYZE</span>
        </div>
        <button onClick={resetAll} style={{padding:"0.5rem 1.25rem",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:"13px"}}>↺ New Analysis</button>
      </div>

      <div style={{position:"relative",zIndex:10,maxWidth:"900px",margin:"0 auto",padding:"2rem"}}>
        {/* Tabs */}
        <div style={{display:"flex",gap:"6px",marginBottom:"2rem",background:"rgba(255,255,255,0.03)",borderRadius:"14px",padding:"6px",border:"1px solid rgba(255,255,255,0.06)"}}>
          {TABS.map(t=>(
            <button key={t.id} className="tab-btn" onClick={()=>handleTabChange(t.id as Tab)} style={{flex:1,padding:"0.6rem 0.4rem",borderRadius:"10px",fontSize:"12px",background:tab===t.id?"rgba(255,255,255,0.1)":"transparent",color:tab===t.id?"white":"rgba(255,255,255,0.4)",border:tab===t.id?"1px solid rgba(255,255,255,0.15)":"1px solid transparent"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── FEEDBACK TAB ── */}
        {tab==="feedback"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:"2rem"}}>
              <div style={{fontSize:"11px",letterSpacing:"4px",color:"rgba(236,72,153,0.8)",marginBottom:"8px",fontWeight:600}}>● HONEST FEEDBACK</div>
              <h2 style={{fontSize:"1.8rem",fontWeight:800,letterSpacing:"-1px"}}>This is how the committee sees you</h2>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {results.map((r,i)=>(
                <div key={i} className="glass" style={{borderRadius:"18px",padding:"1.5rem",border:`1px solid ${r.color}25`,position:"relative",overflow:"hidden",animation:"slideRight 0.4s ease"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:`linear-gradient(90deg,transparent,${r.color}50,transparent)`}}/>
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:"2px",background:`linear-gradient(180deg,${r.color},${r.color}20)`}}/>
                  <div style={{paddingLeft:"14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
                      <span style={{fontSize:"10px",fontWeight:800,letterSpacing:"2px",color:r.color}}>{r.name.toUpperCase()}</span>
                      {r.typing&&<span style={{fontSize:"9px",padding:"2px 8px",background:`${r.color}15`,border:`1px solid ${r.color}30`,borderRadius:"999px",color:r.color,animation:"blink 1s infinite"}}>ANALYZING</span>}
                    </div>
                    <p style={{color:"rgba(255,255,255,0.7)",fontSize:"13px",lineHeight:1.75,margin:0}}>
                      {r.typing?<Typewriter text={r.response} speed={8} onDone={()=>handleDone(i)}/>:r.response}
                    </p>
                  </div>
                </div>
              ))}
              {results.length<rawRef.current.length&&<div style={{textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:"13px",animation:"blink 1.5s infinite"}}>Next insight loading...</div>}
            </div>
          </div>
        )}

        {/* ── SKILLS TAB ── */}
        {tab==="skills"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {loadingSkills?<Spinner msg="Analyzing skills gap..."/>:skills?(
              <div>
                <div className="glass" style={{borderRadius:"20px",padding:"2rem",marginBottom:"1.5rem",textAlign:"center",border:"1px solid rgba(99,102,241,0.2)"}}>
                  <div style={{fontSize:"10px",letterSpacing:"3px",color:"rgba(99,102,241,0.8)",marginBottom:"1rem",fontWeight:600}}>MATCH SCORE</div>
                  <div style={{fontSize:"5rem",fontWeight:900,background:`linear-gradient(135deg,${skills.match_score>=70?"#00ff88,#22d3ee":"#fbbf24,#ff4466"})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>{skills.match_score}%</div>
                  <div style={{height:"6px",background:"rgba(255,255,255,0.05)",borderRadius:"999px",margin:"1.5rem auto",maxWidth:"300px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${skills.match_score}%`,background:skills.match_score>=70?"linear-gradient(90deg,#00ff88,#22d3ee)":"linear-gradient(90deg,#fbbf24,#ff4466)",borderRadius:"999px"}}/>
                  </div>
                  <p style={{color:"rgba(255,255,255,0.5)",fontSize:"14px",fontStyle:"italic"}}>"{skills.honest_assessment}"</p>
                </div>
                {/* Strong */}
                <div className="glass" style={{borderRadius:"20px",padding:"1.5rem",marginBottom:"1rem",border:"1px solid rgba(0,255,136,0.15)"}}>
                  <div style={{fontSize:"10px",letterSpacing:"2px",color:"#00ff88",marginBottom:"1rem",fontWeight:700}}>✓ STRONG SKILLS</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    {skills.strong_skills?.map((s,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"rgba(0,255,136,0.06)",borderRadius:"10px"}}>
                        <div><span style={{fontWeight:600,fontSize:"14px"}}>{s.skill}</span><span style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginLeft:"10px"}}>{s.evidence}</span></div>
                        <span style={{fontSize:"11px",padding:"2px 10px",background:"rgba(0,255,136,0.15)",border:"1px solid rgba(0,255,136,0.3)",borderRadius:"999px",color:"#00ff88"}}>{s.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Weak */}
                {skills.weak_skills?.length>0&&(
                  <div className="glass" style={{borderRadius:"20px",padding:"1.5rem",marginBottom:"1rem",border:"1px solid rgba(251,191,36,0.15)"}}>
                    <div style={{fontSize:"10px",letterSpacing:"2px",color:"#fbbf24",marginBottom:"1rem",fontWeight:700}}>⚠ NEEDS IMPROVEMENT</div>
                    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                      {skills.weak_skills.map((s,i)=>(
                        <div key={i} style={{padding:"12px 14px",background:"rgba(251,191,36,0.06)",borderRadius:"10px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                            <span style={{fontWeight:600,fontSize:"14px"}}>{s.skill}</span>
                            <span style={{fontSize:"11px",padding:"2px 10px",background:"rgba(251,191,36,0.15)",borderRadius:"999px",color:"#fbbf24"}}>{s.level}</span>
                          </div>
                          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"4px"}}>{s.evidence}</div>
                          {s.how_to_fix&&<div style={{fontSize:"12px",color:"#fbbf24"}}>💡 {s.how_to_fix}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Missing */}
                {skills.missing_skills?.length>0&&(
                  <div className="glass" style={{borderRadius:"20px",padding:"1.5rem",border:"1px solid rgba(255,68,102,0.15)"}}>
                    <div style={{fontSize:"10px",letterSpacing:"2px",color:"#ff4466",marginBottom:"1rem",fontWeight:700}}>✗ MISSING SKILLS</div>
                    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                      {skills.missing_skills.map((s,i)=>(
                        <div key={i} style={{padding:"12px 14px",background:"rgba(255,68,102,0.06)",borderRadius:"10px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                            <span style={{fontWeight:600,fontSize:"14px"}}>{s.skill}</span>
                            <div style={{display:"flex",gap:"6px"}}>
                              <span style={{fontSize:"10px",padding:"2px 8px",background:s.priority==="High"?"rgba(255,68,102,0.2)":"rgba(251,191,36,0.15)",borderRadius:"999px",color:s.priority==="High"?"#ff4466":"#fbbf24"}}>{s.priority}</span>
                              <span style={{fontSize:"10px",padding:"2px 8px",background:"rgba(255,255,255,0.05)",borderRadius:"999px",color:"rgba(255,255,255,0.4)"}}>{s.learn_in}</span>
                            </div>
                          </div>
                          <div style={{fontSize:"12px",color:"rgba(99,102,241,0.8)"}}>📚 {s.resource}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ):null}
          </div>
        )}

        {/* ── REWRITE TAB ── */}
        {tab==="rewrite"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {loadingRewrite?<Spinner msg="Rewriting honestly — no fake claims..."/>:rewriteData?(
              <div>
                {/* Trust badge */}
                <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 16px",background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.25)",borderRadius:"12px",marginBottom:"1.5rem"}}>
                  <span style={{fontSize:"16px"}}>🛡️</span>
                  <span style={{fontSize:"12px",color:"#00ff88",fontWeight:600}}>Evidence-Based Rewrite</span>
                  <span style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>— No fake skills or experience added</span>
                </div>

                {/* ATS Score */}
                <div className="glass" style={{borderRadius:"20px",padding:"1.5rem",marginBottom:"1rem",border:"1px solid rgba(99,102,241,0.2)"}}>
                  <div style={{fontSize:"10px",letterSpacing:"3px",color:"rgba(99,102,241,0.8)",fontWeight:600,marginBottom:"1rem"}}>ATS SCORE IMPROVEMENT</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:"1rem"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:"3rem",fontWeight:900,color:"#ff4466"}}>{rewriteData.ats_score_before}</div>
                      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",letterSpacing:"1px",marginBottom:"6px"}}>BEFORE</div>
                      <div style={{height:"4px",background:"rgba(255,68,102,0.2)",borderRadius:"999px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${rewriteData.ats_score_before}%`,background:"#ff4466",borderRadius:"999px"}}/>
                      </div>
                    </div>
                    <div style={{fontSize:"2rem",color:"rgba(255,255,255,0.2)",textAlign:"center"}}>→</div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:"3rem",fontWeight:900,color:"#00ff88"}}>{rewriteData.ats_score_after}</div>
                      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",letterSpacing:"1px",marginBottom:"6px"}}>AFTER</div>
                      <div style={{height:"4px",background:"rgba(0,255,136,0.2)",borderRadius:"999px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${rewriteData.ats_score_after}%`,background:"#00ff88",borderRadius:"999px"}}/>
                      </div>
                    </div>
                  </div>
                  <p style={{textAlign:"center",marginTop:"1rem",fontSize:"13px",color:"rgba(255,255,255,0.5)",fontStyle:"italic"}}>"{rewriteData.honest_note}"</p>
                </div>

                {/* Confidence */}
                <div className="glass" style={{borderRadius:"14px",padding:"1rem 1.5rem",marginBottom:"1rem",border:"1px solid rgba(168,85,247,0.2)",display:"flex",alignItems:"center",gap:"12px"}}>
                  <span style={{fontSize:"13px",color:"rgba(255,255,255,0.4)",flexShrink:0}}>Rewrite confidence:</span>
                  <div style={{flex:1,height:"6px",background:"rgba(255,255,255,0.05)",borderRadius:"999px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${rewriteData.confidence}%`,background:"linear-gradient(90deg,#a855f7,#6366f1)",borderRadius:"999px"}}/>
                  </div>
                  <span style={{fontSize:"14px",fontWeight:700,color:"#a855f7",flexShrink:0}}>{rewriteData.confidence}%</span>
                </div>

                {/* Risky claims */}
                {rewriteData.risky_claims?.length>0&&(
                  <div className="glass" style={{borderRadius:"16px",padding:"1.25rem",marginBottom:"1rem",border:"1px solid rgba(255,170,0,0.3)",background:"rgba(255,170,0,0.04)"}}>
                    <div style={{fontSize:"10px",letterSpacing:"2px",color:"#ffaa00",fontWeight:700,marginBottom:"10px"}}>⚠ VERIFY BEFORE SUBMITTING</div>
                    {rewriteData.risky_claims.map((r,i)=>(
                      <div key={i} style={{padding:"10px 12px",background:"rgba(255,170,0,0.06)",borderRadius:"10px",marginBottom:"6px"}}>
                        <div style={{fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.8)",marginBottom:"4px"}}>"{r.claim}"</div>
                        <div style={{fontSize:"12px",color:"rgba(255,170,0,0.8)",marginBottom:"3px"}}>{r.risk}</div>
                        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>Action: {r.action}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Change log */}
                {rewriteData.changes?.length>0&&(
                  <div className="glass" style={{borderRadius:"16px",padding:"1.25rem",marginBottom:"1.5rem",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{fontSize:"10px",letterSpacing:"2px",color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:"10px"}}>CHANGE LOG ({rewriteData.changes.length} changes)</div>
                    <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"220px",overflow:"auto"}}>
                      {rewriteData.changes.map((c,i)=>(
                        <div key={i} style={{display:"flex",gap:"10px",alignItems:"flex-start",padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"8px"}}>
                          <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"999px",flexShrink:0,marginTop:"1px",background:c.type==="strengthened"?"rgba(99,102,241,0.2)":c.type==="removed"?"rgba(255,68,102,0.2)":"rgba(0,255,136,0.1)",color:c.type==="strengthened"?"#a5b4fc":c.type==="removed"?"#ff4466":"#00ff88"}}>
                            {c.type}
                          </span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.original}</div>
                            {c.changed&&<div style={{fontSize:"12px",color:"#a5b4fc",marginBottom:"2px"}}>→ {c.changed}</div>}
                            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>{c.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rewritten resume */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                  <div style={{fontSize:"10px",letterSpacing:"2px",color:"rgba(168,85,247,0.8)",fontWeight:600}}>REWRITTEN RESUME</div>
                  <button onClick={copyResume} style={{padding:"0.5rem 1.25rem",borderRadius:"10px",background:copied?"rgba(0,255,136,0.2)":"rgba(168,85,247,0.2)",border:`1px solid ${copied?"rgba(0,255,136,0.4)":"rgba(168,85,247,0.4)"}`,color:copied?"#00ff88":"#a855f7",cursor:"pointer",fontSize:"13px",fontWeight:600,transition:"all 0.2s"}}>
                    {copied?"✓ Copied!":"📋 Copy Resume"}
                  </button>
                </div>
                <div className="glass" style={{borderRadius:"16px",padding:"1.5rem",border:"1px solid rgba(168,85,247,0.15)",whiteSpace:"pre-wrap",fontSize:"13px",lineHeight:1.8,color:"rgba(255,255,255,0.8)",fontFamily:"'Courier New',monospace",maxHeight:"500px",overflow:"auto"}}>
                  {rewriteData.rewritten}
                </div>
              </div>
            ):null}
          </div>
        )}

        {/* ── ROADMAP TAB ── */}
        {tab==="roadmap"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {loadingRoadmap?<Spinner msg="Building your honest roadmap..."/>:roadmap?(
              <div>
                <div className="glass" style={{borderRadius:"20px",padding:"1.5rem",marginBottom:"1.5rem",border:`1px solid ${roadmap.ready_to_apply?"rgba(0,255,136,0.3)":"rgba(251,191,36,0.3)"}`,background:roadmap.ready_to_apply?"rgba(0,255,136,0.05)":"rgba(251,191,36,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"8px"}}>
                    <span style={{fontSize:"24px"}}>{roadmap.ready_to_apply?"✅":"⏳"}</span>
                    <span style={{fontWeight:700,fontSize:"15px",color:roadmap.ready_to_apply?"#00ff88":"#fbbf24"}}>{roadmap.ready_to_apply?"Ready to Apply Now":"Not Quite Ready Yet"}</span>
                  </div>
                  <p style={{fontSize:"13px",color:"rgba(255,255,255,0.6)",fontStyle:"italic",marginBottom:"8px"}}>"{roadmap.honest_take}"</p>
                  <p style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>💡 {roadmap.apply_now_anyway}</p>
                </div>
                <div style={{position:"relative",paddingLeft:"24px"}}>
                  <div style={{position:"absolute",left:"8px",top:0,bottom:0,width:"2px",background:"linear-gradient(180deg,#6366f1,#ec4899)",borderRadius:"999px"}}/>
                  {roadmap.months?.map((m,i)=>(
                    <div key={i} style={{marginBottom:"1.5rem",position:"relative",animation:`fadeUp 0.5s ease ${i*0.15}s both`}}>
                      <div style={{position:"absolute",left:"-20px",top:"18px",width:"12px",height:"12px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#a855f7)",boxShadow:"0 0 10px rgba(99,102,241,0.5)"}}/>
                      <div className="glass" style={{borderRadius:"18px",padding:"1.5rem",border:"1px solid rgba(99,102,241,0.15)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",flexWrap:"wrap",gap:"8px"}}>
                          <span style={{fontSize:"12px",color:"#6366f1",fontWeight:700,letterSpacing:"1px"}}>{m.month}</span>
                          <span style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",padding:"3px 10px",background:"rgba(99,102,241,0.1)",borderRadius:"999px"}}>{m.focus}</span>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"12px"}}>
                          {m.actions?.map((a,j)=>(
                            <div key={j} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                              <span style={{color:"#6366f1",fontSize:"12px",marginTop:"2px",flexShrink:0}}>→</span>
                              <span style={{fontSize:"13px",color:"rgba(255,255,255,0.7)",lineHeight:1.5}}>{a}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{padding:"10px 12px",background:"rgba(99,102,241,0.08)",borderRadius:"10px",borderLeft:"3px solid #6366f1"}}>
                          <span style={{fontSize:"11px",color:"rgba(99,102,241,0.8)",fontWeight:600}}>MILESTONE: </span>
                          <span style={{fontSize:"12px",color:"rgba(255,255,255,0.6)"}}>{m.milestone}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ):null}
          </div>
        )}

        {/* ── INTERVIEW TAB ── */}
        {tab==="interview"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {/* Mock interview CTA */}
            <div className="glass" style={{borderRadius:"20px",padding:"2rem",marginBottom:"2rem",border:"1px solid rgba(99,102,241,0.3)",textAlign:"center",background:"rgba(99,102,241,0.05)"}}>
              <div style={{fontSize:"32px",marginBottom:"1rem"}}>🎯</div>
              <h3 style={{fontSize:"1.3rem",fontWeight:800,marginBottom:"0.5rem",letterSpacing:"-0.5px"}}>Practice with a FAANG-level AI interviewer</h3>
              <p style={{color:"rgba(255,255,255,0.4)",fontSize:"13px",marginBottom:"1.5rem",lineHeight:1.6}}>Behavioral → Technical → System Design → Culture Fit<br/>Your JD and resume are pre-loaded</p>
              <a href={`/interview?jd=${encodeURIComponent(jd)}&resume=${encodeURIComponent(resume)}`} style={{textDecoration:"none"}}>
                <button className="btn-main" style={{padding:"0.9rem 2.5rem",borderRadius:"14px",fontSize:"14px",letterSpacing:"2px",display:"inline-block"}}>
                  START MOCK INTERVIEW →
                </button>
              </a>
            </div>

            {/* Questions */}
            {loadingInterview?<Spinner msg="Generating targeted questions..."/>:(
              <div>
                <div style={{fontSize:"10px",letterSpacing:"3px",color:"rgba(251,191,36,0.8)",fontWeight:600,marginBottom:"1rem"}}>PREDICTED INTERVIEW QUESTIONS</div>
                <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                  {interviewQs.map((q,i)=>(
                    <div key={i} className="glass" style={{borderRadius:"18px",padding:"1.5rem",border:"1px solid rgba(251,191,36,0.15)",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:"linear-gradient(180deg,#fbbf24,#fbbf2420)"}}/>
                      <div style={{paddingLeft:"14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                          <span style={{fontSize:"10px",color:"#fbbf24",fontWeight:700,letterSpacing:"1px"}}>Q{i+1}</span>
                          <span style={{fontSize:"10px",padding:"2px 10px",background:q.difficulty==="Hard"?"rgba(255,68,102,0.15)":q.difficulty==="Medium"?"rgba(251,191,36,0.15)":"rgba(0,255,136,0.1)",border:`1px solid ${q.difficulty==="Hard"?"rgba(255,68,102,0.3)":q.difficulty==="Medium"?"rgba(251,191,36,0.3)":"rgba(0,255,136,0.3)"}`,borderRadius:"999px",color:q.difficulty==="Hard"?"#ff4466":q.difficulty==="Medium"?"#fbbf24":"#00ff88"}}>
                            {q.difficulty}
                          </span>
                        </div>
                        <p style={{color:"rgba(255,255,255,0.9)",fontSize:"14px",fontWeight:500,marginBottom:"12px",lineHeight:1.5}}>{q.question}</p>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                          <div style={{background:"rgba(255,255,255,0.03)",borderRadius:"10px",padding:"10px"}}>
                            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"2px",marginBottom:"4px"}}>WHY ASKED</div>
                            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.6)"}}>{q.why}</div>
                          </div>
                          <div style={{background:"rgba(255,255,255,0.03)",borderRadius:"10px",padding:"10px"}}>
                            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"2px",marginBottom:"4px"}}>WHAT TO COVER</div>
                            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.6)"}}>{q.lookFor}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
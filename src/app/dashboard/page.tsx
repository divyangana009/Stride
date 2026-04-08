"use client";
import { useState, useEffect, useCallback } from "react";

interface GoalItem { id: string; title: string; frequency: string; completed: boolean; currentStreak: number; reminderTime: string|null; }
interface SectionCheckin { id: string; name: string; goals: GoalItem[]; score: number; completed: number; total: number; }
interface FreqScore { score: number; completed: number; total: number; }

export default function DashboardPage() {
  const [sections, setSections] = useState<SectionCheckin[]>([]);
  const [unsectioned, setUnsectioned] = useState<GoalItem[]>([]);
  const [unsectionedScore, setUnsectionedScore] = useState<FreqScore>({score:0,completed:0,total:0});
  const [consolidated, setConsolidated] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [freqScores, setFreqScores] = useState<Record<string,FreqScore>>({});
  const [date] = useState(()=>new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const fetchCheckin = useCallback(async()=>{
    const r = await fetch(`/api/checkin?date=${date}`);
    const d = await r.json();
    setSections(d.sections||[]); setUnsectioned(d.unsectioned||[]); setUnsectionedScore(d.unsectionedScore||{score:0,completed:0,total:0});
    setConsolidated(d.consolidatedScore??0); setCompletedCount(d.completedCount??0); setTotalCount(d.totalCount??0); setFreqScores(d.freqScores||{});
    setLoading(false);
  },[date]);
  useEffect(()=>{fetchCheckin();},[fetchCheckin]);

  async function toggle(goalId:string, cur:boolean) {
    const nw=!cur;
    setSections(p=>p.map(s=>({...s,goals:s.goals.map(g=>g.id===goalId?{...g,completed:nw}:g)})));
    setUnsectioned(p=>p.map(g=>g.id===goalId?{...g,completed:nw}:g));
    const r = await fetch("/api/checkin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({goalId,date,completed:nw})});
    const d = await r.json();
    setConsolidated(d.consolidatedScore??0); setCompletedCount(d.completedCount??0); setTotalCount(d.totalCount??0);
    if(d.sectionScores) setSections(p=>p.map(s=>{const u=d.sectionScores.find((x:any)=>x.id===s.id);return u?{...s,score:u.score,completed:u.completed,total:u.total}:s;}));
    if(d.freqScores) setFreqScores(d.freqScores);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>;

  const sc=(s:number)=>s>=80?"text-success":s>=50?"text-warning":"text-accent";
  const bc=(s:number)=>s>=80?"bg-success":s>=50?"bg-warning":"bg-accent";
  const fb=(f:string)=>{const c:Record<string,string>={daily:"bg-accent/10 text-accent",weekly:"bg-warning/10 text-warning",monthly:"bg-success/10 text-success"};return<span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c[f]||""}`}>{f}</span>;};

  function renderGoal(g:GoalItem) {
    return (
      <button key={g.id} onClick={()=>toggle(g.id,g.completed)} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${g.completed?"bg-success/5 border-success/30":"bg-card border-border hover:border-accent/30"}`}>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${g.completed?"bg-success border-success text-white":"border-border"}`}>
          {g.completed&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${g.completed?"line-through text-muted":""}`}>{g.title}</span>
            {fb(g.frequency)}
            {g.currentStreak>0&&<span className="text-xs text-warning">{"\uD83D\uDD25"}{g.currentStreak}</span>}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Today&apos;s Check-in</h1><p className="text-muted text-sm">{new Date(date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p></div>

      {/* Overall */}
      <div className="bg-card border border-border rounded-xl p-5 text-center">
        <div className="text-xs text-muted uppercase tracking-wide mb-1">Overall</div>
        <div className={`text-5xl font-bold ${sc(consolidated)}`}>{consolidated}%</div>
        <p className="text-muted text-sm mt-1">{completedCount}/{totalCount} goals</p>
        <div className="w-full bg-background rounded-full h-3 mt-3"><div className={`h-3 rounded-full transition-all duration-500 ${bc(consolidated)}`} style={{width:`${consolidated}%`}}/></div>
      </div>

      {/* Frequency breakdown + section cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["daily","weekly","monthly"] as const).map(f=>{
          const s=freqScores[f]||{score:0,completed:0,total:0};
          if(s.total===0) return null;
          const labels:Record<string,string>={daily:"Daily",weekly:"Weekly",monthly:"Monthly"};
          return <div key={f} className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-xs text-muted mb-0.5">{labels[f]}</div><div className={`text-2xl font-bold ${sc(s.score)}`}>{s.score}%</div><p className="text-xs text-muted">{s.completed}/{s.total}</p></div>;
        })}
      </div>

      {/* Section cards */}
      {sections.length>1 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sections.map(s=>(<div key={s.id} className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-xs font-medium truncate mb-0.5">{s.name}</div><div className={`text-xl font-bold ${sc(s.score)}`}>{s.score}%</div><p className="text-xs text-muted">{s.completed}/{s.total}</p></div>))}
        </div>
      )}

      {totalCount===0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center"><p className="text-muted mb-4">No goals yet.</p><a href="/dashboard/goals" className="text-accent font-medium hover:underline">Set up goals &rarr;</a></div>
      ) : (<>
        {sections.map(s=>(<div key={s.id}><div className="flex items-center justify-between mb-2"><h2 className="font-semibold text-sm">{s.name}</h2><span className={`text-sm font-bold ${sc(s.score)}`}>{s.score}%</span></div><div className="space-y-2">{s.goals.map(renderGoal)}</div></div>))}
        {unsectioned.length>0 && (<div><div className="flex items-center justify-between mb-2"><h2 className="font-semibold text-sm">Other</h2><span className={`text-sm font-bold ${sc(unsectionedScore.score)}`}>{unsectionedScore.score}%</span></div><div className="space-y-2">{unsectioned.map(renderGoal)}</div></div>)}
      </>)}
    </div>
  );
}

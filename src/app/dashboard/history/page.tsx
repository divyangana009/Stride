"use client";
import { useState, useEffect, useCallback } from "react";

interface GoalDetail { title:string; frequency:string; completed:boolean; }
interface SectionDetail { name:string; completed:number; total:number; score:number; goals:GoalDetail[]; }
interface DayLog { date:string; score:number; sections:SectionDetail[]; totalCompleted:number; totalGoals:number; }

export default function HistoryPage() {
  const [logs,setLogs]=useState<DayLog[]>([]);
  const [loading,setLoading]=useState(true);
  const [expDay,setExpDay]=useState<string|null>(null);
  const [expSec,setExpSec]=useState<string|null>(null);

  useEffect(()=>{(async()=>{const r=await fetch("/api/history");setLogs((await r.json()).logs||[]);setLoading(false);})();},[]);

  if(loading) return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>;
  const sc=(s:number)=>s>=80?"text-success":s>=50?"text-warning":"text-accent";
  const bc=(s:number)=>s>=80?"bg-success":s>=50?"bg-warning":"bg-accent";
  const fb=(f:string)=>{const c:Record<string,string>={daily:"bg-accent/10 text-accent",weekly:"bg-warning/10 text-warning",monthly:"bg-success/10 text-success"};return<span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c[f]||""}`}>{f}</span>;};
  const fmt=(d:string)=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  const today=new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">History</h1><p className="text-muted text-sm">Day-by-day — tap sections to see individual goals</p></div>
      {logs.length===0?<div className="bg-card border border-border rounded-xl p-8 text-center"><p className="text-muted">No history yet.</p></div>:(
        <div className="space-y-2">{logs.map(day=>{const isExp=expDay===day.date;return(
          <div key={day.date} className="bg-card border border-border rounded-xl overflow-hidden">
            <button onClick={()=>{setExpDay(isExp?null:day.date);setExpSec(null);}} className="w-full flex items-center gap-4 p-4 text-left hover:bg-background/50">
              <div className="w-24 shrink-0"><div className="text-sm font-medium">{fmt(day.date)}</div>{day.date===today&&<span className="text-xs text-accent font-medium">Today</span>}</div>
              <div className={`text-2xl font-bold w-16 ${sc(day.score)}`}>{day.score}%</div>
              <div className="flex-1"><div className="w-full bg-background rounded-full h-2.5"><div className={`h-2.5 rounded-full ${bc(day.score)}`} style={{width:`${day.score}%`}}/></div><p className="text-xs text-muted mt-1">{day.totalCompleted}/{day.totalGoals} goals</p></div>
              <span className={`text-muted text-xs transition-transform ${isExp?"rotate-180":""}`}>&#x25BC;</span>
            </button>
            {isExp&&<div className="border-t border-border">{day.sections.map(s=>{const sk=`${day.date}::${s.name}`;const isSE=expSec===sk;return(
              <div key={s.name} className="border-b border-border last:border-b-0">
                <button onClick={()=>setExpSec(isSE?null:sk)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-background/30">
                  <span className="text-sm font-medium flex-1">{s.name}</span>
                  <div className="w-20"><div className="w-full bg-background rounded-full h-1.5"><div className={`h-1.5 rounded-full ${bc(s.score)}`} style={{width:`${s.score}%`}}/></div></div>
                  <span className={`text-sm font-bold w-10 text-right ${sc(s.score)}`}>{s.score}%</span>
                  <span className="text-xs text-muted w-8">{s.completed}/{s.total}</span>
                  <span className={`text-xs text-muted ${isSE?"rotate-180":""}`}>&#x25BE;</span>
                </button>
                {isSE&&<div className="px-5 pb-3 space-y-1">{s.goals.map((g,i)=>(
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${g.completed?"bg-success text-white":"border-2 border-border"}`}>
                      {g.completed&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className={`text-sm flex-1 ${g.completed?"":"text-muted"}`}>{g.title}</span>
                    {fb(g.frequency)}
                  </div>
                ))}</div>}
              </div>
            );})}</div>}
          </div>
        );})}</div>
      )}
    </div>
  );
}

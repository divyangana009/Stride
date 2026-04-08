"use client";
import { useState, useEffect, useCallback } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface Stats {
  dailyScores: {date:string;score:number}[];
  summary: {totalDays:number;avgScore:number;perfectDays:number;daysInMonth:number};
  sectionStats: {id:string;name:string;score:number;goalStats:{id:string;title:string;frequency:string;percentage:number;completedPeriods:number;expectedPeriods:number}[]}[];
  freqStats: Record<string,{score:number;goals:number;avgCompletion:number}>;
  top: {id:string;title:string;percentage:number;section:string}[];
  weak: {id:string;title:string;percentage:number;section:string}[];
  streakGoals: {title:string;currentStreak:number;bestStreak:number}[];
}

export default function StatsPage() {
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth()+1);
  const [stats,setStats]=useState<Stats|null>(null);
  const [loading,setLoading]=useState(true);

  const fetch_=useCallback(async()=>{setLoading(true);const r=await fetch(`/api/stats?year=${year}&month=${month}`);setStats(await r.json());setLoading(false);},[year,month]);
  useEffect(()=>{fetch_();},[fetch_]);

  const prev=()=>{if(month===1){setMonth(12);setYear(year-1);}else setMonth(month-1);};
  const next=()=>{if(year===now.getFullYear()&&month===now.getMonth()+1)return;if(month===12){setMonth(1);setYear(year+1);}else setMonth(month+1);};
  const mName=new Date(year,month-1).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const isCur=year===now.getFullYear()&&month===now.getMonth()+1;
  const sc=(s:number)=>s>=80?"text-success":s>=50?"text-warning":"text-accent";
  const bc=(p:number)=>p>=80?"bg-success":p>=50?"bg-warning":"bg-accent";
  const fb=(f:string)=>{const c:Record<string,string>={daily:"bg-accent/10 text-accent",weekly:"bg-warning/10 text-warning",monthly:"bg-success/10 text-success"};return<span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c[f]||""}`}>{f}</span>;};

  if(loading) return <div className="flex items-center justify-center h-64 text-muted">Loading...</div>;
  if(!stats) return null;

  const chart=stats.dailyScores.map(d=>({date:d.date.split("-")[2],score:d.score}));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stats</h1>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent/10">&larr;</button>
          <span className="text-sm font-medium w-36 text-center">{mName}</span>
          <button onClick={next} disabled={isCur} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed">&rarr;</button>
        </div>
      </div>

      {stats.summary.totalDays===0?<div className="bg-card border border-border rounded-xl p-8 text-center"><p className="text-muted">No data for {mName}.</p></div>:(<>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className={`text-2xl font-bold ${sc(stats.summary.avgScore)}`}>{stats.summary.avgScore}%</div><p className="text-xs text-muted">Avg Score</p></div>
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-foreground">{stats.summary.totalDays}</div><p className="text-xs text-muted">Active Days</p></div>
          <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-success">{stats.summary.perfectDays}</div><p className="text-xs text-muted">Perfect Days</p></div>
        </div>

        {/* Frequency breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {(["daily","weekly","monthly"] as const).map(f=>{
            const s=stats.freqStats[f];if(!s||s.goals===0)return null;
            return <div key={f} className="bg-card border border-border rounded-xl p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium">{f.charAt(0).toUpperCase()+f.slice(1)}</span>{fb(f)}</div><div className={`text-xl font-bold ${sc(s.score)}`}>{s.score}%</div><p className="text-xs text-muted">{s.goals} goals</p></div>;
          })}
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Score Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chart}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis domain={[0,100]} tick={{fontSize:11}} width={30}/><Tooltip/>
              <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="url(#sg)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sections */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Sections</h2>
          <div className="space-y-2.5">
            {stats.sectionStats.map(s=>(<div key={s.id} className="flex items-center gap-3"><span className="w-28 text-sm truncate shrink-0">{s.name}</span><div className="flex-1"><div className="w-full bg-background rounded-full h-2"><div className={`h-2 rounded-full ${bc(s.score)}`} style={{width:`${Math.min(s.score,100)}%`}}/></div></div><span className={`text-sm font-bold w-12 text-right ${sc(s.score)}`}>{s.score}%</span></div>))}
          </div>
        </div>

        {/* Streaks */}
        {stats.streakGoals.length>0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">{"\uD83D\uDD25"} Active Streaks</h2>
            <div className="space-y-2">
              {stats.streakGoals.map((g,i)=>(<div key={i} className="flex items-center gap-2"><span className="text-sm flex-1 truncate">{g.title}</span><span className="text-sm font-bold text-warning">{g.currentStreak} days</span><span className="text-xs text-muted">(best: {g.bestStreak})</span></div>))}
            </div>
          </div>
        )}

        {/* Top & Weak */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4"><h2 className="text-sm font-semibold mb-3">{"\u2B50"} Top Performers</h2><div className="space-y-2">{stats.top.map((g,i)=>(<div key={g.id} className="flex items-center gap-2"><span className="text-xs text-muted w-4">{i+1}.</span><span className="text-sm flex-1 truncate">{g.title}</span><span className={`text-sm font-bold ${sc(g.percentage)}`}>{g.percentage}%</span></div>))}</div></div>
          <div className="bg-card border border-border rounded-xl p-4"><h2 className="text-sm font-semibold mb-3">{"\uD83D\uDCAA"} Needs Work</h2><div className="space-y-2">{stats.weak.map((g,i)=>(<div key={g.id} className="flex items-center gap-2"><span className="text-xs text-muted w-4">{i+1}.</span><span className="text-sm flex-1 truncate">{g.title}</span><span className={`text-sm font-bold ${sc(g.percentage)}`}>{g.percentage}%</span></div>))}</div></div>
        </div>
      </>)}
    </div>
  );
}

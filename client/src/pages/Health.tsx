import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Heart, Moon, Zap, Footprints, Flame, Activity, Wind, Scale, Plus, Bluetooth, Wifi, BarChart3, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import type { HealthLog, HealthGoal } from "@shared/schema";
import AIPanel from "@/components/AIPanel";

const today = new Date().toISOString().split("T")[0];

// ─── device metric registry ───────────────────────────────────────────────
const DEVICE_METRICS: Record<string, string[]> = {
  apple_health: ["steps","activeCalories","workoutMinutes","workoutType","distanceKm","sleepHours","sleepDeep","sleepRem","sleepLight","sleepScore","heartRateResting","heartRateMax","hrv","bloodOxygen","weight","mindfulMinutes","moodScore"],
  fitbit:       ["steps","activeCalories","workoutMinutes","workoutType","distanceKm","sleepHours","sleepDeep","sleepRem","sleepLight","sleepScore","heartRateResting","heartRateMax","hrv","weight","bodyFat","hydrationLiters","calories","protein","carbs","fat","readinessScore","stressLevel"],
  whoop:        ["sleepHours","sleepDeep","sleepRem","sleepLight","sleepScore","heartRateResting","hrv","bloodOxygen","recoveryScore","strainScore","workoutMinutes","workoutType","stressLevel"],
  garmin:       ["steps","activeCalories","workoutMinutes","workoutType","distanceKm","sleepHours","sleepDeep","sleepRem","sleepLight","sleepScore","heartRateResting","heartRateMax","hrv","bloodOxygen","weight","hydrationLiters","recoveryScore","readinessScore","stressLevel","mindfulMinutes"],
};
const USER_DEVICES = ["apple_health","fitbit","whoop","garmin"];
const tracked = new Set(USER_DEVICES.flatMap(d => DEVICE_METRICS[d]||[]));

// ─── coaching tips (Whoop-style) ──────────────────────────────────────────
function coachingTip(log: HealthLog|null|undefined) {
  if (!log) return "Log today's data to get personalized coaching tips.";
  const r = log.recoveryScore||0, s = log.sleepScore||0, strain = log.strainScore||0;
  if (r>=85) return `Peak recovery at ${r}% — your HRV of ${log.hrv||"—"} ms is above average. Today is ideal for high-intensity training.`;
  if (r>=70) return `Good recovery at ${r}%. You slept ${log.sleepHours||"—"}h with a score of ${s}. Moderate intensity training is recommended.`;
  if (r>=50) return `Moderate recovery (${r}%). Your body is still adapting — consider a light workout or active recovery today.`;
  if (r>0)   return `Low recovery at ${r}%. Prioritize rest, hydration, and a consistent sleep schedule tonight.`;
  if (s>=85) return `Excellent sleep score of ${s}! Deep sleep: ${log.sleepDeep||"—"}h, REM: ${log.sleepRem||"—"}h — your body restored well.`;
  return `You've logged ${log.steps||0} steps today. Keep moving toward your 10,000 step goal.`;
}

// ─── Whoop-style 3-dial row ────────────────────────────────────────────────
function ScoreDial({ label, value, max=100, color, sub, icon: Icon }: {
  label:string; value:number|null|undefined; max?:number; color:string; sub?:string; icon:any;
}) {
  const s = value||0;
  const pct = s/max;
  const r = 36;
  const circ = 2*Math.PI*r;
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 88 88" className="-rotate-90 w-24 h-24">
          <circle cx="44" cy="44" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="9"/>
          <circle cx="44" cy="44" r={r} fill="none" strokeWidth="9"
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={circ*(1-Math.min(pct,1))}
            strokeLinecap="round" className="transition-all duration-700"/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <Icon className="w-3.5 h-3.5" style={{ color }}/>
          <span className="text-xl font-bold leading-none" style={{ color }}>{s||"—"}</span>
          {max!==100 && <span className="text-xs text-muted-foreground">/{max}</span>}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── mini stat pill ───────────────────────────────────────────────────────
function StatPill({ label, value, unit, color }: { label:string; value:any; unit?:string; color:string }) {
  const display = value!==null && value!==undefined && value!==0 ? value : "—";
  return (
    <div className="bg-background rounded-xl p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${display==="—"?"text-muted-foreground/30":color}`}>
        {display}{display!=="—" && unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// ─── sparkline ────────────────────────────────────────────────────────────
function Spark({ data, color }: { data:number[]; color:string }) {
  const valid = data.filter(Boolean);
  if (!valid.length) return <div className="h-8 flex items-center"><p className="text-xs text-muted-foreground">No data</p></div>;
  const mx=Math.max(...valid), mn=Math.min(...valid), rng=mx-mn||1;
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v,i)=>(
        <div key={i} className={`flex-1 rounded-sm ${v?color:"bg-border"}`}
          style={{ minHeight:"3px", height:v?`${((v-mn)/rng)*100}%`:"3px" }}/>
      ))}
    </div>
  );
}

// ─── sleep breakdown ──────────────────────────────────────────────────────
function SleepBreakdown({ log }: { log:HealthLog|null|undefined }) {
  if (!log?.sleepHours||!log?.sleepDeep||!log?.sleepRem||!log?.sleepLight) return null;
  const t=log.sleepHours;
  const pcts = [log.sleepDeep/t, log.sleepRem/t, log.sleepLight/t].map(p=>Math.round(p*100));
  return (
    <div className="space-y-3 mt-3">
      <div className="flex rounded-full overflow-hidden h-4">
        <div style={{width:`${pcts[0]}%`}} className="bg-indigo-600"/>
        <div style={{width:`${pcts[1]}%`}} className="bg-violet-500"/>
        <div style={{width:`${pcts[2]}%`}} className="bg-blue-400"/>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Deep","bg-indigo-600",log.sleepDeep],["REM","bg-violet-500",log.sleepRem],["Light","bg-blue-400",log.sleepLight]].map(([label,bg,val])=>(
          <div key={label as string}>
            <div className={`w-2 h-2 rounded-sm ${bg} mx-auto mb-1`}/>
            <p className="text-sm font-semibold text-foreground">{(val as number).toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── connect modal ────────────────────────────────────────────────────────
function ConnectModal({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const devices = [
    { name:"Apple Watch / Health", sub:"Steps · Sleep Stages · HR · HRV · SpO₂ · Workouts", connected:true },
    { name:"Fitbit", sub:"Steps · Sleep · HR · HRV · Nutrition · Body Comp · Readiness", connected:true },
    { name:"Whoop", sub:"Recovery · Strain · Sleep Stages · HRV · Stress", connected:true },
    { name:"Garmin Connect", sub:"Steps · Sleep · HR · HRV · SpO₂ · Body Battery · Stress", connected:true },
    { name:"Oura Ring", sub:"Readiness · Sleep Stages · Skin Temp · HRV", connected:false },
    { name:"MyFitnessPal", sub:"Calories · Macros · Micronutrients · Hydration", connected:false },
    { name:"Withings", sub:"Weight · Body Fat · Muscle Mass · Heart Rate", connected:false },
  ];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Bluetooth className="w-4 h-4 text-primary"/> Connected Devices</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground mb-3">Only metrics your devices actually track are shown — no empty fields ever.</p>
        <div className="space-y-2">
          {devices.map(({name,sub,connected})=>(
            <div key={name} className="flex items-center gap-3 bg-background rounded-xl p-3 border border-border">
              <div className={`w-2 h-2 rounded-full shrink-0 ${connected?"bg-emerald-400":"bg-border"}`}/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              {connected
                ? <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30 shrink-0">Linked</Badge>
                : <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={()=>alert(`Connect ${name} in the Life Hub iOS app.`)}><Wifi className="w-3 h-3 mr-1"/>Connect</Button>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── log modal ────────────────────────────────────────────────────────────
function LogModal({ open, onClose, log, onSave }: { open:boolean; onClose:()=>void; log:HealthLog|null|undefined; onSave:(d:any)=>void }) {
  const [form,setForm]=useState<any>({});
  const fields=[
    {key:"steps",label:"Steps",ph:"8500"},
    {key:"activeCalories",label:"Active Cal (kcal)",ph:"420"},
    {key:"workoutMinutes",label:"Workout (min)",ph:"45"},
    {key:"workoutType",label:"Activity",ph:"Running",text:true},
    {key:"distanceKm",label:"Distance (km)",ph:"5.2"},
    {key:"sleepHours",label:"Sleep (hrs)",ph:"7.5"},
    {key:"sleepScore",label:"Sleep Score",ph:"82"},
    {key:"sleepDeep",label:"Deep (hrs)",ph:"1.4"},
    {key:"sleepRem",label:"REM (hrs)",ph:"1.8"},
    {key:"sleepLight",label:"Light (hrs)",ph:"4.2"},
    {key:"heartRateResting",label:"Resting HR (bpm)",ph:"62"},
    {key:"heartRateMax",label:"Max HR (bpm)",ph:"175"},
    {key:"hrv",label:"HRV (ms)",ph:"55"},
    {key:"bloodOxygen",label:"SpO₂ (%)",ph:"98.5"},
    {key:"recoveryScore",label:"Recovery (0–100)",ph:"78"},
    {key:"strainScore",label:"Strain",ph:"12.5"},
    {key:"readinessScore",label:"Readiness",ph:"80"},
    {key:"weight",label:"Weight (lbs)",ph:"175"},
    {key:"bodyFat",label:"Body Fat (%)",ph:"18"},
    {key:"hydrationLiters",label:"Hydration (L)",ph:"2.5"},
    {key:"calories",label:"Calories In (kcal)",ph:"2100"},
    {key:"protein",label:"Protein (g)",ph:"140"},
    {key:"carbs",label:"Carbs (g)",ph:"220"},
    {key:"fat",label:"Fat (g)",ph:"70"},
    {key:"stressLevel",label:"Stress (1–10)",ph:"3"},
    {key:"moodScore",label:"Mood (1–10)",ph:"8"},
    {key:"mindfulMinutes",label:"Mindful (min)",ph:"10"},
  ].filter(f=>tracked.has(f.key));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log Today's Health</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground mb-3">Only fields from your connected devices.</p>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(({key,label,ph,text})=>(
            <div key={key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{label}</label>
              <Input type={text?"text":"number"} placeholder={ph} defaultValue={(log as any)?.[key]??""}
                onChange={e=>setForm((f:any)=>({...f,[key]:text?e.target.value:parseFloat(e.target.value)||null}))}/>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={()=>{onSave({...form,date:today,source:"manual"});onClose();}}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────
export default function Health() {
  const qc = useQueryClient();
  const [logOpen,setLogOpen] = useState(false);
  const [connectOpen,setConnectOpen] = useState(false);

  const { data: log } = useQuery<HealthLog>({
    queryKey:["/api/health/logs",today],
    queryFn:async()=>{ const r=await fetch(`/api/health/logs/${today}`); if(!r.ok) return null; return r.json(); },
  });
  const { data: logs=[] } = useQuery<HealthLog[]>({ queryKey:["/api/health/logs"] });
  const { data: goals=[] } = useQuery<HealthGoal[]>({ queryKey:["/api/health/goals"] });

  const saveMutation = useMutation({
    mutationFn:(data:any)=>apiRequest("POST","/api/health/logs",data),
    onSuccess:()=>qc.invalidateQueries({ queryKey:["/api/health/logs"] }),
  });

  const g = (key:string) => goals.find(gl=>gl.metric===key);
  const pct = (key:string, val:number|null|undefined) => { const gl=g(key); return gl&&val ? Math.min((val/gl.target)*100,100) : null; };
  const trend = (key:string) => logs.slice(0,7).map(l=>Number((l as any)[key])||0).reverse();

  const aiCtx = `Health — ${today}. Recovery: ${log?.recoveryScore||"—"}%, Strain: ${log?.strainScore||"—"}, Readiness: ${log?.readinessScore||"—"}%. Sleep: ${log?.sleepHours||"—"}h total (deep ${log?.sleepDeep||"—"}h, REM ${log?.sleepRem||"—"}h, score ${log?.sleepScore||"—"}). Activity: ${log?.steps||0} steps, ${log?.activeCalories||0} kcal burned, ${log?.workoutType||"no workout"} ${log?.workoutMinutes||0}min. Heart: ${log?.heartRateResting||"—"} bpm resting, HRV ${log?.hrv||"—"}ms, SpO₂ ${log?.bloodOxygen||"—"}%. Body: ${log?.weight||"—"} lbs, ${log?.bodyFat||"—"}% body fat, ${log?.hydrationLiters||"—"}L hydration. Nutrition: ${log?.calories||0} kcal, ${log?.protein||0}g protein, ${log?.carbs||0}g carbs, ${log?.fat||0}g fat. Mental: mood ${log?.moodScore||"—"}/10, stress ${log?.stressLevel||"—"}/10, ${log?.mindfulMinutes||0} mindful min. 7-day avg steps: ${logs.slice(0,7).length?Math.round(logs.slice(0,7).reduce((s,l)=>s+(l.steps||0),0)/logs.slice(0,7).length):0}.`;

  // Whoop-style recovery label
  const recoveryLabel = (s:number|undefined|null) => {
    if (!s) return { text:"No data", color:"text-muted-foreground" };
    if (s>=85) return { text:"Peak", color:"text-emerald-400" };
    if (s>=70) return { text:"Good", color:"text-sky-400" };
    if (s>=50) return { text:"Moderate", color:"text-amber-400" };
    return { text:"Low — Rest", color:"text-rose-400" };
  };
  const rl = recoveryLabel(log?.recoveryScore);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500"/> Health</h1>
          <p className={`text-xs font-medium mt-0.5 ${rl.color}`}>{rl.text}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>setConnectOpen(true)}><Bluetooth className="w-4 h-4 mr-1.5"/>Devices</Button>
          <Button size="sm" onClick={()=>setLogOpen(true)}><Plus className="w-4 h-4 mr-1.5"/>Log</Button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ── Whoop-style 3 dials ───────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex justify-around">
            {tracked.has("recoveryScore") && (
              <ScoreDial label="Recovery" value={log?.recoveryScore} color="#10b981" icon={Zap}
                sub={`HRV ${log?.hrv||"—"} ms`}/>
            )}
            {tracked.has("sleepScore") && (
              <ScoreDial label="Sleep" value={log?.sleepScore} color="#818cf8" icon={Moon}
                sub={`${log?.sleepHours?.toFixed(1)||"—"}h total`}/>
            )}
            {tracked.has("strainScore") && (
              <ScoreDial label="Strain" value={log?.strainScore} max={21} color="#f59e0b" icon={Flame}
                sub={log?.workoutType||"No workout"}/>
            )}
          </div>

          {/* Coaching tip — Whoop-style */}
          <div className="mt-4 bg-background rounded-xl px-4 py-3 border border-border">
            <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5"><Zap className="w-3 h-3"/>Orion Coach</p>
            <p className="text-sm text-foreground leading-relaxed">{coachingTip(log)}</p>
          </div>
        </div>

        {/* ── Orion AI Panel ────────────────────────────────────── */}
        <AIPanel
          context={aiCtx}
          suggestions={["How's my recovery?","Improve my sleep score","Am I overtraining?","Best workout today?","Explain my HRV","Nutrition check"]}
          placeholder="Ask Orion about your health..."
        />

        {/* ── Activity (Apple Watch / Fitbit / Garmin) ─────────── */}
        {["steps","activeCalories","workoutMinutes"].some(m=>tracked.has(m)) && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-sky-400/10 flex items-center justify-center"><Footprints className="w-4 h-4 text-sky-400"/></div>
              Activity
              <div className="ml-auto w-20"><Spark data={trend("steps")} color="bg-sky-500/70"/></div>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tracked.has("steps") && (
                <div className="bg-background rounded-xl p-3 col-span-2 md:col-span-1">
                  <p className="text-xs text-muted-foreground mb-1">Steps</p>
                  <p className="text-2xl font-bold text-sky-400">{log?.steps?.toLocaleString()||"—"}</p>
                  {pct("steps",log?.steps) !== null && (
                    <div className="mt-2 space-y-0.5">
                      <Progress value={pct("steps",log?.steps)!} className="h-1.5"/>
                      <p className="text-xs text-muted-foreground">{Math.round(pct("steps",log?.steps)!)}% of 10,000</p>
                    </div>
                  )}
                </div>
              )}
              {tracked.has("activeCalories") && <StatPill label="Active Cal" value={log?.activeCalories} unit="kcal" color="text-orange-400"/>}
              {tracked.has("workoutMinutes") && <StatPill label="Workout" value={log?.workoutMinutes} unit="min" color="text-cyan-400"/>}
              {tracked.has("workoutType") && <StatPill label="Activity" value={log?.workoutType} color="text-blue-300"/>}
              {tracked.has("distanceKm") && <StatPill label="Distance" value={log?.distanceKm} unit="km" color="text-teal-300"/>}
            </div>
          </div>
        )}

        {/* ── Sleep (all 4 devices) ─────────────────────────────── */}
        {tracked.has("sleepHours") && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-400/10 flex items-center justify-center"><Moon className="w-4 h-4 text-indigo-400"/></div>
              Sleep
              <div className="ml-auto w-20"><Spark data={trend("sleepHours")} color="bg-indigo-500/70"/></div>
            </h2>
            {/* Oura-style total + score side by side */}
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div className="bg-background rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="text-3xl font-bold text-indigo-400">{log?.sleepHours?.toFixed(1)||"—"}<span className="text-sm font-normal text-muted-foreground ml-1">hrs</span></p>
                {pct("sleepHours",log?.sleepHours) !== null && <Progress value={pct("sleepHours",log?.sleepHours)!} className="h-1.5 mt-2"/>}
              </div>
              <div className="bg-background rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Sleep Score</p>
                <p className={`text-3xl font-bold ${(log?.sleepScore||0)>=85?"text-emerald-400":(log?.sleepScore||0)>=70?"text-sky-400":"text-amber-400"}`}>{log?.sleepScore||"—"}</p>
                <p className="text-xs text-muted-foreground mt-1">{(log?.sleepScore||0)>=85?"Excellent":(log?.sleepScore||0)>=70?"Good":(log?.sleepScore||0)>0?"Fair":"—"}</p>
              </div>
            </div>
            {/* Oura-style stage breakdown */}
            <SleepBreakdown log={log}/>
          </div>
        )}

        {/* ── Heart & Vitals ────────────────────────────────────── */}
        {["heartRateResting","hrv","bloodOxygen"].some(m=>tracked.has(m)) && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-rose-400/10 flex items-center justify-center"><Heart className="w-4 h-4 text-rose-400"/></div>
              Heart & Vitals
              <div className="ml-auto w-20"><Spark data={trend("heartRateResting")} color="bg-rose-500/70"/></div>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tracked.has("heartRateResting") && <StatPill label="Resting HR" value={log?.heartRateResting} unit="bpm" color="text-rose-400"/>}
              {tracked.has("heartRateMax") && <StatPill label="Max HR" value={log?.heartRateMax} unit="bpm" color="text-red-400"/>}
              {tracked.has("hrv") && <StatPill label="HRV" value={log?.hrv} unit="ms" color="text-violet-400"/>}
              {tracked.has("bloodOxygen") && <StatPill label="Blood O₂" value={log?.bloodOxygen} unit="%" color="text-sky-400"/>}
            </div>
            {/* 7-day HR trend */}
            <div className="mt-3 bg-background rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-2">Resting HR — 7 days</p>
              <Spark data={trend("heartRateResting")} color="bg-rose-500/60"/>
            </div>
          </div>
        )}

        {/* ── Body (Fitbit / Garmin / Withings) ───────────────── */}
        {["weight","bodyFat","hydrationLiters"].some(m=>tracked.has(m)) && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center"><Scale className="w-4 h-4 text-amber-400"/></div>
              Body
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {tracked.has("weight") && <StatPill label="Weight" value={log?.weight} unit="lbs" color="text-amber-400"/>}
              {tracked.has("bodyFat") && <StatPill label="Body Fat" value={log?.bodyFat} unit="%" color="text-orange-400"/>}
              {tracked.has("hydrationLiters") && (
                <div className="bg-background rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Hydration</p>
                  <p className="text-lg font-bold text-blue-400">{log?.hydrationLiters||"—"}<span className="text-xs text-muted-foreground ml-1">L</span></p>
                  {pct("hydrationLiters",log?.hydrationLiters)!==null && <Progress value={pct("hydrationLiters",log?.hydrationLiters)!} className="h-1.5 mt-2"/>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Nutrition (Fitbit / MyFitnessPal) ───────────────── */}
        {["calories","protein","carbs","fat"].some(m=>tracked.has(m)) && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-orange-400/10 flex items-center justify-center"><Flame className="w-4 h-4 text-orange-400"/></div>
              Nutrition
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tracked.has("calories") && (
                <div className="bg-background rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Calories</p>
                  <p className="text-xl font-bold text-lime-400">{log?.calories||"—"}<span className="text-xs text-muted-foreground ml-1">kcal</span></p>
                  {pct("calories",log?.calories)!==null && <Progress value={pct("calories",log?.calories)!} className="h-1.5 mt-2"/>}
                </div>
              )}
              {tracked.has("protein") && <StatPill label="Protein" value={log?.protein?.toFixed(0)} unit="g" color="text-green-400"/>}
              {tracked.has("carbs") && <StatPill label="Carbs" value={log?.carbs?.toFixed(0)} unit="g" color="text-yellow-400"/>}
              {tracked.has("fat") && <StatPill label="Fat" value={log?.fat?.toFixed(0)} unit="g" color="text-red-300"/>}
            </div>
            {/* Macro bar — Copilot-style */}
            {log?.protein && log?.carbs && log?.fat && (
              <div className="mt-3">
                <div className="flex rounded-full overflow-hidden h-2.5">
                  {[["bg-green-400", log.protein*4],["bg-yellow-400",log.carbs*4],["bg-red-400",log.fat*9]].map(([color,cal],i)=>{
                    const total=(log.protein||0)*4+(log.carbs||0)*4+(log.fat||0)*9||1;
                    return <div key={i} className={color as string} style={{ width:`${(cal as number/total)*100}%` }}/>;
                  })}
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400 inline-block"/>Protein</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-400 inline-block"/>Carbs</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block"/>Fat</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Mental (Garmin / Apple / Fitbit) ─────────────────── */}
        {["stressLevel","moodScore","mindfulMinutes"].some(m=>tracked.has(m)) && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-purple-400/10 flex items-center justify-center"><Activity className="w-4 h-4 text-purple-400"/></div>
              Mental & Stress
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {tracked.has("stressLevel") && <StatPill label="Stress" value={log?.stressLevel} unit="/10" color="text-red-400"/>}
              {tracked.has("moodScore") && <StatPill label="Mood" value={log?.moodScore} unit="/10" color="text-purple-400"/>}
              {tracked.has("mindfulMinutes") && <StatPill label="Mindful" value={log?.mindfulMinutes} unit="min" color="text-teal-400"/>}
            </div>
          </div>
        )}

        {/* ── 7-day table ───────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-muted-foreground"/> Weekly Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2">Date</th>
                {tracked.has("steps") && <th className="text-right pb-2">Steps</th>}
                {tracked.has("sleepHours") && <th className="text-right pb-2">Sleep</th>}
                {tracked.has("heartRateResting") && <th className="text-right pb-2">HR</th>}
                {tracked.has("hrv") && <th className="text-right pb-2">HRV</th>}
                {tracked.has("recoveryScore") && <th className="text-right pb-2">Recovery</th>}
                {tracked.has("bloodOxygen") && <th className="text-right pb-2">SpO₂</th>}
              </tr></thead>
              <tbody>{logs.slice(0,7).map(l=>(
                <tr key={l.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 text-muted-foreground">{l.date}</td>
                  {tracked.has("steps") && <td className="py-2 text-right text-sky-400">{l.steps?.toLocaleString()||"—"}</td>}
                  {tracked.has("sleepHours") && <td className="py-2 text-right text-indigo-400">{l.sleepHours?.toFixed(1)||"—"}h</td>}
                  {tracked.has("heartRateResting") && <td className="py-2 text-right text-rose-400">{l.heartRateResting||"—"}</td>}
                  {tracked.has("hrv") && <td className="py-2 text-right text-violet-400">{l.hrv||"—"}</td>}
                  {tracked.has("recoveryScore") && <td className="py-2 text-right text-emerald-400">{l.recoveryScore||"—"}%</td>}
                  {tracked.has("bloodOxygen") && <td className="py-2 text-right text-sky-300">{l.bloodOxygen||"—"}%</td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

      </div>
      <LogModal open={logOpen} onClose={()=>setLogOpen(false)} log={log} onSave={d=>saveMutation.mutate(d)}/>
      <ConnectModal open={connectOpen} onClose={()=>setConnectOpen(false)}/>
    </div>
  );
}

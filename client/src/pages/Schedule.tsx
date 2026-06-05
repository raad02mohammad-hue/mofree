import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Event } from "@shared/schema";
import AIPanel from "@/components/AIPanel";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#ef4444","#8b5cf6","#06b6d4"];

export default function Schedule() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(now.toISOString().split("T")[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title:"", time:"", category:"personal", color:"#6366f1", description:"" });

  const { data: events = [] } = useQuery<Event[]>({ queryKey:["/api/events"] });
  const addMutation = useMutation({ mutationFn:(data:any) => apiRequest("POST","/api/events",data), onSuccess:() => qc.invalidateQueries({ queryKey:["/api/events"] }) });
  const delMutation = useMutation({ mutationFn:(id:number) => apiRequest("DELETE",`/api/events/${id}`), onSuccess:() => qc.invalidateQueries({ queryKey:["/api/events"] }) });

  const today = now.toISOString().split("T")[0];
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const eventMap = new Map<string,Event[]>();
  events.forEach(e => { if (!eventMap.has(e.date)) eventMap.set(e.date,[]); eventMap.get(e.date)!.push(e); });

  const prevMonth = () => { if (month===0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); };
  const selectedEvents = eventMap.get(selected) || [];
  const upcomingEvents = events.filter(e => e.date >= today).slice(0,5);

  const aiContext = `Schedule overview. Today: ${today}. Selected date: ${selected}. Upcoming events (next 5): ${upcomingEvents.map(e => `${e.title} on ${e.date}${e.time ? " at "+e.time : ""} (${e.category})`).join("; ") || "none"}. Events on selected date: ${selectedEvents.map(e => e.title+(e.time?" at "+e.time:"")).join(", ") || "none"}. Total events this month: ${events.filter(e => e.date.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length}.`;

  const exportICS = () => {
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Life Hub//EN"];
    events.forEach(e => { const d=e.date.replace(/-/g,""); lines.push("BEGIN:VEVENT",`DTSTART:${d}`,`SUMMARY:${e.title}`,"END:VEVENT"); });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")],{type:"text/calendar"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download="lifehub-events.ics"; a.click();
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Schedule</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportICS}><Download className="w-4 h-4 mr-1.5" /> Export .ics</Button>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add Event</Button>
        </div>
      </div>

      {/* Orion AI — Schedule */}
      <AIPanel
        context={aiContext}
        suggestions={["What's on my schedule today?","Am I overbooked this week?","Best time to schedule a workout?","Any conflicts coming up?","Suggest a rest day","Plan my week"]}
        placeholder="Ask Orion about your schedule..."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth}><ChevronLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            <h2 className="font-semibold text-foreground">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth}><ChevronRight className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length:firstDay }, (_,i) => <div key={`e${i}`} />)}
            {Array.from({ length:daysInMonth }, (_,i) => {
              const dayNum = i+1;
              const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
              const dayEvents = eventMap.get(dateStr)||[];
              const isToday = dateStr===today, isSel = dateStr===selected;
              return (
                <button key={i} onClick={() => setSelected(dateStr)}
                  className={`aspect-square flex flex-col items-center justify-start p-1 rounded-lg text-xs transition-colors ${isSel?"bg-primary text-primary-foreground":isToday?"bg-primary/20 text-primary font-semibold":"hover:bg-accent text-foreground"}`}>
                  <span>{dayNum}</span>
                  {dayEvents.length>0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayEvents.slice(0,3).map(e => <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor:isSel?"white":e.color }} />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day view */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3 text-sm">{selected}</h3>
          {selectedEvents.length>0 ? (
            <div className="space-y-3">
              {selectedEvents.map(e => (
                <div key={e.id} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                  <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor:e.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    {e.time && <p className="text-xs text-muted-foreground">{e.time}</p>}
                    {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                  </div>
                  <button onClick={() => delMutation.mutate(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No events. <button onClick={() => setAddOpen(true)} className="text-primary hover:underline">Add one →</button></p>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><label className="text-xs text-muted-foreground">Title</label><Input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Event title" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" defaultValue={selected} onChange={e => setSelected(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground">Time</label><Input value={form.time} onChange={e => setForm(f=>({...f,time:e.target.value}))} placeholder="e.g. 2:00 PM" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Category</label>
              <Select value={form.category} onValueChange={v => setForm(f=>({...f,category:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["personal","work","health","social","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Color</label>
              <div className="flex gap-2 mt-1">{COLORS.map(c => <button key={c} onClick={() => setForm(f=>({...f,color:c}))} className={`w-6 h-6 rounded-full border-2 ${form.color===c?"border-foreground":"border-transparent"}`} style={{ backgroundColor:c }} />)}</div>
            </div>
            <div><label className="text-xs text-muted-foreground">Notes</label><Input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Optional notes" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => { if (!form.title) return; addMutation.mutate({...form,date:selected}); setAddOpen(false); setForm({title:"",time:"",category:"personal",color:"#6366f1",description:""}); }}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

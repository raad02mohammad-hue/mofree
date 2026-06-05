import { useQuery } from "@tanstack/react-query";
import { Heart, DollarSign, CalendarDays, Footprints, Moon, Zap, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { HealthLog, Transaction, Event } from "@shared/schema";
import AIPanel from "@/components/AIPanel";

export default function Dashboard() {
  const today = new Date().toISOString().split("T")[0];
  const { data: healthLog } = useQuery<HealthLog>({ queryKey: ["/api/health/logs", today], queryFn: async () => { const r = await fetch(`/api/health/logs/${today}`); if (!r.ok) return null; return r.json(); } });
  const { data: transactions = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: events = [] } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const { data: logs = [] } = useQuery<HealthLog[]>({ queryKey: ["/api/health/logs"] });

  const todayExpenses = Math.abs(transactions.filter(t => t.date === today && t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const upcomingEvents = events.filter(e => e.date >= today).slice(0, 3);
  const weekAvgSteps = logs.slice(0, 7).length > 0 ? Math.round(logs.slice(0, 7).reduce((s, l) => s + (l.steps || 0), 0) / logs.slice(0, 7).length) : 0;
  const totalBalance = transactions.reduce((s, t) => s + t.amount, 0);

  const aiContext = `Dashboard overview. Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}. Steps: ${healthLog?.steps || 0}, Sleep: ${healthLog?.sleepHours || 0}h (score ${healthLog?.sleepScore || "—"}), Recovery: ${healthLog?.recoveryScore || "—"}%, HRV: ${healthLog?.hrv || "—"} ms, Resting HR: ${healthLog?.heartRateResting || "—"} bpm. Balance: $${totalBalance.toFixed(2)}, spent today: $${todayExpenses.toFixed(2)}. Upcoming events: ${upcomingEvents.map(e => e.title + " on " + e.date).join(", ") || "none"}. Weekly avg steps: ${weekAvgSteps}.`;

  const stats = [
    { label: "Steps Today", value: healthLog?.steps?.toLocaleString() || "—", sub: `${weekAvgSteps.toLocaleString()} avg`, icon: Footprints, color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/health" },
    { label: "Sleep Last Night", value: healthLog?.sleepHours ? `${healthLog.sleepHours}h` : "—", sub: `Score: ${healthLog?.sleepScore || "—"}`, icon: Moon, color: "text-indigo-400", bg: "bg-indigo-400/10", href: "/health" },
    { label: "Recovery", value: healthLog?.recoveryScore ? `${healthLog.recoveryScore}%` : "—", sub: `HRV: ${healthLog?.hrv || "—"} ms`, icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10", href: "/health" },
    { label: "Spent Today", value: `$${todayExpenses.toFixed(0)}`, sub: `${transactions.filter(t => t.amount < 0).length} total expenses`, icon: DollarSign, color: "text-rose-400", bg: "bg-rose-400/10", href: "/budget" },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Good {getGreeting()}</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <a className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </a>
          </Link>
        ))}
      </div>

      {/* Orion AI */}
      <AIPanel
        context={aiContext}
        suggestions={["What should I focus on today?", "How's my week looking?", "Any health red flags?", "Am I overspending?", "What's my best day this week?"]}
        placeholder="Ask Orion about your day..."
      />

      {/* Health snapshot + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> Health Today</h2>
            <Link href="/health"><a className="text-xs text-primary hover:underline">View all →</a></Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Heart Rate", value: healthLog?.heartRateResting ? `${healthLog.heartRateResting} bpm` : "—", color: "text-rose-500" },
              { label: "Blood O₂", value: healthLog?.bloodOxygen ? `${healthLog.bloodOxygen}%` : "—", color: "text-sky-400" },
              { label: "Calories", value: healthLog?.calories ? `${healthLog.calories} kcal` : "—", color: "text-orange-400" },
              { label: "Hydration", value: healthLog?.hydrationLiters ? `${healthLog.hydrationLiters}L` : "—", color: "text-blue-400" },
              { label: "Mood", value: healthLog?.moodScore ? `${healthLog.moodScore}/10` : "—", color: "text-purple-400" },
              { label: "Stress", value: healthLog?.stressLevel ? `${healthLog.stressLevel}/10` : "—", color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center bg-background rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-sm font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> Upcoming</h2>
            <Link href="/schedule"><a className="text-xs text-primary hover:underline">View all →</a></Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.date} {ev.time && `· ${ev.time}`}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          )}
        </div>
      </div>

      {/* Quick log */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Quick Log</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {["Log Steps", "Log Sleep", "Log Workout", "Log Meal", "Log Mood", "Log Water"].map(label => (
            <Link key={label} href="/health">
              <a className="text-center bg-background hover:bg-accent rounded-lg px-2 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer block">{label}</a>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

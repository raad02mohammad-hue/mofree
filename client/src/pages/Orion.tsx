import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Send, User, Zap, Brain, TrendingUp, Calendar, Heart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage { role: "user" | "ai"; content: string; time: string; }

const QUICK_ACTIONS = [
  { icon: Heart,       label: "Health check",        prompt: "Give me a comprehensive summary of my health data and what to focus on today." },
  { icon: DollarSign,  label: "Budget summary",       prompt: "How am I doing with my budget this month? Any concerns or wins?" },
  { icon: Calendar,    label: "Schedule overview",    prompt: "What's on my schedule today and this week? Anything I should prepare for?" },
  { icon: TrendingUp,  label: "Progress report",      prompt: "Give me a weekly progress report across health, finances, and productivity." },
  { icon: Brain,       label: "Recovery tips",        prompt: "Based on my sleep and recovery data, what should I do today to perform my best?" },
  { icon: Zap,         label: "What to focus on",     prompt: "What's the single most important thing I should focus on right now across all areas of my life?" },
];

const CONTEXT = "You are Orion, the personal AI assistant inside mofree — a personal life OS. You have full context on the user's health data from connected wearables, budget, schedule, and messages. Be concise, personalized, and actionable. Always refer to the user's actual data when available.";

export default function Orion() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      role: "ai",
      content: "Hey — I'm Orion. I have full context on your health, finances, schedule, and messages. Ask me anything, or pick a quick action below.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", "/api/ai/chat", { message, context: CONTEXT }).then(r => r.json()),
    onSuccess: (data: any) => {
      setMsgs(m => [...m, {
        role: "ai",
        content: data.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    },
  });

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, {
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    chatMutation.mutate(text);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-background shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-foreground">Orion AI</h1>
          <p className="text-xs text-muted-foreground">Personal life assistant · knows your health, budget & schedule</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Online</span>
        </div>
      </div>

      {/* ── Quick actions row ── */}
      <div className="px-4 py-3 border-b border-border/50 bg-background/60 shrink-0">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Quick actions</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              data-testid={`quick-action-${label.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => send(prompt)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent transition-all whitespace-nowrap"
            >
              <Icon className="w-3 h-3 text-primary shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {msgs.map((m, i) => (
          <div
            key={i}
            data-testid={`chat-msg-${i}`}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "ai" && (
              <div className="w-8 h-8 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            )}

            <div className="flex flex-col gap-1 max-w-lg">
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}>
                {m.content}
              </div>
              <p className={`text-[10px] text-muted-foreground ${m.role === "user" ? "text-right" : "text-left"}`}>
                {m.time}
              </p>
            </div>

            {m.role === "user" && (
              <div className="w-8 h-8 rounded-2xl bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {chatMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-4 py-3 border-t border-border bg-background flex items-center gap-2 shrink-0">
        <Input
          data-testid="input-orion"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Orion anything about your life…"
          className="flex-1 rounded-full bg-accent/40 border-border/60"
          onKeyDown={e => e.key === "Enter" && !chatMutation.isPending && send(input)}
        />
        <Button
          data-testid="button-send-orion"
          size="icon"
          className="rounded-full w-9 h-9 shrink-0"
          onClick={() => send(input)}
          disabled={!input.trim() || chatMutation.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

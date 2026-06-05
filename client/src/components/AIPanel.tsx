import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message { role: "user" | "ai"; content: string; }

interface AIPanelProps {
  context: string;          // Real-time data string passed from parent
  suggestions: string[];    // Quick prompts
  placeholder?: string;
}

export default function AIPanel({ context, suggestions, placeholder = "Ask Orion..." }: AIPanelProps) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Auto-generate an opening insight when context first loads with real data
  useEffect(() => {
    if (initialized.current || !context || context.includes("No data")) return;
    initialized.current = true;
    chatMutation.mutate(`Based on my current data, give me a short (2-3 sentence) personalized insight and one actionable tip. Data: ${context}`);
  }, [context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", "/api/ai/chat", { message, context }).then(r => r.json()),
    onSuccess: (data: any) => {
      setMsgs(m => [...m, { role: "ai", content: data.reply }]);
    },
  });

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { role: "user", content: text }]);
    chatMutation.mutate(text);
    setInput("");
  };

  return (
    <div className="bg-card border border-primary/20 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Orion AI</span>
          {chatMutation.isPending && (
            <div className="flex gap-1 items-center">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i*120}ms` }} />
              ))}
            </div>
          )}
          {!chatMutation.isPending && msgs.length === 0 && !collapsed && (
            <span className="text-xs text-muted-foreground">analyzing your data...</span>
          )}
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="border-t border-border/50">
          {/* Messages */}
          {msgs.length > 0 && (
            <div className="max-h-56 overflow-y-auto px-4 py-3 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "ai" && (
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-sm text-sm rounded-xl px-3 py-2 leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-background border border-border rounded-bl-sm text-foreground"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-background border border-border rounded-xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Loading state before first message */}
          {msgs.length === 0 && chatMutation.isPending && (
            <div className="px-4 py-3 flex gap-2 items-center">
              <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-background border border-border rounded-xl px-3 py-2 flex gap-1 items-center">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-border/30">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 px-2.5 py-1 bg-background border border-border rounded-full text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pb-3 pt-1 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              className="flex-1 h-8 text-sm"
              onKeyDown={e => e.key === "Enter" && !chatMutation.isPending && send(input)}
            />
            <Button size="sm" className="h-8 w-8 p-0" onClick={() => send(input)} disabled={!input.trim() || chatMutation.isPending}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Send, MessageCircle, Clock, Search, Plus, CheckCheck,
  Mic, Image, Smile, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AIPanel from "@/components/AIPanel";
import type { Contact, Message } from "@shared/schema";

export default function Messages() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ["/api/contacts"] });
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", selected],
    queryFn: () => apiRequest("GET", `/api/messages/${selected}`, undefined).then(r => r.json()),
    enabled: !!selected,
    refetchInterval: 3000,
  });

  const sendMsg = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/messages", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messages", selected] });
      qc.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeContact = contacts.find(c => c.id === selected);
  const unreadTotal = contacts.reduce((s, c) => s + (c.unread || 0), 0);
  const needsReply = contacts.filter(c => (c.unread || 0) > 0);
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = () => {
    if (!input.trim() || !selected) return;
    sendMsg.mutate({
      contactId: selected,
      content: input.trim(),
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setInput("");
  };

  // AI context string from message data
  const aiContext = `Messages overview: ${contacts.length} conversations, ${unreadTotal} unread. ${
    needsReply.length > 0 ? `Needs reply: ${needsReply.map(c => c.name).join(", ")}.` : "No urgent replies needed."
  } ${activeContact ? `Currently viewing chat with ${activeContact.name}.` : ""}`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* AI Panel — top strip (collapsible) */}
      <div className="border-b border-border">
        <div className="px-4 py-2">
          <AIPanel
            context={aiContext}
            suggestions={[
              "Who needs a reply today?",
              "Draft a quick reply to my latest message",
              "Summarize my unread conversations",
              "What messages are urgent?",
            ]}
            placeholder="Ask about your messages..."
          />
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Contacts sidebar ─── */}
        <div className="w-72 border-r border-border flex flex-col bg-background shrink-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Messages</h2>
              {unreadTotal > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs h-4 px-1.5">
                  {unreadTotal}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-7 pl-8 text-xs bg-accent/40 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          {/* Needs Reply nudge strip */}
          {needsReply.length > 0 && (
            <div className="px-3 py-2 border-b border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Needs Reply</span>
              </div>
              <div className="space-y-0.5">
                {needsReply.slice(0, 3).map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="w-full text-left flex items-center gap-2 py-0.5 group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
                      {c.name}
                    </span>
                    <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">{c.lastMessageTime}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
                No conversations
              </div>
            ) : (
              filteredContacts.map(c => (
                <button
                  key={c.id}
                  data-testid={`contact-row-${c.id}`}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-3 py-3 flex items-start gap-3 border-b border-border/40 hover:bg-accent/60 transition-colors ${
                    selected === c.id ? "bg-accent" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                      {c.avatar}
                    </div>
                    {(c.unread || 0) > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                        {c.unread}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm truncate ${(c.unread || 0) > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground shrink-0 ml-2">{c.lastMessageTime}</p>
                    </div>
                    <p className={`text-xs truncate ${(c.unread || 0) > 0 ? "text-foreground/70" : "text-muted-foreground"}`}>
                      {c.lastMessage}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Chat pane ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected && activeContact ? (
            <>
              {/* Chat header — iMessage style */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-background">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {activeContact.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{activeContact.name}</p>
                  <p className="text-xs text-emerald-400">Active now</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-7 h-7">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7">
                    <Image className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="w-6 h-6 text-primary/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">Start your conversation with {activeContact.name}</p>
                  </div>
                )}

                {messages.map((m, idx) => {
                  const isMe = m.sender === "me";
                  const prevSender = idx > 0 ? messages[idx - 1].sender : null;
                  const showAvatar = !isMe && prevSender !== m.sender;

                  return (
                    <div
                      key={m.id}
                      data-testid={`message-bubble-${m.id}`}
                      className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {/* Other person's avatar */}
                      {!isMe && (
                        <div className={`w-6 h-6 rounded-full shrink-0 ${showAvatar ? "bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold" : "opacity-0"}`}>
                          {showAvatar ? activeContact.avatar : ""}
                        </div>
                      )}

                      <div className={`max-w-xs lg:max-w-sm`}>
                        {/* Bubble */}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border text-foreground rounded-bl-md"
                        }`}>
                          <p>{m.content}</p>
                        </div>
                        {/* Timestamp + read receipt */}
                        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                          <p className="text-[10px] text-muted-foreground">{m.timestamp}</p>
                          {isMe && <CheckCheck className="w-3 h-3 text-primary" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {sendMsg.isPending && (
                  <div className="flex justify-end">
                    <div className="bg-primary/30 rounded-2xl rounded-br-md px-4 py-2.5 flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-primary-foreground/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input bar — iMessage style */}
              <div className="px-4 py-3 border-t border-border bg-background flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
                  <Image className="w-4 h-4 text-muted-foreground" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    data-testid="input-message"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={`Message ${activeContact.name}…`}
                    className="h-9 pr-10 text-sm rounded-full bg-accent/40 border-border/60"
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                  />
                </div>
                <Button
                  data-testid="button-send"
                  size="icon"
                  className="w-8 h-8 rounded-full shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-8 h-8 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-foreground">Your messages</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Select a conversation from the left to start chatting
                </p>
                {unreadTotal > 0 && (
                  <p className="text-xs text-primary font-medium">{unreadTotal} unread message{unreadTotal > 1 ? "s" : ""}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

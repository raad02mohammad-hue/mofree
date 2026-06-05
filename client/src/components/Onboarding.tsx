import { useState, useEffect, useRef } from "react";
import { Heart, DollarSign, CalendarDays, MessageCircle, Sparkles, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

const SLIDES = [
  {
    id: "welcome",
    bg: "from-black via-zinc-900 to-black",
    accent: "#ffffff",
    icon: null,
    logo: true,
    title: "mofree",
    subtitle: "Your personal life OS",
    body: "Everything you need — health, money, schedule, messages, and AI — all in one place.",
    cta: "Let's go",
  },
  {
    id: "health",
    bg: "from-black via-rose-950 to-black",
    accent: "#f43f5e",
    icon: Heart,
    title: "Health",
    subtitle: "Powered by your devices",
    body: "Connect your wearables and track recovery, sleep, strain, HRV, and every metric that matters.",
    cta: "Next",
  },
  {
    id: "budget",
    bg: "from-black via-emerald-950 to-black",
    accent: "#10b981",
    icon: DollarSign,
    title: "Budget",
    subtitle: "Know where every dollar goes",
    body: "Real-time spending breakdowns, category tracking, and AI-powered financial insights.",
    cta: "Next",
  },
  {
    id: "schedule",
    bg: "from-black via-blue-950 to-black",
    accent: "#3b82f6",
    icon: CalendarDays,
    title: "Schedule",
    subtitle: "Own your time",
    body: "Calendar, events, and reminders in a clean intelligent layout. Never miss what matters.",
    cta: "Next",
  },
  {
    id: "messages",
    bg: "from-black via-violet-950 to-black",
    accent: "#8b5cf6",
    icon: MessageCircle,
    title: "Messages",
    subtitle: "All your conversations",
    body: "Unified inbox for all your conversations. See who needs a reply, jump in instantly.",
    cta: "Next",
  },
  {
    id: "orion",
    bg: "from-black via-amber-950 to-black",
    accent: "#f59e0b",
    icon: Sparkles,
    title: "Orion AI",
    subtitle: "Your personal AI",
    body: "Orion knows your health data, finances, and schedule. Ask anything. Get answers that actually help.",
    cta: "Enter mofree →",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<any>(null);

  // Entrance animation on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const next = () => {
    if (animating) return;
    if (slide === SLIDES.length - 1) {
      // Exit animation then complete
      setDirection("out");
      setAnimating(true);
      setVisible(false);
      setTimeout(() => onComplete(), 600);
      return;
    }
    setDirection("out");
    setAnimating(true);
    setVisible(false);
    setTimeout(() => {
      setSlide(s => s + 1);
      setDirection("in");
      setTimeout(() => {
        setVisible(true);
        setAnimating(false);
      }, 60);
    }, 300);
  };

  const skip = () => {
    setVisible(false);
    setTimeout(() => onComplete(), 400);
  };

  const current = SLIDES[slide];
  const Icon = current.icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ touchAction: "none" }}
    >
      {/* Skip button */}
      {slide > 0 && slide < SLIDES.length - 1 && (
        <button
          onClick={skip}
          className="absolute top-5 right-5 text-white/40 hover:text-white/80 transition-colors text-xs flex items-center gap-1"
        >
          Skip <X className="w-3 h-3" />
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === slide ? 20 : 6,
              height: 6,
              backgroundColor: i === slide ? current.accent : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* Slide content */}
      <div
        className={`flex flex-col items-center text-center px-8 max-w-sm transition-all duration-300 ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : direction === "in"
            ? "opacity-0 translate-y-6 scale-95"
            : "opacity-0 -translate-y-4 scale-95"
        }`}
      >
        {/* Icon / Logo */}
        <div className="mb-8">
          {current.logo ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center overflow-hidden"
                style={{ boxShadow: `0 0 60px 20px rgba(255,255,255,0.15)` }}
              >
                <img src="/icon-192.png" alt="mofree" className="w-full h-full object-cover" />
              </div>
            </div>
          ) : Icon ? (
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                backgroundColor: current.accent + "22",
                boxShadow: `0 0 60px 20px ${current.accent}22`,
              }}
            >
              <Icon className="w-10 h-10" style={{ color: current.accent }} />
            </div>
          ) : null}
        </div>

        {/* Text */}
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: current.accent }}
        >
          {current.subtitle}
        </p>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
          {current.title}
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-12">
          {current.body}
        </p>

        {/* CTA */}
        <button
          onClick={next}
          className="flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-black text-sm transition-all active:scale-95"
          style={{ backgroundColor: current.accent, boxShadow: `0 0 30px 6px ${current.accent}44` }}
        >
          {current.cta}
          {slide < SLIDES.length - 1 && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Radial background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${current.accent}18 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

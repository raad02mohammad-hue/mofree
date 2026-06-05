import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatarInitials: string;
}

interface AuthPageProps {
  onSuccess: (token: string, user: AuthUser) => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [tab, setTab] = useState<"login" | "signup">("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("Please fill in all fields.");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email: loginEmail, password: loginPassword });
      const data = await res.json();
      if (!data.token || !data.user) throw new Error("Invalid response from server");
      onSuccess(data.token, data.user);
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      const jsonMatch = msg.match(/"error":"([^"]+)"/);
      setLoginError(jsonMatch ? jsonMatch[1] : msg.replace(/^\d+:\s*/, "") || "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    if (!signupName || !signupEmail || !signupPassword || !signupConfirm) {
      setSignupError("Please fill in all fields.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError("Passwords do not match.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    setSignupLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        email: signupEmail,
        password: signupPassword,
        name: signupName,
      });
      const data = await res.json();
      if (!data.token || !data.user) throw new Error("Invalid response from server");
      onSuccess(data.token, data.user);
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      const jsonMatch = msg.match(/"error":"([^"]+)"/);
      setSignupError(jsonMatch ? jsonMatch[1] : msg.replace(/^\d+:\s*/, "") || "Sign up failed. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  };

  const handleComingSoon = () => {
    toast({ title: "Coming soon", description: "OAuth sign-in requires domain setup. Use email for now." });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0f" }}>
      {/* Left side — desktop only */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 px-12 relative">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur overflow-hidden">
            <img src="/icon-192.png" alt="mofree" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-5xl font-bold text-white tracking-tight">mofree</h1>
            <p className="mt-3 text-lg text-white/50 font-light tracking-wide">Your personal life OS</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 text-left max-w-xs">
            {[
              { icon: "✦", text: "Track your health & fitness" },
              { icon: "✦", text: "Manage your schedule" },
              { icon: "✦", text: "Monitor your finances" },
              { icon: "✦", text: "Stay connected with people" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/40 text-sm">
                <span style={{ color: "#8b5cf6" }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — auth form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center mb-8 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 overflow-hidden">
              <img src="/icon-192.png" alt="mofree" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-bold text-white">mofree</h1>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => { setTab("login"); setLoginError(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={tab === "login" ? { background: "#8b5cf6", color: "#fff" } : { color: "rgba(255,255,255,0.5)" }}
            >
              Sign in
            </button>
            <button
              onClick={() => { setTab("signup"); setSignupError(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={tab === "signup" ? { background: "#8b5cf6", color: "#fff" } : { color: "rgba(255,255,255,0.5)" }}
            >
              Sign up
            </button>
          </div>

          {/* Login form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-white/70 text-sm">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-white/70 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 text-white placeholder:text-white/20 pr-10"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {loginError && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{loginError}</p>
              )}
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full h-11 font-medium text-white"
                style={{ background: "#8b5cf6" }}
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
              </Button>

              <Divider />

              <OAuthButtons onComingSoon={handleComingSoon} />
            </form>
          )}

          {/* Sign up form */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-white/70 text-sm">Full name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your Name"
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  autoComplete="name"
                  className="h-11 text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-white/70 text-sm">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-white/70 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    autoComplete="new-password"
                    className="h-11 text-white placeholder:text-white/20 pr-10"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm" className="text-white/70 text-sm">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="signup-confirm"
                    type={showSignupConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={signupConfirm}
                    onChange={e => setSignupConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="h-11 text-white placeholder:text-white/20 pr-10"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showSignupConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {signupError && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{signupError}</p>
              )}
              <Button
                type="submit"
                disabled={signupLoading}
                className="w-full h-11 font-medium text-white"
                style={{ background: "#8b5cf6" }}
              >
                {signupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
              </Button>

              <Divider />

              <OAuthButtons onComingSoon={handleComingSoon} />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Or continue with</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

function OAuthButtons({ onComingSoon }: { onComingSoon: () => void }) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onComingSoon}
        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-medium transition-colors"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
      >
        {/* Google icon */}
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </button>
      <button
        type="button"
        onClick={onComingSoon}
        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-medium transition-colors"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
      >
        {/* Apple icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.2.04 2.04.58 2.75.62.98-.19 1.94-.77 3-.73 1.27.07 2.24.53 2.95 1.43a4.73 4.73 0 0 0-1.86 3.96c.05 2.43 1.58 4.05 3.12 4.4-.32.93-.7 1.8-1.96 3.2zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        Apple
      </button>
    </div>
  );
}

import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest, setAuthToken, getAuthToken } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect, useRef } from "react";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Schedule from "./pages/Schedule";
import Health from "./pages/Health";
import Budget from "./pages/Budget";
import Orion from "./pages/Orion";
import Sidebar from "./components/Sidebar";
import Onboarding from "./components/Onboarding";
import AuthPage from "./pages/AuthPage";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatarInitials: string;
}

// Session ID persisted in memory for the tab's lifetime
let SESSION_ID: string | null = null;

function AppLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const url = SESSION_ID
      ? `/api/onboarding/status?sid=${SESSION_ID}`
      : "/api/onboarding/status";

    apiRequest("GET", url)
      .then(r => r.json())
      .then((data: { show: boolean; sessionId: string }) => {
        SESSION_ID = data.sessionId;
        setShowOnboarding(data.show);
      })
      .catch(() => setShowOnboarding(false));
  }, []);

  const handleOnboardingComplete = () => {
    if (SESSION_ID) {
      apiRequest("POST", "/api/onboarding/complete", { sessionId: SESSION_ID }).catch(() => {});
    }
    setShowOnboarding(false);
  };

  if (showOnboarding === null) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden">
          <img src="/icon-192.png" alt="mofree" className="w-full h-full object-cover" />
        </div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-hidden">
          <Router hook={useHashLocation}>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/messages" component={Messages} />
              <Route path="/schedule" component={Schedule} />
              <Route path="/health" component={Health} />
              <Route path="/budget" component={Budget} />
              <Route path="/orion" component={Orion} />
            </Switch>
          </Router>
        </main>
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined); // undefined = loading
  const checkedAuth = useRef(false);

  useEffect(() => {
    if (checkedAuth.current) return;
    checkedAuth.current = true;

    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }

    apiRequest("GET", "/api/auth/me")
      .then(async res => {
        const data = await res.json();
        setUser(data.user);
      })
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    setAuthToken(null);
    queryClient.clear();
    setUser(null);
  };

  const handleAuthSuccess = (token: string, authUser: AuthUser) => {
    setAuthToken(token);
    setUser(authUser);
    queryClient.clear(); // clear any stale queries
  };

  return (
    <QueryClientProvider client={queryClient}>
      {user === undefined ? (
        // Loading state
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden">
            <img src="/icon-192.png" alt="mofree" className="w-full h-full object-cover" />
          </div>
        </div>
      ) : user === null ? (
        <AuthPage onSuccess={(token, user) => handleAuthSuccess(token, user)} />
      ) : (
        <AppLayout user={user} onLogout={handleLogout} />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}

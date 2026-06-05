import { useLocation, Link } from "wouter";
import { LayoutDashboard, MessageCircle, CalendarDays, Heart, DollarSign, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { setAuthToken } from "@/lib/queryClient";

interface SidebarUser {
  name: string;
  avatarInitials: string;
}

interface SidebarProps {
  user: SidebarUser | null;
  onLogout: () => void;
}

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/schedule", icon: CalendarDays, label: "Schedule" },
  { href: "/health", icon: Heart, label: "Health" },
  { href: "/budget", icon: DollarSign, label: "Budget" },
  { href: "/orion", icon: Sparkles, label: "Orion AI" },
];

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside className="w-16 md:w-60 bg-card border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {/* mofree silhouette icon */}
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/icon-192.png" alt="mofree" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-foreground hidden md:block tracking-tight">mofree</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:block">{label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {user?.avatarInitials ?? "?"}
          </div>
          <div className="hidden md:block min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{user?.name ?? "Guest"}</p>
            <p className="text-xs text-muted-foreground truncate">mofree</p>
          </div>
          <button
            onClick={() => { setAuthToken(null); onLogout(); }}
            title="Sign out"
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {/* Mobile logout */}
        <button
          onClick={() => { setAuthToken(null); onLogout(); }}
          title="Sign out"
          className="md:hidden mt-2 flex items-center justify-center w-full py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

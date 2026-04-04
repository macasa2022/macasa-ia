import { Link, useLocation } from "react-router-dom";
import { Brain, LayoutDashboard, Calculator, MessageCircle, BookOpen, Calendar, History, Settings, CreditCard, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Resolver", url: "/solve", icon: Calculator },
  { title: "Tutor IA", url: "/chat", icon: MessageCircle },
  { title: "Disciplinas", url: "/subjects", icon: BookOpen },
  { title: "Plano de Estudo", url: "/study-plan", icon: Calendar },
  { title: "Histórico", url: "/history", icon: History },
  { title: "Preços", url: "/pricing", icon: CreditCard },
  { title: "Definições", url: "/settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        <div className={`flex items-center h-16 border-b border-border px-4 ${collapsed ? "justify-center" : "gap-2"}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-sm">MACASA IA</span>}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.url;
            return (
              <Link key={item.url} to={item.url} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed ? "justify-center" : ""}`}>
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /><span>Minimizar</span></>}
          </button>
          <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? "justify-center" : ""}`}>
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around py-2">
        {navItems.slice(0, 5).map(item => {
          const active = location.pathname === item.url;
          return (
            <Link key={item.url} to={item.url} className={`flex flex-col items-center gap-1 px-2 py-1 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}

import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Brain, LayoutDashboard, Calculator, MessageCircle, BookOpen, Calendar, History, Settings, CreditCard, LogOut, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

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
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, isAdmin, profile, paymentState, paymentDueDate, pendingInvoiceUrl } = useAuth();
  const showRenewalWarning = paymentState === "grace" && !!pendingInvoiceUrl;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`hidden md:flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0 border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        <div className={`flex items-center h-16 border-b border-border px-4 ${collapsed ? "justify-center" : "gap-2"}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-sm">MACASA IA</span>}
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.url;
            return (
              <Link key={item.url} to={item.url} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed ? "justify-center" : ""}`}>
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed ? "justify-center" : ""}`}>
              <Shield className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Admin</span>}
            </Link>
          )}
        </nav>
        <div className="mx-3 pt-3 pb-3 border-t border-border space-y-1">
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors" aria-label={collapsed ? "Expandir barra lateral" : "Minimizar barra lateral"} aria-pressed={collapsed}>
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /><span>Minimizar</span></>}
          </button>
          <button onClick={handleSignOut} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full ${collapsed ? "justify-center" : ""}`} aria-label="Terminar sessão">
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around py-2">
        {navItems.slice(0, 4).map(item => {
          const active = location.pathname === item.url;
          return (
            <Link key={item.url} to={item.url} className={`flex flex-col items-center gap-1 px-2 py-1 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
        <button onClick={handleSignOut} className="flex flex-col items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {showRenewalWarning && (
          <div role="alert" className="m-4 md:mx-8 md:mt-6 mb-0 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
            <p className="text-sm flex-1">
              <strong>A renovação do teu Premium está por pagar.</strong>{" "}
              Paga até {paymentDueDate ? new Date(paymentDueDate).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "ao fim do prazo"} (cartão ou MB WAY).
              Depois disso, a tua conta volta ao plano Gratuito.
            </p>
            <a href={pendingInvoiceUrl!} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
              Pagar agora
            </a>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Users, UserCheck, Clock, Search, Crown, Filter, Inbox, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContactRequestsSection from "@/components/admin/ContactRequestsSection";
import SubjectChangeRequestsSection from "@/components/admin/SubjectChangeRequestsSection";
import { toast } from "sonner";

type ProfileWithRole = {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  ano_escolar: string | null;
  created_at: string;
  roles: string[];
  plan: string;
  subscription_id: string | null;
  subscription_end: string | null;
};

export default function AdminPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profs, error }, { data: roles }, subsResponse] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.functions.invoke("admin-subscriptions", {
          body: { action: "list" },
        }),
      ]);

      if (error) throw error;

      const subscriptions = subsResponse.data?.subscriptions || {};

      return (profs || []).map((p) => ({
        ...p,
        roles: (roles || [])
          .filter((r) => r.user_id === p.user_id)
          .map((r) => r.role),
        plan: subscriptions[p.user_id]?.plan || "Gratuito",
        subscription_id: subscriptions[p.user_id]?.subscription_id || null,
        subscription_end: subscriptions[p.user_id]?.subscription_end || null,
      })) as ProfileWithRole[];
    },
  });

  const toggleRole = async (userId: string, role: "admin" | "moderator" | "user", hasRole: boolean) => {
    if (userId === user?.id && role === "admin") {
      toast.error("Não podes remover o teu próprio role de admin.");
      return;
    }

    if (hasRole) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) { toast.error("Erro ao remover role"); return; }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) { toast.error("Erro ao adicionar role"); return; }
    }
    toast.success("Role atualizado!");
    refetch();
  };

  const changePlan = async (profile: ProfileWithRole, newPlan: string) => {
    if (profile.plan === newPlan) return;
    setChangingPlan(profile.user_id);
    try {
      if (newPlan === "Premium") {
        const { data, error } = await supabase.functions.invoke("admin-subscriptions", {
          body: { action: "upgrade", user_email: profile.email },
        });
        if (error || data?.error) throw new Error(data?.error || "Erro ao atualizar plano");
      } else {
        const { data, error } = await supabase.functions.invoke("admin-subscriptions", {
          body: { action: "downgrade", subscription_id: profile.subscription_id, user_email: profile.email },
        });
        if (error || data?.error) throw new Error(data?.error || "Erro ao atualizar plano");
      }
      toast.success(`Plano alterado para ${newPlan}!`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar plano");
    } finally {
      setChangingPlan(null);
    }
  };

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      (p.nome || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || p.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const stats = {
    total: profiles.length,
    admins: profiles.filter((p) => p.roles.includes("admin")).length,
    premium: profiles.filter((p) => p.plan === "Premium").length,
    thisWeek: profiles.filter((p) => {
      const d = new Date(p.created_at);
      const now = new Date();
      return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-7 h-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Painel de Administração</h1>
          </div>
          <p className="text-muted-foreground mb-6">Gestão de utilizadores e permissões.</p>
        </motion.div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-5">
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Utilizadores</TabsTrigger>
            <TabsTrigger value="requests"><Inbox className="w-4 h-4 mr-2" />Pedidos Escola</TabsTrigger>
            <TabsTrigger value="subject-changes"><BookOpen className="w-4 h-4 mr-2" />Mudança Disciplina</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total de utilizadores", value: stats.total, icon: Users, color: "text-primary" },
            { label: "Administradores", value: stats.admins, icon: UserCheck, color: "text-accent-foreground" },
            { label: "Premium", value: stats.premium, icon: Crown, color: "text-primary" },
            { label: "Novos (7 dias)", value: stats.thisWeek, icon: Clock, color: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-5 border border-border/50 shadow-card">
              <div className="flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-3xl font-bold mt-2">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="Gratuito">Gratuito</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users table */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Utilizador</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ano</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plano</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Roles</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Registado em</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">A carregar...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum utilizador encontrado.</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-sm">{p.nome || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="p-4 text-sm">{p.ano_escolar || "—"}</td>
                      <td className="p-4">
                        <Badge
                          variant={p.plan === "Premium" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {p.plan === "Premium" && <Crown className="w-3 h-3 mr-1" />}
                          {p.plan}
                        </Badge>
                        {p.subscription_end && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            até {new Date(p.subscription_end).toLocaleDateString("pt-PT")}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {p.roles.length === 0 && <Badge variant="outline" className="text-xs">user</Badge>}
                          {p.roles.map((r) => (
                            <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap">
                          {p.plan === "Gratuito" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              disabled={changingPlan === p.user_id}
                              onClick={() => changePlan(p, "Premium")}
                            >
                              {changingPlan === p.user_id ? "..." : "↑ Premium"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              disabled={changingPlan === p.user_id}
                              onClick={() => changePlan(p, "Gratuito")}
                            >
                              {changingPlan === p.user_id ? "..." : "↓ Gratuito"}
                            </Button>
                          )}
                          {(["admin", "moderator"] as const).map((role) => {
                            const has = p.roles.includes(role);
                            return (
                              <Button
                                key={role}
                                size="sm"
                                variant={has ? "default" : "outline"}
                                className="text-xs h-7"
                                onClick={() => toggleRole(p.user_id, role, has)}
                              >
                                {has ? `✓ ${role}` : `+ ${role}`}
                              </Button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="requests">
            <ContactRequestsSection />
          </TabsContent>

          <TabsContent value="subject-changes">
            <SubjectChangeRequestsSection />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

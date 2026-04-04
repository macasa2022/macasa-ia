import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Users, UserCheck, Clock, Search, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ProfileWithRole = {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  ano_escolar: string | null;
  created_at: string;
  roles: string[];
};

export default function AdminPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("*");

      return (profs || []).map((p) => ({
        ...p,
        roles: (roles || [])
          .filter((r) => r.user_id === p.user_id)
          .map((r) => r.role),
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

  const filtered = profiles.filter(
    (p) =>
      (p.nome || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: profiles.length,
    admins: profiles.filter((p) => p.roles.includes("admin")).length,
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total de utilizadores", value: stats.total, icon: Users, color: "text-primary" },
            { label: "Administradores", value: stats.admins, icon: UserCheck, color: "text-accent-foreground" },
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

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users table */}
        <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Utilizador</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ano</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Roles</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Registado em</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">A carregar...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum utilizador encontrado.</td>
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
                        <div className="flex gap-2">
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
      </div>
    </AppLayout>
  );
}

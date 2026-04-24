import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { School, Plus, Trash2, Loader2, Users, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

type SchoolClient = {
  id: string;
  name: string;
  contact_request_id: string | null;
  notes: string | null;
  created_at: string;
};

type Member = {
  id: string;
  school_client_id: string;
  email: string;
  user_id: string | null;
  created_at: string;
};

export default function SchoolClientsSection() {
  const [selected, setSelected] = useState<SchoolClient | null>(null);
  const [addEmails, setAddEmails] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: schools = [], isLoading, refetch: refetchSchools } = useQuery({
    queryKey: ["school-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SchoolClient[];
    },
  });

  const { data: allMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ["school-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_premium_members")
        .select("*");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const memberCounts = schools.reduce<Record<string, { total: number; registered: number }>>((acc, s) => {
    const list = allMembers.filter((m) => m.school_client_id === s.id);
    acc[s.id] = {
      total: list.length,
      registered: list.filter((m) => m.user_id).length,
    };
    return acc;
  }, {});

  const selectedMembers = selected
    ? allMembers.filter((m) => m.school_client_id === selected.id)
    : [];

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from("school_premium_members")
      .delete()
      .eq("id", memberId);
    if (error) {
      toast.error("Erro ao remover membro");
      return;
    }
    toast.success("Membro removido");
    refetchMembers();
  };

  const removeSchool = async (schoolId: string) => {
    if (!confirm("Remover esta escola e todos os acessos associados? Esta ação não pode ser revertida."))
      return;
    const { error } = await supabase
      .from("school_clients")
      .delete()
      .eq("id", schoolId);
    if (error) {
      toast.error("Erro ao remover escola");
      return;
    }
    toast.success("Escola removida");
    setSelected(null);
    refetchSchools();
    refetchMembers();
  };

  const addMembers = async () => {
    if (!selected) return;
    const emails = addEmails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      toast.error("Adiciona pelo menos um email");
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("convert-school-client", {
        body: { action: "add_emails", school_client_id: selected.id, emails },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Erro");
      toast.success(`${data?.inserted_count} emails adicionados (${data?.linked_existing_users} já registados)`);
      setAddEmails("");
      refetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar membros");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="text-xs text-muted-foreground">Escolas cliente</div>
          <div className="text-2xl font-bold mt-1">{schools.length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="text-xs text-muted-foreground">Total alunos com acesso</div>
          <div className="text-2xl font-bold mt-1">{allMembers.length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="text-xs text-muted-foreground">Já registados</div>
          <div className="text-2xl font-bold mt-1">{allMembers.filter((m) => m.user_id).length}</div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Escola</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Alunos</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Convertida em</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">A carregar...</td></tr>
              ) : schools.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Nenhuma escola convertida. Converte um pedido na aba "Pedidos Escola".
                </td></tr>
              ) : schools.map((s) => {
                const c = memberCounts[s.id] || { total: 0, registered: 0 };
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-muted-foreground" />
                        {s.name}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" /> {c.total}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                          {c.registered} ativos
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(s)}>
                        Gerir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <School className="w-5 h-5 text-primary" /> {selected.name}
                </DialogTitle>
                <DialogDescription>
                  Convertida em {new Date(selected.created_at).toLocaleDateString("pt-PT")} —
                  {" "}{selectedMembers.length} alunos com acesso
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Adicionar mais alunos
                  </div>
                  <Textarea
                    rows={4}
                    value={addEmails}
                    onChange={(e) => setAddEmails(e.target.value)}
                    placeholder="aluno@escola.pt, outro@escola.pt..."
                    className="font-mono text-xs mb-2"
                  />
                  <Button size="sm" onClick={addMembers} disabled={adding}>
                    {adding && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
                    Adicionar
                  </Button>
                </div>

                <div>
                  <div className="text-xs font-medium mb-2">Alunos com acesso</div>
                  <div className="border border-border/50 rounded-lg max-h-[300px] overflow-y-auto">
                    {selectedMembers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Nenhum aluno ainda.</div>
                    ) : (
                      <ul className="divide-y divide-border/50">
                        {selectedMembers.map((m) => (
                          <li key={m.id} className="p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              {m.user_id ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate">{m.email}</span>
                              {!m.user_id && (
                                <Badge variant="outline" className="text-[9px] ml-1">aguarda registo</Badge>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={() => removeMember(m.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <Button variant="destructive" size="sm" onClick={() => removeSchool(selected.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Remover escola e todos os acessos
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

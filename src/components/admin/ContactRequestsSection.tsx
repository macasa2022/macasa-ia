import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, School, Search, Filter, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["Novo", "Em análise", "Contactado", "Convertido", "Rejeitado"] as const;
type Status = typeof STATUSES[number];

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  "Novo": "default",
  "Em análise": "secondary",
  "Contactado": "secondary",
  "Convertido": "default",
  "Rejeitado": "destructive",
};

type ContactRequest = {
  id: string;
  nome: string;
  email: string;
  escola: string;
  telefone: string | null;
  mensagem: string | null;
  status: Status;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export default function ContactRequestsSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ContactRequest | null>(null);
  const [editNotas, setEditNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [convertingFor, setConvertingFor] = useState<ContactRequest | null>(null);
  const [convertSchoolName, setConvertSchoolName] = useState("");
  const [convertEmails, setConvertEmails] = useState("");
  const [converting, setConverting] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["contact-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactRequest[];
    },
  });

  const filtered = requests.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.nome.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.escola.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const stats = STATUSES.reduce<Record<Status, number>>((acc, s) => {
    acc[s] = requests.filter((r) => r.status === s).length;
    return acc;
  }, { "Novo": 0, "Em análise": 0, "Contactado": 0, "Convertido": 0, "Rejeitado": 0 });

  const openConvertModal = (request: ContactRequest) => {
    setConvertingFor(request);
    setConvertSchoolName(request.escola);
    setConvertEmails("");
  };

  const submitConvert = async () => {
    if (!convertingFor) return;
    const emails = convertEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Adiciona pelo menos um email de aluno");
      return;
    }
    if (!convertSchoolName.trim()) {
      toast.error("Nome da escola obrigatório");
      return;
    }
    setConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke("convert-school-client", {
        body: {
          action: "create",
          contact_request_id: convertingFor.id,
          school_name: convertSchoolName.trim(),
          emails,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Erro");
      const invalid = (data?.invalid_emails || []).length;
      toast.success(
        `Escola convertida: ${data?.inserted_count} alunos com acesso (${data?.linked_existing_users} já registados${invalid ? `, ${invalid} emails inválidos` : ""}).`,
      );
      setConvertingFor(null);
      setSelected(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao converter escola");
    } finally {
      setConverting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: Status) => {
    // Intercept "Convertido": open conversion modal instead of updating directly
    if (newStatus === "Convertido") {
      const req = requests.find((r) => r.id === id);
      if (req) openConvertModal(req);
      return;
    }
    const { error } = await supabase
      .from("contact_requests")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar estado"); return; }
    toast.success("Estado atualizado");
    refetch();
    if (selected?.id === id) setSelected({ ...selected, status: newStatus });
  };

  const saveNotas = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("contact_requests")
      .update({ notas: editNotas })
      .eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error("Erro ao guardar notas"); return; }
    toast.success("Notas guardadas");
    refetch();
    setSelected({ ...selected, notas: editNotas });
  };

  const openDetails = (r: ContactRequest) => {
    setSelected(r);
    setEditNotas(r.notas ?? "");
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {STATUSES.map((s) => (
          <div key={s} className="bg-card rounded-xl p-4 border border-border/50">
            <div className="text-xs text-muted-foreground">{s}</div>
            <div className="text-2xl font-bold mt-1">{stats[s]}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email ou escola..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Escola / Contacto</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Telefone</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Recebido</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">A carregar...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-muted-foreground" />
                      {r.escola}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.nome}</div>
                  </td>
                  <td className="p-4 text-sm">
                    <a href={`mailto:${r.email}`} className="text-primary hover:underline inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {r.email}
                    </a>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {r.telefone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {r.telefone}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-4">
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as Status)}>
                      <SelectTrigger className="h-7 text-xs w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-PT")}<br />
                    <span className="text-[10px]">{new Date(r.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetails(r)}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <School className="w-5 h-5 text-primary" />
                  {selected.escola}
                </DialogTitle>
                <DialogDescription>
                  Pedido recebido em {new Date(selected.created_at).toLocaleString("pt-PT")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Contacto</div>
                    <div className="font-medium">{selected.nome}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Estado</div>
                    <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Email</div>
                    <a href={`mailto:${selected.email}`} className="text-primary hover:underline text-xs break-all">{selected.email}</a>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Telefone</div>
                    <div>{selected.telefone || "—"}</div>
                  </div>
                </div>

                {selected.mensagem && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-sm whitespace-pre-wrap">{selected.mensagem}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Notas internas</div>
                  <Textarea
                    rows={4}
                    value={editNotas}
                    onChange={(e) => setEditNotas(e.target.value)}
                    placeholder="Adiciona notas internas (datas de contacto, decisões, etc.)"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v as Status)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={saveNotas} disabled={saving} variant="hero" className="flex-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Guardar notas
                  </Button>
                </div>

                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${selected.email}?subject=Logic Pathways — Plano Escola (${encodeURIComponent(selected.escola)})`}>
                    <Mail className="w-4 h-4 mr-2" /> Responder por email
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Conversion modal: paste student emails */}
      <Dialog open={!!convertingFor} onOpenChange={(open) => !open && !converting && setConvertingFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Converter em cliente
            </DialogTitle>
            <DialogDescription>
              Indica os emails dos alunos da escola. Todos passarão a ter acesso completo às 3 disciplinas (estatuto Premium-escola). Quando se registarem, serão automaticamente associados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome da escola</label>
              <Input
                value={convertSchoolName}
                onChange={(e) => setConvertSchoolName(e.target.value)}
                placeholder="Ex: Escola Secundária X"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Emails dos alunos (um por linha, ou separados por vírgula)
              </label>
              <Textarea
                rows={8}
                value={convertEmails}
                onChange={(e) => setConvertEmails(e.target.value)}
                placeholder={"aluno1@escola.pt\naluno2@escola.pt\n..."}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Emails inválidos ou duplicados serão ignorados automaticamente.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConvertingFor(null)} disabled={converting}>
                Cancelar
              </Button>
              <Button variant="hero" className="flex-1" onClick={submitConvert} disabled={converting}>
                {converting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Converter e ativar acesso
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

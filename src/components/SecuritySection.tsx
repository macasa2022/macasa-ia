import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDeviceId, getDeviceLabel } from "@/lib/device";
import { relativeTime } from "@/lib/attempts";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { sessionGuard } from "@/components/SessionGuard";

const EVENT_LABELS: Record<string, string> = {
  login: "Início de sessão",
  transfer: "Sessão transferida para este dispositivo",
  logout: "Sessão terminada",
  revoke_others: "Outras sessões terminadas",
  expired: "Sessão expirada por inatividade",
};

export default function SecuritySection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const [revoking, setRevoking] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["security", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: active }, { data: events }, { data: devices }] = await Promise.all([
        supabase.from("active_sessions").select("device_id, device_label, started_at, last_seen").maybeSingle(),
        supabase.from("session_events").select("id, kind, device_id, device_label, created_at")
          .order("created_at", { ascending: false }).limit(10),
        supabase.from("known_devices").select("device_id, device_label, first_seen, last_seen")
          .order("last_seen", { ascending: false }),
      ]);
      return { active, events: events ?? [], devices: devices ?? [] };
    },
  });

  const revokeOthers = async () => {
    setRevoking(true);
    const res = await sessionGuard("revoke_others");
    setRevoking(false);
    if (res?.status === "ok") {
      toast.success("As outras sessões foram terminadas.");
      queryClient.invalidateQueries({ queryKey: ["security"] });
    } else {
      toast.error("Não foi possível terminar as outras sessões.");
    }
  };

  const changePassword = async () => {
    if (!isPasswordValid(pw)) {
      toast.error("A palavra-passe deve ter pelo menos 8 caracteres, uma letra maiúscula e um caractere especial.");
      return;
    }
    if (pw !== pw2) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPw("");
    setPw2("");
    toast.success("Palavra-passe alterada.");
  };

  const activeHere = data?.active?.device_id === deviceId;

  return (
    <div className="space-y-6">
      {/* Sessão ativa */}
      <section aria-labelledby="sec-sessao">
        <h3 id="sec-sessao" className="font-semibold mb-2 flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4 text-primary" aria-hidden="true" /> Sessão ativa
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          A conta é pessoal: só pode haver uma sessão ativa de cada vez. Ao entrar noutro dispositivo podes
          transferir a sessão. Sem atividade durante 60 minutos, a sessão termina sozinha.
        </p>
        <div className="p-4 rounded-lg bg-secondary/50 text-sm">
          {isLoading ? "A carregar…" : data?.active ? (
            <>
              <div className="font-medium">
                {data.active.device_label || "Dispositivo"} {activeHere && <span className="text-primary">(este dispositivo)</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                Iniciada {relativeTime(data.active.started_at).toLowerCase()} · última atividade {relativeTime(data.active.last_seen).toLowerCase()}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Sem sessão registada ({getDeviceLabel()}).</div>
          )}
        </div>
        <Button variant="outline" className="mt-3" onClick={revokeOthers} disabled={revoking}>
          {revoking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
          Terminar todas as outras sessões
        </Button>
      </section>

      {/* Dispositivos e atividade */}
      <section aria-labelledby="sec-atividade">
        <h3 id="sec-atividade" className="font-semibold mb-2">Dispositivos e atividade recente</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Se vires um dispositivo que não reconheces, termina as outras sessões e altera a palavra-passe.
        </p>
        <ul className="space-y-1.5 mb-3">
          {(data?.devices ?? []).map((d) => (
            <li key={d.device_id} className="text-sm flex justify-between gap-3 p-2 rounded bg-secondary/40">
              <span>{d.device_label || "Dispositivo"}{d.device_id === deviceId ? " (este)" : ""}</span>
              <span className="text-xs text-muted-foreground">visto {relativeTime(d.last_seen).toLowerCase()}</span>
            </li>
          ))}
        </ul>
        <ul className="space-y-1">
          {(data?.events ?? []).map((e) => (
            <li key={e.id} className="text-xs text-muted-foreground">
              {relativeTime(e.created_at)} — {EVENT_LABELS[e.kind] || e.kind}{e.device_label ? ` · ${e.device_label}` : ""}
            </li>
          ))}
        </ul>
      </section>

      {/* Palavra-passe */}
      <section aria-labelledby="sec-password">
        <h3 id="sec-password" className="font-semibold mb-2 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" aria-hidden="true" /> Alterar palavra-passe
        </h3>
        <div className="grid gap-3 max-w-sm">
          <div>
            <Label htmlFor="new-pw">Nova palavra-passe</Label>
            <div className="relative mt-1.5">
              <Input id="new-pw" type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby="new-pw-rules" autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} aria-pressed={showPw}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <ul id="new-pw-rules" className="mt-2 space-y-0.5 text-xs" aria-live="polite">
              {PASSWORD_RULES.map((r) => (
                <li key={r.id} className={r.test(pw) ? "text-green-600" : "text-muted-foreground"}>
                  {r.test(pw) ? "✓" : "•"} {r.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label htmlFor="new-pw2">Confirmar palavra-passe</Label>
            <Input id="new-pw2" type={showPw ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1.5" autoComplete="new-password" />
          </div>
          <Button variant="hero" onClick={changePassword} disabled={savingPw || !pw}>
            {savingPw && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Guardar nova palavra-passe
          </Button>
        </div>
      </section>
    </div>
  );
}

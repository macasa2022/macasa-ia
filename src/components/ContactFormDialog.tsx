import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactFormDialog({ open, onOpenChange }: ContactFormDialogProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [escola, setEscola] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!nome.trim() || nome.trim().length < 3) {
      toast.error("Introduz um nome válido.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Introduz um email válido.");
      return;
    }
    if (!escola.trim()) {
      toast.error("Introduz o nome da escola.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("contact_requests").insert({
      nome: nome.trim(),
      email: email.trim(),
      escola: escola.trim(),
      telefone: telefone.trim() || null,
      mensagem: mensagem.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error("Erro ao enviar. Tenta novamente.");
      console.error(error);
    } else {
      toast.success("Pedido enviado com sucesso! Entraremos em contacto em breve.");
      setNome("");
      setEmail("");
      setEscola("");
      setTelefone("");
      setMensagem("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contactar sobre o Plano Escola</DialogTitle>
          <DialogDescription>Preenche o formulário e entraremos em contacto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="O teu nome" className="mt-1" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@escola.pt" className="mt-1" />
          </div>
          <div>
            <Label>Escola *</Label>
            <Input value={escola} onChange={e => setEscola(e.target.value)} placeholder="Nome da escola" className="mt-1" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(opcional)" className="mt-1" />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Descreve o que precisas (opcional)" className="mt-1" rows={3} />
          </div>
          <Button variant="hero" className="w-full" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Enviar pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

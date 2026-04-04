import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, BookOpen, Bell, Palette, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("perfil");

  const tabs = [
    { id: "perfil", label: "Perfil", icon: User },
    { id: "estudo", label: "Preferências", icon: BookOpen },
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "aparencia", label: "Aparência", icon: Palette },
    { id: "conta", label: "Conta", icon: Shield },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Definições</h1>
          <p className="text-muted-foreground mb-6">Personaliza a tua experiência.</p>
        </motion.div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          {activeTab === "perfil" && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input defaultValue="Miguel Santos" className="mt-1.5" />
              </div>
              <div>
                <Label>Email</Label>
                <Input defaultValue="miguel@email.com" className="mt-1.5" />
              </div>
              <div>
                <Label>Ano escolar</Label>
                <select className="w-full mt-1.5 border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  {["7º", "8º", "9º", "10º", "11º", "12º"].map(y => <option key={y}>{y} ano</option>)}
                </select>
              </div>
              <Button variant="hero">Guardar alterações</Button>
            </div>
          )}
          {activeTab === "estudo" && (
            <div className="space-y-4">
              <div>
                <Label>Estilo de explicação preferido</Label>
                <select className="w-full mt-1.5 border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option>Simples e direto</option>
                  <option>Detalhado com exemplos</option>
                  <option>Formal e académico</option>
                </select>
              </div>
              <div>
                <Label>Disciplinas favoritas</Label>
                <div className="flex gap-2 mt-1.5">
                  {["Matemática", "Física", "Química"].map(s => (
                    <button key={s} className="px-3 py-1.5 rounded-full text-sm border border-primary/30 bg-primary/10 text-primary">{s}</button>
                  ))}
                </div>
              </div>
              <Button variant="hero">Guardar preferências</Button>
            </div>
          )}
          {activeTab === "notificacoes" && (
            <div className="space-y-4">
              {["Lembretes de estudo", "Novos conteúdos", "Relatórios semanais", "Dicas do tutor"].map(n => (
                <label key={n} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm">{n}</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              ))}
            </div>
          )}
          {activeTab === "aparencia" && (
            <div className="space-y-4">
              <div>
                <Label>Tema</Label>
                <div className="flex gap-3 mt-2">
                  <button className="px-4 py-2 rounded-lg border border-primary bg-primary/10 text-primary text-sm font-medium">Claro</button>
                  <button className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-secondary">Escuro</button>
                  <button className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-secondary">Sistema</button>
                </div>
              </div>
            </div>
          )}
          {activeTab === "conta" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="text-sm font-medium mb-1">Plano atual</div>
                <div className="text-lg font-bold text-primary">Premium</div>
                <div className="text-xs text-muted-foreground">Renova a 15 de maio de 2026</div>
              </div>
              <Button variant="outline">Gerir subscrição</Button>
              <Button variant="destructive" className="ml-3">Eliminar conta</Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

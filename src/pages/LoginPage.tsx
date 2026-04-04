import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Brain, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">MACASA IA</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Bem-vindo de volta</h1>
          <p className="text-muted-foreground text-sm">Entra na tua conta para continuar a aprender.</p>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="o.teu@email.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">Lembrar-me</span>
              </label>
              <a className="text-primary hover:underline cursor-pointer">Esqueci a palavra-passe</a>
            </div>
            <Button variant="hero" className="w-full" asChild>
              <Link to="/dashboard">Entrar</Link>
            </Button>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Não tens conta? <Link to="/signup" className="text-primary font-medium hover:underline">Criar conta grátis</Link>
        </p>
      </div>
    </div>
  );
}

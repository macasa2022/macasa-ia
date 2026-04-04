import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Send, Brain, Sparkles, User } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const initialMessages: Message[] = [
  { role: "assistant", content: "Olá! 👋 Sou o teu tutor IA do MACASA. Estou aqui para te ajudar a aprender Matemática, Física e Química.\n\nPodes perguntar-me qualquer dúvida, enviar um exercício, ou pedir para explicar um conceito. Adapto a minha linguagem ao teu nível!\n\nComo posso ajudar-te hoje?" },
];

const mockResponses: Record<string, string> = {
  default: "Boa pergunta! 🤔\n\nVamos pensar nisto juntos. Antes de avançar para a resolução, quero que me digas:\n\n1. **Que dados** consegues identificar no enunciado?\n2. **O que é pedido** exatamente?\n3. **Que tema** achas que este exercício envolve?\n\nAssim posso guiar-te da melhor forma! 💡",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: mockResponses.default }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm">Tutor MACASA IA</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success inline-block" /> Online · Adapta ao teu nível
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-accent-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-4">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Escreve a tua dúvida aqui..."
              className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button variant="hero" size="icon" onClick={handleSend} disabled={!input.trim()} className="h-12 w-12 rounded-xl">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

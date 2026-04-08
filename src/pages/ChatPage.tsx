import AppLayout from "@/components/AppLayout";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Brain, Loader2, Lightbulb, BookOpen, Eye, Sparkles, RotateCcw, MessageCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { streamChat, ChatMessage } from "@/lib/ai-stream";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageLimit } from "@/hooks/use-usage-limit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";

const quickActions = [
  { label: "Explica mais simples", icon: Eye, msg: "Podes explicar isso de forma mais simples?" },
  { label: "Dá uma pista", icon: Lightbulb, msg: "Dá-me apenas uma pista, não a resposta." },
  { label: "Mostra outro método", icon: Sparkles, msg: "Mostra-me outra forma de resolver." },
  { label: "Resume o conceito", icon: BookOpen, msg: "Resume o conceito principal envolvido." },
];

const starterSuggestions = [
  "Como resolver equações do 1º grau?",
  "Explica-me o que é a aceleração em Física.",
  "O que é a massa molar e como se calcula?",
  "Ajuda-me a perceber trigonometria.",
  "Qual a diferença entre velocidade e aceleração?",
  "Como balancear equações químicas?",
];

export default function ChatPage() {
  const { profile } = useAuth();
  const { isOnCooldown, isLimited, showWarning, remaining, recordQuestion, getCooldownTimeLeft } = useUsageLimit();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || isLoading) return;

    if (isLimited) {
      const { allowed, warning, remaining: rem } = await recordQuestion();
      if (!allowed) {
        toast.error("Atingiste o limite de perguntas. Aguarda 20 horas para continuar.");
        return;
      }
      if (warning) {
        toast.warning(`Atenção: só te restam ${rem} ocasiões para perguntar ou resolver exercícios.`);
      }
    }

    const userMsg: ChatMessage = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    await streamChat({
      messages: newMessages,
      year: profile?.ano_escolar || undefined,
      onDelta: updateAssistant,
      onDone: () => setIsLoading(false),
      onError: (err) => {
        toast.error(err);
        setIsLoading(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-hero flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold">Tutor IA</h1>
                <p className="text-xs text-muted-foreground">O teu mentor de Exatas</p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetChat} className="text-xs gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Nova conversa
              </Button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-lg font-bold mb-2">Olá{profile?.nome ? `, ${profile.nome}` : ""}! 👋</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Sou o teu tutor de Matemática, Física e Química. Pergunta-me qualquer coisa — estou aqui para te ajudar a pensar e aprender!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {starterSuggestions.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                      className="text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground">
                      <MessageCircle className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border/50 shadow-card rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-1 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mt-2 [&>pre]:bg-secondary/50 [&>pre]:rounded-lg [&>pre]:p-3 [&_code]:text-xs [&_code]:bg-secondary/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>A pensar…</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick actions */}
        {messages.length > 0 && !isLoading && (
          <div className="px-4 pb-2">
            <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-1">
              {quickActions.map((a, i) => (
                <button key={i} onClick={() => sendMessage(a.msg)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary whitespace-nowrap transition-all">
                  <a.icon className="w-3 h-3" /> {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          {isOnCooldown && (
            <Alert className="mb-2 border-amber-500/30 bg-amber-500/5">
              <Clock className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Atingiste o limite de 5 perguntas. Poderás voltar a usar em <strong>{getCooldownTimeLeft()}</strong>.
              </AlertDescription>
            </Alert>
          )}
          {showWarning && (
            <Alert className="mb-2 border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Atenção: só te restam <strong>{remaining}</strong> ocasiões para perguntar ou resolver exercícios.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-background border border-border rounded-xl overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isOnCooldown ? "Aguarda para poder enviar novas perguntas..." : "Escreve a tua dúvida aqui..."}
                disabled={isOnCooldown}
                className="w-full p-3 bg-transparent resize-none text-sm focus:outline-none placeholder:text-muted-foreground/50 min-h-[44px] max-h-[120px] disabled:opacity-50"
                rows={1}
              />
            </div>
            <Button
              variant="hero"
              size="icon"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading || isOnCooldown}
              className="h-11 w-11 shrink-0 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { Calculator, Atom, FlaskConical, Brain, BookOpen, Target, Lightbulb, TrendingUp, Sparkles, ChevronRight, Star, CheckCircle2, ArrowRight, Zap, Users, Award, Clock, BarChart3, MessageCircle, Upload, GraduationCap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">MACASA IA</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#disciplinas" className="hover:text-foreground transition-colors">Disciplinas</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
          <Button variant="hero" asChild><Link to="/signup">Começar grátis</Link></Button>
        </div>
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden glass border-t border-border p-4 flex flex-col gap-3">
          <a href="#funcionalidades" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Funcionalidades</a>
          <a href="#disciplinas" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Disciplinas</a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Preços</a>
          <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
          <Button variant="hero" asChild><Link to="/signup">Começar grátis</Link></Button>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-60 h-60 bg-accent/10 rounded-full blur-3xl" />
      <div className="container mx-auto px-4 relative">
        <motion.div className="max-w-4xl mx-auto text-center" initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Tutor IA para Matemática, Física e Química
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Aprende a <span className="text-gradient-hero">pensar.</span><br />
            Não apenas a <span className="text-gradient-accent">responder.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Resolve exercícios de Matemática, Física e Química com explicações passo a passo, raciocínio guiado e ajuda inteligente do 7º ao 12º ano.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg" asChild className="text-base px-8 py-6">
              <Link to="/signup">Experimentar grátis <ArrowRight className="w-5 h-5 ml-1" /></Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild className="text-base px-8 py-6">
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> Grátis para começar</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> 7º ao 12º ano</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> IA pedagógica</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    { icon: GraduationCap, title: "Adaptado ao teu ano", desc: "Explicações ajustadas do 7º ao 12º ano escolar" },
    { icon: Target, title: "Passo a passo", desc: "Cada resolução explicada com clareza e método" },
    { icon: Brain, title: "Ensina a pensar", desc: "Não dá respostas — ensina o raciocínio" },
    { icon: TrendingUp, title: "Progresso real", desc: "Acompanha a tua evolução e sugere melhorias" },
    { icon: Award, title: "Preparação para exames", desc: "Treino focado nos temas mais importantes" },
    { icon: Zap, title: "Rápido e inteligente", desc: "Respostas pedagógicas em segundos" },
  ];
  return (
    <section className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Porquê o <span className="text-gradient-hero">MACASA IA</span>?</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Mais do que resolver exercícios — aprender a resolvê-los sozinho.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div key={i} className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <b.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{b.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: "1", icon: Upload, title: "Escreve ou fotografa", desc: "Insere o exercício por texto, imagem ou screenshot." },
    { num: "2", icon: Brain, title: "Recebe explicação guiada", desc: "A IA analisa, classifica e explica passo a passo como pensar e resolver." },
    { num: "3", icon: TrendingUp, title: "Aprende e pratica", desc: "Consolida com exercícios semelhantes, quiz e resumos do conceito." },
  ];
  return (
    <section id="como-funciona" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona?</h2>
          <p className="text-muted-foreground text-lg">Três passos simples para aprender melhor.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <motion.div key={i} className="text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto mb-5 shadow-glow">
                <s.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Passo {s.num}</div>
              <h3 className="font-bold text-xl mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SubjectsSection() {
  const subjects = [
    { name: "Matemática", icon: Calculator, gradient: "bg-gradient-math", topics: ["Equações", "Funções", "Geometria", "Trigonometria", "Derivadas", "Probabilidade"] },
    { name: "Física", icon: Atom, gradient: "bg-gradient-physics", topics: ["Cinemática", "Forças", "Energia", "Eletricidade", "Ondas", "Óptica"] },
    { name: "Química", icon: FlaskConical, gradient: "bg-gradient-chemistry", topics: ["Estrutura Atómica", "Reações", "Estequiometria", "Soluções", "pH", "Química Orgânica"] },
  ];
  return (
    <section id="disciplinas" className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Disciplinas</h2>
          <p className="text-muted-foreground text-lg">Cobertura completa do 7º ao 12º ano.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {subjects.map((s, i) => (
            <motion.div key={i} className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className={`${s.gradient} p-6 text-primary-foreground`}>
                <s.icon className="w-10 h-10 mb-3" />
                <h3 className="text-2xl font-bold">{s.name}</h3>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {s.topics.map((t, j) => (
                    <span key={j} className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Brain, title: "Tutor IA Pedagógico", desc: "Conversa com um explicador inteligente que adapta a linguagem ao teu nível." },
    { icon: BookOpen, title: "Resolução Inteligente", desc: "Cada exercício resolvido com método, fórmulas explicadas e verificação final." },
    { icon: Target, title: "Modo Treino", desc: "Tenta resolver sozinho e recebe correção pedagógica em tempo real." },
    { icon: Lightbulb, title: "Modo Pista", desc: "Recebe dicas sem a resposta completa — desenvolve autonomia." },
    { icon: BarChart3, title: "Progresso Detalhado", desc: "Visualiza a tua evolução, identifica dificuldades e melhora constantemente." },
    { icon: Clock, title: "Plano de Estudo", desc: "Plano personalizado com base nos teus objetivos e dificuldades." },
  ];
  return (
    <section id="funcionalidades" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Funcionalidades</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Tudo o que precisas para dominar Matemática, Física e Química.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={i} className="bg-card rounded-xl p-6 shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300 group" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DifferentiationSection() {
  return (
    <section className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">O que nos torna diferentes?</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div className="bg-card rounded-xl p-8 border border-destructive/20" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="text-destructive font-bold text-lg mb-4 flex items-center gap-2"><X className="w-5 h-5" /> Calculadoras tradicionais</div>
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li className="flex items-start gap-2"><X className="w-4 h-4 mt-0.5 text-destructive shrink-0" /> Dão a resposta sem explicar</li>
              <li className="flex items-start gap-2"><X className="w-4 h-4 mt-0.5 text-destructive shrink-0" /> O aluno copia sem aprender</li>
              <li className="flex items-start gap-2"><X className="w-4 h-4 mt-0.5 text-destructive shrink-0" /> Sem adaptação ao nível do aluno</li>
              <li className="flex items-start gap-2"><X className="w-4 h-4 mt-0.5 text-destructive shrink-0" /> Sem estratégia de estudo</li>
            </ul>
          </motion.div>
          <motion.div className="bg-card rounded-xl p-8 border border-primary/30 shadow-glow" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="text-primary font-bold text-lg mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> MACASA IA</div>
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" /> Ensina o raciocínio passo a passo</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" /> O aluno aprende a pensar</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" /> Linguagem adaptada ao ano escolar</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" /> Plano de estudo inteligente</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    { name: "Ana Martins", year: "10º ano", text: "Finalmente percebi trigonometria! A forma como explica passo a passo fez toda a diferença.", rating: 5 },
    { name: "Miguel Santos", year: "12º ano", text: "Preparei o exame de Física com o MACASA IA. Subi de 12 para 17. Recomendo muito!", rating: 5 },
    { name: "Sofia Oliveira", year: "9º ano", text: "Adoro o modo Pista — dá dicas sem entregar a resposta. Ajudou-me a pensar sozinha.", rating: 5 },
    { name: "Pedro Costa", year: "11º ano", text: "Química nunca fez tanto sentido. As explicações são super claras e adaptadas ao meu nível.", rating: 5 },
  ];
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">O que dizem os alunos</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <motion.div key={i} className="bg-card rounded-xl p-6 shadow-card border border-border/50" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-4 h-4 fill-warning text-warning" />)}
              </div>
              <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.year}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Gratuito",
      price: "0€",
      period: "/mês",
      desc: "Para experimentar e começar a aprender",
      features: ["5 perguntas por dia", "Explicações básicas", "1 disciplina", "Histórico limitado"],
      cta: "Começar grátis",
      popular: false,
    },
    {
      name: "Premium",
      price: "9,99€",
      period: "/mês",
      desc: "Para quem quer resultados a sério",
      features: ["Perguntas ilimitadas", "Explicações completas", "Todas as disciplinas", "Modo treino avançado", "Upload de imagem", "Plano de estudo", "Relatórios de progresso", "Suporte prioritário"],
      cta: "Começar Premium",
      popular: true,
    },
    {
      name: "Escola",
      price: "Sob consulta",
      period: "",
      desc: "Para escolas e centros de explicação",
      features: ["Gestão de alunos", "Dashboard do professor", "Relatórios pedagógicos", "Acompanhamento de turmas", "Integração escolar", "Suporte dedicado"],
      cta: "Contactar equipa",
      popular: false,
    },
  ];
  return (
    <section id="pricing" className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos e preços</h2>
          <p className="text-muted-foreground text-lg">Escolhe o plano certo para o teu estudo.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div key={i} className={`bg-card rounded-xl p-8 border ${p.popular ? "border-primary shadow-glow scale-105" : "border-border/50 shadow-card"} relative transition-all`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-hero text-primary-foreground text-xs font-bold rounded-full">Mais popular</div>}
              <h3 className="font-bold text-xl mb-1">{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="text-muted-foreground text-sm">{p.period}</span>
              </div>
              <p className="text-muted-foreground text-sm mb-6">{p.desc}</p>
              <ul className="space-y-3 mb-8">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {f}</li>
                ))}
              </ul>
              <Button variant={p.popular ? "hero" : "outline"} className="w-full" asChild>
                <Link to="/signup">{p.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: "Para que anos escolares funciona?", a: "O MACASA IA cobre do 7º ao 12º ano de escolaridade, com explicações adaptadas a cada nível." },
    { q: "A IA dá as respostas diretamente?", a: "Não! O nosso objetivo é ensinar a pensar. Temos modos como Pista e Explicar que guiam sem entregar a resposta." },
    { q: "Posso enviar fotos de exercícios?", a: "Sim! Podes tirar foto ao exercício, fazer screenshot ou escrever o enunciado manualmente." },
    { q: "É gratuito?", a: "Temos um plano gratuito com 5 perguntas diárias. Para acesso completo, existe o plano Premium por 9,99€/mês." },
    { q: "Funciona para exames nacionais?", a: "Sim! Os conteúdos cobrem os programas oficiais e o modo treino ajuda na preparação para exames." },
    { q: "Como funciona o modo Treino?", a: "No modo Treino, tu tentas resolver sozinho e a IA corrige cada passo, dando feedback pedagógico imediato." },
  ];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
        </motion.div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <button className="w-full text-left p-5 flex items-center justify-between font-medium hover:bg-secondary/50 transition-colors" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                {f.q}
                <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openIdx === i ? "rotate-90" : ""}`} />
              </button>
              {openIdx === i && <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">MACASA IA</span>
            </div>
            <p className="text-sm text-muted-foreground">Mentor das Exatas — aprende a pensar antes de responder.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Produto</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/solve" className="block hover:text-foreground transition-colors">Resolver Exercício</Link>
              <Link to="/chat" className="block hover:text-foreground transition-colors">Tutor IA</Link>
              <Link to="/subjects" className="block hover:text-foreground transition-colors">Disciplinas</Link>
              <Link to="/pricing" className="block hover:text-foreground transition-colors">Preços</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Disciplinas</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a className="block">Matemática</a>
              <a className="block">Física</a>
              <a className="block">Química</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a className="block">Termos de Uso</a>
              <a className="block">Política de Privacidade</a>
              <a className="block">Contacto</a>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © 2026 MACASA IA — Mentor das Exatas. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <SubjectsSection />
      <FeaturesSection />
      <DifferentiationSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FooterSection />
    </div>
  );
}

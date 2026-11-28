// Normalização da matemática escrita pela IA antes de ir para o KaTeX.
// Os modelos pequenos (ex.: gemma4:e2b) nem sempre cumprem a regra do LaTeX. Casos reais vistos:
//   "x = -b +/- sqrt(b^2 - 4ac)", "Delta = b^2 - 4ac", "ax^2 + bx + c = 0" (com ou sem $);
//   "\frac{-b \text{ mais ou menos } \text{raiz quadrada de } (b^2 - 4ac)}{2a}";
//   "Delta = 2 ao quadrado menos 4 vezes 24 vezes (-1)";
//   "\text{Delta}", "\textDelta" (que chega como TAB + "extDelta"), "\pmsqrt(…)", "\sqrt(64)";
//   "$c = -1" (sem $ a fechar), "… (2 \times 15)$" (sem $ a abrir), "\text{…} 57 $  $x_1 = …$" (sem o primeiro $).
// Tudo é convertido de forma determinística; o texto normal fica como está.

const GREGAS = [
  "Delta", "delta", "alpha", "beta", "gamma", "Gamma", "theta", "Theta", "lambda", "Lambda", "mu",
  "sigma", "Sigma", "omega", "Omega", "rho", "epsilon", "varepsilon", "phi", "Phi", "pi", "tau", "eta",
];
const GREGAS_ALT = GREGAS.join("|");
const GREGA_RE = new RegExp(`(?<![\\\\A-Za-z])(${GREGAS_ALT})(?![A-Za-z])`, "g");
const FUNCOES = ["sqrt", "sin", "cos", "tan", "log", "ln", "sen", "tg", "exp"];
const PALAVRAS_MATEMATICAS = new Set([...GREGAS, ...FUNCOES]);

// ---------- utilitários ----------

/** Índice do parêntese que fecha o que abre em `abre` (ou -1). */
function fechoDe(s: string, abre: number, a = "(", f = ")"): number {
  let n = 0;
  for (let i = abre; i < s.length; i++) {
    if (s[i] === a) n++;
    else if (s[i] === f && --n === 0) return i;
  }
  return -1;
}

const chavetasEquilibradas = (s: string) => {
  let n = 0;
  for (const c of s) {
    if (c === "{") n++;
    else if (c === "}" && --n < 0) return false;
  }
  return n === 0;
};

/** Aplica `fn` só ao que está fora de \text{…} (o conteúdo de \text é texto, não matemática). */
function foraDeText(s: string, fn: (parte: string) => string): string {
  const re = /\\(?:text|textrm|mathrm|textit|mbox)\s*\{/g;
  let out = "", i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const abre = m.index + m[0].length - 1;
    const fecha = fechoDe(s, abre, "{", "}");
    if (fecha < 0) break;
    out += fn(s.slice(i, m.index)) + s.slice(m.index, fecha + 1);
    i = re.lastIndex = fecha + 1;
  }
  return out + fn(s.slice(i));
}

/** A linha é só matemática? (tirando \text{…} e comandos LaTeX, não sobram palavras de 4+ letras) */
export function pareceSoMatematica(s: string): boolean {
  if (!s.trim()) return false;
  const resto = s.replace(/\\(?:text|textrm|mathrm|mbox)\s*\{[^{}]*\}/g, " ").replace(/\\[a-zA-Z]+/g, " ");
  if (/[A-Za-zÀ-ÿ]{4,}/.test(resto.replace(new RegExp(`\\b(${[...PALAVRAS_MATEMATICAS].join("|")})\\b`, "g"), " "))) return false;
  return /\\[a-zA-Z]|[=^]|[0-9]/.test(s);
}

// ---------- 1) escapes estragados no JSON ----------

/**
 * "\textDelta", "\frac", "\beta"… escritos com uma só barra chegam como TAB/FF/BS + resto.
 * Repõe a barra quando o carácter de controlo vem colado a letras.
 */
const BACKSPACE_LETRAS = new RegExp(String.fromCharCode(8) + "(?=[a-zA-Z]{2})", "g"); // \b de "\beta" lido como backspace
export function repararEscapes(texto: string): string {
  return texto
    .replace(/\t(?=[a-zA-Z]{2})/g, "\\t")
    .replace(/\f(?=[a-zA-Z]{2})/g, "\\f")
    .replace(BACKSPACE_LETRAS, "\\b")
    .replace(/\r(?=(?:ight|ho|angle|floor|ceil)(?![a-z]))/g, "\\r")
    .replace(/\\n(?=[\s$A-Z0-9(]|$)/g, "\n"); // "\n" escrito à letra (JSON escapado duas vezes)
}

// ---------- 2) $ desemparelhados ----------

/**
 * Corrige $ desemparelhados numa linha (a IA esquece-se de abrir ou fechar):
 * "$c = -1" -> "$c = -1$"; "\text{…} 57 $  $x = 1$" -> "$\text{…} 57 $…"; "Substituindo: x = 2 \times 3$" -> sem o $ solto.
 * Também separa fórmulas seguidas escritas como "$…$  $…$" em linhas diferentes.
 */
export function corrigirDolaresSoltos(texto: string): string {
  if (!texto.includes("$")) return texto;
  return texto.split("\n").map((linha) => {
    const simples = [...linha.matchAll(/(?<!\$)\$(?!\$)/g)].map((m) => m.index!);
    const duplos = (linha.match(/\$\$/g) || []).length;
    let l = linha;
    if (duplos % 2 === 1 && simples.length === 0) l = l.replace(/\$\$\s*$/, "").replace(/^\s*\$\$/, "");
    else if (simples.length % 2 === 1) {
      const antes = l.slice(0, simples[0]);
      const depois = l.slice(simples[simples.length - 1] + 1);
      if (/^\s*$/.test(antes) && !/^\s*$/.test(depois)) l = l.replace(/(\s*)$/, "$$$1");
      else if (pareceSoMatematica(antes)) l = l.replace(/^(\s*)/, "$1$$");
      else if (pareceSoMatematica(depois) && !/^\s*$/.test(depois)) l = l.replace(/(\s*)$/, "$$$1");
      else l = l.slice(0, simples[simples.length - 1]) + l.slice(simples[simples.length - 1] + 1);
    }
    return l.replace(/(?<!\$)\$[ \t]{2,}\$(?!\$)/g, "$\n$");
  }).join("\n");
}

// ---------- 3) operações escritas por extenso ----------

// Dentro de uma fórmula: estas palavras são sempre operações.
const FRASES_FORMULA: [RegExp, string][] = [
  [/(?:mais|plus) ou menos/gi, " \\pm "],
  [/raiz\s*(?:quadrada\s*)?de\s*|raiz\s+quadrada\s*|raiz(?=\s*\()/gi, " sqrt "],
  [/\s*ao quadrado/gi, "^2 "],
  [/\s*ao cubo/gi, "^3 "],
  [/dividido por/gi, " / "],
  [/\bvezes\b/gi, " \\times "],
  [/\bmenos\b/gi, " - "],
  [/\bmais\b/gi, " + "],
  [/\bsobre\b/gi, " / "],
  [/\b(?:quatro)\b/gi, "4"], [/\b(?:dois)\b/gi, "2"], [/\b(?:tr[eê]s)\b/gi, "3"],
];
const FRASE_SO = /^\s*(?:(?:mais|plus) ou menos|raiz(?:\s*quadrada)?(?:\s*de)?|ao quadrado|ao cubo|dividido por|vezes|menos|mais)\s*$/i;

function frasesNaFormula(s: string): string {
  // \text{ mais ou menos } -> mais ou menos (só quando o \text contém apenas a operação)
  s = s.replace(/\\(?:text|textrm|mathrm|mbox)\s*\{([^{}]*)\}/g, (t, dentro: string) => (FRASE_SO.test(dentro) ? ` ${dentro} ` : t));
  // palavras coladas: "raizquadradade(", "raizde"
  s = s.replace(/raizquadradade|raizquadrada|raizde/gi, " raiz quadrada de ");
  return foraDeText(s, (parte) => FRASES_FORMULA.reduce((acc, [re, por]) => acc.replace(re, por), parte));
}

// No texto normal: só quando a palavra está entre operandos ("4 vezes 24", "2 ao quadrado"),
// para não mexer em frases como "pelo menos dois" ou "a menos que".
const OPERANDO_ESQ = /(?:[0-9)\]}]|(?:^|[^A-Za-z])[A-Za-z]|^(?:Delta|delta|pi)|\^[0-9])[.,;:]?$/;
const OPERANDO_DIR = /^(?:[(\-−0-9]|[A-Za-z](?![A-Za-zÀ-ÿ])|(?:Delta|delta|pi)(?![A-Za-z])|raiz)/;

const NUMEROS: Record<string, string> = { zero: "0", um: "1", dois: "2", "três": "3", tres: "3", quatro: "4", cinco: "5", seis: "6", sete: "7", oito: "8", nove: "9", dez: "10" };
const OPS_PALAVRA = /^(?:mais|menos|vezes|sobre|=|\+|-|\*|\/|×|\(|\)|\+\/-|±)$/i;

export function frasesNoTexto(linha: string): string {
  if (!/\b(?:mais|menos|vezes|dividido|sobre|quadrado|cubo|raiz)\b/i.test(linha)) return linha;
  const t = linha.split(/(\s+)/);
  // números por extenso entre operações: "menos quatro vezes a" -> "menos 4 vezes a"
  for (let i = 0; i < t.length; i += 2) {
    const n = NUMEROS[t[i].toLowerCase().replace(/[).,;:]+$/, "")];
    const antes = t[i - 2], depois = t[i + 2];
    if (n && antes !== undefined && OPS_PALAVRA.test(antes) && (depois === undefined || OPS_PALAVRA.test(depois) || /^[).,;:]/.test(t[i].replace(/^[^).,;:]+/, ""))))
      t[i] = t[i].replace(/^[A-Za-zÀ-ÿ]+/, n);
  }
  // palavra anterior/seguinte, saltando as que já foram absorvidas (ficaram vazias)
  const pal = (i: number) => (i >= 0 && i < t.length ? t[i] : undefined);
  const anterior = (i: number) => { for (let k = i - 2; k >= 0; k -= 2) if (t[k] !== "") return t[k]; return undefined; };
  const anteriorIdx = (i: number) => { for (let k = i - 2; k >= 0; k -= 2) if (t[k] !== "") return k; return -1; };
  const OP_FEITO = /^(?:\\times|\\pm|[-+/=×±]|\+\/-)$/;
  const eOp = (x?: string) => x !== undefined && (OPS_PALAVRA.test(x) || OP_FEITO.test(x));
  const posterior = (i: number) => { for (let k = i + 2; k < t.length; k += 2) if (t[k] !== "") return t[k]; return undefined; };
  // "a", "e", "o" só contam como variável quando estão encostados a outra operação ("4 vezes a vezes c")
  const curta = (x: string) => /^(?:a|e|o)$/i.test(x.replace(/[).,;:]+$/, ""));
  const eOperandoEsq = (k: number) => {
    const x = k >= 0 ? t[k] : undefined;
    if (!x || !OPERANDO_ESQ.test(x) || /^é$/i.test(x)) return false;
    return !curta(x) || eOp(anterior(k)) || /\)$/.test(x);
  };
  const eOperandoDir = (k: number) => {
    const x = k < t.length ? t[k] : undefined;
    if (!x || !OPERANDO_DIR.test(x) || /^é$/i.test(x)) return false;
    return !curta(x) || eOp(posterior(k)) || /\)/.test(x);
  };
  for (let i = 0; i < t.length; i += 2) {
    const w = t[i].toLowerCase();
    const seguinte = (n: number) => pal(i + 2 * n)?.toLowerCase();
    let tam = 0, sim = "";
    if (w === "mais" && seguinte(1) === "ou" && seguinte(2) === "menos") { tam = 3; sim = "\\pm"; }
    else if (w === "dividido" && seguinte(1) === "por") { tam = 2; sim = "/"; }
    else if (w === "sobre") { tam = 1; sim = "/"; }
    else if (w === "vezes") { tam = 1; sim = "\\times"; }
    else if (w === "menos") { tam = 1; sim = "-"; }
    else if (w === "mais") { tam = 1; sim = "+"; }
    if (tam && eOperandoEsq(anteriorIdx(i)) && eOperandoDir(i + 2 * tam)) {
      t[i] = sim;
      for (let k = 1; k < tam; k++) { t[i + 2 * k] = ""; t[i + 2 * k - 1] = ""; }
      // "sobre 2 vezes 15" é o denominador inteiro: "/ (2 \times 15)"
      if (sim === "/") {
        let k = i + 2 * tam, ultimo = -1, temVezes = false;
        while (k < t.length && OPERANDO_DIR.test(t[k] || "")) {
          ultimo = k;
          if (/[.,;:)]$/.test(t[k]) || t[k + 2]?.toLowerCase() !== "vezes") break;
          temVezes = true;
          k += 4;
        }
        if (temVezes && ultimo > 0) {
          t[i + 2 * tam] = "(" + t[i + 2 * tam];
          t[ultimo] = t[ultimo].replace(/([.,;:]*)$/, ")$1");
        }
      }
      continue;
    }
    if (w === "ao" && (seguinte(1) === "quadrado" || seguinte(1) === "cubo") && eOperandoEsq(anteriorIdx(i))) {
      const k = anteriorIdx(i);
      t[k] += seguinte(1) === "quadrado" ? "^2" : "^3";
      t[i - 1] = ""; t[i] = ""; t[i + 1] = "";
      t[i + 2] = t[i + 2].replace(/^(quadrado|cubo)/i, "");
    }
  }
  return t.join("").replace(/ {2,}/g, " ");
}

// ---------- 4) dentro da fórmula: ASCII -> LaTeX ----------

/** sqrt(...) -> \sqrt{...}, respeitando parênteses encaixados; "sqrt 57" / "sqrt b^2 - 4ac}" também. */
function converterSqrt(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const m = /(?<![\\A-Za-z])sqrt\s*(?=[^\s])/.exec(s.slice(i));
    if (!m) { out += s.slice(i); break; }
    const ini = i + m.index;
    const pos = ini + m[0].length;
    if (s[pos] === "(") {
      const fecha = fechoDe(s, pos);
      if (fecha < 0) { out += s.slice(i, ini) + "\\sqrt{" + converterSqrt(s.slice(pos + 1)) + "}"; break; } // parêntese por fechar
      out += s.slice(i, ini) + "\\sqrt{" + converterSqrt(s.slice(pos + 1, fecha)) + "}";
      i = fecha + 1;
    } else if (s[pos] === "{") {
      out += s.slice(i, ini) + "\\sqrt";
      i = pos;
    } else {
      // operando sem parênteses: até ao fim do grupo ({…}), a um "=" ou ao fim
      let n = 0, f = pos;
      for (; f < s.length; f++) {
        if (s[f] === "{") n++;
        else if (s[f] === "}") { if (n === 0) break; n--; }
        else if (n === 0 && (s[f] === "=" || s[f] === "," || s[f] === "$")) break;
      }
      const operando = s.slice(pos, f).trimEnd();
      out += s.slice(i, ini) + "\\sqrt{" + operando + "}" + s.slice(pos + operando.length, f);
      i = f;
    }
  }
  return out;
}

/** (num)/(den) e (num)/2a -> \frac{num}{den}. */
function converterFracoes(s: string): string {
  for (let guarda = 0; guarda < 10; guarda++) {
    const barra = s.search(/\)\s*\/\s*(?:\(|[0-9A-Za-z\\])/);
    if (barra < 0) return s;
    let n = 0, abre = -1;
    for (let i = barra; i >= 0; i--) {
      if (s[i] === ")") n++;
      else if (s[i] === "(" && --n === 0) { abre = i; break; }
    }
    if (abre < 0) return s;
    const num = s.slice(abre + 1, barra);
    let resto = s.slice(barra + 1).replace(/^\s*\/\s*/, "");
    let den: string;
    if (resto.startsWith("(")) {
      const f = fechoDe(resto, 0);
      if (f < 0) return s;
      den = resto.slice(1, f);
      resto = resto.slice(f + 1);
    } else {
      const m = /^(?:\\[A-Za-z]+(?:\{[^{}]*\})*|[0-9.,]*[A-Za-z]?(?:\^\{?[0-9A-Za-z]+\}?)?)/.exec(resto)!;
      den = m[0];
      resto = resto.slice(den.length);
    }
    if (!den) return s;
    s = s.slice(0, abre) + `\\frac{${num.trim()}}{${den.trim()}}` + resto;
  }
  return s;
}

/** Fórmula resolvente sem o "/2a" (erro frequente do modelo) -> fração completa. */
function completarResolvente(s: string): string {
  return s.replace(
    /(^|=\s*)(-\s*b\s*\\pm\s*\\sqrt\{\s*b\s*\^\s*\{?2\}?\s*-\s*4\s*a\s*c\s*\})(?!\s*(?:\}\s*\{|\/))/g,
    (_t, antes: string, nucleo: string) => `${antes}\\frac{${nucleo}}{2a}`,
  );
}

/** Converte a matemática de uma fórmula (conteúdo entre $…$) para LaTeX válido. */
export function asciiParaLatex(tex: string): string {
  let s = repararEscapes(tex);
  // letras gregas e sqrt metidos em modo texto: \text{Delta}, \textDelta, \text{sqrt}
  s = s.replace(new RegExp(`\\\\(?:text|mathrm|textrm)\\s*\\{\\s*\\\\?(${GREGAS_ALT})\\s*\\}`, "g"), "\\$1");
  s = s.replace(new RegExp(`\\\\(?:text|mathrm|textrm)(${GREGAS_ALT})(?![A-Za-z])`, "g"), "\\$1");
  s = frasesNaFormula(s);
  // \text{±sqrt}(64), \mathrm{sqrt}… : matemática metida em modo texto (aparecia a vermelho ou como palavra)
  s = s.replace(/\\(?:text|textrm|mathrm|operatorname|textit|mathit)\s*\{([^{}]*)\}/g, (t, dentro: string) =>
    /sqrt|±|\+\s*\/\s*-|\\[A-Za-z]|\^/.test(dentro) ? dentro : t);
  s = s.replace(/\\(pm|mp|times|cdot|div)(?=sqrt|frac)/g, "\\$1 "); // \pmsqrt( -> \pm sqrt(
  s = s.replace(/\\sqrt\s*\(/g, "sqrt("); // \sqrt(64)
  s = s.replace(/\+\s*\/\s*-|\+-|±/g, "\\pm ");
  s = s.replace(/−/g, "-").replace(/√\s*\(/g, "sqrt(");
  s = converterSqrt(s);
  s = s.replace(/√\s*([0-9A-Za-z]+)/g, "\\sqrt{$1}");
  s = converterFracoes(s);
  s = s.replace(/\^\s*\(([^()]*)\)/g, "^{$1}");
  s = foraDeText(s, (p) => p.replace(GREGA_RE, "\\$1"));
  s = s.replace(/>=|≥/g, "\\geq ").replace(/<=|≤/g, "\\leq ").replace(/!=|≠/g, "\\neq ");
  s = s.replace(/(?<=[0-9A-Za-z])\s*\*\s*(?=[A-Za-z(\\])/g, ""); // 4*a*c -> 4ac
  s = s.replace(/(?<=[0-9A-Za-z)}\s])\*(?=[\s0-9A-Za-z(\\])/g, "\\times "); // 3*4 -> 3 \times 4
  s = s.replace(/(\\times|\\cdot|(?<=[0-9A-Za-z)}]\s*)[+-])\s*-\s*([0-9]+(?:[.,][0-9]+)?|[A-Za-z])(?![0-9A-Za-z.,^{(])/g, "$1 (-$2)"); // 4 × -1 -> 4 × (-1)
  s = completarResolvente(s);
  return s.replace(/\\(pm|geq|leq|neq|times) +(?=[\s}])/g, "\\$1").replace(/ {2,}/g, " ");
}

// ---------- 5) fórmulas soltas no texto (sem $) ----------

const STOPWORDS = new Set(["e", "o", "a", "os", "as", "ao", "de", "da", "do", "em", "no", "na", "um", "se", "ou", "que", "com", "por", "sem", "para", "és"]);
const OPERADOR = /^(?:=|\+|-|\*|\/|\+\/-|±|<|>|<=|>=|≤|≥|≠|\\times|\\pm|\\cdot)$/;
const SINAL_FORTE = /\^|\\(?:frac|sqrt|pm|times|cdot|Delta)(?![A-Za-z])|(?<![\\A-Za-z])sqrt\s*\(|\+\s*\/\s*-|±|√|(?<![\\A-Za-z])Delta(?![A-Za-z])/;

function eMatematico(tok: string, antes?: string, depois?: string): boolean {
  if (/^[(]*\\[A-Za-z]/.test(tok)) return true; // comando LaTeX (\times, \pm, \frac{…})
  const limpo = tok.replace(/^[(]+|[).,;:]+$/g, "");
  if (!limpo) return /[()]/.test(tok);
  if (/[À-ÿ]/.test(limpo)) return false; // palavras com acentos são português
  if (OPERADOR.test(limpo)) return true;
  if (/[=+\-*/^<>±√_()0-9]/.test(limpo)) return true;
  const letras = /^[A-Za-z]+$/.test(limpo);
  if (letras && PALAVRAS_MATEMATICAS.has(limpo)) return true;
  if (letras && limpo.length <= 2) {
    const vizinhoOperador = [antes, depois].some((v) => v !== undefined && OPERADOR.test(v));
    if (STOPWORDS.has(limpo.toLowerCase())) return vizinhoOperador;
    return true;
  }
  return false;
}

/** Tira pontuação final e parênteses desemparelhados das pontas de um troço de fórmula. */
function aparar(s: string): { ini: number; fim: number } {
  let ini = 0, fim = s.length;
  for (;;) {
    const t = s.slice(ini, fim);
    if (/[.,;:]$/.test(t) && !/\\[a-z]+\{[.,;:]$/.test(t)) { fim--; continue; }
    const abertos = (t.match(/\(/g) || []).length, fechados = (t.match(/\)/g) || []).length;
    if (t.endsWith(")") && fechados > abertos) { fim--; continue; }
    if (t.startsWith("(") && abertos > fechados) { ini++; continue; }
    if (t.startsWith("(") && t.endsWith(")") && fechoDe(t, 0) === t.length - 1) { ini++; fim--; continue; }
    break;
  }
  return { ini, fim };
}

/**
 * Envolve em \(…\) as fórmulas escritas no texto normal sem $:
 * ASCII ("ax^2 + bx + c = 0"), por extenso ("2 ao quadrado menos 4 vezes 24") ou LaTeX sem $.
 */
export function envolverMatematicaAscii(texto: string): string {
  return texto.split("\n").map((linhaOriginal) => {
    const linha = frasesNoTexto(repararEscapes(linhaOriginal));
    // linha toda em LaTeX (com \text{…} para as palavras): vai inteira
    if (/\\[a-zA-Z]/.test(linha) && pareceSoMatematica(linha) && chavetasEquilibradas(linha)) {
      const m = /^(\s*)(.*?)(\s*)$/.exec(linha)!;
      return `${m[1]}\\(${m[2]}\\)${m[3]}`;
    }
    if (!/[=^±√]|sqrt|\+\s*\/\s*-|\\(?:frac|sqrt|pm)/.test(linha)) return linha;
    const partes = linha.split(/(\s+)/); // palavras e espaços alternados
    const toks = partes.filter((_p, i) => i % 2 === 0);
    const mat = toks.map((t, i) => t !== "" && eMatematico(t, toks[i - 1], toks[i + 1]));
    let out = "";
    let i = 0;
    while (i < toks.length) {
      if (!mat[i]) { out += toks[i] + (partes[2 * i + 1] ?? ""); i++; continue; }
      let j = i;
      while (j + 1 < toks.length && mat[j + 1]) j++;
      let troco = "";
      for (let k = i; k <= j; k++) troco += toks[k] + (k < j ? partes[2 * k + 1] : "");
      const espacoFinal = partes[2 * j + 1] ?? "";
      const { ini, fim } = aparar(troco);
      const nucleo = troco.slice(ini, fim);
      const temIgualComNumeros = /=/.test(nucleo) && /[0-9]/.test(nucleo) && (j > i || /^[A-Za-z][A-Za-z0-9_]*=-?[0-9]/.test(nucleo));
      if (nucleo && chavetasEquilibradas(nucleo) && (SINAL_FORTE.test(nucleo) || temIgualComNumeros)) {
        out += troco.slice(0, ini) + "\\(" + nucleo + "\\)" + troco.slice(fim) + espacoFinal;
      } else {
        out += troco + espacoFinal;
      }
      i = j + 1;
    }
    return out;
  }).join("\n");
}

// Matemática em ASCII -> LaTeX.
// Os modelos pequenos (ex.: gemma4:e2b) às vezes ignoram a regra do LaTeX e escrevem
// "x = -b +/- sqrt(b^2 - 4ac)", "Delta = b^2 - 4ac" ou "ax^2 + bx + c = 0" (com ou sem $).
// Aqui isso é convertido de forma determinística antes de ir para o KaTeX.

const GREGAS = [
  "Delta", "delta", "alpha", "beta", "gamma", "Gamma", "theta", "Theta", "lambda", "Lambda", "mu",
  "sigma", "Sigma", "omega", "Omega", "rho", "epsilon", "varepsilon", "phi", "Phi", "pi", "tau", "eta",
];
const GREGA_RE = new RegExp(`(?<![\\\\A-Za-z])(${GREGAS.join("|")})(?![A-Za-z])`, "g");
const FUNCOES = ["sqrt", "sin", "cos", "tan", "log", "ln", "sen", "tg", "exp"];
const PALAVRAS_MATEMATICAS = new Set([...GREGAS, ...FUNCOES]);

/** Devolve o índice do parêntese que fecha o que abre em `abre` (ou -1). */
function fechoDe(s: string, abre: number): number {
  let n = 0;
  for (let i = abre; i < s.length; i++) {
    if (s[i] === "(") n++;
    else if (s[i] === ")" && --n === 0) return i;
  }
  return -1;
}

/** sqrt(...) -> \sqrt{...}, respeitando parênteses encaixados. */
function converterSqrt(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const m = /(?<![\\A-Za-z])(?:sqrt|raiz)\s*\(/.exec(s.slice(i));
    if (!m) { out += s.slice(i); break; }
    const ini = i + m.index;
    const abre = ini + m[0].length - 1;
    const fecha = fechoDe(s, abre);
    if (fecha < 0) { out += s.slice(i); break; }
    out += s.slice(i, ini) + "\\sqrt{" + converterSqrt(s.slice(abre + 1, fecha)) + "}";
    i = fecha + 1;
  }
  return out;
}

/** (num)/(den) e (num)/2a -> \frac{num}{den}. */
function converterFracoes(s: string): string {
  for (let guarda = 0; guarda < 10; guarda++) {
    const barra = s.search(/\)\s*\/\s*(?:\(|[0-9A-Za-z\\])/);
    if (barra < 0) return s;
    // encontrar o "(" que abre o numerador
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

/** Converte matemática escrita em ASCII dentro de uma fórmula para LaTeX válido. */
export function asciiParaLatex(tex: string): string {
  let s = tex;
  // \text{±sqrt}(64), \mathrm{sqrt}… : matemática metida em modo texto (aparecia a vermelho ou como palavra)
  s = s.replace(/\\(?:text|textrm|mathrm|operatorname|textit|mathit)\s*\{([^{}]*)\}/g, (t, dentro: string) =>
    /sqrt|raiz|±|\+\s*\/\s*-|\\[A-Za-z]|\^/.test(dentro) ? dentro : t);
  // comandos colados: \pmsqrt( -> \pm sqrt(
  s = s.replace(/\\(pm|mp|times|cdot|div)(?=sqrt|raiz|frac)/g, "\\$1 ");
  // \sqrt(…) com parênteses em vez de chavetas
  s = s.replace(/\\sqrt\s*\(/g, "sqrt(");
  s = s.replace(/\+\s*\/\s*-|\+-|±/g, "\\pm ");
  s = s.replace(/−/g, "-").replace(/√\s*\(/g, "sqrt(");
  s = converterSqrt(s);
  s = s.replace(/√\s*([0-9A-Za-z]+)/g, "\\sqrt{$1}");
  s = converterFracoes(s);
  s = s.replace(/\^\s*\(([^()]*)\)/g, "^{$1}");
  s = s.replace(GREGA_RE, "\\$1");
  s = s.replace(/>=|≥/g, "\\geq ").replace(/<=|≤/g, "\\leq ").replace(/!=|≠/g, "\\neq ");
  s = s.replace(/(?<=[0-9A-Za-z])\s*\*\s*(?=[A-Za-z(\\])/g, ""); // 4*a*c -> 4ac
  s = s.replace(/(?<=[0-9A-Za-z)}\s])\*(?=[\s0-9A-Za-z(\\])/g, "\\times "); // 3*4 -> 3 \times 4
  s = s.replace(/\\(times|cdot)\s*-\s*([0-9]+(?:[.,][0-9]+)?|[A-Za-z])(?![0-9A-Za-z])/g, "\\$1 (-$2)"); // 4 × -1 -> 4 × (-1)
  s = completarResolvente(s);
  return s.replace(/\\(pm|geq|leq|neq|times) +(?=[\s}])/g, "\\$1");
}

// ---------- fórmulas ASCII soltas no texto (sem $) ----------

const STOPWORDS = new Set(["e", "o", "a", "os", "as", "de", "da", "do", "em", "no", "na", "um", "se", "ou", "que", "com", "por", "sem", "para"]);
const OPERADOR = /^(?:=|\+|-|\*|\/|\+\/-|±|<|>|<=|>=|≤|≥|≠)$/;
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
    if (/[.,;:]$/.test(t)) { fim--; continue; }
    const abertos = (t.match(/\(/g) || []).length, fechados = (t.match(/\)/g) || []).length;
    if (t.endsWith(")") && fechados > abertos) { fim--; continue; }
    if (t.startsWith("(") && abertos > fechados) { ini++; continue; }
    if (t.startsWith("(") && t.endsWith(")") && fechoDe(t, 0) === t.length - 1) { ini++; fim--; continue; }
    break;
  }
  return { ini, fim };
}

/** Envolve em \(…\) os troços de texto normal que são fórmulas em ASCII (ex.: "ax^2 + bx + c = 0"). */
export function envolverMatematicaAscii(texto: string): string {
  if (!/[=^±√]|sqrt|\+\s*\/\s*-/.test(texto)) return texto;
  if (/^\s*\\[A-Za-z]/.test(texto) && !/[=^±√]/.test(texto)) return texto;
  return texto.split("\n").map((linha) => {
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
      const temIgualComNumeros = /=/.test(nucleo) && /[0-9]/.test(nucleo) && j > i;
      if (nucleo && (SINAL_FORTE.test(nucleo) || temIgualComNumeros)) {
        out += troco.slice(0, ini) + "\\(" + nucleo + "\\)" + troco.slice(fim) + espacoFinal;
      } else {
        out += troco + espacoFinal;
      }
      i = j + 1;
    }
    return out;
  }).join("\n");
}

/**
 * Corrige $ desemparelhados numa linha (a IA esquece-se de abrir ou fechar):
 * "$c = -1" -> "$c = -1$"; "Substituindo: x = 2 \\times 3$" -> sem o $ solto (a fórmula é apanhada depois).
 */
export function corrigirDolaresSoltos(texto: string): string {
  if (!texto.includes("$")) return texto;
  return texto.split("\n").map((linha) => {
    const simples = [...linha.matchAll(/(?<!\$)\$(?!\$)/g)].map((m) => m.index!);
    const duplos = (linha.match(/\$\$/g) || []).length;
    if (duplos % 2 === 1 && simples.length === 0) return linha.replace(/\$\$\s*$/, "").replace(/^\s*\$\$/, "");
    if (simples.length % 2 === 0) return linha;
    if (/^\s*\$(?!\$)/.test(linha)) return linha.replace(/(\s*)$/, "$$$1");
    const ultimo = simples[simples.length - 1];
    return linha.slice(0, ultimo) + linha.slice(ultimo + 1);
  }).join("\n");
}

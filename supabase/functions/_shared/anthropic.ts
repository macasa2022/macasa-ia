// Cliente mínimo da API da Anthropic (Claude), usado só quando AI_PROVIDER=anthropic
// (comparação com o Ollama). Não importar diretamente: usar ./ai.ts.
// Aceita mensagens no formato OpenAI e converte-as.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const DEFAULT_MODEL = "claude-opus-5-5";

type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenAIContentPart[];
};

function getConfig() {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
  const model = Deno.env.get("ANTHROPIC_MODEL") || DEFAULT_MODEL;
  return { apiKey, model };
}

function convertImage(url: string) {
  const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (m) {
    return {
      type: "image",
      source: { type: "base64", media_type: m[1] === "image/jpg" ? "image/jpeg" : m[1], data: m[2] },
    };
  }
  return { type: "image", source: { type: "url", url } };
}

function convertContent(content: string | OpenAIContentPart[]) {
  if (typeof content === "string") return content;
  return content.map((p) =>
    p.type === "image_url" ? convertImage(p.image_url.url) : { type: "text", text: p.text }
  );
}

/** Converte mensagens OpenAI → { system, messages } da Anthropic. */
export function toAnthropic(messages: OpenAIMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => ("text" in p ? p.text : "")).join("\n")))
    .join("\n\n");

  const out: { role: "user" | "assistant"; content: unknown }[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (typeof m.content === "string" && !m.content.trim()) continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = convertContent(m.content);
    const last = out[out.length - 1];
    // A Anthropic exige alternância user/assistant: junta mensagens seguidas do mesmo papel.
    if (last && last.role === role && typeof last.content === "string" && typeof content === "string") {
      last.content = `${last.content}\n\n${content}`;
    } else {
      out.push({ role, content });
    }
  }
  // A primeira mensagem tem de ser do utilizador.
  while (out.length && out[0].role !== "user") out.shift();
  return { system, messages: out };
}

export class AIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function callAnthropic(body: Record<string, unknown>) {
  const { apiKey } = getConfig();
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Anthropic error:", resp.status, text);
    let status = resp.status;
    if (status === 529) status = 429; // sobrecarga → tratar como "aguarda"
    if (status === 400 && /credit balance/i.test(text)) status = 402;
    throw new AIError(status, text);
  }
  return resp;
}

/** Resposta completa (não-stream). Devolve o texto. */
export async function completeText(messages: OpenAIMessage[], maxTokens = 4096): Promise<string> {
  const { model } = getConfig();
  const { system, messages: msgs } = toAnthropic(messages);
  const resp = await callAnthropic({ model, max_tokens: maxTokens, system, messages: msgs });
  const data = await resp.json();
  return (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
}

/**
 * Resposta em streaming. Devolve um ReadableStream em formato SSE *compatível
 * com OpenAI* ("data: {choices:[{delta:{content}}]}" ... "data: [DONE]"),
 * para que o frontend (src/lib/ai-stream.ts) funcione sem alterações.
 */
export async function streamOpenAICompatible(messages: OpenAIMessage[], maxTokens = 2048): Promise<ReadableStream<Uint8Array>> {
  const { model } = getConfig();
  const { system, messages: msgs } = toAnthropic(messages);
  const resp = await callAnthropic({ model, max_tokens: maxTokens, system, messages: msgs, stream: true });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = resp.body!.getReader();
  let buf = "";

  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, text: string) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text } }] })}\n\n`));

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Lê até emitir pelo menos um pedaço (ou terminar): se pull() resolver sem
      // enqueue, o ReadableStream não volta a chamá-lo e o stream fica pendurado.
      let emitted = false;
      while (!emitted) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).replace(/\r$/, "");
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const ev = JSON.parse(json);
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
              emit(controller, ev.delta.text);
              emitted = true;
            } else if (ev.type === "error") {
              console.error("Anthropic stream error:", ev.error);
              emit(controller, "\n\n[Erro na IA. Tenta novamente.]");
              emitted = true;
            }
          } catch { /* linha parcial */ }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

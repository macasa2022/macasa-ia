// Cliente de IA das Edge Functions do MACASA IA.
// AI_PROVIDER escolhe o fornecedor:
//   ollama    (omissão) IA local, sem custos
//   anthropic Claude (Opus ou Fable) pela API — só para comparar respostas;
//             usa ANTHROPIC_API_KEY e ANTHROPIC_MODEL (ex. claude-opus-5-5 ou claude-fable-5-2)
// Aceita mensagens no formato OpenAI (o formato que o resto do código usa),
// fala com a API nativa do Ollama (/api/chat) e devolve:
//   - completeText(): o texto completo;
//   - streamOpenAICompatible(): um stream SSE no formato OpenAI
//     ("data: {choices:[{delta:{content}}]}" ... "data: [DONE]"),
//     que o frontend (src/lib/ai-stream.ts) já sabe ler.
//
// Variáveis (supabase/functions/.env):
//   OLLAMA_URL      por omissão http://host.docker.internal:11434
//                   (as funções correm dentro do Docker; "localhost" seria o próprio contentor)
//   OLLAMA_MODEL    por omissão gemma4:e4b (lê texto e imagens)
//   OLLAMA_NUM_CTX  janela de contexto, por omissão 8192 (os prompts do tutor são longos)

import * as anthropic from "./anthropic.ts";

export const DEFAULT_MODEL = "gemma4:e4b";

export function aiProvider(): "ollama" | "anthropic" {
  return (Deno.env.get("AI_PROVIDER") || "ollama").toLowerCase() === "anthropic" ? "anthropic" : "ollama";
}

/** Converte os erros da Anthropic para o AIError comum. */
async function viaAnthropic<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof anthropic.AIError) throw new AIError(err.status, err.message);
    throw err;
  }
}

type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenAIContentPart[];
};

type OllamaMessage = { role: "system" | "user" | "assistant"; content: string; images?: string[] };

export class AIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getConfig() {
  const url = (Deno.env.get("OLLAMA_URL") || "http://host.docker.internal:11434").replace(/\/+$/, "");
  const model = Deno.env.get("OLLAMA_MODEL") || DEFAULT_MODEL;
  const numCtx = Number(Deno.env.get("OLLAMA_NUM_CTX") || 8192);
  return { url, model, numCtx };
}

/** Converte mensagens OpenAI → mensagens do Ollama (texto + imagens em base64 puro). */
export function toOllama(messages: OpenAIMessage[]): OllamaMessage[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    const text = m.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    const images = m.content
      .filter((p): p is { type: "image_url"; image_url: { url: string } } => p.type === "image_url")
      .map((p) => p.image_url.url.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/s)?.[1])
      .filter((b): b is string => !!b);
    return images.length ? { role: m.role, content: text, images } : { role: m.role, content: text };
  });
}

async function callOllama(messages: OpenAIMessage[], maxTokens: number, stream: boolean, json: boolean) {
  const { url, model, numCtx } = getConfig();
  let resp: Response;
  try {
    resp = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: toOllama(messages),
        stream,
        ...(json ? { format: "json" } : {}),
        keep_alive: "30m",
        options: { num_ctx: numCtx, num_predict: maxTokens },
      }),
    });
  } catch (err) {
    console.error(`Ollama inacessível em ${url}:`, err);
    throw new AIError(503, `Ollama inacessível em ${url}. O Ollama está aberto?`);
  }
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Ollama error:", resp.status, text);
    if (resp.status === 404) throw new AIError(503, `Modelo ${model} não encontrado. Corre: ollama pull ${model}`);
    throw new AIError(resp.status, text);
  }
  return resp;
}

/** Resposta completa (não-stream). Com json=true o Ollama é obrigado a devolver JSON válido. */
export async function completeText(messages: OpenAIMessage[], maxTokens = 4096, json = false): Promise<string> {
  if (aiProvider() === "anthropic") return viaAnthropic(() => anthropic.completeText(messages, maxTokens));
  const resp = await callOllama(messages, maxTokens, false, json);
  const data = await resp.json();
  return data?.message?.content ?? "";
}

/** Resposta em streaming, convertida de NDJSON (Ollama) para SSE no formato OpenAI. */
export async function streamOpenAICompatible(messages: OpenAIMessage[], maxTokens = 2048): Promise<ReadableStream<Uint8Array>> {
  if (aiProvider() === "anthropic") return viaAnthropic(() => anthropic.streamOpenAICompatible(messages, maxTokens));
  const resp = await callOllama(messages, maxTokens, true, false);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = resp.body!.getReader();
  let buf = "";

  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, text: string) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text } }] })}\n\n`));
  const finish = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Lê até emitir pelo menos um pedaço (ou terminar): se pull() resolver sem
      // enqueue, o ReadableStream não volta a chamá-lo e o stream fica pendurado.
      while (true) {
        const nl = buf.indexOf("\n");
        if (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let chunk: { message?: { content?: string }; done?: boolean; error?: string };
          try {
            chunk = JSON.parse(line);
          } catch {
            continue;
          }
          if (chunk.error) {
            console.error("Ollama stream error:", chunk.error);
            finish(controller);
            return;
          }
          const text = chunk.message?.content;
          if (chunk.done) {
            if (text) emit(controller, text);
            finish(controller);
            return;
          }
          if (text) {
            emit(controller, text);
            return;
          }
          continue;
        }
        const { done, value } = await reader.read();
        if (done) {
          finish(controller);
          return;
        }
        buf += decoder.decode(value, { stream: true });
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

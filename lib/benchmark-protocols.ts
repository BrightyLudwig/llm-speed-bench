export type BenchmarkProtocol =
  | "openai-chat"
  | "openai-responses"
  | "claude-messages"
  | "gemini-generate-content"
  | "cohere-chat"
  | "jina-rerank"
  | "custom-json";

export type ProviderPreset = {
  id: string;
  name: string;
  protocol: BenchmarkProtocol;
  url: string;
};

export type ProtocolRequestInput = {
  apiKey: string;
  url: string;
  modelName: string;
  prompt: string;
  customMethod?: string;
  customHeaders?: string;
  customBody?: string;
};

export type BuiltProtocolRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type ProtocolAdapter = {
  id: BenchmarkProtocol;
  name: string;
  buildRequest: (input: ProtocolRequestInput) => BuiltProtocolRequest;
  extractTokens: (response: unknown) => number;
};

export const providerPresets: ProviderPreset[] = [
  { id: "custom", name: "自定义", protocol: "openai-chat", url: "" },
  { id: "openai", name: "OpenAI", protocol: "openai-chat", url: "https://api.openai.com/v1/chat/completions" },
  { id: "openai-responses", name: "OpenAI Responses", protocol: "openai-responses", url: "https://api.openai.com/v1/responses" },
  { id: "anthropic", name: "Anthropic Claude", protocol: "claude-messages", url: "https://api.anthropic.com/v1/messages" },
  { id: "gemini", name: "Google Gemini", protocol: "gemini-generate-content", url: "https://generativelanguage.googleapis.com/v1beta/models/{{MODEL}}:generateContent" },
  { id: "cohere", name: "Cohere Chat", protocol: "cohere-chat", url: "https://api.cohere.com/v2/chat" },
  { id: "jina-rerank", name: "Jina Rerank", protocol: "jina-rerank", url: "https://api.jina.ai/v1/rerank" },
  { id: "openrouter", name: "OpenRouter", protocol: "openai-chat", url: "https://openrouter.ai/api/v1/chat/completions" },
  { id: "deepseek", name: "DeepSeek", protocol: "openai-chat", url: "https://api.deepseek.com/v1/chat/completions" },
  { id: "moonshot", name: "Moonshot", protocol: "openai-chat", url: "https://api.moonshot.cn/v1/chat/completions" },
  { id: "zhipu", name: "智谱 GLM", protocol: "openai-chat", url: "https://open.bigmodel.cn/api/paas/v4/chat/completions" },
  { id: "dashscope", name: "阿里 DashScope 兼容模式", protocol: "openai-chat", url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" },
  { id: "siliconflow", name: "SiliconFlow", protocol: "openai-chat", url: "https://api.siliconflow.cn/v1/chat/completions" },
  { id: "xai", name: "xAI", protocol: "openai-chat", url: "https://api.x.ai/v1/chat/completions" },
  { id: "mistral", name: "Mistral", protocol: "openai-chat", url: "https://api.mistral.ai/v1/chat/completions" },
  { id: "perplexity", name: "Perplexity", protocol: "openai-chat", url: "https://api.perplexity.ai/chat/completions" },
  { id: "ollama", name: "Ollama", protocol: "openai-chat", url: "http://localhost:11434/v1/chat/completions" },
  { id: "xinference", name: "Xinference", protocol: "openai-chat", url: "http://localhost:9997/v1/chat/completions" },
  { id: "minimax", name: "MiniMax", protocol: "openai-chat", url: "https://api.minimax.chat/v1/text/chatcompletion_v2" },
  { id: "volcengine", name: "火山方舟 / Doubao", protocol: "openai-chat", url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions" },
  { id: "lingyiwanwu", name: "零一万物", protocol: "openai-chat", url: "https://api.lingyiwanwu.com/v1/chat/completions" },
];

export const protocolOptions: Array<{ id: BenchmarkProtocol; name: string }> = [
  { id: "openai-chat", name: "OpenAI Chat Completions" },
  { id: "openai-responses", name: "OpenAI Responses" },
  { id: "claude-messages", name: "Claude Messages" },
  { id: "gemini-generate-content", name: "Google Gemini generateContent" },
  { id: "cohere-chat", name: "Cohere Chat" },
  { id: "jina-rerank", name: "Jina Rerank" },
  { id: "custom-json", name: "高级 JSON" },
];

function replacePlaceholders(value: string, input: ProtocolRequestInput) {
  return value
    .replaceAll("{{API_KEY}}", input.apiKey)
    .replaceAll("{{MODEL}}", input.modelName)
    .replaceAll("{{PROMPT}}", input.prompt);
}

function parseJsonObject(value: string, field: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${field} 必须是 JSON 对象`);
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("必须是 JSON 对象")) {
      throw error;
    }

    throw new Error(`${field} 不是合法 JSON`);
  }
}

function bearerHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function extractUsageTokens(response: unknown) {
  const data = response as {
    usage?: {
      total_tokens?: number;
      totalTokens?: number;
      input_tokens?: number;
      output_tokens?: number;
      inputTokens?: number;
      outputTokens?: number;
    };
  };
  const usage = data.usage;

  if (!usage) {
    return 0;
  }

  return usage.total_tokens ?? usage.totalTokens ?? (usage.input_tokens ?? usage.inputTokens ?? 0) + (usage.output_tokens ?? usage.outputTokens ?? 0);
}

export const protocolAdapters: Record<BenchmarkProtocol, ProtocolAdapter> = {
  "openai-chat": {
    id: "openai-chat",
    name: "OpenAI Chat Completions",
    buildRequest: (input) => ({
      method: "POST",
      url: replacePlaceholders(input.url, input),
      headers: bearerHeaders(input.apiKey),
      body: JSON.stringify({
        model: input.modelName,
        messages: [{ role: "user", content: input.prompt }],
        stream: false,
        reasoning: false,
      }),
    }),
    extractTokens: extractUsageTokens,
  },
  "openai-responses": {
    id: "openai-responses",
    name: "OpenAI Responses",
    buildRequest: (input) => ({
      method: "POST",
      url: replacePlaceholders(input.url, input),
      headers: bearerHeaders(input.apiKey),
      body: JSON.stringify({
        model: input.modelName,
        input: input.prompt,
        stream: false,
      }),
    }),
    extractTokens: extractUsageTokens,
  },
  "claude-messages": {
    id: "claude-messages",
    name: "Claude Messages",
    buildRequest: (input) => ({
      method: "POST",
      url: replacePlaceholders(input.url, input),
      headers: {
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.modelName,
        max_tokens: 1024,
        messages: [{ role: "user", content: input.prompt }],
      }),
    }),
    extractTokens: extractUsageTokens,
  },
  "gemini-generate-content": {
    id: "gemini-generate-content",
    name: "Google Gemini generateContent",
    buildRequest: (input) => {
      const url = new URL(replacePlaceholders(input.url, input));
      url.searchParams.set("key", input.apiKey);

      return {
        method: "POST",
        url: url.toString(),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input.prompt }] }],
          generationConfig: { candidateCount: 1 },
        }),
      };
    },
    extractTokens: (response) => {
      const data = response as { usageMetadata?: { totalTokenCount?: number; promptTokenCount?: number; candidatesTokenCount?: number } };
      const usage = data.usageMetadata;
      return usage?.totalTokenCount ?? (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);
    },
  },
  "cohere-chat": {
    id: "cohere-chat",
    name: "Cohere Chat",
    buildRequest: (input) => ({
      method: "POST",
      url: replacePlaceholders(input.url, input),
      headers: bearerHeaders(input.apiKey),
      body: JSON.stringify({
        model: input.modelName,
        messages: [{ role: "user", content: input.prompt }],
      }),
    }),
    extractTokens: (response) => {
      const data = response as { usage?: { tokens?: { input_tokens?: number; output_tokens?: number } } };
      return (data.usage?.tokens?.input_tokens ?? 0) + (data.usage?.tokens?.output_tokens ?? 0);
    },
  },
  "jina-rerank": {
    id: "jina-rerank",
    name: "Jina Rerank",
    buildRequest: (input) => ({
      method: "POST",
      url: replacePlaceholders(input.url, input),
      headers: bearerHeaders(input.apiKey),
      body: JSON.stringify({
        model: input.modelName,
        query: input.prompt,
        documents: [input.prompt, `${input.prompt} benchmark document`],
      }),
    }),
    extractTokens: (response) => {
      const data = response as { usage?: { total_tokens?: number } };
      return data.usage?.total_tokens ?? 0;
    },
  },
  "custom-json": {
    id: "custom-json",
    name: "高级 JSON",
    buildRequest: (input) => {
      const headers = parseJsonObject(replacePlaceholders(input.customHeaders || "{}", input), "Headers JSON");
      const method = (input.customMethod || "POST").trim().toUpperCase();
      const body = replacePlaceholders(input.customBody || "{}", input);

      return {
        method,
        url: replacePlaceholders(input.url, input),
        headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)])),
        body,
      };
    },
    extractTokens: extractUsageTokens,
  },
};

export function getProviderPreset(id: string) {
  return providerPresets.find((preset) => preset.id === id) ?? providerPresets[0];
}

export function getProtocolAdapter(protocol: BenchmarkProtocol) {
  return protocolAdapters[protocol] ?? protocolAdapters["openai-chat"];
}

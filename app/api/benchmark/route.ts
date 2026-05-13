import { appendBenchmarkHistory, truncatePrompt } from "@/lib/benchmark-history";

type BenchmarkRequest = {
  apiKey?: unknown;
  url?: unknown;
  modelName?: unknown;
  prompt?: unknown;
  concurrency?: unknown;
  totalRequests?: unknown;
};

type RequestResult =
  | { success: true; latency: number; tokens: number }
  | { success: false; error: string };

const MAX_CONCURRENCY = 20;
const MAX_TOTAL_REQUESTS = 200;
const REQUEST_TIMEOUT_MS = 1_000_000;

function readString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} 不能为空`);
  }

  return value.trim();
}

function readHeaderValue(value: unknown, field: string) {
  const text = readString(value, field);

  if ([...text].some((character) => character.charCodeAt(0) > 255)) {
    throw new Error(`${field} 不能包含中文、省略号（…）等特殊字符，请粘贴完整原始值`);
  }

  return text;
}

function readPositiveInteger(value: unknown, field: string, max: number) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new Error(`${field} 必须是正整数`);
  }

  return Math.min(numberValue, max);
}

function readUrl(value: unknown) {
  const url = readString(value, "URL");
  const parsed = new URL(url);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("URL 只支持 HTTP 或 HTTPS");
  }

  return parsed.toString();
}

async function sendRequest(input: {
  apiKey: string;
  url: string;
  modelName: string;
  prompt: string;
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startTime = performance.now();

  try {
    const response = await fetch(input.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.modelName,
        messages: [{ role: "user", content: input.prompt }],
        stream: false,
        reasoning: false,
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${responseText}` } satisfies RequestResult;
    }

    const responseJson = JSON.parse(responseText) as { usage?: { total_tokens?: number } };
    const tokens = responseJson.usage?.total_tokens ?? 0;

    return {
      success: true,
      latency: (performance.now() - startTime) / 1000,
      tokens,
    } satisfies RequestResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message } satisfies RequestResult;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runWithConcurrency<T>(total: number, concurrency: number, task: (index: number) => Promise<T>) {
  const results = new Array<T>(total);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < total) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));

  return results;
}

export async function POST(request: Request) {
  let body: BenchmarkRequest;

  try {
    body = (await request.json()) as BenchmarkRequest;
  } catch {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  try {
    const apiKey = readHeaderValue(body.apiKey, "API Key");
    const url = readUrl(body.url);
    const modelName = readString(body.modelName, "模型名称");
    const prompt = readString(body.prompt, "测试 Prompt");
    const concurrency = readPositiveInteger(body.concurrency, "并发数", MAX_CONCURRENCY);
    const totalRequests = readPositiveInteger(body.totalRequests, "总批次数", MAX_TOTAL_REQUESTS);

    const startTime = performance.now();
    const results = await runWithConcurrency(totalRequests, concurrency, () =>
      sendRequest({ apiKey, url, modelName, prompt }),
    );
    const totalTime = (performance.now() - startTime) / 1000;

    const successResults = results.filter((result): result is Extract<RequestResult, { success: true }> => result.success);
    const failedResults = results.filter((result): result is Extract<RequestResult, { success: false }> => !result.success);
    const totalTokens = successResults.reduce((sum, result) => sum + result.tokens, 0);
    const latencies = successResults.map((result) => result.latency);

    const metrics = {
      totalTime,
      successCount: successResults.length,
      failureCount: failedResults.length,
      tps: successResults.length > 0 ? successResults.length / totalTime : 0,
      tokensPerSecond: totalTokens / totalTime,
      averageLatency: latencies.length > 0 ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      totalTokens,
      appliedConcurrency: concurrency,
      appliedTotalRequests: totalRequests,
      errors: failedResults.slice(0, 3).map((result) => result.error),
    };
    const historyRow = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      url,
      modelName,
      prompt: truncatePrompt(prompt),
      concurrency,
      totalRequests,
      totalTime: metrics.totalTime,
      successCount: metrics.successCount,
      failureCount: metrics.failureCount,
      tps: metrics.tps,
      tokensPerSecond: metrics.tokensPerSecond,
      averageLatency: metrics.averageLatency,
      minLatency: metrics.minLatency,
      maxLatency: metrics.maxLatency,
      totalTokens: metrics.totalTokens,
      errors: metrics.errors,
    };

    await appendBenchmarkHistory(historyRow);

    return Response.json({ ...metrics, historyRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "参数错误";
    return Response.json({ error: message }, { status: 400 });
  }
}

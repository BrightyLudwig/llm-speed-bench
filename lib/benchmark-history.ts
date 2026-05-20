import { mkdir, readFile, appendFile } from "fs/promises";
import path from "path";

import type { BenchmarkProtocol } from "@/lib/benchmark-protocols";

export type BenchmarkHistoryRow = {
  id: string;
  createdAt: string;
  url: string;
  protocol: BenchmarkProtocol;
  providerPreset: string;
  modelName: string;
  prompt: string;
  concurrency: number;
  totalRequests: number;
  totalTime: number;
  successCount: number;
  failureCount: number;
  tps: number;
  tokensPerSecond: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  totalTokens: number;
  errors: string[];
};

const dataDirectory = path.join(process.cwd(), "data");
const historyFile = path.join(dataDirectory, "benchmark-results.jsonl");

function normalizeHistoryRow(value: unknown): BenchmarkHistoryRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const isValid =
    typeof row.id === "string" &&
    typeof row.createdAt === "string" &&
    typeof row.url === "string" &&
    typeof row.modelName === "string" &&
    typeof row.prompt === "string" &&
    typeof row.concurrency === "number" &&
    typeof row.totalRequests === "number" &&
    typeof row.totalTime === "number" &&
    typeof row.successCount === "number" &&
    typeof row.failureCount === "number" &&
    typeof row.tps === "number" &&
    typeof row.tokensPerSecond === "number" &&
    typeof row.averageLatency === "number" &&
    typeof row.minLatency === "number" &&
    typeof row.maxLatency === "number" &&
    typeof row.totalTokens === "number" &&
    Array.isArray(row.errors);

  if (!isValid) {
    return null;
  }

  return {
    id: row.id as string,
    createdAt: row.createdAt as string,
    url: row.url as string,
    protocol: typeof row.protocol === "string" ? (row.protocol as BenchmarkProtocol) : "openai-chat",
    providerPreset: typeof row.providerPreset === "string" ? row.providerPreset : "custom",
    modelName: row.modelName as string,
    prompt: row.prompt as string,
    concurrency: row.concurrency as number,
    totalRequests: row.totalRequests as number,
    totalTime: row.totalTime as number,
    successCount: row.successCount as number,
    failureCount: row.failureCount as number,
    tps: row.tps as number,
    tokensPerSecond: row.tokensPerSecond as number,
    averageLatency: row.averageLatency as number,
    minLatency: row.minLatency as number,
    maxLatency: row.maxLatency as number,
    totalTokens: row.totalTokens as number,
    errors: (row.errors as unknown[]).filter((item): item is string => typeof item === "string"),
  };
}

export function truncatePrompt(prompt: string) {
  return prompt.length > 160 ? `${prompt.slice(0, 160)}…` : prompt;
}

export async function appendBenchmarkHistory(row: BenchmarkHistoryRow) {
  await mkdir(dataDirectory, { recursive: true });
  await appendFile(historyFile, `${JSON.stringify(row)}\n`, "utf8");
}

export async function readBenchmarkHistory() {
  try {
    const content = await readFile(historyFile, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return normalizeHistoryRow(JSON.parse(line) as unknown);
        } catch {
          return null;
        }
      })
      .filter((row): row is BenchmarkHistoryRow => row !== null)
      .reverse();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

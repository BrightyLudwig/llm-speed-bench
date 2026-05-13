import { mkdir, readFile, appendFile } from "fs/promises";
import path from "path";

export type BenchmarkHistoryRow = {
  id: string;
  createdAt: string;
  url: string;
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

function isHistoryRow(value: unknown): value is BenchmarkHistoryRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
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
    Array.isArray(row.errors)
  );
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
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter(isHistoryRow)
      .reverse();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

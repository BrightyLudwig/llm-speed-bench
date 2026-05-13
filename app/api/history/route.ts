import { readBenchmarkHistory } from "@/lib/benchmark-history";

export async function GET() {
  const rows = await readBenchmarkHistory();

  return Response.json({ rows });
}

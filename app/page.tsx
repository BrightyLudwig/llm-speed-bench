"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type BenchmarkHistoryRow = {
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

type BenchmarkResult = {
  totalTime: number;
  successCount: number;
  failureCount: number;
  tps: number;
  tokensPerSecond: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  totalTokens: number;
  appliedConcurrency: number;
  appliedTotalRequests: number;
  errors: string[];
  historyRow?: BenchmarkHistoryRow;
};

type ThemeName = "dark" | "light";

const defaultForm = {
  apiKey: "",
  url: "https://aigw-gzgy2.cucloud.cn:8443/v1/chat/completions",
  modelName: "Qwen3.5-397B-A17B",
  prompt: "你是谁",
  concurrency: 1,
  totalRequests: 3,
};

const themeStyles = {
  dark: {
    main: "bg-[radial-gradient(circle_at_top_left,#7c3aed_0,#0f172a_26rem),radial-gradient(circle_at_top_right,#0891b2_0,#0f172a_24rem)] text-slate-100",
    header: "border-white/10 bg-slate-950/70 shadow-2xl shadow-violet-950/30",
    eyebrow: "text-fuchsia-200",
    muted: "text-slate-300",
    softMuted: "text-slate-400",
    panel: "border-white/10 bg-slate-950/76 shadow-2xl shadow-slate-950/30",
    input: "border-white/10 bg-white/5 focus:border-fuchsia-300",
    pill: "bg-fuchsia-400/10 text-fuchsia-100 ring-1 ring-fuchsia-300/20",
    ghostPill: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    code: "bg-slate-950 text-cyan-100",
    button: "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white hover:from-fuchsia-400 hover:to-cyan-300 disabled:from-slate-600 disabled:to-slate-600 disabled:text-slate-300",
    toggle: "border-white/10 bg-white/10 text-cyan-100 hover:bg-white/15",
    running: "text-cyan-200",
    metric: "border-white/10 bg-gradient-to-br from-white/[0.08] to-cyan-300/[0.05]",
    metricLabel: "text-slate-400",
    metricValue: "text-white",
    errorBox: "border-red-400/30 bg-red-950/50 text-red-200",
    errorPanel: "border-red-400/30 bg-red-950/40",
    errorText: "text-red-100",
    row: "border-white/10 bg-white/[0.05] hover:bg-cyan-300/[0.08]",
    tableHead: "text-slate-400",
  },
  light: {
    main: "bg-[radial-gradient(circle_at_top_left,#fde68a_0,#f8fafc_22rem),radial-gradient(circle_at_top_right,#bae6fd_0,#f8fafc_26rem),linear-gradient(180deg,#fff7ed_0%,#f8fafc_42%)] text-slate-900",
    header: "border-white bg-white/88 shadow-[0_24px_80px_rgba(59,130,246,0.16)]",
    eyebrow: "text-fuchsia-600",
    muted: "text-slate-600",
    softMuted: "text-slate-500",
    panel: "border-white bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.09)]",
    input: "border-slate-200 bg-white text-slate-950 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100",
    pill: "bg-gradient-to-r from-fuchsia-50 to-cyan-50 text-fuchsia-700 ring-1 ring-fuchsia-100",
    ghostPill: "border-cyan-100 bg-cyan-50 text-cyan-700",
    code: "bg-slate-950 text-cyan-100",
    button: "bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:from-fuchsia-500 hover:to-cyan-400 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500",
    toggle: "border-fuchsia-100 bg-white text-fuchsia-700 hover:bg-fuchsia-50",
    running: "text-cyan-700",
    metric: "border-white bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50",
    metricLabel: "text-slate-500",
    metricValue: "text-slate-950",
    errorBox: "border-red-200 bg-red-50 text-red-700",
    errorPanel: "border-red-200 bg-red-50",
    errorText: "text-red-700",
    row: "border-white bg-white hover:bg-cyan-50/80",
    tableHead: "text-slate-500",
  },
} satisfies Record<ThemeName, Record<string, string>>;

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function buildCodePreview(form: typeof defaultForm) {
  return `const payload = {
  model: "${form.modelName || "<model_name>"}",
  messages: [{ role: "user", content: ${JSON.stringify(form.prompt || "<test_prompt>")} }],
  stream: false,
  reasoning: false,
};

const headers = {
  Authorization: "Bearer <API_KEY_FROM_FORM>",
  "Content-Type": "application/json",
};

const concurrency = ${form.concurrency};
const totalRequests = ${form.totalRequests};

async function sendRequest() {
  const startedAt = performance.now();
  const response = await fetch("${form.url || "<url>"}", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const latency = (performance.now() - startedAt) / 1000;

  if (!response.ok) {
    return { success: false, error: \`HTTP \${response.status}: \${text}\` };
  }

  const json = JSON.parse(text);
  return { success: true, latency, tokens: json.usage?.total_tokens ?? 0 };
}`;
}

export default function Home() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [historyRows, setHistoryRows] = useState<BenchmarkHistoryRow[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [themeName, setThemeName] = useState<ThemeName>("light");

  const codePreview = useMemo(() => buildCodePreview(form), [form]);
  const topHistoryRows = useMemo(
    () => [...historyRows].sort((left, right) => right.tokensPerSecond - left.tokensPerSecond).slice(0, 5),
    [historyRows],
  );
  const theme = themeStyles[themeName];

  async function loadHistory() {
    try {
      const response = await fetch("/api/history");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "读取历史失败");
      }

      setHistoryRows(data.rows ?? []);
      setHistoryError("");
    } catch (caughtError) {
      setHistoryError(caughtError instanceof Error ? caughtError.message : "读取历史失败");
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function runBenchmark(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "测速失败");
      }

      const benchmarkResult = data as BenchmarkResult;
      setResult(benchmarkResult);
      if (benchmarkResult.historyRow) {
        setHistoryRows((current) => [benchmarkResult.historyRow!, ...current]);
      } else {
        await loadHistory();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "测速失败");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className={`min-h-screen px-5 py-8 transition-colors md:px-8 ${theme.main}`}>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <header className={`rounded-3xl border p-6 backdrop-blur ${theme.header}`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className={`text-sm uppercase tracking-[0.4em] ${theme.eyebrow}`}>Public LLM Arena Bench</p>
              <h1 className="mt-3 text-3xl font-bold md:text-5xl">公开大模型 API 性能竞技场</h1>
              <p className={`mt-4 max-w-3xl ${theme.muted}`}>
                面向所有互联网用户的模型速度测试平台：提交你的 API 地址、模型名称与测试参数，系统会生成性能报告并进入公开 Tokens/s 排行榜。API Key 仅用于本次请求，不会展示或保存。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setThemeName((current) => (current === "dark" ? "light" : "dark"))}
              className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${theme.toggle}`}
            >
              切换到{themeName === "dark" ? "亮色" : "暗色"}
            </button>
          </div>
        </header>

        <section className={`rounded-3xl border p-6 ${theme.panel}`}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">公开性能排行榜 Top 5</h2>
              <p className={`mt-1 text-sm ${theme.softMuted}`}>按 Tokens/s 从高到低排序，突出全站最快的 5 次测试。</p>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className={`shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${theme.toggle}`}
            >
              刷新
            </button>
          </div>

          {historyError && <p className={`mb-4 rounded-2xl border p-3 text-sm ${theme.errorBox}`}>{historyError}</p>}
          {topHistoryRows.length === 0 ? (
            <p className={theme.softMuted}>暂无历史结果。</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[78rem] border-separate border-spacing-y-2 text-left text-sm">
                <thead className={theme.tableHead}>
                  <tr>
                    <th className="px-3 py-2 font-medium">时间</th>
                    <th className="px-3 py-2 font-medium">地址</th>
                    <th className="px-3 py-2 font-medium">模型 / Prompt</th>
                    <th className="px-3 py-2 font-medium">并发/批次</th>
                    <th className="px-3 py-2 font-medium">成功/失败</th>
                    <th className="px-3 py-2 font-bold">TPS</th>
                    <th className="px-3 py-2 font-bold">Tokens/s</th>
                    <th className="px-3 py-2 font-bold">平均延迟</th>
                    <th className="px-3 py-2 font-bold">总耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {topHistoryRows.map((row) => (
                    <tr key={row.id} className={`rounded-2xl border ${theme.row}`}>
                      <td className="rounded-l-2xl px-3 py-3 align-top whitespace-nowrap">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="max-w-[24rem] truncate font-medium" title={row.url}>{row.url}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="max-w-52 truncate font-medium" title={row.modelName}>{row.modelName}</div>
                        <div className={`mt-1 max-w-52 truncate text-xs ${theme.softMuted}`} title={row.prompt}>{row.prompt}</div>
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">{row.concurrency} / {row.totalRequests}</td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">{row.successCount} / {row.failureCount}</td>
                      <td className="px-3 py-3 align-top font-bold whitespace-nowrap">{formatNumber(row.tps)}</td>
                      <td className="px-3 py-3 align-top font-bold whitespace-nowrap">{formatNumber(row.tokensPerSecond)}</td>
                      <td className="px-3 py-3 align-top font-bold whitespace-nowrap">{formatNumber(row.averageLatency)} 秒</td>
                      <td className="rounded-r-2xl px-3 py-3 align-top font-bold whitespace-nowrap">{formatNumber(row.totalTime)} 秒</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(430px,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={runBenchmark} className={`rounded-3xl border p-6 ${theme.panel}`}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">提交一次公开测速</h2>
                <p className={`mt-1 text-sm ${theme.softMuted}`}>并发上限 20，总批次数上限 200；测试结果会进入公开榜单。</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${theme.pill}`}>公开提交</span>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className={`text-sm ${theme.muted}`}>API Key</span>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                  placeholder="sk-..."
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none transition ${theme.input}`}
                  required
                />
              </label>

              <label className="block">
                <span className={`text-sm ${theme.muted}`}>URL</span>
                <input
                  value={form.url}
                  onChange={(event) => setForm({ ...form, url: event.target.value })}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none transition ${theme.input}`}
                  required
                />
              </label>

              <label className="block">
                <span className={`text-sm ${theme.muted}`}>Model Name</span>
                <input
                  value={form.modelName}
                  onChange={(event) => setForm({ ...form, modelName: event.target.value })}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none transition ${theme.input}`}
                  required
                />
              </label>

              <label className="block">
                <span className={`text-sm ${theme.muted}`}>Test Prompt</span>
                <textarea
                  value={form.prompt}
                  onChange={(event) => setForm({ ...form, prompt: event.target.value })}
                  rows={5}
                  className={`mt-2 w-full resize-none rounded-2xl border px-4 py-3 outline-none transition ${theme.input}`}
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={`text-sm ${theme.muted}`}>并发数</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.concurrency}
                    onChange={(event) => setForm({ ...form, concurrency: Number(event.target.value) })}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none transition ${theme.input}`}
                    required
                  />
                </label>

                <label className="block">
                  <span className={`text-sm ${theme.muted}`}>总批次数</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={form.totalRequests}
                    onChange={(event) => setForm({ ...form, totalRequests: Number(event.target.value) })}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 outline-none transition ${theme.input}`}
                    required
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className={`mt-7 w-full rounded-2xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed ${theme.button}`}
            >
              {isRunning ? "测速发布中..." : "开始测速并发布结果"}
            </button>

            {error && <p className={`mt-4 rounded-2xl border p-4 text-sm ${theme.errorBox}`}>{error}</p>}
          </form>

          <div className="space-y-6">
            <section className={`rounded-3xl border p-6 ${theme.panel}`}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">透明执行代码</h2>
                <span className={`rounded-full border px-3 py-1 text-xs ${theme.ghostPill}`}>API Key 已隐藏</span>
              </div>
              <pre className={`max-h-[28rem] overflow-auto rounded-2xl p-4 text-sm leading-6 ${theme.code}`}>
                <code>{codePreview}</code>
              </pre>
            </section>

            <section className={`rounded-3xl border p-6 ${theme.panel}`}>
              <h2 className="text-xl font-semibold">本次性能报告</h2>
              {!result && !isRunning && <p className={`mt-4 ${theme.softMuted}`}>尚未开始测试。</p>}
              {isRunning && <p className={`mt-4 ${theme.running}`}>正在按并发数执行请求，请稍等...</p>}
              {result && (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Metric label="总耗时" value={`${formatNumber(result.totalTime)} 秒`} theme={theme} />
                    <Metric label="成功 / 失败" value={`${result.successCount} / ${result.failureCount}`} theme={theme} />
                    <Metric label="总 Token" value={String(result.totalTokens)} theme={theme} />
                    <Metric label="TPS" value={formatNumber(result.tps)} theme={theme} />
                    <Metric label="Tokens/s" value={formatNumber(result.tokensPerSecond)} theme={theme} />
                    <Metric label="平均延迟" value={`${formatNumber(result.averageLatency)} 秒`} theme={theme} />
                    <Metric label="最短延迟" value={`${formatNumber(result.minLatency)} 秒`} theme={theme} />
                    <Metric label="最长延迟" value={`${formatNumber(result.maxLatency)} 秒`} theme={theme} />
                    <Metric label="实际并发 / 批次" value={`${result.appliedConcurrency} / ${result.appliedTotalRequests}`} theme={theme} />
                  </div>

                  {result.errors.length > 0 && (
                    <div className={`rounded-2xl border p-4 ${theme.errorPanel}`}>
                      <p className="font-semibold text-red-500">错误详情（前 3 个）</p>
                      <ul className={`mt-3 space-y-2 text-sm ${theme.errorText}`}>
                        {result.errors.map((item, index) => (
                          <li key={`${index}-${item}`} className="break-words">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, theme }: { label: string; value: string; theme: (typeof themeStyles)[ThemeName] }) {
  return (
    <div className={`rounded-2xl border p-4 ${theme.metric}`}>
      <p className={`text-xs uppercase tracking-[0.18em] ${theme.metricLabel}`}>{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${theme.metricValue}`}>{value}</p>
    </div>
  );
}

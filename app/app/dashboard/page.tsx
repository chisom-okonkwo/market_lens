const topMetrics = [
  {
    label: "AI visibility score",
    value: "67%",
    delta: "+8% vs last month",
    deltaTone: "text-emerald-400",
  },
  {
    label: "Prompts monitored",
    value: "12,420",
    delta: "+1,840 this week",
    deltaTone: "text-lime-400",
  },
  {
    label: "Hallucinations detected",
    value: "14",
    delta: "3 unresolved - high severity",
    deltaTone: "text-rose-400",
  },
  {
    label: "AI-driven referral traffic",
    value: "9,340",
    delta: "+22% vs last month",
    deltaTone: "text-emerald-400",
  },
] as const;

const trendMonths = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] as const;

const trendSeries = [
  { label: "Your brand", color: "#10b981", values: [43, 47, 50, 58, 63, 67] },
  { label: "Amazon", color: "#a1a1aa", values: [74, 73, 75, 74, 73, 74] },
  { label: "Competitor A", color: "#8b5cf6", values: [69, 68, 67, 66, 65, 74] },
  { label: "Competitor B", color: "#f59e0b", values: [38, 39, 40, 38, 37, 39] },
] as const;

const trendAnnotations = [
  { monthIndex: 1, label: "Schema markup added" },
  { monthIndex: 3, label: "Hallucinations resolved (x3)" },
  { monthIndex: 4, label: "Wirecutter content published" },
] as const;

const shareOfVoiceRows = [
  { label: "Your brand", value: 67, tone: "bg-emerald-400" },
  { label: "Amazon", value: 74, tone: "bg-zinc-400" },
  { label: "Competitor A", value: 51, tone: "bg-zinc-500" },
  { label: "Competitor B", value: 39, tone: "bg-zinc-600" },
] as const;

const alerts = [
  {
    source: "ChatGPT",
    summary: "'Brand X charges 3% foreign transaction fees' - actual policy: no foreign fees",
    meta: "Detected 2h ago - Perplexity - HIGH - Claim ID #4821",
    tone: "border-rose-500/70 bg-rose-950/60 text-rose-100",
    dot: "bg-rose-300",
  },
  {
    source: "Google AI",
    summary: "'Product Y has 8-hour battery' - actual spec: 14 hours",
    meta: "Detected 5h ago - Google AI Overviews - HIGH - Claim ID #4798",
    tone: "border-rose-500/70 bg-rose-950/50 text-rose-100",
    dot: "bg-rose-300",
  },
  {
    source: "Perplexity",
    summary: "Price listed as $120 - current price: $109",
    meta: "Detected 1d ago - Perplexity - MEDIUM - Claim ID #4750",
    tone: "border-amber-500/70 bg-amber-950/50 text-amber-100",
    dot: "bg-amber-300",
  },
] as const;

const topDomains = [
  { domain: "wirecutter.com", impact: "High influence", tone: "bg-rose-500/20 text-rose-300" },
  { domain: "reddit.com/r/DIY", impact: "High influence", tone: "bg-rose-500/20 text-rose-300" },
  { domain: "amazon.com", impact: "Medium", tone: "bg-amber-500/20 text-amber-300" },
  { domain: "yourbrand.com", impact: "Medium", tone: "bg-amber-500/20 text-amber-300" },
  { domain: "competitor-blog.com", impact: "Low", tone: "bg-emerald-500/20 text-emerald-300" },
] as const;

const categoryBreakdown = [
  { label: "Power tools", value: 71, tone: "bg-violet-500" },
  { label: "Hand tools", value: 58, tone: "bg-indigo-500" },
  { label: "Appliances", value: 31, tone: "bg-rose-500" },
  { label: "Smart home", value: 19, tone: "bg-red-500" },
] as const;

function Panel({
  title,
  children,
  className = "",
}: Readonly<{
  title: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={[
        "rounded-3xl border border-white/10 bg-zinc-900/70 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur",
        className,
      ].join(" ")}
    >
      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      {children}
    </section>
  );
}

function ProgressRow({
  label,
  value,
  tone,
}: Readonly<{
  label: string;
  value: number;
  tone: string;
}>) {
  return (
    <div className="grid grid-cols-[100px_1fr_44px] items-center gap-3 text-sm">
      <span className="font-medium text-zinc-200">{label}</span>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-right font-semibold text-zinc-300">{value}%</span>
    </div>
  );
}

function TrendChart() {
  const chartWidth = 900;
  const chartHeight = 290;
  const leftPadding = 44;
  const rightPadding = 22;
  const topPadding = 42;
  const bottomPadding = 42;
  const minValue = 20;
  const maxValue = 90;
  const innerWidth = chartWidth - leftPadding - rightPadding;
  const innerHeight = chartHeight - topPadding - bottomPadding;
  const stepX = innerWidth / (trendMonths.length - 1);
  const yTicks = [20, 30, 40, 50, 60, 70, 80, 90];

  const xForIndex = (index: number) => leftPadding + index * stepX;
  const yForValue = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    return topPadding + innerHeight - ratio * innerHeight;
  };

  const buildPath = (values: readonly number[]) =>
    values
      .map((value, index) => `${index === 0 ? "M" : "L"} ${xForIndex(index)} ${yForValue(value)}`)
      .join(" ");

  return (
    <Panel title="Share of voice trend" className="mt-4 overflow-hidden p-0">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-300">
          {trendSeries.map((series) => (
            <div key={series.label} className="flex items-center gap-2">
              <span
                className="h-0.5 w-6 rounded-full"
                style={{ backgroundColor: series.color }}
                aria-hidden="true"
              />
              <span>{series.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="h-0 w-6 border-t border-dashed border-rose-500" aria-hidden="true" />
            <span>Event annotation</span>
          </div>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full" role="img" aria-label="Share of voice trend chart">
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={leftPadding}
                x2={chartWidth - rightPadding}
                y1={yForValue(tick)}
                y2={yForValue(tick)}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <text
                x={leftPadding - 10}
                y={yForValue(tick) + 4}
                textAnchor="end"
                fontSize="12"
                fill="rgba(244,244,245,0.6)"
              >
                {tick}%
              </text>
            </g>
          ))}

          {trendMonths.map((month, index) => (
            <text
              key={month}
              x={xForIndex(index)}
              y={chartHeight - 12}
              textAnchor="middle"
              fontSize="12"
              fill="rgba(244,244,245,0.6)"
            >
              {month}
            </text>
          ))}

          {trendAnnotations.map((annotation) => (
            <g key={`${annotation.label}-${annotation.monthIndex}`}>
              <line
                x1={xForIndex(annotation.monthIndex)}
                x2={xForIndex(annotation.monthIndex)}
                y1={topPadding}
                y2={chartHeight - bottomPadding}
                stroke="rgba(244,63,94,0.85)"
                strokeDasharray="5 5"
                strokeWidth="1"
              />
              <text
                x={xForIndex(annotation.monthIndex)}
                y={topPadding - 10}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(251,113,133,0.95)"
              >
                {annotation.label}
              </text>
            </g>
          ))}

          {trendSeries.map((series) => (
            <g key={series.label}>
              <path
                d={buildPath(series.values)}
                fill="none"
                stroke={series.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {series.values.map((value, index) => (
                <circle
                  key={`${series.label}-${trendMonths[index]}`}
                  cx={xForIndex(index)}
                  cy={yForValue(value)}
                  r="4.5"
                  fill={series.color}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
    </Panel>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(237,171,90,0.12),_transparent_28%),linear-gradient(180deg,_#171717_0%,_#0b0b0b_100%)] px-4 py-8 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">
              Market Lens dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              AI visibility and hallucination monitoring
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
              Placeholder dashboard for the future reporting view. Data shown here is static for now,
              but the layout is ready for real analytics later.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
             <a href="/" className="font-medium text-white">Try custom prompt</a>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {topMetrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur"
            >
              <p className="text-sm font-medium text-zinc-400">{metric.label}</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-white">{metric.value}</p>
              <p className={`mt-2 text-sm font-medium ${metric.deltaTone}`}>{metric.delta}</p>
            </article>
          ))}
        </section>

        <TrendChart />

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Panel title="Share of voice - AI recommendations" className="min-h-[375px]">
            <div className="mt-6 space-y-4">
              {shareOfVoiceRows.map((row) => (
                <ProgressRow key={row.label} label={row.label} value={row.value} tone={row.tone} />
              ))}
            </div>

            <button
              type="button"
              className="mt-8 w-full rounded-2xl border border-white/12 bg-white/3 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/7"
            >
              Drill down by category
            </button>
          </Panel>

          <Panel title="Active hallucination alerts" className="min-h-[375px]">
            <div className="mt-6 space-y-3">
              {alerts.map((alert) => (
                <article key={`${alert.source}-${alert.summary}`} className={`rounded-2xl border p-4 ${alert.tone}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${alert.dot}`} />
                    <div>
                      <p className="text-sm font-semibold leading-6">{alert.source}: {alert.summary}</p>
                      <p className="mt-1 text-xs leading-5 text-inherit/80">{alert.meta}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-2xl border border-white/12 bg-white/3 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/7"
            >
              View all alerts and fix actions
            </button>
          </Panel>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Panel title="Top influencing domains">
            <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/8 bg-white/[0.02] px-4">
              {topDomains.map((row) => (
                <div key={row.domain} className="flex items-center justify-between gap-4 py-4">
                  <span className="text-sm font-medium text-zinc-200">{row.domain}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.tone}`}>
                    {row.impact}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-2xl border border-white/12 bg-white/3 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/7"
            >
              Improve domain influence
            </button>
          </Panel>

          <Panel title="Category visibility breakdown">
            <div className="mt-6 space-y-4">
              {categoryBreakdown.map((row) => (
                <ProgressRow key={row.label} label={row.label} value={row.value} tone={row.tone} />
              ))}
            </div>

            <button
              type="button"
              className="mt-8 w-full rounded-2xl border border-white/12 bg-white/3 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/7"
            >
              Fix weak categories
            </button>
          </Panel>
        </section>
      </div>
    </main>
  );
}
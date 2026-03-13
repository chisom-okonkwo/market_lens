"use client";

import { useMemo, useState, type CSSProperties } from "react";

export interface DashboardClientProps {
  businessName: string;
  businessLocation: string;
  lastScanLabel: string;
  kpis: Array<{
    label: string;
    value: string;
    delta: string;
    tone: "up" | "down" | "warn" | "neutral";
  }>;
  overview: {
    visibilityScore: number;
    visibilityLabel: string;
    visibilityTitle: string;
    visibilityBody: string;
    platformMetrics: Array<{ name: string; value: number; color: string }>;
    hallucinationTitle: string;
    hallucinationAlerts: Array<{
      summary: string;
      meta: string;
      severity: "low" | "medium" | "high";
    }>;
    shareOfVoice: Array<{ label: string; value: number; color: string }>;
    visibilityTrend: {
      labels: string[];
      yourSeries: number[];
      competitorSeries: number[];
    };
    priorityActions: Array<{
      title: string;
      body: string;
      tone: "danger" | "warning" | "info";
    }>;
    categoryBreakdown: Array<{ name: string; value: number; color: string }>;
  };
  competitors: {
    cards: Array<{
      initials: string;
      name: string;
      score: number;
      color: string;
      accentBackground: string;
      accentText: string;
      tags: string[];
      why: string;
      action: string;
    }>;
    tactics: string[];
  };
  improvements: {
    critical: Array<{ title: string; body: string; impact: string }>;
    recommended: Array<{ title: string; body: string; impact: string }>;
    projectedImpact: string;
    projectedBody: string;
  };
  content: {
    keywords: Array<{
      term: string;
      leader: string;
      leaderTone: "blue" | "amber" | "pink";
      volume: number;
      gap: string;
    }>;
    products: Array<{ rank: number; name: string; appearance: number }>;
    ideas: Array<{
      tag: string;
      tone: "info" | "warning";
      title: string;
      body: string;
    }>;
  };
  sources: {
    countLabel: string;
    sources: Array<{
      name: string;
      type: string;
      score: number;
      badgeTone: "warn" | "info" | "good" | "muted";
      actionLabel: string;
    }>;
    budget: Array<{ label: string; amount: string; value: number; color: string }>;
    budgetOutcome: string;
  };
  topInfluencingDomains: Array<{
    domain: string;
    impact: string;
    tone: string;
  }>;
}

type DashboardTab = "overview" | "competitors" | "improvements" | "content" | "sources";

const tabLabels: Array<{ id: DashboardTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "competitors", label: "Competitors" },
  { id: "improvements", label: "Site improvements" },
  { id: "content", label: "Content planning" },
  { id: "sources", label: "Ad sources" },
];

function toneClasses(tone: DashboardClientProps["kpis"][number]["tone"]): string {
  if (tone === "up") {
    return "text-emerald-600";
  }

  if (tone === "down") {
    return "text-rose-600";
  }

  if (tone === "warn") {
    return "text-amber-600";
  }

  return "text-slate-500";
}

function severityClasses(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "bg-rose-500";
  }

  if (severity === "medium") {
    return "bg-amber-500";
  }

  return "bg-emerald-500";
}

function sourceBadgeClasses(tone: DashboardClientProps["sources"]["sources"][number]["badgeTone"]): string {
  if (tone === "warn") {
    return "bg-rose-100 text-rose-700";
  }

  if (tone === "info") {
    return "bg-amber-100 text-amber-700";
  }

  if (tone === "good") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-600";
}

function keywordToneClasses(tone: DashboardClientProps["content"]["keywords"][number]["leaderTone"]): string {
  if (tone === "blue") {
    return "bg-blue-100 text-blue-700";
  }

  if (tone === "amber") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-pink-100 text-pink-700";
}

function ideaToneClasses(tone: DashboardClientProps["content"]["ideas"][number]["tone"]): string {
  return tone === "info" ? "text-sky-700" : "text-amber-700";
}

function priorityToneClasses(tone: DashboardClientProps["overview"]["priorityActions"][number]["tone"]): string {
  if (tone === "danger") {
    return "border-rose-500 bg-rose-50 text-rose-700";
  }

  if (tone === "warning") {
    return "border-amber-500 bg-amber-50 text-amber-700";
  }

  return "border-sky-500 bg-sky-50 text-sky-700";
}

function buildConicGradient(segments: DashboardClientProps["overview"]["shareOfVoice"]): string {
  let current = 0;
  const stops = segments.map((segment) => {
    const start = current;
    current += segment.value;
    return `${segment.color} ${start}% ${current}%`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildRingStyle(score: number, color: string): CSSProperties {
  return {
    background: `conic-gradient(${color} 0% ${score}%, #e2e8f0 ${score}% 100%)`,
  };
}

function buildLinePath(values: number[], width: number, height: number, padding: number): string {
  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 100);
  const minValue = Math.min(...values, 0);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const stepX = values.length === 1 ? 0 : innerWidth / (values.length - 1);
  const span = Math.max(1, maxValue - minValue);

  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const ratio = (value - minValue) / span;
      const y = padding + innerHeight - ratio * innerHeight;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function LineChart({
  labels,
  yourSeries,
  competitorSeries,
}: DashboardClientProps["overview"]["visibilityTrend"]) {
  const width = 360;
  const height = 140;
  const padding = 22;
  const yourPath = buildLinePath(yourSeries, width, height, padding);
  const competitorPath = buildLinePath(competitorSeries, width, height, padding);
  const stepX = labels.length > 1 ? (width - padding * 2) / (labels.length - 1) : 0;

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" aria-label="Visibility trend chart" role="img">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding + ((100 - tick) / 100) * (height - padding * 2);
          return (
            <line
              key={tick}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}
        <path d={competitorPath} fill="none" stroke="#3b82f6" strokeDasharray="5 4" strokeWidth="2" />
        <path d={yourPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
        {yourSeries.map((value, index) => {
          const x = padding + index * stepX;
          const y = padding + ((100 - value) / 100) * (height - padding * 2);
          return <circle key={`${value}-${labels[index]}`} cx={x} cy={y} r="3" fill="#10b981" />;
        })}
      </svg>
      <div className="flex justify-between text-[11px] font-medium text-slate-400">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({
  segments,
  centerLabel,
}: {
  segments: DashboardClientProps["overview"]["shareOfVoice"];
  centerLabel?: string;
}) {
  const background = useMemo(() => buildConicGradient(segments), [segments]);

  return (
    <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background }}>
      <div className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-center shadow-inner">
        <span className="font-mono text-lg font-semibold text-slate-900">{centerLabel ?? ""}</span>
      </div>
    </div>
  );
}

function BudgetDonut({ budget }: { budget: DashboardClientProps["sources"]["budget"] }) {
  const total = budget.reduce((sum, item) => sum + item.value, 0);
  const background = useMemo(() => {
    let current = 0;
    return `conic-gradient(${budget
      .map((item) => {
        const start = current;
        current += (item.value / Math.max(total, 1)) * 100;
        return `${item.color} ${start}% ${current}%`;
      })
      .join(", ")})`;
  }, [budget, total]);

  return (
    <div className="relative h-40 w-40 rounded-full" style={{ background }}>
      <div className="absolute inset-6 flex items-center justify-center rounded-full bg-white text-center shadow-inner">
        <div>
          <div className="font-mono text-xl font-semibold text-slate-900">$600</div>
          <div className="text-[11px] text-slate-500">monthly budget</div>
        </div>
      </div>
    </div>
  );
}

function DashboardClient(props: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8"
      style={{ fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-lg font-bold tracking-[-0.03em] text-slate-950">
              AI<span className="text-emerald-500">sight</span>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
              {props.businessName} - {props.businessLocation}
            </div>
            <div className="font-mono text-[11px] text-slate-500">{props.lastScanLabel}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1.5">
            {tabLabels.map((tab) => {
              const isActive = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {props.kpis.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
            >
              <div className="font-mono text-[28px] font-semibold tracking-[-0.04em] text-slate-950">
                {metric.value}
              </div>
              <div className="mt-1 text-xs text-slate-500">{metric.label}</div>
              <div className={`mt-1 text-xs font-medium ${toneClasses(metric.tone)}`}>{metric.delta}</div>
            </article>
          ))}
        </section>

        {activeTab === "overview" ? (
          <section data-testid="dashboard-overview">
            <div className="mb-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">AI visibility score</h2>
                  <span className="font-mono text-[11px] text-slate-500">vs 4 platforms</span>
                </div>
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="relative h-[88px] w-[88px] rounded-full p-[7px]" style={buildRingStyle(props.overview.visibilityScore, "#10b981")}>
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white font-mono text-xl font-semibold text-slate-950">
                      {props.overview.visibilityLabel}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-950">{props.overview.visibilityTitle}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{props.overview.visibilityBody}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {props.overview.platformMetrics.map((platform) => (
                    <div key={platform.name} className="flex items-center gap-3 rounded-xl bg-slate-100/90 px-3 py-2.5">
                      <div className="w-20 text-[11px] text-slate-500">{platform.name}</div>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${platform.value}%`, backgroundColor: platform.color }}
                        />
                      </div>
                      <div className="w-8 text-right font-mono text-[11px] text-slate-900">{platform.value}%</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Hallucination alerts</h2>
                  <span className="font-mono text-[11px] text-slate-500">{props.overview.hallucinationTitle}</span>
                </div>
                <div className="space-y-3">
                  {props.overview.hallucinationAlerts.map((alert) => (
                    <div key={`${alert.summary}-${alert.meta}`} className="flex gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityClasses(alert.severity)}`} />
                      <div>
                        <div className="text-sm leading-6 text-slate-900">{alert.summary}</div>
                        <div className="mt-1 text-xs text-slate-500">{alert.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Fix all hallucinations
                </button>
              </section>
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Share of voice</h2>
                  <span className="font-mono text-[11px] text-slate-500">same tracked prompt set</span>
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <DonutChart segments={props.overview.shareOfVoice} centerLabel="29%" />
                  <div className="flex-1 space-y-2 text-xs text-slate-600">
                    {props.overview.shareOfVoice.map((segment) => (
                      <div key={segment.label} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: segment.color }} />
                          <span>{segment.label}</span>
                        </div>
                        <span className="font-mono text-slate-900">{segment.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Visibility trend - 6 weeks</h2>
                </div>
                <LineChart {...props.overview.visibilityTrend} />
              </section>
            </div>

            <section className="mb-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-4 text-sm font-semibold text-slate-900">This week's priority actions</div>
              <div className="grid gap-3 lg:grid-cols-3">
                {props.overview.priorityActions.map((action) => (
                  <article
                    key={action.title}
                    className={`border-l-[3px] px-4 py-3 ${priorityToneClasses(action.tone)}`}
                  >
                    <div className="text-sm font-semibold">{action.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-600">{action.body}</div>
                  </article>
                ))}
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Top influencing domains</h2>
                  <span className="font-mono text-[11px] text-slate-500">live sources</span>
                </div>
                <div className="space-y-2.5">
                  {props.topInfluencingDomains.map((domain) => (
                    <div key={domain.domain} className="flex items-center justify-between gap-4 rounded-xl bg-slate-100/90 px-3 py-3">
                      <span className="text-sm text-slate-900">{domain.domain}</span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${domain.tone}`}>
                        {domain.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 text-sm font-semibold text-slate-900">Category visibility breakdown</div>
                <div className="space-y-3">
                  {props.overview.categoryBreakdown.map((row) => (
                    <div key={row.name} className="grid grid-cols-[90px_1fr_38px] items-center gap-3 text-sm">
                      <span className="text-slate-500">{row.name}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full" style={{ width: `${row.value}%`, backgroundColor: row.color }} />
                      </div>
                      <span className="text-right font-mono text-[11px] text-slate-500">{row.value}%</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Fix weak categories
                </button>
              </section>
            </div>
          </section>
        ) : null}

        {activeTab === "competitors" ? (
          <section data-testid="dashboard-competitors">
            <div className="mb-4 text-sm text-slate-500">
              Why these competitors outrank you - and what specific tactics are driving it.
            </div>
            <div className="mb-4 grid gap-4 xl:grid-cols-3">
              {props.competitors.cards.map((card) => (
                <article key={card.name} className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ backgroundColor: card.accentBackground, color: card.accentText }}
                    >
                      {card.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{card.name}</div>
                      <div className="text-[11px] text-slate-500">AI visibility: {card.score}%</div>
                    </div>
                  </div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full" style={{ width: `${card.score}%`, backgroundColor: card.color }} />
                    </div>
                    <span className="font-mono text-sm font-semibold" style={{ color: card.color }}>
                      {card.score}%
                    </span>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="border-l-2 border-slate-200 pl-3 text-sm leading-6 text-slate-500">{card.why}</p>
                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    {card.action}
                  </button>
                </article>
              ))}
            </div>

            <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-4 text-sm font-semibold text-slate-900">
                Competitor tactics you can replicate this month
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {props.competitors.tactics.map((tactic) => (
                  <article key={tactic} className="rounded-2xl bg-slate-100/90 px-4 py-3 text-sm leading-6 text-slate-600">
                    {tactic}
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "improvements" ? (
          <section data-testid="dashboard-improvements">
            <div className="mb-4 text-sm text-slate-500">
              Technical and content gaps on your site that reduce how often AI systems cite you.
            </div>
            <div className="mb-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Critical fixes</h2>
                  <span className="text-xs font-semibold text-rose-600">{props.improvements.critical.length} issues</span>
                </div>
                <div className="space-y-4">
                  {props.improvements.critical.map((item) => (
                    <article key={item.title} className="flex items-start gap-3 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-xs">!!</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.body}</div>
                      </div>
                      <div className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700">{item.impact}</div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Recommended improvements</h2>
                  <span className="text-xs font-semibold text-amber-600">{props.improvements.recommended.length} items</span>
                </div>
                <div className="space-y-4">
                  {props.improvements.recommended.map((item) => (
                    <article key={item.title} className="flex items-start gap-3 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs">!</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.body}</div>
                      </div>
                      <div className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">{item.impact}</div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Total estimated impact if all fixes applied</div>
                  <div className="mt-1 text-xs text-slate-500">cumulative, 90 days</div>
                </div>
                <div className="font-mono text-4xl font-semibold tracking-[-0.04em] text-emerald-600">{props.improvements.projectedImpact}</div>
              </div>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="max-w-3xl text-sm leading-6 text-slate-500">{props.improvements.projectedBody}</p>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Get implementation guide
                </button>
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "content" ? (
          <section data-testid="dashboard-content">
            <div className="mb-4 grid gap-4 xl:grid-cols-3">
              <section className="xl:col-span-2 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">High-performing SEO keywords from competitors</h2>
                  <span className="font-mono text-[11px] text-slate-500">observed from prompt analysis</span>
                </div>
                <div className="mb-2 grid grid-cols-[1fr_84px_60px_52px] gap-3 border-b border-slate-200 pb-2 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <span>Keyword phrase</span>
                  <span>Leader</span>
                  <span>AI volume</span>
                  <span className="text-right">Gap</span>
                </div>
                <div className="space-y-2">
                  {props.content.keywords.map((keyword) => (
                    <div key={keyword.term} className="grid grid-cols-[1fr_84px_60px_52px] items-center gap-3 border-b border-slate-200 py-2 last:border-b-0">
                      <span className="text-sm font-medium text-slate-900">{keyword.term}</span>
                      <span className={`inline-flex w-fit rounded-md px-2 py-1 text-[10px] font-semibold ${keywordToneClasses(keyword.leaderTone)}`}>
                        {keyword.leader}
                      </span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-slate-500" style={{ width: `${keyword.volume}%` }} />
                      </div>
                      <span className="text-right text-[10px] font-medium text-slate-500">{keyword.gap}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Generate content brief
                </button>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Top product rankings</h2>
                  <span className="font-mono text-[11px] text-slate-500">by AI appearance rate</span>
                </div>
                <div className="space-y-2">
                  {props.content.products.map((product) => (
                    <div key={product.name} className="grid grid-cols-[24px_1fr_64px_40px] items-center gap-3 border-b border-slate-200 py-2 last:border-b-0">
                      <span className="font-mono text-[11px] text-slate-500">#{product.rank}</span>
                      <span className="text-sm font-medium text-slate-900">{product.name}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${product.appearance}%`,
                            backgroundColor:
                              product.appearance >= 60 ? "#10b981" : product.appearance >= 30 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{product.appearance}%</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Fix low-ranked products
                </button>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Suggested content to publish this month</h2>
                <span className="font-mono text-[11px] text-slate-500">based on prompt analysis</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {props.content.ideas.map((idea) => (
                  <article key={idea.title} className="rounded-2xl bg-slate-100/90 px-4 py-4">
                    <div className={`mb-2 text-[10px] font-semibold ${ideaToneClasses(idea.tone)}`}>{idea.tag}</div>
                    <div className="text-sm font-semibold text-slate-900">{idea.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{idea.body}</div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "sources" ? (
          <section data-testid="dashboard-sources">
            <div className="mb-4 text-sm text-slate-500">
              Where AI gets its data about your category - ranked by influence. Advertise where the score is highest.
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Sources by influence score</h2>
                  <span className="font-mono text-[11px] text-slate-500">{props.sources.countLabel} total found</span>
                </div>
                <div className="space-y-3">
                  {props.sources.sources.map((source) => (
                    <div key={source.name} className="flex items-center gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-700">
                        {source.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{source.name}</div>
                        <div className="text-xs text-slate-500">{source.type}</div>
                      </div>
                      <div className="font-mono text-sm font-semibold text-slate-900">{source.score}</div>
                      <button
                        type="button"
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${sourceBadgeClasses(source.badgeTone)}`}
                      >
                        {source.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Recommended ad budget allocation</h2>
                  <span className="font-mono text-[11px] text-slate-500">of $600/mo AI budget</span>
                </div>
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <BudgetDonut budget={props.sources.budget} />
                  <div className="flex-1 space-y-2">
                    {props.sources.budget.map((item) => (
                      <div key={item.label} className="flex items-center justify-between border-b border-slate-200 py-2 last:border-b-0">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-mono text-sm font-semibold text-slate-900">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                  {props.sources.budgetOutcome}
                </div>
              </section>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default DashboardClient;
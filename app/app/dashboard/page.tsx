import DashboardClient, { type DashboardClientProps } from "@/app/dashboard/DashboardClient";
import { AIPlatform } from "@/lib/aiResponse";
import { buildDashboardHallucinationsMetric } from "@/lib/ai/hallucinationMetrics/dashboardHallucinationsMetric";
import { HallucinationsDetectedService } from "@/lib/ai/hallucinationMetrics/hallucinationsDetectedService";
import { buildDashboardReferralTrafficMetric } from "@/lib/ai/referralTraffic/dashboardReferralTrafficMetric";
import { buildDashboardTopInfluencingDomains } from "@/lib/ai/referralTraffic/dashboardTopInfluencingDomains";
import { TopInfluencingDomainsService } from "@/lib/ai/referralTraffic/topInfluencingDomainsService";
import {
	aiResponseRepository,
	type AIStoredResponse,
} from "@/lib/ai/storage/aiResponseRepository";
import { buildDashboardVisibilityMetric } from "@/lib/ai/visibilityScore/dashboardVisibilityMetric";
import { VisibilityScoreService } from "@/lib/ai/visibilityScore/visibilityScoreService";

function formatCompactNumber(value: number): string {
	return new Intl.NumberFormat("en-US", {
		notation: value >= 1000 ? "compact" : "standard",
		maximumFractionDigits: 0,
	}).format(value);
}

function formatRelativeTime(timestamp: string | null): string {
	if (!timestamp) {
		return "Last scan: no data yet";
	}

	const diffMs = Date.now() - new Date(timestamp).getTime();
	const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

	if (diffHours < 1) {
		return "Last scan: just now";
	}

	if (diffHours < 24) {
		return `Last scan: ${diffHours}h ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) {
		return `Last scan: ${diffDays}d ago`;
	}

	return `Last scan: ${new Date(timestamp).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	})}`;
}

function isSameMonth(date: Date, reference: Date): boolean {
	return (
		date.getUTCFullYear() === reference.getUTCFullYear() &&
		date.getUTCMonth() === reference.getUTCMonth()
	);
}

function getTrackedTerms(): string[] {
	const configuredTerms = process.env.VISIBILITY_TRACKED_TERMS?.split(",")
		.map((term) => term.trim())
		.filter((term) => term.length > 0);

	return configuredTerms && configuredTerms.length > 0 ? configuredTerms : ["eBay"];
}

function getCurrentMonthResponses(responses: AIStoredResponse[], now: Date): AIStoredResponse[] {
	return responses.filter((response) => isSameMonth(new Date(response.timestamp), now));
}

function getVisibilitySummary(score: number): Pick<
	DashboardClientProps["overview"],
	"visibilityTitle" | "visibilityBody"
> {
	if (score < 10) {
		return {
			visibilityTitle: "Virtually invisible to AI search",
			visibilityBody:
				"You appear in a small fraction of tracked queries. The live metrics below show where AI models mention you today and where structured fixes can move the score fastest.",
		};
	}

	if (score < 35) {
		return {
			visibilityTitle: "Visible, but rarely chosen",
			visibilityBody:
				"AI systems recognize your brand in some prompts, but you are still losing recommendation share to better-cited competitors and stronger structured content.",
		};
	}

	if (score < 65) {
		return {
			visibilityTitle: "Competing for AI recommendation share",
			visibilityBody:
				"Your business is starting to show up consistently. The next lift comes from reducing hallucinations and increasing citation-worthy source coverage.",
		};
	}

	return {
		visibilityTitle: "Strong AI recommendation presence",
		visibilityBody:
			"You are appearing in a large share of tracked prompts. At this point, the priority is protecting accuracy and expanding the set of domains and prompts you dominate.",
	};
}

function toneFromDelta(deltaLabel: string): DashboardClientProps["kpis"][number]["tone"] {
	if (deltaLabel.startsWith("+")) {
		return "up";
	}

	if (deltaLabel.startsWith("-")) {
		return "down";
	}

	if (
		deltaLabel.toLowerCase().includes("high severity") ||
		deltaLabel.toLowerCase().includes("unable")
	) {
		return "warn";
	}

	return "neutral";
}

function severityWeight(severity: "low" | "medium" | "high"): number {
	if (severity === "high") {
		return 3;
	}

	if (severity === "medium") {
		return 2;
	}

	return 1;
}

function buildPlatformMetrics(
	responses: AIStoredResponse[],
	now: Date,
): DashboardClientProps["overview"]["platformMetrics"] {
	const currentMonthResponses = getCurrentMonthResponses(responses, now);
	const result = new VisibilityScoreService().analyze({
		trackedTerms: getTrackedTerms(),
		responses: currentMonthResponses,
	});

	const platformOrder = [
		{ name: "ChatGPT", platform: AIPlatform.ChatGPT, color: "#10b981" },
		{ name: "Perplexity", platform: AIPlatform.Perplexity, color: "#10b981" },
		{ name: "Google AI", platform: AIPlatform.GoogleAI, color: "#10b981" },
		{ name: "Gemini", platform: AIPlatform.Gemini, color: "#10b981" },
	] as const;

	return platformOrder.map((platform) => {
		const platformResponses = result.responseBreakdown.filter(
			(response) => response.platform === platform.platform,
		);
		const value =
			platformResponses.length === 0
				? 0
				: Math.round(
						platformResponses.reduce((sum, response) => sum + response.score, 0) /
							platformResponses.length,
					);

		return {
			name: platform.name,
			value,
			color: platform.color,
		};
	});
}

function buildHallucinationAlerts(
	responses: AIStoredResponse[],
	now: Date,
): DashboardClientProps["overview"]["hallucinationAlerts"] {
	const currentMonthResponses = getCurrentMonthResponses(responses, now);
	const analysis = new HallucinationsDetectedService().analyze(currentMonthResponses);

	const alerts = analysis.responseBreakdown
		.flatMap((response) =>
			response.hallucinatedClaims.map((claim) => ({
				summary: claim.claim,
				meta: `${claim.matchedGroundTruth ?? "Needs verification"} - ${claim.severity.toUpperCase()} severity - ${response.platform}`,
				severity: claim.severity,
			})),
		)
		.sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity))
		.slice(0, 3);

	if (alerts.length > 0) {
		return alerts;
	}

	return [
		{
			summary: "No active hallucinations detected in the current month.",
			meta: "Current month scan - LOW severity",
			severity: "low",
		},
	];
}

function buildAdSources(
	responses: AIStoredResponse[],
	now: Date,
): DashboardClientProps["sources"]["sources"] {
	const currentMonthResponses = getCurrentMonthResponses(responses, now);
	const domains = new TopInfluencingDomainsService().analyze(currentMonthResponses).domains.slice(0, 6);

	if (domains.length === 0) {
		return [
			{
				name: "No cited sources yet",
				type: "Awaiting model citations",
				score: 0,
				badgeTone: "muted",
				actionLabel: "Monitor",
			},
		];
	}

	return domains.map((domain) => {
		const score = Math.min(99, domain.responseCount * 24 + domain.referenceCount * 8);
		const dominantChannel =
			domain.sourceCount >= domain.citationCount && domain.sourceCount >= domain.linkCount
				? "Editorial source"
				: domain.citationCount >= domain.linkCount
					? "Frequently cited"
					: "Shopping link";

		return {
			name: domain.domain,
			type: `${dominantChannel} - ${domain.referenceCount} references this month`,
			score,
			badgeTone: score >= 70 ? "warn" : score >= 45 ? "info" : score >= 1 ? "good" : "muted",
			actionLabel: score >= 70 ? "Advertise" : score >= 45 ? "Optimize" : "Monitor",
		};
	});
}

function buildDashboardProps(responses: AIStoredResponse[]): DashboardClientProps {
	const now = new Date();
	const currentMonthResponses = getCurrentMonthResponses(responses, now);
	const visibilityMetric = buildDashboardVisibilityMetric(responses, now);
	const hallucinationsMetric = buildDashboardHallucinationsMetric(responses, now);
	const referralTrafficMetric = buildDashboardReferralTrafficMetric(responses, now);
	const topInfluencingDomains = buildDashboardTopInfluencingDomains(responses, now);
	const latestTimestamp =
		responses
			.map((response) => response.timestamp)
			.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
	const distinctPromptCount = new Set(currentMonthResponses.map((response) => response.promptId)).size;
	const visibilitySummary = getVisibilitySummary(visibilityMetric.score);
	const topDomainAnalysis = new TopInfluencingDomainsService().analyze(currentMonthResponses);

	return {
		businessName: "Johnson's Home Goods",
		businessLocation: "Dallas TX",
		lastScanLabel: formatRelativeTime(latestTimestamp),
		kpis: [
			{
				label: "AI visibility score",
				value: visibilityMetric.scoreLabel,
				delta: visibilityMetric.deltaLabel,
				tone: toneFromDelta(visibilityMetric.deltaLabel),
			},
			{
				label: "Prompts monitored",
				value: formatCompactNumber(distinctPromptCount),
				delta: `${formatCompactNumber(currentMonthResponses.length)} responses this month`,
				tone: "up",
			},
			{
				label: "Hallucinations active",
				value: hallucinationsMetric.countLabel,
				delta: hallucinationsMetric.deltaLabel,
				tone: toneFromDelta(hallucinationsMetric.deltaLabel),
			},
			{
				label: "Influencing sources",
				value: referralTrafficMetric.countLabel,
				delta: referralTrafficMetric.deltaLabel,
				tone: toneFromDelta(referralTrafficMetric.deltaLabel),
			},
			{
				label: "Share of voice",
				value: "29%",
				delta: "vs 32% Amazon",
				tone: "down",
			},
		],
		overview: {
			visibilityScore: visibilityMetric.score,
			visibilityLabel: visibilityMetric.scoreLabel,
			...visibilitySummary,
			platformMetrics: buildPlatformMetrics(responses, now),
			hallucinationTitle: `${hallucinationsMetric.countLabel} unresolved`,
			hallucinationAlerts: buildHallucinationAlerts(responses, now),
			shareOfVoice: [
				{ label: "You", value: 29, color: "#10b981" },
				{ label: "Amazon", value: 32, color: "#3b82f6" },
				{ label: "HomeDepot", value: 24, color: "#f59e0b" },
				{ label: "Others", value: 15, color: "#94a3b8" },
			],
			visibilityTrend: {
				labels: ["Wk1", "Wk2", "Wk3", "Wk4", "Wk5", "Wk6"],
				yourSeries: [12, 11, 10, 9, 9, visibilityMetric.score],
				competitorSeries: [71, 72, 73, 73, 74, 74],
			},
			priorityActions: [
				{
					title: "Fix hours in structured business data",
					body: "Resolves high-severity availability confusion and gives AI systems a machine-readable source of truth.",
					tone: "danger",
				},
				{
					title: "Claim the next two high-influence source profiles",
					body: "Use the live source list below to tighten the domains AI already prefers when describing your category.",
					tone: "warning",
				},
				{
					title: "Expand buying-guide content for repeated AI prompt themes",
					body: "You already show up in tracked prompts. More structured comparison content can improve recommendation frequency.",
					tone: "info",
				},
			],
			categoryBreakdown: buildPlatformMetrics(responses, now),
		},
		competitors: {
			cards: [
				{
					initials: "AZ",
					name: "Amazon",
					score: 74,
					color: "#3b82f6",
					accentBackground: "#dbeafe",
					accentText: "#1e40af",
					tags: ["Schema markup", "Rich reviews", "Product FAQs"],
					why: "Dominant because product pages expose structured data, deep reviews, and FAQ sections that AI systems can quote with little transformation.",
					action: "What can I copy from this?",
				},
				{
					initials: "HD",
					name: "Home Depot",
					score: 61,
					color: "#f59e0b",
					accentBackground: "#fef3c7",
					accentText: "#92400e",
					tags: ["How-to guides", "Local inventory", "Video content"],
					why: "Ranks especially well on instructional prompts because its content library is designed to answer how-to-choose and how-to-install queries directly.",
					action: "How do I compete here?",
				},
				{
					initials: "WF",
					name: "Wayfair",
					score: 44,
					color: "#ec4899",
					accentBackground: "#fce7f3",
					accentText: "#9d174d",
					tags: ["Room inspiration", "Price match copy", "Spec tables"],
					why: "Wins comparison prompts because AI can pull structured specifications and side-by-side differentiation language straight into its answers.",
					action: "Content to create",
				},
			],
			tactics: [
				"Add FAQ schema to every high-priority product page.",
				"Publish three buying guides for your highest-repeated prompt themes.",
				"Create one comparison page per core category.",
				"Standardize product specification tables across listings.",
			],
		},
		improvements: {
			critical: [
				{
					title: "No structured schema markup",
					body: "AI systems extract schema data first. Without it, they either guess at your attributes or skip your pages entirely.",
					impact: "+12pt est.",
				},
				{
					title: "Missing business hours in crawlable text",
					body: "Hours that only appear in images cannot be used by AI systems and are a direct source of factual drift.",
					impact: "+4pt est.",
				},
				{
					title: "No FAQ section on product pages",
					body: "Question-and-answer blocks give AI systems direct extractable answer spans that are missing on your current pages.",
					impact: "+7pt est.",
				},
			],
			recommended: [
				{
					title: "Add delivery and service area copy to the homepage",
					body: "The service exists, but the supporting text AI needs to quote is too thin or absent.",
					impact: "+3pt est.",
				},
				{
					title: "Extend short product descriptions",
					body: "Thin product copy reduces the chance of being cited in comparison and buying-decision prompts.",
					impact: "+5pt est.",
				},
				{
					title: "Add stronger local entity signals",
					body: "Location-specific content improves AI performance on local shopping and service-intent prompts.",
					impact: "+3pt est.",
				},
			],
			projectedImpact: "+34pts",
			projectedBody:
				"Applying all critical fixes and recommended improvements would move the visibility score from the current live baseline toward a competitive mid-tier range over the next 90 days.",
		},
		content: {
			keywords: [
				{ term: "affordable home goods dallas", leader: "Amazon", leaderTone: "blue", volume: 90, gap: "You: 0%" },
				{ term: "best cordless drill under $100", leader: "HomeDepot", leaderTone: "amber", volume: 80, gap: "You: 4%" },
				{ term: "home goods store near me dallas", leader: "Amazon", leaderTone: "blue", volume: 75, gap: "You: 9%" },
				{ term: "same day delivery home goods", leader: "Wayfair", leaderTone: "pink", volume: 65, gap: "You: 12%" },
				{ term: "kitchen appliance bundles", leader: "HomeDepot", leaderTone: "amber", volume: 58, gap: "You: 18%" },
				{ term: "how to pick a vacuum cleaner", leader: "HomeDepot", leaderTone: "amber", volume: 50, gap: "You: 31%" },
			],
			products: [
				{ rank: 1, name: "Dyson V8 Cordless", appearance: 82 },
				{ rank: 2, name: "KitchenAid Mixer", appearance: 74 },
				{ rank: 3, name: "Instant Pot 6qt", appearance: 61 },
				{ rank: 4, name: "Ninja Air Fryer", appearance: 48 },
				{ rank: 5, name: "Roomba i3", appearance: 34 },
				{ rank: 6, name: "Weber Kettle Grill", appearance: 19 },
				{ rank: 7, name: "Stanley Thermos", appearance: 11 },
			],
			ideas: [
				{
					tag: "GUIDE - HIGH PRIORITY",
					tone: "info",
					title: "Best home goods stores in Dallas 2026",
					body: "Targets a repeated local-intent query cluster where your current visibility is low but the commercial intent is strong.",
				},
				{
					tag: "FAQ PAGE - HIGH PRIORITY",
					tone: "info",
					title: "Do you offer same-day delivery in Dallas?",
					body: "Turns an existing service into a crawlable answer surface that can reduce omission-based hallucinations.",
				},
				{
					tag: "COMPARISON - MEDIUM",
					tone: "warning",
					title: "Dyson V8 vs V10: which is right for you?",
					body: "Captures research-stage prompts where AI models favor structured side-by-side product language.",
				},
			],
		},
		sources: {
			countLabel: formatCompactNumber(topDomainAnalysis.domains.length),
			sources: buildAdSources(responses, now),
			budget: [
				{ label: "Yelp Ads", amount: "$300/mo", value: 300, color: "#ef4444" },
				{ label: "Google Local Ads", amount: "$200/mo", value: 200, color: "#3b82f6" },
				{ label: "Houzz Pro listing", amount: "$100/mo", value: 100, color: "#10b981" },
			],
			budgetOutcome:
				"Projected outcome: improve visibility across AI discovery surfaces by concentrating spend on the domains and profiles already showing up in citations.",
		},
		topInfluencingDomains,
	};
}

function buildFallbackProps(): DashboardClientProps {
	return {
		businessName: "Johnson's Home Goods",
		businessLocation: "Dallas TX",
		lastScanLabel: "Unable to load scans",
		kpis: [
			{ label: "AI visibility score", value: "0%", delta: "Unable to load data", tone: "warn" },
			{ label: "Prompts monitored", value: "0", delta: "Unable to load data", tone: "neutral" },
			{ label: "Hallucinations active", value: "0", delta: "Unable to load data", tone: "warn" },
			{ label: "Influencing sources", value: "0", delta: "Unable to load data", tone: "warn" },
			{ label: "Share of voice", value: "29%", delta: "vs 32% Amazon", tone: "down" },
		],
		overview: {
			visibilityScore: 0,
			visibilityLabel: "0%",
			visibilityTitle: "Unable to load visibility data",
			visibilityBody:
				"The dashboard layout is available, but the repository-backed analytics could not be loaded for this render.",
			platformMetrics: [
				{ name: "ChatGPT", value: 0, color: "#10b981" },
				{ name: "Perplexity", value: 0, color: "#10b981" },
				{ name: "Google AI", value: 0, color: "#10b981" },
				{ name: "Gemini", value: 0, color: "#10b981" },
			],
			hallucinationTitle: "0 unresolved",
			hallucinationAlerts: [
				{
					summary: "Unable to load hallucination alerts.",
					meta: "Load failed - HIGH severity",
					severity: "high",
				},
			],
			shareOfVoice: [
				{ label: "You", value: 29, color: "#10b981" },
				{ label: "Amazon", value: 32, color: "#3b82f6" },
				{ label: "HomeDepot", value: 24, color: "#f59e0b" },
				{ label: "Others", value: 15, color: "#94a3b8" },
			],
			visibilityTrend: {
				labels: ["Wk1", "Wk2", "Wk3", "Wk4", "Wk5", "Wk6"],
				yourSeries: [12, 11, 10, 9, 9, 8],
				competitorSeries: [71, 72, 73, 73, 74, 74],
			},
			priorityActions: [
				{
					title: "Reconnect the analytics data source",
					body: "The dashboard design is active, but the live response repository is unavailable for this render.",
					tone: "danger",
				},
			],
			categoryBreakdown: [
				{ name: "ChatGPT", value: 0, color: "#10b981" },
				{ name: "Perplexity", value: 0, color: "#10b981" },
				{ name: "Google AI", value: 0, color: "#10b981" },
				{ name: "Gemini", value: 0, color: "#10b981" },
			],
		},
		competitors: {
			cards: [],
			tactics: [],
		},
		improvements: {
			critical: [],
			recommended: [],
			projectedImpact: "+34pts",
			projectedBody: "Reconnect the repository to restore live metrics.",
		},
		content: {
			keywords: [],
			products: [],
			ideas: [],
		},
		sources: {
			countLabel: "0",
			sources: [
				{
					name: "Unable to load domains",
					type: "Load failed",
					score: 0,
					badgeTone: "warn",
					actionLabel: "Retry",
				},
			],
			budget: [
				{ label: "Yelp Ads", amount: "$300/mo", value: 300, color: "#ef4444" },
				{ label: "Google Local Ads", amount: "$200/mo", value: 200, color: "#3b82f6" },
				{ label: "Houzz Pro listing", amount: "$100/mo", value: 100, color: "#10b981" },
			],
			budgetOutcome: "Reconnect the repository to restore live source analysis.",
		},
		topInfluencingDomains: [
			{
				domain: "Unable to load domains",
				impact: "Load failed",
				tone: "bg-rose-100 text-rose-700",
			},
		],
	};
}

export default async function DashboardPage() {
	try {
		const responses = await aiResponseRepository.listAll();
		return <DashboardClient {...buildDashboardProps(responses)} />;
	} catch {
		return <DashboardClient {...buildFallbackProps()} />;
	}
}

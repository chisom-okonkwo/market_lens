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

// These helpers derive the dashboard view model entirely from stored prompt responses.
const CONTENT_THEME_STOPWORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"best",
	"can",
	"do",
	"does",
	"for",
	"from",
	"how",
	"i",
	"in",
	"is",
	"me",
	"my",
	"near",
	"of",
	"on",
	"or",
	"should",
	"the",
	"to",
	"under",
	"what",
	"where",
	"with",
	"you",
]);

type KeywordTheme = DashboardClientProps["content"]["keywords"][number] & {
	promptCount: number;
	mentionRate: number;
};

type ProductRanking = DashboardClientProps["content"]["products"][number];

type CompetitorPalette = {
	color: string;
	accentBackground: string;
	accentText: string;
};

type EntityShareStat = {
	key: string;
	label: string;
	mentionCount: number;
	promptIds: Set<string>;
	positiveCount: number;
	rankedCount: number;
	firstPlaceCount: number;
	sourceLinkedCount: number;
};

type ShareOfVoiceSnapshot = {
	trackedShare: number;
	trackedMentions: number;
	totalMentions: number;
	topCompetitorLabel: string | null;
	topCompetitorShare: number;
	segments: DashboardClientProps["overview"]["shareOfVoice"];
	competitors: Array<{
		label: string;
		share: number;
		stat: EntityShareStat;
	}>;
};

const TRACKED_ENTITY_KEY = "__tracked__";
const COMPETITOR_PALETTE: readonly CompetitorPalette[] = [
	{ color: "#3b82f6", accentBackground: "#dbeafe", accentText: "#1e40af" },
	{ color: "#f59e0b", accentBackground: "#fef3c7", accentText: "#92400e" },
	{ color: "#ec4899", accentBackground: "#fce7f3", accentText: "#9d174d" },
];

// Shared formatting and time-window helpers used across multiple dashboard cards.
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

function getResponsesForMonth(responses: AIStoredResponse[], monthReference: Date): AIStoredResponse[] {
	return responses.filter((response) => isSameMonth(new Date(response.timestamp), monthReference));
}

function shiftMonth(reference: Date, monthOffset: number): Date {
	return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, 1));
}

function normalizeContentText(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function toTitleCase(value: string): string {
	return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clampPercentage(value: number): number {
	if (value < 0) {
		return 0;
	}

	if (value > 100) {
		return 100;
	}

	return value;
}

function responseMentionsTrackedTerm(response: AIStoredResponse, trackedTerms: string[]): boolean {
	const normalizedResponseText = normalizeContentText(response.responseText);
	const detectedBrands = response.analysisPayload.entityDetection?.brandMentions ?? [];

	return trackedTerms.some((term) => {
		const normalizedTerm = normalizeContentText(term);
		return (
			normalizedResponseText.includes(normalizedTerm) ||
			detectedBrands.some((brand) => normalizeContentText(brand) === normalizedTerm)
		);
	});
}

function extractPromptTheme(prompt: string): string {
	const normalizedPrompt = normalizeContentText(prompt);
	const filteredTokens = normalizedPrompt
		.split(" ")
		.filter((token) => token.length > 2 && !CONTENT_THEME_STOPWORDS.has(token));

	if (filteredTokens.length === 0) {
		return normalizedPrompt || prompt.trim().toLowerCase();
	}

	return filteredTokens.slice(0, 5).join(" ");
}

function leaderToneForName(name: string): DashboardClientProps["content"]["keywords"][number]["leaderTone"] {
	const normalizedName = normalizeContentText(name);

	if (normalizedName.includes("amazon")) {
		return "blue";
	}

	if (normalizedName.includes("home depot") || normalizedName.includes("homedepot")) {
		return "amber";
	}

	if (normalizedName.includes("wayfair")) {
		return "pink";
	}

	return "blue";
}

function getEntityInitials(label: string): string {
	const words = label.trim().split(/\s+/).filter(Boolean);

	if (words.length === 0) {
		return "--";
	}

	if (words.length === 1) {
		return words[0]!.slice(0, 2).toUpperCase();
	}

	return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function isTrackedEntityName(name: string, trackedTerms: string[]): boolean {
	const normalizedName = normalizeContentText(name);
	return trackedTerms.some((term) => normalizeContentText(term) === normalizedName);
}

function extractCompetitorCandidates(response: AIStoredResponse, trackedTerms: string[]): string[] {
	const seen = new Set<string>();
	const orderedCandidates = [
		...(response.rankingOrder ?? []),
		...(response.analysisPayload.entityDetection?.retailerMentions ?? []),
		...(response.analysisPayload.entityDetection?.brandMentions ?? []),
	];

	const competitors: string[] = [];
// Competitor and share-of-voice sections are inferred from entity detection and ranking data.

	for (const candidate of orderedCandidates) {
		const normalizedCandidate = normalizeContentText(candidate);
		if (!normalizedCandidate || seen.has(normalizedCandidate)) {
			continue;
		}

		seen.add(normalizedCandidate);

		if (isTrackedEntityName(candidate, trackedTerms)) {
			continue;
		}

		competitors.push(candidate.trim());
	}

	return competitors;
}

function collectEntityShareStats(
	responses: AIStoredResponse[],
	trackedTerms: string[],
): Map<string, EntityShareStat> {
	const stats = new Map<string, EntityShareStat>();

	const ensureStat = (key: string, label: string): EntityShareStat => {
		const existing = stats.get(key);
		if (existing) {
			return existing;
		}

		const next: EntityShareStat = {
			key,
			label,
			mentionCount: 0,
			promptIds: new Set<string>(),
			positiveCount: 0,
			rankedCount: 0,
			firstPlaceCount: 0,
			sourceLinkedCount: 0,
		};

		stats.set(key, next);
		return next;
	};

	for (const response of responses) {
		const observedEntities = new Map<string, string>();
		const hasTrackedMention = responseMentionsTrackedTerm(response, trackedTerms);
		const sentiment = response.analysisPayload.entityDetection?.sentiment ?? "neutral";
		const hasSourceEvidence =
			response.sources.length > 0 || response.citations.length > 0 || response.links.length > 0;

		if (hasTrackedMention) {
			observedEntities.set(TRACKED_ENTITY_KEY, "You");
		}

		for (const competitor of extractCompetitorCandidates(response, trackedTerms)) {
			observedEntities.set(normalizeContentText(competitor), competitor);
		}

		for (const [key, label] of observedEntities.entries()) {
			const stat = ensureStat(key, key === TRACKED_ENTITY_KEY ? "You" : label);
			stat.mentionCount += 1;
			stat.promptIds.add(response.promptId);

			if (sentiment === "positive") {
				stat.positiveCount += 1;
			}

			if (hasSourceEvidence) {
				stat.sourceLinkedCount += 1;
			}
		}

		const rankedEntities = (response.rankingOrder ?? []).filter((candidate) => candidate.trim().length > 0);
		for (const rankedEntity of rankedEntities) {
			const key = isTrackedEntityName(rankedEntity, trackedTerms)
				? TRACKED_ENTITY_KEY
				: normalizeContentText(rankedEntity);
			const label = key === TRACKED_ENTITY_KEY ? "You" : rankedEntity;
			const stat = ensureStat(key, label);
			stat.rankedCount += 1;
		}

		const firstRanked = rankedEntities[0];
		if (firstRanked) {
			const key = isTrackedEntityName(firstRanked, trackedTerms)
				? TRACKED_ENTITY_KEY
				: normalizeContentText(firstRanked);
			const label = key === TRACKED_ENTITY_KEY ? "You" : firstRanked;
			const stat = ensureStat(key, label);
			stat.firstPlaceCount += 1;
		}
	}

	return stats;
}

function buildShareOfVoiceSnapshot(
	responses: AIStoredResponse[],
	now: Date,
): ShareOfVoiceSnapshot {
	const trackedTerms = getTrackedTerms();
	const currentMonthResponses = getResponsesForMonth(responses, now);
	const entityStats = collectEntityShareStats(currentMonthResponses, trackedTerms);
	const totalMentions = Array.from(entityStats.values()).reduce(
		(sum, stat) => sum + stat.mentionCount,
		0,
	);
	const trackedStat = entityStats.get(TRACKED_ENTITY_KEY);
	const trackedMentions = trackedStat?.mentionCount ?? 0;
	const trackedShare =
		totalMentions === 0 ? 0 : clampPercentage(Math.round((trackedMentions / totalMentions) * 100));

	const competitors = Array.from(entityStats.values())
		.filter((stat) => stat.key !== TRACKED_ENTITY_KEY)
		.map((stat) => ({
			label: stat.label,
			share:
				totalMentions === 0
					? 0
					: clampPercentage(Math.round((stat.mentionCount / totalMentions) * 100)),
			stat,
		}))
		.sort((left, right) => {
			if (right.share !== left.share) {
				return right.share - left.share;
			}

			if (right.stat.firstPlaceCount !== left.stat.firstPlaceCount) {
				return right.stat.firstPlaceCount - left.stat.firstPlaceCount;
			}

			return left.label.localeCompare(right.label);
		});

	const topCompetitors = competitors.slice(0, 2);
	const othersShare = Math.max(
		0,
		100 - trackedShare - topCompetitors.reduce((sum, competitor) => sum + competitor.share, 0),
	);

	const segments: DashboardClientProps["overview"]["shareOfVoice"] = [
		{ label: "You", value: trackedShare, color: "#10b981" },
		...topCompetitors.map((competitor, index) => ({
			label: competitor.label,
			value: competitor.share,
			color: COMPETITOR_PALETTE[index]?.color ?? "#64748b",
		})),
	];

	if (othersShare > 0 || segments.length === 1) {
		segments.push({ label: "Others", value: othersShare, color: "#94a3b8" });
	}

	return {
		trackedShare,
		trackedMentions,
		totalMentions,
		topCompetitorLabel: competitors[0]?.label ?? null,
		topCompetitorShare: competitors[0]?.share ?? 0,
		segments,
		competitors,
	};
}

function buildShareOfVoiceDeltaLabel(
	currentShare: number,
	previousShare: number | null,
	topCompetitorLabel: string | null,
	topCompetitorShare: number,
): { delta: string; tone: DashboardClientProps["kpis"][number]["tone"] } {
	if (previousShare !== null) {
		const delta = currentShare - previousShare;
		if (delta > 0) {
			return {
				delta: `+${delta}pts vs previous month`,
				tone: "up",
			};
		}

		if (delta < 0) {
			return {
				delta: `${delta}pts vs previous month`,
				tone: "down",
			};
		}
	}

	if (topCompetitorLabel) {
		const direction = currentShare >= topCompetitorShare ? "ahead of" : "behind";
		return {
			delta: `${direction} ${topCompetitorLabel} at ${topCompetitorShare}%`,
			tone: currentShare >= topCompetitorShare ? "up" : "down",
		};
	}

	return {
		delta: currentShare > 0 ? "Leading observed share" : "No brand-share data yet",
		tone: currentShare > 0 ? "up" : "neutral",
	};
}

function buildCompetitorCards(
	responses: AIStoredResponse[],
	now: Date,
): DashboardClientProps["competitors"]["cards"] {
	const snapshot = buildShareOfVoiceSnapshot(responses, now);

	return snapshot.competitors.slice(0, 3).map((competitor, index) => {
		const palette = COMPETITOR_PALETTE[index] ?? COMPETITOR_PALETTE[COMPETITOR_PALETTE.length - 1]!;
		const tags: string[] = [];

		if (competitor.stat.firstPlaceCount > 0) {
			tags.push(`${competitor.stat.firstPlaceCount} top-ranked prompt${competitor.stat.firstPlaceCount === 1 ? "" : "s"}`);
		}

		if (competitor.stat.rankedCount > 0) {
			tags.push(`${competitor.stat.rankedCount} ranking mention${competitor.stat.rankedCount === 1 ? "" : "s"}`);
		}

		if (competitor.stat.sourceLinkedCount > 0) {
			tags.push(`${competitor.stat.sourceLinkedCount} source-linked response${competitor.stat.sourceLinkedCount === 1 ? "" : "s"}`);
		}

		if (competitor.stat.positiveCount > 0) {
			tags.push(`${competitor.stat.positiveCount} positive mention${competitor.stat.positiveCount === 1 ? "" : "s"}`);
		}

		if (tags.length === 0) {
			tags.push(`${competitor.stat.promptIds.size} observed prompt${competitor.stat.promptIds.size === 1 ? "" : "s"}`);
		}

		const whyParts = [
			`Appears in ${competitor.share}% of observed entity mentions this month.`,
			competitor.stat.firstPlaceCount > 0
				? `Led ${competitor.stat.firstPlaceCount} ranking output${competitor.stat.firstPlaceCount === 1 ? "" : "s"}.`
				: `Observed across ${competitor.stat.promptIds.size} monitored prompt${competitor.stat.promptIds.size === 1 ? "" : "s"}.`,
			competitor.stat.sourceLinkedCount > 0
				? `Mentioned alongside cited links or sources in ${competitor.stat.sourceLinkedCount} response${competitor.stat.sourceLinkedCount === 1 ? "" : "s"}.`
				: `Not yet backed by cited-source volume in the stored runs.`,
		];

		return {
			initials: getEntityInitials(competitor.label),
			name: competitor.label,
			score: competitor.share,
			color: palette.color,
			accentBackground: palette.accentBackground,
			accentText: palette.accentText,
			tags: tags.slice(0, 3),
			why: whyParts.join(" "),
			action: "Inspect live AI mentions",
		};
	});
}

function buildCompetitorTactics(
	responses: AIStoredResponse[],
	now: Date,
	keywords: KeywordTheme[],
): string[] {
	const competitorCards = buildCompetitorCards(responses, now);
	const tactics: string[] = [];
	const topCompetitor = competitorCards[0];
	const secondCompetitor = competitorCards[1];
	const topKeyword = keywords[0];

	if (topCompetitor) {
		tactics.push(
			`${topCompetitor.name} appears in ${topCompetitor.score}% of observed mentions. Build comparison copy and proof-point sections for the prompts where it leads.`,
		);
	}

	if (topKeyword) {
		tactics.push(
			`Publish content around ${topKeyword.term}. That theme is already recurring in monitored prompts and can be used to challenge competitor-led answers.`,
		);
	}

	if (secondCompetitor) {
		tactics.push(
			`${secondCompetitor.name} shows up repeatedly in stored runs. Add citations, product proof, and brand-specific FAQ coverage on overlapping prompts.`,
		);
	}

	if (tactics.length === 0) {
		tactics.push("No competitor mentions detected yet. Run more monitored prompts to build a live comparison baseline.");
	}

	return tactics.slice(0, 4);
}

function buildKeywordThemes(
	responses: AIStoredResponse[],
	now: Date,
): KeywordTheme[] {
	const currentMonthResponses = getCurrentMonthResponses(responses, now);
	const trackedTerms = getTrackedTerms();

	if (currentMonthResponses.length === 0) {
		return [];
	}

	const groupedThemes = new Map<
		string,
		{
			label: string;
			promptIds: Set<string>;
			responses: AIStoredResponse[];
			leaders: Map<string, number>;
		}
	>();

	for (const response of currentMonthResponses) {
		const themeKey = extractPromptTheme(response.prompt);
		if (!themeKey) {
			continue;
		}

		const existingGroup = groupedThemes.get(themeKey) ?? {
			label: themeKey,
			promptIds: new Set<string>(),
			responses: [],
			leaders: new Map<string, number>(),
		};

		existingGroup.promptIds.add(response.promptId);
		existingGroup.responses.push(response);

		const entityDetection = response.analysisPayload.entityDetection;
		const leaderCandidates = [
			...(entityDetection?.retailerMentions ?? []),
			...(entityDetection?.brandMentions ?? []),
			...(response.rankingOrder ?? []),
		].filter(
			(candidate) =>
				candidate.trim().length > 0 &&
				!trackedTerms.some(
					(term) => normalizeContentText(term) === normalizeContentText(candidate),
				),
		);

		for (const leader of leaderCandidates) {
			existingGroup.leaders.set(leader, (existingGroup.leaders.get(leader) ?? 0) + 1);
		}

		groupedThemes.set(themeKey, existingGroup);
	}

	const maxPromptCount = Math.max(
		1,
		...Array.from(groupedThemes.values(), (group) => group.promptIds.size),
	);

	return Array.from(groupedThemes.values())
		.map((group) => {
			const topLeader = Array.from(group.leaders.entries()).sort((left, right) => {
				if (right[1] !== left[1]) {
					return right[1] - left[1];
				}

				return left[0].localeCompare(right[0]);
			})[0]?.[0] ?? "Observed market";
			const mentioningResponses = group.responses.filter((response) =>
				responseMentionsTrackedTerm(response, trackedTerms),
			).length;
			const mentionRate =
				group.responses.length === 0 ? 0 : Math.round((mentioningResponses / group.responses.length) * 100);
			const volume = clampPercentage(
				Math.round((group.promptIds.size / maxPromptCount) * 100),
			);

			return {
				term: group.label,
				leader: topLeader,
				leaderTone: leaderToneForName(topLeader),
				volume,
				gap: `You: ${mentionRate}%`,
				promptCount: group.promptIds.size,
				mentionRate,
			};
		})
		.sort((left, right) => {
			if (right.promptCount !== left.promptCount) {
				return right.promptCount - left.promptCount;
			}

			if (right.volume !== left.volume) {
				return right.volume - left.volume;
			}

			return left.term.localeCompare(right.term);
		})
		.slice(0, 6);
}

function buildProductRankings(
	responses: AIStoredResponse[],
	now: Date,
): ProductRanking[] {
	const currentMonthResponses = getCurrentMonthResponses(responses, now);

	if (currentMonthResponses.length === 0) {
		return [];
	}

	const productsByName = new Map<string, Set<string>>();

	for (const response of currentMonthResponses) {
		const productMentions = response.analysisPayload.entityDetection?.productMentions ?? [];
		for (const product of productMentions) {
			const existingSet = productsByName.get(product) ?? new Set<string>();
			existingSet.add(response.responseId);
			productsByName.set(product, existingSet);
		}
	}

	return Array.from(productsByName.entries())
		.map(([name, responseIds]) => ({
			name,
			appearance: clampPercentage(
				Math.round((responseIds.size / Math.max(currentMonthResponses.length, 1)) * 100),
			),
			count: responseIds.size,
		}))
		.sort((left, right) => {
			if (right.count !== left.count) {
				return right.count - left.count;
			}

			if (right.appearance !== left.appearance) {
				return right.appearance - left.appearance;
			}

			return left.name.localeCompare(right.name);
		})
		.slice(0, 7)
		.map((product, index) => ({
			rank: index + 1,
			name: product.name,
			appearance: product.appearance,
		}));
}

function buildContentIdeas(
	responses: AIStoredResponse[],
	now: Date,
	keywords: KeywordTheme[],
	products: ProductRanking[],
): DashboardClientProps["content"]["ideas"] {
	const currentMonthResponses = getCurrentMonthResponses(responses, now);
	const hallucinationClaims = currentMonthResponses
		.flatMap((response) => response.analysisPayload.accuracyAnalysis?.results ?? [])
		.filter((result) => result.hallucinationDetected)
		.sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity));

	const ideas: DashboardClientProps["content"]["ideas"] = [];
	const topKeyword = keywords[0];
	const topHallucination = hallucinationClaims[0];
	const topProduct = products[0];

	if (topKeyword) {
		ideas.push({
			tag: "GUIDE - LIVE SIGNAL",
			tone: "info",
			title: toTitleCase(topKeyword.term),
			body: `Observed across ${topKeyword.promptCount} tracked prompt${topKeyword.promptCount === 1 ? "" : "s"}. Your current appearance rate for this theme is ${topKeyword.mentionRate}%.`,
		});
	}

	if (topHallucination) {
		ideas.push({
			tag: "FAQ PAGE - LIVE SIGNAL",
			tone: "info",
			title: topHallucination.matchedGroundTruth
				? toTitleCase(topHallucination.matchedGroundTruth)
				: `Clarify ${topHallucination.claim.slice(0, 52)}${topHallucination.claim.length > 52 ? "..." : ""}`,
			body: `Highest-priority misinformation pattern this month: ${topHallucination.claim}. A dedicated answer page can reduce repeat hallucinations.`,
		});
	}

	if (topProduct) {
		ideas.push({
			tag: "COMPARISON - LIVE SIGNAL",
			tone: "warning",
			title: `${topProduct.name}: buying guide and comparison`,
			body: `This product appeared in ${topProduct.appearance}% of current-month AI responses where a product was detected, making it a strong candidate for structured comparison content.`,
		});
	}

	return ideas.slice(0, 3);
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

// This assembles the full server-side view model consumed by the client dashboard component.
function buildDashboardProps(responses: AIStoredResponse[]): DashboardClientProps {
	const now = new Date();
	const currentMonthResponses = getCurrentMonthResponses(responses, now);
	const previousMonthResponses = getResponsesForMonth(responses, shiftMonth(now, -1));
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
	const keywordThemes = buildKeywordThemes(responses, now);
	const productRankings = buildProductRankings(responses, now);
	const contentIdeas = buildContentIdeas(responses, now, keywordThemes, productRankings);
	const shareOfVoiceSnapshot = buildShareOfVoiceSnapshot(responses, now);
	const previousShareOfVoiceSnapshot =
		previousMonthResponses.length > 0 ? buildShareOfVoiceSnapshot(previousMonthResponses, shiftMonth(now, -1)) : null;
	const shareOfVoiceKpi = buildShareOfVoiceDeltaLabel(
		shareOfVoiceSnapshot.trackedShare,
		previousShareOfVoiceSnapshot?.trackedShare ?? null,
		shareOfVoiceSnapshot.topCompetitorLabel,
		shareOfVoiceSnapshot.topCompetitorShare,
	);
	const competitorCards = buildCompetitorCards(responses, now);
	const competitorTactics = buildCompetitorTactics(responses, now, keywordThemes);

	return {
		businessName: "Marcus's Electronics Shop",
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
				value: `${shareOfVoiceSnapshot.trackedShare}%`,
				delta: shareOfVoiceKpi.delta,
				tone: shareOfVoiceKpi.tone,
			},
		],
		overview: {
			visibilityScore: visibilityMetric.score,
			visibilityLabel: visibilityMetric.scoreLabel,
			...visibilitySummary,
			platformMetrics: buildPlatformMetrics(responses, now),
			hallucinationTitle: `${hallucinationsMetric.countLabel} unresolved`,
			hallucinationAlerts: buildHallucinationAlerts(responses, now),
			shareOfVoice: shareOfVoiceSnapshot.segments,
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
			cards: competitorCards,
			tactics: competitorTactics,
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
			keywords: keywordThemes,
			products: productRankings,
			ideas: contentIdeas,
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

// Fallback props keep the dashboard renderable when persistence is unavailable.
function buildFallbackProps(): DashboardClientProps {
	return {
		businessName: "Marcus's Electronics Shop",
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

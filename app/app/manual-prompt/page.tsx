"use client";

import { type FormEvent, useEffect, useState } from "react";

import { type AIResponse } from "@/lib/aiResponse";
import { type EntityDetectionResult } from "@/lib/ai/entityDetection/types";
import { type ResponseAccuracyAnalysis } from "@/lib/ai/hallucinationDetection/types";
import { type MonitoredPrompt } from "@/lib/ai/promptSources/monitoredPromptRepository";
import {
	executeMonitoredPrompts,
	loadMonitoredPrompts,
	submitManualPrompt,
} from "@/lib/manualPromptClient";

const EMPTY_PROMPT_ERROR = "Please enter a prompt before submitting.";
const FALLBACK_SUBMIT_ERROR = "Unable to submit prompt right now.";

export default function ManualPromptPage() {
	const [prompt, setPrompt] = useState("");
	const [error, setError] = useState("");
	const [responses, setResponses] = useState<AIResponse[]>([]);
	const [entityDetections, setEntityDetections] = useState<EntityDetectionResult[]>([]);
	const [accuracyAnalyses, setAccuracyAnalyses] = useState<ResponseAccuracyAnalysis[]>([]);
	const [showAccuracyDetails, setShowAccuracyDetails] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingMonitoredPrompts, setIsLoadingMonitoredPrompts] = useState(true);
	const [isRunningMonitoredPrompts, setIsRunningMonitoredPrompts] = useState(false);
	const [monitoredPrompts, setMonitoredPrompts] = useState<MonitoredPrompt[]>([]);
	const [monitoredPromptError, setMonitoredPromptError] = useState("");
	const promptHintId = "manual-prompt-hint";
	const promptFeedbackId = "manual-prompt-feedback";
	const promptDescribedBy = [promptHintId, error ? promptFeedbackId : ""]
		.filter(Boolean)
		.join(" ");
	const isSubmitDisabled = prompt.trim().length === 0;

	const handlePromptChange = (value: string) => {
		setPrompt(value);

		if (error) {
			setError("");
		}

		setResponses([]);
		setEntityDetections([]);
		setAccuracyAnalyses([]);
		setShowAccuracyDetails(false);
	};

	useEffect(() => {
		let isMounted = true;

		const run = async () => {
			setIsLoadingMonitoredPrompts(true);
			const result = await loadMonitoredPrompts();

			if (!isMounted) {
				return;
			}

			if (!result.ok) {
				setMonitoredPromptError(result.error ?? FALLBACK_SUBMIT_ERROR);
				setMonitoredPrompts([]);
				setIsLoadingMonitoredPrompts(false);
				return;
			}

			setMonitoredPromptError("");
			setMonitoredPrompts(result.prompts ?? []);
			setIsLoadingMonitoredPrompts(false);
		};

		void run();

		return () => {
			isMounted = false;
		};
	}, []);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedPrompt = prompt.trim();
		if (!trimmedPrompt) {
			setError(EMPTY_PROMPT_ERROR);
			setResponses([]);
			setEntityDetections([]);
			setAccuracyAnalyses([]);
			setShowAccuracyDetails(false);
			return;
		}

		setError("");
		setResponses([]);
		setEntityDetections([]);
		setAccuracyAnalyses([]);
		setShowAccuracyDetails(false);
		setIsSubmitting(true);

		try {
			const result = await submitManualPrompt(trimmedPrompt);

			if (!result.ok) {
				setError(result.error ?? FALLBACK_SUBMIT_ERROR);
				return;
			}

			setResponses(result.responses ?? []);
			setEntityDetections(result.entityDetections ?? []);
			setAccuracyAnalyses(result.accuracyAnalyses ?? []);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRunMonitoredPrompts = async () => {
		setError("");
		setMonitoredPromptError("");
		setResponses([]);
		setEntityDetections([]);
		setAccuracyAnalyses([]);
		setShowAccuracyDetails(false);
		setIsRunningMonitoredPrompts(true);

		try {
			const result = await executeMonitoredPrompts();

			if (!result.ok) {
				setMonitoredPromptError(result.error ?? FALLBACK_SUBMIT_ERROR);
				return;
			}

			setMonitoredPrompts(result.prompts ?? monitoredPrompts);
			setResponses(result.responses ?? []);
			setEntityDetections(result.entityDetections ?? []);
			setAccuracyAnalyses(result.accuracyAnalyses ?? []);
		} finally {
			setIsRunningMonitoredPrompts(false);
		}
	};

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-8">
			<section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
				<h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
					Manual Prompt Input
				</h1>
				<p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
					This page is a temporary manual input source for submitting prompts.
					It supports early workflow testing and will later coexist with, or be
					replaced by, the full Query Intelligence System.
				</p>
				<p id={promptHintId} className="mt-2 text-sm text-zinc-500">
					Use this manual flow for temporary prompt submission only.
				</p>

				<section className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-sm font-semibold text-zinc-900">Monitored prompts from database</h2>
							<p className="mt-1 text-sm text-zinc-600">
								Load your stored Supabase search queries and run them through the AI connectors.
							</p>
						</div>
						<button
							type="button"
							onClick={() => {
								void handleRunMonitoredPrompts();
							}}
							disabled={
								isLoadingMonitoredPrompts ||
								isRunningMonitoredPrompts ||
								monitoredPrompts.length === 0
							}
							className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isRunningMonitoredPrompts ? "Running monitored prompts..." : "Run monitored prompts"}
						</button>
					</div>

					{monitoredPromptError ? (
						<p className="mt-3 text-sm text-red-600" role="alert">
							{monitoredPromptError}
						</p>
					) : null}

					{isLoadingMonitoredPrompts ? (
						<p className="mt-3 text-sm text-zinc-500">Loading monitored prompts...</p>
					) : monitoredPrompts.length > 0 ? (
						<ul className="mt-4 space-y-2">
							{monitoredPrompts.map((storedPrompt) => (
								<li
									key={storedPrompt.id}
									className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
								>
									<div className="font-medium text-zinc-900">
										{storedPrompt.label || storedPrompt.prompt}
									</div>
									{storedPrompt.label ? (
										<div className="mt-1 text-xs text-zinc-500">{storedPrompt.prompt}</div>
									) : null}
								</li>
							))}
						</ul>
					) : (
						<p className="mt-3 text-sm text-zinc-500">
							No monitored prompts found. Add rows to your Supabase monitored prompts table.
						</p>
					)}
				</section>

				<form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
					<div>
						<label
							htmlFor="manual-prompt"
							className="mb-2 block text-sm font-medium text-zinc-800"
						>
							Prompt
						</label>
						<textarea
							id="manual-prompt"
							name="prompt"
							value={prompt}
							onChange={(event) => {
								handlePromptChange(event.target.value);
							}}
							placeholder="Example: Best cordless drill for beginners"
							className="h-36 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
							aria-invalid={Boolean(error)}
							aria-describedby={promptDescribedBy}
							required
						/>
						{error ? (
							<p id={promptFeedbackId} className="mt-2 text-sm text-red-600" role="alert">
								{error}
							</p>
						) : null}
					</div>

					<button
						type="submit"
						disabled={isSubmitDisabled || isSubmitting}
						className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isSubmitting ? "Submitting..." : "Submit Prompt"}
					</button>
				</form>

				{responses.length > 0 ? (
					<section className="mt-8 border-t border-zinc-200 pt-6">
						<h2 className="text-lg font-semibold text-zinc-900">AI Output</h2>
						<div className="mt-4 space-y-4">
							{responses.map((response) => (
								<article key={`${response.platform}-${response.promptId}`} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
									<p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
										{response.platform} {response.model ? `(${response.model})` : ""}
									</p>
									<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-900">
										{response.responseText || "No response text returned."}
									</p>
								</article>
							))}
						</div>
					</section>
				) : null}

				{entityDetections.length > 0 ? (
					<section className="mt-8 border-t border-zinc-200 pt-6">
						<h2 className="text-lg font-semibold text-zinc-900">Entity Detection Output</h2>
						<div className="mt-4 space-y-4">
							{entityDetections.map((detection) => (
								<article
									key={detection.responseId}
									className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
								>
									<p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
										{detection.responseId}
									</p>
									<p className="mt-2 text-sm text-zinc-800">
										<span className="font-medium">Sentiment:</span> {detection.sentiment}
									</p>
									<p className="mt-1 text-sm text-zinc-800">
										<span className="font-medium">Brands:</span>{" "}
										{detection.brandMentions.length > 0
											? detection.brandMentions.join(", ")
											: "None"}
									</p>
									<p className="mt-1 text-sm text-zinc-800">
										<span className="font-medium">Products:</span>{" "}
										{detection.productMentions.length > 0
											? detection.productMentions.join(", ")
											: "None"}
									</p>
									<p className="mt-1 text-sm text-zinc-800">
										<span className="font-medium">Retailers:</span>{" "}
										{detection.retailerMentions.length > 0
											? detection.retailerMentions.join(", ")
											: "None"}
									</p>
									<p className="mt-1 text-sm text-zinc-800">
										<span className="font-medium">Claims:</span>{" "}
										{detection.claims.length > 0 ? detection.claims.join(" | ") : "None"}
									</p>
								</article>
							))}
						</div>

						{accuracyAnalyses.length > 0 ? (
							<div className="mt-4">
								<button
									type="button"
									onClick={() => {
										setShowAccuracyDetails((current) => !current);
									}}
									className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
									aria-expanded={showAccuracyDetails}
								>
									{showAccuracyDetails ? "Hide more" : "View more"}
								</button>
							</div>
						) : null}

						{showAccuracyDetails && accuracyAnalyses.length > 0 ? (
							<section className="mt-6 border-t border-zinc-200 pt-6">
								<h3 className="text-base font-semibold text-zinc-900">
									Hallucination &amp; Accuracy Output
								</h3>
								<div className="mt-4 space-y-4">
									{accuracyAnalyses.map((analysis) => (
										<article
											key={analysis.responseId}
											className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
										>
											<p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
												{analysis.responseId}
											</p>
											<p className="mt-2 text-sm text-zinc-800">
												<span className="font-medium">Summary:</span> {analysis.summary}
											</p>
											<p className="mt-1 text-sm text-zinc-800">
												<span className="font-medium">Overall accuracy score:</span>{" "}
												{analysis.overallAccuracyScore}
											</p>
											<p className="mt-1 text-sm text-zinc-800">
												<span className="font-medium">Hallucination detected:</span>{" "}
												{analysis.hallucinationDetected ? "Yes" : "No"}
											</p>
											<p className="mt-1 text-sm text-zinc-800">
												<span className="font-medium">Overall severity:</span>{" "}
												{analysis.overallSeverity}
											</p>
											<p className="mt-1 text-sm text-zinc-800">
												<span className="font-medium">Counts:</span>{" "}
												{analysis.accurateCount} accurate, {analysis.hallucinationCount} hallucinated,
												{" "}{analysis.unverifiableCount} unverifiable
											</p>
											<div className="mt-3 space-y-3">
												{analysis.results.map((result) => (
													<div key={`${analysis.responseId}-${result.claim}`} className="rounded border border-zinc-200 bg-white p-3">
														<p className="text-sm font-medium text-zinc-900">{result.claim}</p>
														<p className="mt-1 text-sm text-zinc-800">
															<span className="font-medium">Accurate:</span>{" "}
															{result.isAccurate ? "Yes" : "No"}
														</p>
														<p className="mt-1 text-sm text-zinc-800">
															<span className="font-medium">Hallucination:</span>{" "}
															{result.hallucinationDetected ? "Yes" : "No"}
														</p>
														<p className="mt-1 text-sm text-zinc-800">
															<span className="font-medium">Severity:</span> {result.severity}
														</p>
														<p className="mt-1 text-sm text-zinc-800">
															<span className="font-medium">Confidence:</span> {result.confidence}
														</p>
														<p className="mt-1 text-sm text-zinc-800">
															<span className="font-medium">Explanation:</span> {result.explanation}
														</p>
														<p className="mt-1 text-sm text-zinc-800">
															<span className="font-medium">Matched ground truth:</span>{" "}
															{result.matchedGroundTruth ?? "None"}
														</p>
													</div>
												))}
											</div>
										</article>
									))}
								</div>
							</section>
						) : null}
					</section>
				) : null}
			</section>
		</main>
	);
}

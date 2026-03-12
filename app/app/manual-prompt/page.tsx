"use client";

import { type FormEvent, useState } from "react";

import { type AIResponse } from "@/lib/aiResponse";
import { submitManualPrompt } from "@/lib/manualPromptClient";

const EMPTY_PROMPT_ERROR = "Please enter a prompt before submitting.";
const FALLBACK_SUBMIT_ERROR = "Unable to submit prompt right now.";

export default function ManualPromptPage() {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError(EMPTY_PROMPT_ERROR);
      setResponses([]);
      return;
    }

    setError("");
    setResponses([]);
    setIsSubmitting(true);

    try {
      const result = await submitManualPrompt(trimmedPrompt);

      if (!result.ok) {
        setError(result.error ?? FALLBACK_SUBMIT_ERROR);
        return;
      }

      setResponses(result.responses ?? []);
    } finally {
      setIsSubmitting(false);
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
      </section>
    </main>
  );
}

"use client";

import { type FormEvent, useState } from "react";

export default function ManualPromptPage() {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const isSubmitDisabled = prompt.trim().length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Please enter a prompt before submitting.");
      return;
    }

    setError("");

    // Temporary manual input path: local handling only until QIS is implemented.
    console.log("Manual prompt submitted:", trimmedPrompt);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-8">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
          Manual Prompt Input
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
          This is a temporary manual input path for entering prompts while the
          full Query Intelligence System is built.
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
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                if (error) {
                  setError("");
                }
              }}
              placeholder="Example: Best cordless drill for beginners"
              className="h-36 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              aria-invalid={Boolean(error)}
            />
            {error ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit Prompt
          </button>
        </form>
      </section>
    </main>
  );
}

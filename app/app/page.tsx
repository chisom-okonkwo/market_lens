"use client";

import { type FormEvent, useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // For now, just log the prompt - later this will feed into the system
    console.log('Submitted prompt:', prompt);
    alert(`Prompt submitted: ${prompt}`);
    setPrompt('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            AI Visibility SaaS
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Enter a prompt to test AI responses and monitor brand visibility.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="flex flex-col gap-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here (e.g., 'Best cordless drill for beginners')"
              className="w-full h-32 p-4 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Submit Prompt
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

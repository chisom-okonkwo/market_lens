# Market Lens

## What This Application Does

Market Lens is an AI visibility intelligence dashboard.

It helps a team understand how a brand appears inside AI-generated answers from models such as ChatGPT, Claude, and Gemini. The app can:

- run a saved set of prompts against supported AI providers
- store generated responses in Supabase
- analyze those responses for visibility, competitor presence, hallucinations, and source/domain influence
- display the results in a dashboard built for quick review

This project is intended to act like an SEO-style monitoring tool, but for AI answer surfaces instead of traditional search engines.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase for persistence
- OpenAI, Anthropic, and Gemini connectors for prompt execution

## Repository Layout

- `app/`: the runnable Next.js application
- `app/app/manual-prompt`: page for submitting one-off prompts and running monitored prompts from the database
- `app/app/dashboard`: analytics dashboard built from stored prompt responses
- `app/app/api`: API routes used by the UI
- `app/lib/ai`: connectors, storage, orchestration, and analytics logic

## The fastest way to interpret the project is:

1. Open the manual prompt page and run prompts.
2. Open the dashboard and review the resulting analytics.

Key routes:

- `http://localhost:3000/manual-prompt`: operational entry point for running prompts
- `http://localhost:3000/dashboard`: main analytics experience
- `http://localhost:3000/`: lightweight landing page only

Expected workflow:

1. Add monitored prompts to Supabase or submit a manual prompt.
2. The app sends prompts to configured AI providers.
3. Responses are stored and analyzed.
4. The dashboard surfaces visibility, hallucination, competitor, and source/domain signals.

## Requirements

Minimum local requirements:

- Node.js 20+
- npm

To use the full product flow, you also need:

- a Supabase project
- at least one AI provider API key

## Environment Variables

Create `app/.env.local` and set the values you want to use.

Required for database-backed mode:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

At least one of these is required to execute prompts against models:

```bash
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key
```

Optional:

```bash
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_MODEL=claude-sonnet-4-6
GEMINI_MODEL=gemini-2.5-flash
VISIBILITY_TRACKED_TERMS=eBay,Amazon
SUPABASE_MONITORED_PROMPTS_TABLE=monitored_prompts
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
```

## Supabase Setup

The app expects prompt and response data in Supabase.

At minimum, ensure the following tables exist:

- `ai_response_records`
- `monitored_prompts`

The monitored prompts table should hold the prompts you want the app to run on demand from the manual prompt page.

## How To Run The Application

### Recommended

From the repository root:

```bash
sh run.sh
```

This script:

- moves into the Next.js app folder
- installs dependencies if needed
- starts the Next.js development server

### Manual Start

```bash
cd app
npm install
npm run dev
```

## How To Tell If The App Started Successfully

The app started correctly if:

- the terminal shows the Next.js dev server is ready
- `http://localhost:3000` loads in the browser
- `http://localhost:3000/manual-prompt` and `http://localhost:3000/dashboard` both load

If prompt execution is configured correctly, running prompts from `/manual-prompt` should produce responses instead of a connector configuration error.

## Notes For Reviewers

- The main product experience is the `/dashboard`.
- Some dashboard cards show fallback or heuristic values when there is not enough stored response data yet.
- If no AI keys are configured, the UI can still load, but prompt execution will not work.
- If Supabase is not configured, database-backed monitored prompt execution and persisted analytics will not work.

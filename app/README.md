This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Manual Prompt Path (Temporary)

- Frontend route: `/manual-prompt`
- API route: `POST /api/manual-prompt`

This route is a temporary manual input source used while the full Query Intelligence System (QIS) is being built. It enables simple prompt submission and validation now, and is expected to either coexist with or be superseded by QIS-driven prompt generation later.

## Supabase-Backed Prompt MVP

The current MVP supports loading monitored search queries from Supabase, executing them through the configured AI connectors, and persisting the outputs back into `ai_response_records`.

### What you need to do

1. Set the required environment variables in your app environment:

```bash
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key
```

2. Make sure your existing `ai_response_records` table is present in Supabase.

3. Create the monitored prompts table. The app defaults to `monitored_prompts`.

```sql
create extension if not exists pgcrypto;

create table if not exists public.monitored_prompts (
	id uuid primary key default gen_random_uuid(),
	prompt text not null,
	label text,
	is_active boolean not null default true,
	sort_order integer not null default 0,
	last_run_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
```

4. Add about 10 query rows in Supabase, for example:

```sql
insert into public.monitored_prompts (prompt, label, sort_order)
values
	('best cordless drill for beginners', 'Drill beginners', 1),
	('best impact driver under 200 dollars', 'Impact driver', 2),
	('best power tool brand for homeowners', 'Power tool brand', 3);
```

5. Start the app and use `/manual-prompt`. You can still submit a manual textbox prompt, or use the new database-backed monitored prompt runner.

### Routes added for this MVP

- `GET /api/monitored-prompts`
- `POST /api/prompt-execution/monitored`

### How the flow works

1. The app loads active rows from `monitored_prompts`.
2. It sends each prompt into the existing prompt execution pipeline.
3. Raw AI outputs are saved into `ai_response_records`.
4. Entity detection and hallucination analysis run on those outputs.
5. The processed records are upserted back into `ai_response_records`.
6. The dashboard reads from `ai_response_records` to compute rankings, keyword themes, and content ideas.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Project Progress: Market Lens

Project: Market Lens (AI Visibility SaaS)
Stack: Next.js (App Router) + TypeScript + Tailwind
Status: Building gradually, no over-engineering.

## Building Objective
Build an "SEO analytics platform for AI answers" that helps brands:

1. Monitor whether they appear in AI-generated recommendations.
2. Detect hallucinations/misinformation in AI responses.
3. Understand source/domain influence behind AI answers.
4. Get actionable optimization recommendations.

This should be built incrementally, with clean modular TypeScript code, production-minded structure, and small focused steps.

## Most Recent Work Completed (Step 1)
Step 1 is complete: a temporary manual prompt input path.

Implemented:

1. Frontend page: `/manual-prompt`
   - Textarea prompt input
   - Local state handling
   - Empty/whitespace validation
   - Submit button disabled when input is empty
   - Loading/success/error states
2. Backend endpoint: `POST /api/manual-prompt`
   - Accepts `{ prompt: string }`
   - Validates non-empty trimmed prompt
   - Returns success payload with message + prompt
3. Small shared typing/util modules for request/response and prompt normalization.
4. Basic tests:
   - Frontend validation/submit behavior
   - Backend success + validation cases
5. Documentation wording updated to clarify this is a temporary/manual input source until full QIS is added.

Important constraint: This is intentionally a manual fallback path, not full Query Intelligence System logic.

## What Is Next (Immediate)
Implement Step 2 in a minimal way:

1. Add a simple "manual submissions history view" (in-memory only, no DB yet) OR
2. Add the first basic "response processing shell" behind the API (still no external AI connectors), depending on architecture preference.

Preferred path:

- Keep `/manual-prompt` as input source.
- Add minimal backend domain structure for future expansion (without adding queues/auth/db).
- Maintain current behavior and tests.

## General Features To Incorporate Later (Roadmap)

1. Query Intelligence Layer
   - Prompt generation from seed topics, templates, and categorization metadata.
2. AI Response Collection Layer
   - Connectors for ChatGPT/Perplexity/Gemini/Claude/etc.
   - Scheduled execution + response storage.
3. Entity Detection Layer
   - Brand/product/retailer extraction and sentiment tagging.
4. Hallucination & Accuracy Detection
   - Claim extraction + fact validation against trusted sources.
5. Source Attribution Layer
   - Domains/pages cited, influence scoring.
6. Insights & Analytics Engine
   - Visibility score, share of voice, category presence, competitor comparison.
7. Action & Optimization Layer
   - Practical recommendations for content/schema/coverage fixes.
8. Dashboard Layer
   - Visibility summary, alerts, prompt coverage, trend views.

## Guardrails

1. TypeScript only.
2. Keep implementation simple and modular.
3. No database, auth, queues, analytics infra, or AI platform connectors unless explicitly requested.
4. No full QIS implementation yet.
5. Small focused changes with clear run/test instructions after each step.

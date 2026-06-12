# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Sous Chef v2 — an AI meal-planning + grocery/expense agent for an Indian household. A React PWA talks to a FastAPI backend whose "brain" is `backend/agent/graph.py`. The long-term goal is to generalize this into a multi-household app (onboarding, per-family budgets/preferences); today it is single-household with shared Supabase tables (no `household_id` / auth yet).

## Deployment topology (read this first)

- **This repo (`supriyalambor/claude-code-sous-chef`) is the one that deploys.** A sibling repo `new-agent-sous-chef` exists and looks almost identical — do **not** push app changes there expecting them to go live. Confirm `git remote -v` before committing.
- **Frontend** → Vercel, auto-deploys on push to `main`. Root directory = `frontend`, framework = Vite, output = `dist`.
- **Backend** → Railway, auto-deploys on push to `main`. Dockerfile build, public domain bound to **port 8080**.
- Live backend: `https://claude-code-sous-chef-production.up.railway.app` (test with `/health`).
- There is no `gh` CLI installed here; use the GitHub REST API with the stored git credential for PR operations.

## Commands

Backend (from `backend/`):
```bash
pip install -r requirements.txt
cp .env.example .env                       # fill in keys
uvicorn main:app --reload                  # local dev server
python test_sous_chef.py                   # MUST pass before every deploy — prints "🚀 ALL TESTS PASSED"
```

Frontend (from `frontend/`):
```bash
npm install
npm run dev                                # local dev
npm run build                              # production build
```

`test_sous_chef.py` is the gate before shipping any `graph.py` change. It is a **static + simulation** test: it reads `graph.py` as source text, AST-checks structure, validates the meal data tables, and runs a 100-week simulation of the planning rules. It does not import `graph.py`, so it needs no dependencies/keys.

## Architecture

**The meal-planning logic lives in Python, not the LLM.** This is the core design decision. `plan_week()` in `backend/agent/graph.py` deterministically generates the week (gravy/sabzi/protein/starch per day, no repeats, rule-enforced). The LLM (Groq `llama-3.1-8b-instant`) only **formats** the already-decided plan and handles free-form conversation/tool calls. When editing meal behavior, change the Python rules — do **not** rely on prompting the LLM.

Request flow (`POST /api/chat` → `run_agent` in `graph.py`):
1. Keyword intent detection on the user message (`wants_plan`, `wants_today`, `wants_shopping`, meal-logging).
2. If a plan is wanted: load history + preferences + pantry, call `plan_week()`, save to Supabase, build a structured shopping list, and inject the finished plan into the prompt with strict "present this exactly" instructions (the LLM is explicitly told not to invent meals).
3. Otherwise: normal LLM turn with the tool loop (up to 10 tool calls) for expenses/pantry/preferences/meal-logging/email.

**Supabase is accessed via raw `httpx` REST calls, not the `supabase` Python client** (see `sb_url()`/`sb_headers()` in `graph.py` and the `api/*.py` routers). Tables: `meal_plans`, `expenses`, `pantry_inventory`, `preferences`. The pantry column is `in_stock` (not `instock`). Queries are currently unscoped (shared across all users) — adding multi-household means adding a `household_id` column and filtering every query.

Backend layout:
- `main.py` — FastAPI app, CORS `*`, routers, `/api/chat`, `/api/weekly-plan`, `/health`.
- `agent/graph.py` — all agent logic: meal data tables, `plan_week()`, `generate_shopping_list()`, the `TOOLS` definitions + `execute_tool()`, `run_agent()`, and `run_weekly_agent()`.
- `api/expenses.py`, `api/meals.py`, `api/preferences.py` — CRUD routers.
- Railway cron (`railway.json`) hits `/api/weekly-plan` every Friday 12:00 UTC → `run_weekly_agent()` plans next week and emails both household members via Resend.

Frontend: single-file UI in `src/App.jsx` (chat + Shop + Spend tabs, table renderer, voice input via `hooks/useVoice.js`). `App_old.jsx` is dead.

## Meal rules

`SOUS_CHEF_SUMMARY.md` documents the intended rules, **but treat it as potentially stale — the user's stated preferences override it.** Real eating habits include items the summary's "approved" lists omit (e.g. pepper chicken, sea bass, chicken xacuti). The actual rule shape from the user: every meal = gravy + sabzi + starch; dal-type gravies pair with chicken/fish + rice; bean gravies (rajma/chole) take paneer bhurji + rice/roti; paneer/chicken gravies take roti/paratha; Sundays lean to stuffed paratha + chicken gravy. Weekly rotation currently spaces chicken across Mon/Wed/Sat (non-consecutive); in monsoon (Jun–Sep) Friday's fish becomes veg. When meal rules and the doc disagree, ask or follow the user — don't silently enforce the doc.

## Gotchas

- **Vite env vars are baked in at build time.** Changing `VITE_API_URL` (or any `VITE_*`) in Vercel requires a **redeploy** to take effect — setting the variable alone does nothing.
- **`VITE_API_URL` must be a full origin.** `App.jsx` normalizes it (adds `https://` if the scheme is missing, strips trailing slashes), so a bare host or trailing `/` no longer breaks calls — but an *empty* value falls back to `http://localhost:8000`.
- **Railway public domain must target port 8080**, matching the app. A 502 on the live URL usually means the port binding is wrong.
- Email requires `RESEND_API_KEY`; meal generation requires `GROQ_API_KEY`.

## Environment variables

Backend (Railway): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`, `SUPRIYA_EMAIL`, `VIVEK_EMAIL`. (`.env.example` lists a legacy `OPENROUTER_API_KEY`; the code uses Groq.)

Frontend (Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.

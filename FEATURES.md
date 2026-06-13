# Sous Chef — Feature Lineup

This is the backlog the build routine works through. See `VISION.md` for the why.

## How this works
- Add features as unchecked items (`- [ ]`) under the right phase.
- Each run: the routine picks the **topmost unchecked item**, implements it on a branch,
  runs `backend/test_sous_chef.py` (if backend touched), and opens a PR. It does **not**
  push to `main` directly.
- When a PR merges, check the item off (`- [x]`) and note the PR number.
- Keep each item **self-contained**: file paths + acceptance criteria, no outside context.

## Conventions
- Backend meal logic lives in Python (`backend/agent/graph.py`), not the LLM.
- UI direction: agent-first, sleek-health (see `frontend/src/preview/MealPlanPreview.jsx`).
- Health features **suggest, never diagnose**.

---

## Phase 1 — Extend what exists (no auth needed)

- [x] **Roll the agent UI into the live app.** Sleek-health agent UI + rings card now
  live in `frontend/src/App.jsx`, wired to real endpoints, voice kept. (Shipped.)

- [ ] **Accept → grocery gate.** Generating a plan should not auto-build groceries;
  the grocery list is triggered only when the user taps Accept. Add an `accepted`
  state on `meal_plans` and an explicit accept action. Acceptance: a plan can exist
  un-accepted; grocery list appears only after accept.

- [ ] **Spend categories.** Extend `expenses` with a `category` column (`grocery`,
  `toiletries`, `cleaning`, `health`, `other`) and add category chips to the daily
  check-in + Spend UI. (Daily spend check-in itself is shipped; categories pending.)

- [ ] **Spend insights.** Monthly breakdown by category with the existing budget
  projection (₹38,000 target). Simple bars/rings in the Spend view.

## Phase 2 — Accounts (prerequisite for health/personal data)

- [ ] **Supabase Auth (Google login).** Add sign-in; gate the app behind a session.
- [ ] **Multi-household data model.** Add `household_id` to `meal_plans`, `expenses`,
  `pantry_inventory`, `preferences`; filter every query by the signed-in household.
  (Today queries are unscoped — see `api/*.py` and `graph.py`.)
- [ ] **Onboarding.** Capture members (age/sex/weight/height/goal), weekly budget,
  veg/non-veg, region. Replace hardcoded targets/rules with per-household profile.

## Phase 3 — Adaptive nutrition (needs Phase 2 + input decisions)

- [ ] **DECISION: calorie-burn source.** Manual entry vs wearable (Apple Health /
  Google Fit / Fitbit). Blocks the rest of this phase.
- [ ] **DECISION: "what I actually ate" source.** Confirm planned meal vs log
  deviations.
- [ ] **Daily nutrition target engine.** From intake + calories burned, compute
  "eat ~X kcal / Y g protein today."
- [ ] **Feed targets back into meal generation.** `plan_week()` consumes the daily
  target so meals respond to the day instead of being fixed.

## Phase 4 — Preventive health (longest horizon)

- [ ] **Pattern tracking.** Aggregate eating/spend/activity trends over weeks/months.
- [ ] **Blood-test suggestions.** From patterns, suggest monthly/quarterly tests,
  framed as "discuss with your doctor." Must not diagnose.

## Phase 1.5 — The "agent that works for me" (data-driven autonomy)

The vision in the user's words: an agent that reminds them, logs their data, scans
bills to learn prices, recommends monthly groceries from real usage, detects habit
changes, and checks daily whether they actually ate the plan.

- [x] **Proactive daily spend check-in** — agent asks "spend anything today?" once a
  day with inline logging. (Shipped.)
- [x] **Daily meal-adherence check** — agent asks "did you eat the plan, or switch it
  up?" and logs the actual meal. (Shipped.)
- [ ] **Receipt / bill scanning (OCR)** — user photographs a grocery bill; the agent
  extracts line items + prices and stores them. *Needs a vision-capable model (the
  current Groq llama-3.1-8b is text-only) — decision required on model/service.*
- [ ] **Price intelligence store** — a `prices` table (item, price, source, date) fed
  by scanned bills + manual entry, so cost estimates use real recent prices instead of
  the hardcoded Mango list. Shopping-list totals read from here.
- [ ] **Monthly grocery recommendation** — from logged consumption (pantry usage +
  purchases + adherence), predict and propose the month's staples and quantities.
- [ ] **Habit-change detection** — track eating/spending time-series; surface shifts
  ("you've had chicken 5×/week lately, up from 3", "grocery spend trending +15%").
- [ ] **Smart reminders** — proactive nudges beyond app-open: "weekly shop due in 2
  days", "₹2k left in budget", "you're low on atta". Needs a delivery channel (daily
  cron + email/push, building on the existing Friday cron).
- [ ] **Real macros** — compute actual kcal/protein per meal for both people so the
  rings reflect reality, not fixed targets.

## Open decisions (block dependent features)
- **Calorie-burn source** for adaptive nutrition: manual entry vs wearable.
- **Vision model** for bill scanning: which multimodal model/service.
- **Auth/accounts**: needed before per-person health data is meaningful.

---

## Done
- [x] Proactive daily spend check-in (chat-initiated, inline logging)
- [x] Daily meal-adherence check (logs actual vs planned)

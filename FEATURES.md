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

- [ ] **Roll the agent UI into the live app.** Replace the plain chat/tabs in
  `frontend/src/App.jsx` with the agent-first conversation + rich cards from
  `frontend/src/preview/MealPlanPreview.jsx`, wired to the real `/api/chat` and
  meal/shopping/expense endpoints. Keep voice input. Acceptance: live app (no
  `?preview` flag) shows the new design and still talks to the backend.

- [ ] **Accept → grocery gate.** Generating a plan should not auto-build groceries;
  the grocery list is triggered only when the user taps Accept. Add an `accepted`
  state on `meal_plans` and an explicit accept action. Acceptance: a plan can exist
  un-accepted; grocery list appears only after accept.

- [ ] **Daily spend check-in with categories.** Proactively ask once a day "did you
  spend anywhere?" and log into categories beyond food: `grocery`, `toiletries`,
  `cleaning`, `health`, `other`. Extend the `expenses` table with a `category` column
  and the Spend UI with category chips. Acceptance: a non-food spend can be logged and
  shows in the monthly budget total.

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

---

## Done
<!-- - [x] Example completed feature (PR #N) -->

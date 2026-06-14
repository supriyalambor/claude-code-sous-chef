# Sous Chef — Feature Lineup

Backlog for the daily build routine. See `VISION.md` for the why.

## Conventions
- Backend meal logic lives in Python (`backend/agent/graph.py`), not the LLM.
- UI direction: agent-first, sleek-health dark theme.
- Health features **suggest, never diagnose**.
- All changes go to `claude-code-sous-chef` only.

---

## ✅ Shipped

- [x] Agent UI with sleek-health design, rings card, framer-motion animations
- [x] Weekly meal plan generation (Python logic, not LLM)
- [x] Daily spend check-in — agent asks once a day, inline logging
- [x] Daily meal-adherence check — "did you eat the plan?"
- [x] Bill scanning — 📷 button, multi-image, Groq vision (llama-4-scout)
- [x] Voice input (🎤 hold to speak)
- [x] Shopping list with platform grouping (Licious / Instamart / Blinkit / Mango)
- [x] Expense tracker with budget ring and projected spend
- [x] Weekly email to Supriya + Vivek every Friday

---

## Phase 1 — Polish what exists (no auth needed)

- [ ] **Accept → grocery gate.** Plan appears in chat with an "Accept this week"
  button. Shopping list only revealed after Accept — not auto-shown.
  Files: `frontend/src/App.jsx` (meal_plan message type + Accept button),
  `backend/agent/graph.py` (gate shopping_list in meal_plan object).

- [ ] **Spend categories.** Add `category` column to `expenses` table
  (`grocery`, `toiletries`, `cleaning`, `health`, `other`). Show category
  chips in daily check-in and Spend tab.

- [ ] **Spend insights.** Monthly bar chart by category in the Spend view.
  Show which category is eating the budget ("Groceries 68%, Toiletries 14%…").

- [ ] **PWA polish.** Update `manifest.json` with correct icon, name, theme
  colour. Add offline splash. Lets Supriya add it to iPhone home screen from
  Safari with a polished look (free, no App Store needed right now).

- [ ] **Real macros.** Compute actual kcal + protein per meal from an
  ingredient table. Rings show real numbers, not fixed 1700/130g targets.

---

## Phase 1.5 — Agent autonomy (data-driven, no auth needed)

- [ ] **Price intelligence store.** `prices` table (item, price, store, date)
  fed by bill scans. Shopping-list cost estimates read from here instead of
  hardcoded values. Agent learns "eggs are ₹160/doz now, not ₹139."

- [ ] **Monthly grocery recommendation.** From pantry usage + bill scans +
  meal adherence logs, predict and propose next month's staples + quantities.
  "You go through ~3kg chicken/week — add 12kg to your monthly order."

- [ ] **Habit-change detection.** Surface shifts in eating/spending patterns.
  "You've had chicken 5×/week lately, up from 3." "Grocery spend up 15% vs
  last month." Shown as a weekly insight card in chat.

- [ ] **Smart reminders via email.** Proactive nudges beyond app-open:
  "weekly shop due in 2 days", "₹3k left in budget", "you're low on atta."
  Piggyback on the existing Friday cron + Resend email.

---

## Phase 2 — Accounts + security (prerequisite for multi-household)

- [ ] **Google login via Supabase Auth.** Add sign-in page; gate the entire
  app behind a session. Free up to 50,000 users on Supabase free tier.

- [ ] **Multi-household data model.** Add `household_id` to `meal_plans`,
  `expenses`, `pantry_inventory`, `preferences`. Filter every query by the
  signed-in household. Today all queries are unscoped.

- [ ] **Onboarding flow.** After first login, capture: members (name, age,
  sex, weight, height, goal), weekly grocery budget, veg/non-veg preference,
  region (affects fish availability, monsoon rules). Replace hardcoded
  Supriya/Vivek targets with per-household profile.

- [ ] **Multi-member profiles.** Each household member gets their own
  calorie + protein target. Meal plan generates portions for all members.
  ("Supriya: 1700 kcal / Vivek: 2200 kcal / add a third member.")

---

## Phase 3 — House management (beyond meals)

- [ ] **Utility bill tracking.** Log electricity, water, internet, gas bills
  separately from grocery spend. Monthly view shows household running cost.

- [ ] **Home maintenance reminders.** Track recurring tasks: AC service
  (every 3 months), pest control, water purifier filter, society dues.
  Agent nudges you when one is due.

- [ ] **Shared task / chore list.** Simple weekly chore assignment between
  household members. Agent checks in: "Vivek, did you pay the electricity
  bill this week?"

---

## Phase 4 — Adaptive nutrition (needs Phase 2 + decisions)

- [ ] **DECISION: calorie-burn source.** Manual entry vs Apple Health /
  Google Fit / Fitbit integration. Blocks this whole phase.
- [ ] **Daily nutrition target engine.** Intake + calories burned →
  "eat ~X kcal / Y g protein today." Adjusts if you skipped the gym.
- [ ] **Adaptive meal generation.** `plan_week()` consumes the daily target
  so meals respond to actual activity, not fixed weekly template.

---

## Phase 5 — Preventive health (longest horizon)

- [ ] **Pattern tracking.** Aggregate eating, spend, activity over months.
- [ ] **Blood-test suggestions.** From patterns, suggest tests framed as
  "worth discussing with your doctor." Never diagnose.

---

## Open decisions
- **Calorie-burn source** — manual vs wearable (blocks Phase 4)
- **App Store** — PWA on iPhone home screen for now; Play Store ($25) when
  ready to go public; Apple App Store ($99/yr) when scaling

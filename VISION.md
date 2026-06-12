# Sous Chef — Product Vision

## One line
A closed-loop health + household app: it plans your meals, runs your grocery list, tracks every spend, adapts your nutrition to how your body is doing, and watches the long-term trends to nudge you toward preventive health checks.

## The core idea — a feedback loop, not separate tools
The modules are not independent features; they feed each other:

```
        ┌─────────────────────────────────────────────┐
        ▼                                               │
   PLAN MEALS ──► you accept ──► GROCERY LIST ──► SPEND (auto-logged)
        ▲                                               │
        │                                               ▼
   ADJUST TARGETS ◄── cals burned + what you ate ── DAILY CHECK-IN
        │                                          ("eat anywhere? spend anywhere?")
        ▼
   HEALTH FLAGS ──► suggest blood tests (monthly / quarterly)
```

## Modules

### 1. Meal engine (exists today)
Auto-generates the week's meals from rules in `plan_week()`. **Change needed:** make "accept" an explicit gate — accepting a plan is what triggers the grocery list, rather than generating both at once.

### 2. Expense tracker (partly exists — needs widening)
Two streams:
- **Food / grocery** — flows automatically from accepted meal plans.
- **Household & personal** — toiletries, cleaning supplies, tissue, skincare, etc. (new categories).
- **Proactive daily check-in:** the app asks "Did you spend anywhere today?" and logs the answer into the right category. Budget projection already exists (monthly target ₹38,000).

### 3. Adaptive nutrition (new — the health core)
Closes the loop between **intake** (what was actually eaten) and **expenditure** (calories burned that day) to compute a daily target ("eat ~X kcal / Y g protein today") and **feed that back into the next meal generation**. Meals shift from fixed rules to responsive-to-your-day.

### 4. Preventive health (new — longest horizon)
Watches eating/health patterns over weeks/months and **suggests** monthly/quarterly blood tests (framed as "things to discuss with your doctor," not medical advice).

### 5. UI / experience (cross-cutting)
Current UI is functional but plain (chat + Shop + Spend tabs). The app should feel **engaging and motivating** — visual meal cards, progress rings for cals/protein/budget, streaks, animations (framer-motion is already a dependency). A health app people open daily needs to feel alive, not like a form.

## Open questions (decide before the dependent module)
1. **Calorie-burn source** — manual entry vs wearable integration (Apple Health / Google Fit / Fitbit). *Blocks Module 3.*
2. **"What I actually ate" source** — confirm planned meal vs log deviations ("ate out"). *Blocks Module 3.*
3. **Blood-test logic** — generic guidelines vs derived from logged data. *Blocks Module 4. Must stay "suggest, don't diagnose."*
4. **Multi-user** — targets/activity/health are per-person, so accounts + per-user data become required, not optional. Today tables are shared/unscoped.

## Build order (each builds on the last)
1. **Accept → grocery gate** + **daily spend check-in with household/personal categories** — extends what exists, immediately useful.
2. **UI revamp** — can largely proceed in parallel; makes everything else feel worth using.
3. **Per-user accounts** (Supabase Auth + `household_id` on every table) — prerequisite for anything health/personal.
4. **Adaptive nutrition** — needs intake + activity inputs (Q1/Q2) decided.
5. **Preventive health / blood tests** — needs months of data anyway.

## Guardrails
- Health features **suggest and inform; never diagnose**. Always defer to a doctor.
- Indian home cooking only for meals.
- The user's spoken preferences override `SOUS_CHEF_SUMMARY.md` (which is stale).

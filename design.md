# Chore Tracker — Design Specification

Source prototype: `Chore Tracker.dc.html`
Platform: Android (Material-style layout, 412 × 892 dp reference)
Visual system: Nocturne (dark, compact, outlined accent)

## 1. Purpose

A personal tracker for household chores. The user logs each chore as they do it, and the app compares how often they did it with how often the whole household *should* do it. The result is the user's share of the household workload, per chore and overall, compared with a fair share (1 ÷ household size).

Scope: single user. Other household members are not tracked; their work is inferred as the gap between expected and logged.

## 2. Core concepts

| Term | Definition |
| --- | --- |
| Chore | A single, atomic task (e.g. "Load dishwasher", not "Dishes"). Has name, category, expected rate. |
| Category | User-defined group for chores (Kitchen, Laundry, …). Display and grouping only. |
| Expected rate | How often the **whole household** should do the chore: `n` times per `day` \| `week` \| `month`. |
| Log entry | One completion of a chore by the user, with a day and timestamp. |
| Household size | Number of people in the home (1–12). Default 3. |
| Fair share | `1 / householdSize` (e.g. 33% for 3 people). |
| Share | `myCount / expectedCount` over a date range. |

### Chore granularity
Chores are split into base steps. Seeded defaults:

- **Kitchen:** Wash dishes by hand (1/day), Load dishwasher (1.2/day), Unload dishwasher (1.2/day), Wipe counters (1/day), Take out trash (3/week)
- **Meals:** Make breakfast (1/day), Make dinner (1/day), Pack lunches (5/week), Grocery shopping (1/week)
- **Laundry:** Load washer (5/week), Load dryer (5/week), Fold laundry (5/week), Put laundry away (5/week)
- **Pets:** Feed dog (2/day), Walk dog (2/day), Clean up yard (2/week)
- **Cleaning:** Vacuum (2/week), Clean bathroom (1/week), Mop floors (1/week)
- **Other:** (empty)

## 3. Data model

```ts
type Period = 'day' | 'week' | 'month';

interface Chore {
  id: string;
  name: string;
  cat: string;        // category name
  n: number;          // expected household count per period, > 0
  per: Period;
}

interface LogEntry {
  id: number;
  c: string;          // chore id
  d: number;          // local day index (days since 2000-01-01)
  t: number;          // epoch ms timestamp
}

interface AppData {
  chores: Chore[];
  cats: string[];     // ordered category list
  logs: LogEntry[];
  household: number;  // 1–12
  nid: number;        // next log id
}
```

Persistence: the whole `AppData` object is saved as JSON to local storage (`choretrack-v1`) whenever chores, logs, categories or household size change. A production build should use on-device storage (Room/SQLite) with the same schema.

Period to per-day conversion: `day = 1`, `week = 7`, `month = 30.44`.

## 4. Calculations

For a date range `[from, to]` inclusive, `days = to − from + 1`:

```
expectedPerDay(c)  = c.n / PERIOD_DAYS[c.per]
expectedCount(c)   = expectedPerDay(c) × days
myCount(c)         = logs in range where log.c == c.id
myPerDay(c)        = myCount(c) / days
share(c)           = myCount(c) / expectedCount(c)

overallShare       = Σ myCount / Σ expectedCount   (all chores)
fairShare          = 1 / household
fairMultiple       = share / fairShare             (shown as "1.7× a fair share")
```

Status thresholds (used for color):
- **Above fair share:** `share > fairShare × 1.15` → accent color
- Otherwise → neutral

Worked example: Load dishwasher, 3 months (91 days), expected 1.2/day → 109 expected. User logged 81 → 0.89/day, share 74%, fair share 33%, 2.2× fair share.

### Trend buckets
Range is split into buckets. Bucket size:
- ≤ 14 days → 1 day
- ≤ 45 days → `ceil(days / 10)` days
- otherwise → 7 days (weekly)

Each bucket shows `share` for that bucket. Chart height is scaled to `max(2 × fairShare, 100%, max bucket share)`. A dashed line marks the fair share.

## 5. Information architecture

Bottom navigation, 3 tabs:

1. **Log** (default) — record chores
2. **Insights** — analysis
3. **Chores** — manage chores, categories, household, export

Overlays:
- **Chore detail** — full-screen push from Insights
- **Chore sheet** — bottom sheet for add/edit chore
- **Category sheet** — bottom sheet for add/edit/delete category
- **Snackbar** — transient confirmation with Undo

## 6. Screens

### 6.1 Log
- **Header:** kicker (weekday + date, or "Logging for a past day"), title ("Today" / "Yesterday" / "Mon, Sep 21").
- **Day stepper:** ‹ › icon buttons (44 dp). › is disabled on today. No future logging.
- **Summary line:** "12 logged today", or an empty-state prompt.
- **Chore list:** grouped by category (category label in small caps above a surface card). Each row:
  - Name (15 sp, medium) + subline "Household expects 1.2 / day"
  - **−** ghost button (hidden when count is 0; the space is kept so rows stay aligned)
  - Count (18 sp, tabular); dimmed when 0
  - **+** outlined accent button (44 dp)
- **Behavior:**
  - + creates a log entry. Today uses the current time; past days use 12:00.
  - − removes the most recent entry for that chore on that day.
  - Both show a snackbar with Undo (5 s).

### 6.2 Insights
- **Range selector:** segmented 7D / 30D / 3M / Custom. Default 3M (91 days).
- **Custom:** two native date inputs (From / To). To is capped at today; From ≤ To.
- **Range label:** "Jun 29 – Sep 27 · 91 days".
- **Hero card:**
  - "Your share of expected household chores"
  - Large % (56 sp) + "1.7× a fair share" (accent-300)
  - Horizontal bar (0–100%) with a fair-share marker
  - Footnote: fair share explanation + "N chores logged of about M expected"
- **Trend card:** bar chart of overall share per bucket, dashed fair-share line, start/end date labels. Bars above the threshold use the accent color; the rest are neutral.
- **By chore list:** sorted by share, highest first. Each row: name, share %, "You 0.89/day · household expects 1.2/day", progress bar with fair-share marker. Tap to open chore detail.

### 6.3 Chore detail
- Top bar: back arrow, edit (pencil) button that opens the chore sheet.
- Kicker = category, title = chore name, range label (inherits the Insights range).
- **Stat tiles (3-col):** You (per day), Expected (per day), Your share (% + "×fair share"). The share tile gets an accent edge when above fair share.
- **Plain-language sentence:** "You did this 81 times in 91 days. The household expects about 109, so you covered 74% of it. An even split between 3 people would be 33%."
- **Trend card:** same as Insights, scoped to this chore.
- **History:** entries in range, newest first (max 40 shown), each with date, time and a delete button (with Undo). Footnote: past entries are added from the Log tab.

### 6.4 Chores (manage)
- Header: "Chores" + outlined "Add chore" button (single line, no shrink).
- Helper text: expected counts are for the whole household.
- **Chore list** grouped by category. Row: name, rate ("1.2 / day"), caret. Tap → chore sheet.
- **Categories section:** row per category with chore count, plus a "New category" row. Tap → category sheet.
- **Household section:**
  - People in household stepper (− n +), subline "Fair share is 33% each"
  - Export data row: "CSV of all N entries", download icon

### 6.5 Chore sheet (bottom sheet)
- Title: "New chore" / "Edit chore"
- Name text field
- Category chips (single select) + dashed "New category" chip. That chip opens an inline text field with Cancel / Add. Adding creates and selects the category; names are matched case-insensitively, so an existing name is selected instead of duplicated.
- Expected: number input + "times per" + segmented day/week/month
- Live hint: "About 0.71 per day, or 65 over 3 months."
- Actions: Delete (edit only; deletes the chore **and its logs**), Cancel, Save (disabled if name is empty or n ≤ 0)
- Tapping the backdrop dismisses the sheet.

### 6.6 Category sheet (bottom sheet)
- Title: "New category" / "Edit category"
- Name field. Validation: not empty, and not the same as another category (case-insensitive).
- Hint: rename keeps chores and history; for a new category, empty categories appear only in the manage list.
- **Delete:**
  - Empty category → removed right away.
  - Has chores → inline panel "Move N chores to:" with category chips (defaults to "Other" if present), then "Keep category" / "Delete and move".
  - Hidden when it's the only category.
- Rename updates every chore in the category.

### 6.7 Snackbar
- Floats 76 dp above the bottom, 12 dp side insets, neutral-800 surface, large shadow.
- Text + "Undo" ghost button. Auto-dismisses after 5 s; a new snackbar replaces the current one.

## 7. Export
CSV, UTF-8, sorted by timestamp:

```
date,time,chore,category
2026-06-01,07:42,"Load dishwasher",Kitchen
```
Filename: `chore-log.csv`.

## 8. Visual specification (Nocturne)

Use tokens from the design system stylesheet. Don't hard-code values the tokens already provide.

### Color
| Role | Token |
| --- | --- |
| App ground | `--color-bg` (#161826) |
| Cards / sheets | `--color-surface` (#232532) |
| Text | `--color-text` (#e9e9ed) |
| Muted text | `--color-neutral-400/500` |
| Dividers | `--color-divider` |
| Bar tracks | `--color-neutral-800` |
| Row hover | `--color-neutral-900` |
| Accent (lines, + buttons, over-share bars) | `--color-accent` (#9184d9) |
| Selected pill / segment fill | `--color-accent-900` |
| Accent text on tints | `--color-accent-300` |
| Scrim | black 55% |

Rules: the accent is used for lines, outlines and data marks only. Never fill large areas with it. No pure black or white.

### Type (Inter)
| Use | Size / weight |
| --- | --- |
| Screen title | 28 sp / 500 |
| Hero figure | 56 sp / 500, −0.03em |
| Stat tile figure | 24 sp / 500 |
| Sheet title | 20 sp / 500 |
| Row title | 15 sp / 500 (log, insights) or 400 (manage) |
| Body / helper | 13 sp |
| Subline / meta | 12 sp |
| Section label | 11 sp, uppercase, 0.08em tracking |
| Nav label | 12 sp / 500 |

Numbers use `font-variant-numeric: tabular-nums`. Headings never go above weight 500.

### Shape & spacing
- Cards and sheets: `--radius-lg` (14). Buttons and inputs: `--radius-md` (8). Chips: fully rounded (18).
- Screen padding: 16 dp horizontal. Section gap: 20–26 dp. Row padding: 8–12 dp vertical, 14 dp left.
- Minimum touch target: **44 dp** for every interactive element.

### Components
- **Buttons:** `.btn-primary` = 1 px accent outline on transparent. `.btn-secondary` = divider outline. `.btn-ghost` = text only. Never filled.
- **Segmented control:** 1 px divider border; the selected segment uses accent-900 fill and accent-300 text.
- **Bottom nav:** 3 items. The active item has a 56 × 30 pill (accent-900) behind a filled icon and accent-300 color. Inactive items are neutral-500 with outline icons.
- **Progress bar:** 6–8 dp track (neutral-800), fill accent (over threshold) or neutral-500, 2 dp fair-share marker.
- **Icons:** Phosphor (regular, and fill for the active nav item). Used: caret-left/right, plus, minus, check-square, chart-bar, list-bullets, arrow-left, pencil-simple, trash, download-simple.

### States
- Hover/press: accent tint from the ramp (see Nocturne `.btn` rules).
- Focus: 2 px accent outline, 2 px offset (`:focus-visible`).
- Disabled: 45% opacity.

## 9. Configuration flags (prototype tweaks)
| Flag | Default | Effect |
| --- | --- | --- |
| `showFairShare` | true | Shows or hides fair-share markers and trend lines |
| `defaultRange` | `3M` | Insights range when the app opens |
| `startTab` | `log` | Tab shown when the app opens |

## 10. Edge cases
- Chore with expected `n = 0` is blocked at save, so share is never divided by zero.
- Custom range where From is after To: the dates are swapped when computing.
- Deleting a chore deletes its logs, with no undo. Consider adding a confirm dialog in production.
- A category is only shown in the Log and Insights groupings when it contains at least one chore.
- Share can exceed 100% (the user did more than the household's expected total). Bars cap at 100%, but the % label shows the true value.

## 11. Out of scope / future
- Multi-member logging and per-person comparison
- Effort weighting per chore (e.g. minutes), so the overall share reflects time rather than counts
- Reminders / notifications
- Cloud sync and backup
- Adding a past entry at a specific time from the detail screen

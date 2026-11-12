# Stint — MVP Prototype Spec

## Purpose
An interactive front-end for testing, playing with, and defining what the product should eventually be.

**Out of scope:** backend, database connections, accounts/auth, or any advanced infrastructure.

**Data:** persisted in localStorage, so a refresh keeps it. On first load the calendar is seeded with realistic sample data (tasks, events, routines, notes, finished sessions, projects).

**Guiding principle:** simplicity. Every addition should keep the calendar feeling as light and fast as a spreadsheet.

## Baseline features

1. **Single-page calendar**: organize your life in one calendar view.
   - Desktop: monthly view
   - Mobile: weekly view
2. **Focus session manager**: work in focus sessions (start, set the time, do the work).
   - Sessions live inside the calendar. There is **no stats view**: looking back at the calendar is the history.
3. **Projects**: color-coded labels that can be assigned to any item.

## Page structure

### Navbar
- **Left:** Stint logomark + a small, seamless "start a Stint" button. Once a session starts, the running counter shows in its place in the navbar.
- **Month navigation:** previous / next month + a "Today" control in the navbar.
- **Far right:** menu icon. Holds anything that doesn't fit the calendar view (profile, advanced settings, etc.). Its contents will be defined later.

### Calendar (desktop: month)
- **Columns:** Monday → Sunday, plus an 8th column per week for **Weekly goals, notes, backlog**.
- **Rows:** one row per week until the month ends, plus a final row for **Monthly goals, notes, backlog**.
- The month does **not** have to fit the viewport; the page scrolls vertically.
- **Each day scrolls on its own:** a day shows about 10 rows, empty ones included (like the spreadsheet), and scrolls inside its cell when there are more.
- **Today:** marked very subtly. It must not affect the overall simplicity.
- Days outside the current month are greyed out.

### Calendar (mobile: week)
- The user moves between weeks by swiping or with arrows.
- The weekly cell sits below the 7 days, and the monthly cell at the bottom.

### Day layout (list view)
A day is a vertical list of rows, and any row can hold any item type.

Reference: the user's Google Sheets monthly planner (`Planner 2026`):
- Black header bar with weekday names (Monday → Sunday).
- Each day block shows its date number in the top-left, followed by a stack of thin, equal-height rows.
- Rows are free-form, one item per row. Filled rows have a light grey fill and empty rows stay white.
- Thick borders separate the weeks; thin lines separate the rows.
- In the sheet, item types are written by hand as text. The app should give each type a real structure:
  - time ranges: `(5 - 5:30) meet Dave`
  - durations: `(1h) Portfolio: projects section`
  - all-day items: `Breez (All day)`
  - ongoing items: `ongoing: invoice pc…`
  - progress counts: `daily repose 3/5`

The goal is to keep the speed and density of the spreadsheet while adding structure.

## Calendar item types

| Type | Fields / behavior |
|---|---|
| **Task** | Checkable. The default type. Unfinished tasks stay on their day (no carry-over). |
| **Focus session** | States: `active` (running now) or `finished`. Cannot be scheduled ahead of time; sessions only exist once started. Can be paused, extended, and stopped early. There's no separate name: a session is labeled automatically by its timeframe and duration, e.g. `5:00–6:30 / 1.5h`. |
| **Note** | Free text |
| **Event** | Title, timeframe (`5:00–5:30`), link. The duration is calculated from the timeframe. The link opens in one click, so the user can join the meeting as it starts. |
| **Routine** | A task that repeats daily, weekly, or monthly. Each copy is checked off separately. The user can turn it off from any copy. Shown as a task with a repeat icon. |

### Weekly / monthly cells
Each holds three small labeled sections, stacked:
- **Goals:** checkable, with a distinct visual design so they stand out from regular items.
- **Notes:** plain text.
- **Backlog:** tasks.

## Projects
- Projects are represented by **colors**, shown as a small **color dot** on the row.
- They can be assigned to anything: tasks, sessions, notes, goals, events, backlog items, routines.
- **One project per item.**
- **Colors:** a fixed palette defined in OKLCH, with consistent lightness and chroma, so every color has the same visual weight.
- **Assigning:** two ways, both opening the same project list:
  - typing `#` while writing a row (like `/` for types)
  - right-click → "Project…" on an existing item
- They're created directly in the calendar, with no separate projects page:
  1. The user chooses to assign an item to a project.
  2. A small list of existing projects appears, with a **Create project** button.
  3. Create project: the user types the name in an input field and picks a color right there. The new project is assigned immediately.
- **Editing:** projects are renamed, recolored, and deleted straight from that same list, in a very minimal but clear way. There's no settings page for them.
- **Deleting:** the project's items stay. Each one keeps a **grey dot** labeled `~deleted-<projectname>`, which the user can remove from the item.

## Interactions

### Creating items
- Clicking an empty row shows a very simple placeholder hint that `/` opens more formats.
- Typing directly creates a **task**.
- Typing `/` opens a type picker: note, event, routine, etc.
- Typing `#` opens the project list (see Projects).
- **Inline links:** in any row with text, the user can select part of the text and attach a link to it. This applies to every type, not only events.
- **Event shortcut:** typing a time range at the start of a row (`5:00-5:30 Meet Dave`) turns it into an event automatically, the way the user writes in the spreadsheet today. `/event` also works. This is the starting approach and should be validated in the prototype.

### Ordering & moving
- **Time-bound items** (events, focus sessions) sort themselves by time by default. The user can still drag them elsewhere.
- **Drag & drop:** anything can be dragged anywhere on the visible calendar (within a day, between days, into the weekly or monthly cells).
- **Right-click menu on any row:** copy, cut, paste, clear. Since a month fills the whole screen, cut/paste is how items move to places outside the current view (e.g. another month).

### Keyboard
- `Cmd+C` / `Cmd+X` / `Cmd+V` on a selected row: copy, cut, paste.
- `Enter`: create a new row below.
- `Backspace` on an empty row: delete it.

### Focus session flow
1. The user clicks the navbar "start a Stint" button and sets the duration.
2. The session starts:
   - An `active` session row appears in today's cell, placed by time.
   - The counter runs in the navbar.
   - A **pop-out timer** opens automatically (see below).
3. While it runs, the user can pause, resume, or stop early. A session stopped early is saved as `finished` with the time actually worked.
4. **When the counter reaches zero:**
   - A soft notification sound plays.
   - The browser tab is highlighted and its title text changes.
   - The app waits for the user to respond. The user can **extend** the session or **confirm** it's finished.
5. Only once the user confirms is the row marked `finished`.

### Pop-out timer
- It opens as soon as a session starts, in a small always-on-top window, so the user stays aware of the active session while moving between desktop apps and browser tabs.
- Priority: as seamless and simple as possible.
- Implementation: the browser's Document Picture-in-Picture API (Chromium browsers). The click that starts the session is what opens the window.
- **Safari / Firefox:** no extra design for now. The rest of the session flow still works there; there's just no pop-out (see open questions).

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| App | React + TypeScript + Vite | Single-page app; no SSR needed |
| Styling | Tailwind CSS v4, `@/index.css` tokens, `cn()` (clsx + tailwind-merge), cva | The project palette is defined in OKLCH |
| Fonts / icons | Geist, dseg (7-segment timer), pixelarticons via svgr | |
| State + persistence | Zustand + `persist` middleware → localStorage | |
| Row text editing | TipTap | Minimal: single line, text + links only. **Only the row being edited mounts an editor**; every other row renders static text. The Link extension handles inline links, the bubble menu / `Cmd+K` attaches a link to selected text, and the Suggestion utility powers the `/` type picker and `#` project list. |
| Drag & drop | dnd-kit (core + sortable) | Drag across days, the weekly and monthly cells, and within a day; auto-scrolls inside scrollable cells |
| Menus / popovers | radix-ui | Context menu (copy / cut / paste / clear), the start-session and project popovers, the navbar menu |
| Dates | date-fns | Month grid (weeks start Monday), mobile week navigation, timeframe math, routine repeats |
| Backend | None in the prototype | Supabase stays installed for the real product later |

**No library needed:**
- **Timer:** calculated from the start timestamp, so it stays accurate while the tab is in the background.
- **Pop-out:** the native Document Picture-in-Picture API + a React portal (stylesheets are copied into the new window).
- **End-of-session alert:** Web Audio / a short sound file, `document.title`, a favicon swap.
- **Mobile week swipe:** CSS scroll-snap.
- **Event shortcut (`5:00-5:30 …`):** a regex.
- **Routine repeats:** computed with date-fns.

## Tentative: linking sessions to tasks
**Status:** placeholder idea. The real design is still open.

Any task checked off while a session is `active` gets attributed to that session automatically. The finished session row then shows it, e.g. `50 min · 3 tasks`, and expanding the row lists those tasks. This needs no extra setup from the user.

## Open questions
- How should focus sessions and tasks be linked? (The tentative version above is a stand-in.)
- What should replace the pop-out timer in browsers without Document Picture-in-Picture (Safari, Firefox)?

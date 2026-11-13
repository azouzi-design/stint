# Stint — MVP Prototype Spec

## Build progress
Parts 1–5 were built on the `prototype` branch and merged into `main`. Later iterations go straight to `main`, which deploys the public prototype (https://stint-prototype.vercel.app). Each step is committed after review.

- [x] **Part 1: The calendar you can look at**
  - [x] 1. Calendar grid, navbar shell, month navigation
  - [x] 2. Item model, localStorage persistence, sample data, every item type rendered (read-only)
- [x] **Part 2: Writing in it**
  - [x] 3. Typing in rows (TipTap, placeholder hint, Enter / Backspace, checking off)
  - [x] 4. `/` type picker + event shortcut
  - [x] 5. Inline links
  - [x] 6. Weekly / monthly sections behavior
- [x] **Part 3: Organizing**
  - [x] 7. Projects
  - [x] 8. Right-click menu + keyboard copy / cut / paste
  - [x] 9. Drag & drop + time sorting
  - [x] 10. Routines recurrence
- [x] **Part 4: Focus sessions**
  - [x] 11. Session flow (start, navbar counter, pause / stop / extend, end alert)
  - [x] 12. Pop-out timer
- [x] **Part 5: Mobile**
  - [x] 13. Weekly view
- [x] **Part 6: Iteration**
  - [x] 14. Calendar switcher in the menu: sample data / my calendar
  - [x] 15. Start overlay (`⌘K` / `Ctrl+K`), typed duration with Min / Hr, no timecap
  - [x] 16. Custom extend at time's up, Discard during a session's first minute
  - [x] 17. Minimal one-row pop-out timer (all states, Back to Stint, Hide timer)

## Purpose
An interactive front-end for testing, playing with, and defining what the product should eventually be.

**Out of scope:** backend, database connections, accounts/auth, or any advanced infrastructure.

**Data:** persisted in localStorage, so a refresh keeps it. There are two calendars, picked from the navbar menu: **Sample data**, seeded with realistic content (tasks, events, routines, notes, finished sessions, projects), and **My calendar**, which starts empty. Each keeps its own saved data.

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
- **Left:** Stint logomark + a small, seamless "Start a Stint" button showing its shortcut (`⌘K` / `Ctrl K`). Once a session starts, a compact running counter (14px, 7-segment font) and its controls show in its place.
- **Month navigation:** previous / next month + a "Today" control in the navbar.
- **Far right:** menu icon. Holds anything that doesn't fit the calendar view (profile, advanced settings, etc.). For now it holds a **calendar switcher** — *Sample data* (seeded, with "Reset sample data") or *My calendar* (starts empty; whatever you add is saved). Each calendar keeps its own saved items, projects and routines; switching finishes a running session first.

### Calendar (desktop: month)
- **Columns:** Monday → Sunday, plus an 8th column per week for **Weekly goals, notes, backlog**.
- **Rows:** one row per week until the month ends, plus a final row for **Monthly goals, notes, backlog**.
- The month does **not** have to fit the viewport; the page scrolls vertically.
- **Each day scrolls on its own:** a day shows about 10 rows, empty ones included (like the spreadsheet), and scrolls inside its cell when there are more.
- **Today:** marked very subtly. It must not affect the overall simplicity.
- Days outside the current month are greyed out.

### Calendar (mobile: week)
- Below 768px wide. The user moves between weeks by swiping or with arrows.
- The weekly cell sits below the 7 days, and the monthly cell at the bottom.
- **Navbar (two rows):** logomark + start / session controls + menu on top; the week (`Nov 9 – 15`, `W46`), Today and the arrows below.
- **Days are stacked** top to bottom, Monday → Sunday. Each day shows all its items (no inner scroll; the page scrolls) and at least 3 rows.
- **Monthly cell:** the month the week belongs to: the one holding its Thursday (today's week always shows today's month).
- **Swipe:** native horizontal scroll-snap. While swiping, the previous / next week is visible (read-only) beside the current one.
- **Touch gestures:** tap a row to edit it. Press and hold lifts it: move to drag it, or release without moving to open the row menu (copy / cut / paste / clear / project / repeat).
- No pop-out timer on phones (the API is desktop-only); the navbar counter, tab title and alert still work.

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
| **Focus session** | States: `active` (running now) or `finished`. Cannot be scheduled ahead of time; sessions only exist once started. Can be paused, extended, stopped early, or run with no timecap (counts up until stopped). There's no separate name: a session is labeled automatically by its timeframe and duration, e.g. `5:00–6:30 / 1.5h`. |
| **Note** | Free text |
| **Event** | Title, timeframe (`5:00–5:30`), link. The duration is calculated from the timeframe. The link opens in one click, so the user can join the meeting as it starts. |
| **Routine** | A task that repeats daily, weekly, or monthly. Each copy is checked off separately. The user can turn it off from any copy. Shown as a task with a repeat icon. See **Routines** below. |

### Routines
- Created in a day with `/routine · daily|weekly|monthly`. That day is the first copy, and it sets the weekday (weekly) or day of the month (monthly; clamped in short months).
- Copies are generated for every month the user views, at the top of each day.
- Editing a copy's text or project applies to that copy and all later ones (earlier copies keep their history).
- Deleting a copy (Clear, Cut, Backspace) removes only that day; it isn't regenerated.
- Changing a copy's repeat restarts the routine from that day with the new repeat.
- **Stop repeating** (right-click): keeps this copy and earlier ones, removes later ones.
- Dragging a copy to another day keeps it linked to its original date.

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
- **Details:**
  - `#` opens the list when typed at the start of a row or after a space; `Escape` closes it and puts the typed `#text` back as plain text.
  - The list has a search field. Hovering a project shows a pencil to rename / recolor / delete it.
  - "Remove project" appears when the item has one (including a deleted one).

## Interactions

### Creating items
- Clicking an empty row shows a very simple placeholder hint that `/` opens more formats.
- Typing directly creates a **task**.
- Typing `/` opens a type picker: note, event, routine, etc.
- Typing `#` opens the project list (see Projects).
- **Inline links:** in any row with text, the user can select part of the text and attach a link to it. This applies to every type, not only events.
  - Selecting text shows a small "Link ⌘K" button below the row; clicking it or pressing `⌘K` opens a link field. An existing link can be edited or removed the same way.
  - Pasting a URL over selected text links it; typing a URL turns it into a link automatically.
  - Stored as markdown-style text (`Call [Jon](https://…)`).
- **Event shortcut:** typing a time range at the start of a row (`5:00-5:30 Meet Dave`) turns it into an event automatically, the way the user writes in the spreadsheet today. `/event` also works. This is the starting approach and should be validated in the prototype.
  - A URL at the end of an event row becomes the event's join link: `14:00-15:00 Call with Jon https://meet.google.com/abc`.
  - An event without a time range is saved as a task.
  - Editing an event shows it as text (`14:00-15:00 Call with Jon https://…`), so the time and link are changed by editing the text.
- **Weekly / monthly sections:** the type is fixed by the section (Goals → goal, Notes → note, Backlog → task). No `/` picker or event shortcut there.
- **Editing keys:** `Enter` saves and opens a new row below; `Escape` or clicking away saves and closes; `Backspace` on an empty row deletes it and moves to the row above. A row whose text is cleared is deleted.
- **Clicking:** a row opens it for editing; a checkbox toggles it; a link opens in a new tab without editing the row.

### Ordering & moving
- **Time-bound items** (events, focus sessions) sort themselves by time by default. The user can still drag them elsewhere.
- **Drag & drop:** anything can be dragged anywhere on the visible calendar (within a day, between days, into the weekly or monthly cells).
  - The row moves live while dragging, leaving a faded placeholder where it will land: above or below the row under the pointer, depending on which half the pointer is over.
  - A drop where the item can't go (a session onto a weekly cell) puts it back where it started.
- **Time sorting:** new events (typed or via `/event`) and events whose time is edited are placed in time order among the day's other events and sessions. Dragged and pasted rows keep the position the user chose.
- **Right-click menu on any row:** copy, cut, paste, clear. Since a month fills the whole screen, cut/paste is how items move to places outside the current view (e.g. another month).

### Copy / cut / paste
- **Right-click menu:** Copy, Cut, Paste, Clear, Project…, and "Stop repeating" on routine copies. On an empty row: Paste.
- Cut removes the row right away; it can then be pasted anywhere, including another month.
- Pasted rows go below the row that was right-clicked, or at the end of the list when pasted into an empty row.
- **Types adapt to where they land** (paste and drag): a goal in a day becomes a task. In weekly / monthly sections, items become goals, notes, or tasks depending on the section. Focus sessions can't go into weekly / monthly cells.
- Copying a routine copy pastes a plain task (only the rule creates routine copies). Cutting one moves it and keeps it a routine copy.

### Keyboard
- `Cmd+C` / `Cmd+X` on a row being edited, with no text selected: copy / cut the whole row. With text selected, they copy / cut the text as usual.
- `Cmd+V` in an empty row, right after copying a row: pastes the row itself. Any other clipboard content pastes as text.
- `Enter`: create a new row below.
- `Backspace` on an empty row: delete it.

### Focus session flow
1. The user clicks the navbar "Start a Stint" button, or presses `⌘K` (Mac) / `Ctrl+K` (Windows). The button shows the shortcut. (Inside a row being edited, `⌘K` still adds a link.)
   - A soft light overlay covers the calendar, with one large field centered on screen: the Stint logomark, the duration input (7-segment font), a **Min / Hr** switch, a **No timecap** toggle, and Start.
   - The input is focused right away. Keyboard: type the number, `M` / `H` switch the unit (so `90m` or `1.5h` can be typed straight through), `N` toggles no timecap, `Enter` starts, `Esc` or a click outside closes.
   - Duration: 1 min to 10 hours; hours accept one decimal. Typing a number turns no timecap back off.
   - **No timecap:** the session has no limit. The counter counts up (focused time) instead of down, and there's no time's up: the user stops it when done.
2. The session starts:
   - An `active` session row appears in today's cell, placed by time.
   - The counter runs in the navbar and in the tab title (`24:13 · Stint`).
   - A **pop-out timer** opens automatically (see below).
3. While it runs, the user can pause, resume, or stop early. A session stopped early is saved as `finished` with the time actually worked.
   - The duration shown on a session is focused time: pauses aren't counted.
   - A session stopped under 1 minute is discarded (no row is kept). During that first minute the stop button reads **Discard** (× icon) instead of Stop, so it's clear nothing will be saved.
   - A running session survives a page refresh.
4. **When the counter reaches zero** (sessions with a timecap only):
   - A soft notification sound plays.
   - The browser tab is highlighted and its title text changes.
   - The app waits for the user to respond. The user can **extend** the session or **confirm** it's finished (Done).
   - Extend: a small field next to Done (navbar and pop-out). Type any duration and press Enter: `20` / `20m` = minutes, `1h` / `1.5h` = hours (up to 10 h). `⌘K` / `Ctrl+K` jumps to it.
   - Time spent waiting after time's up isn't counted: extending continues from the moment the counter hit zero.
5. Only once the user confirms is the row marked `finished`. Its end time is the moment the counter hit zero, not when the user clicked Done.

### Pop-out timer
- It opens as soon as a session starts: a tiny one-row window (about 240 × 40 px, the smallest the browser allows), so the user stays aware of the session while moving between apps and tabs.
- Priority: as small and simple as possible.
- Layout: state dot + counter on the left, icon buttons on the right. Hovering a button swaps the counter for the button's label (the window is too small for floating tooltips).
- States:
  - **Running:** green pulsing dot, counter (counts down; counts up with no timecap). Pause, Stop (or Discard during the first minute).
  - **Paused:** grey dot, dimmed counter. Resume, Stop / Discard.
  - **Time's up:** amber background and dot, "Time's up". Done (✓) and a compact extend field (type `20m` / `1h`, Enter).
  - **Ended:** shows "Saved · 25m focused" or "Discarded" for ~1.5 s, then the window closes.
- Always shown: **Back to Stint** (↩: brings the tab to the front; the pop-out stays) and **Hide timer** (closes the pop-out without switching to the browser; the session carries on in the navbar).
- The browser's frame on top of the pop-out (site name + close) can't be removed in a browser. A frameless floating timer needs a desktop app (e.g. a Tauri / Electron wrapper): see open questions.
- Once hidden or closed, a pop-out button next to the navbar counter reopens it.
- Implementation: the browser's Document Picture-in-Picture API (Chromium browsers). The click that starts the session is what opens the window.
- **Safari / Firefox:** no extra design for now. The rest of the session flow still works there; there's just no pop-out (see open questions).

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| App | React + TypeScript + Vite | Single-page app; no SSR needed |
| Styling | Tailwind CSS v4, `@/index.css` tokens, `cn()` (clsx + tailwind-merge), cva | The project palette is defined in OKLCH |
| Fonts / icons | Geist, dseg (7-segment timer), pixelarticons via svgr | |
| State + persistence | Zustand + `persist` middleware → localStorage | |
| Row text editing | TipTap | Minimal: single line, text + links only. **Only the row being edited mounts an editor**; every other row renders static text. The Link extension handles inline links (non-inclusive, so typing after a link doesn't extend it). The `/` picker and link popover are small custom components anchored with radix Popover; TipTap's Suggestion utility is still an option for `#` (which, unlike `/`, can appear mid-text). |
| Drag & drop | dnd-kit (core + sortable) | Drag across days, the weekly and monthly cells, and within a day; auto-scrolls inside scrollable cells |
| Menus / popovers | radix-ui | Context menu (copy / cut / paste / clear), the start overlay (Dialog), the project popover, the navbar menu (with the calendar switcher) |
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
- A truly frameless floating timer (no browser title bar): only possible outside the browser. Options: a desktop wrapper (Tauri / Electron: frameless, always-on-top window), or a small native menu-bar companion app.

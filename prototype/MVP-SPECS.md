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
  - [x] 12. ~~Pop-out timer~~ (removed: replaced by the desktop timer)
- [x] **Part 5: Mobile**
  - [x] 13. Weekly view
- [x] **Part 6: Iteration**
  - [x] 14. Calendar switcher in the menu: sample data / my calendar
  - [x] 15. Start overlay (`⌘K` / `Ctrl+K`), typed duration with Min / Hr, no timecap
  - [x] 16. Custom extend at time's up, Discard during a session's first minute
  - [x] 17. ~~Minimal one-row pop-out timer~~ (removed)
- [x] **Part 7: Desktop + sync**
  - [x] 18. Full-screen time's-up overlay, desktop notification
  - [x] 19. Desktop timer widget (Tauri)
  - [x] 20. Database + email-code sign-in: "My calendar" syncs between web and desktop
  - [x] 21. Browser pop-out removed; "Desktop app required" notice
- [x] **Part 8: Settings**
  - [x] 22. Settings dialog: tab timer, 12h / 24h, week start, notifications, desktop timer status, delete account (synced to the account)
- [x] **Part 9: Accounts**
  - [x] 23. Sign-in required (web + desktop), Continue with Google, one-click desktop sign-in through the web app
- [x] **Part 10: Item details**
  - [x] 24. Details popup: notes (full text), events (all fields + notes), focus sessions (tasks + notes)
  - [x] 25. Routines grouped per day: one row per repeat (monthly, weekly, daily), finished when all its tasks are
  - [x] 26. Processes: progress 0–100%, carried over day to day until 100% or deleted
  - [x] 27. Drag a task into a focus session or a routine row
  - [x] 28. Click a project dot (rows + popups) to assign / change / remove / create projects
  - [x] 29. Easier events: `5pm Call Jon` / `5pm 1h Call Jon`, event popup with start list + length chips + link
  - [x] 30. Rows show start + duration (`5:00 30m`); processes take a typed `10%` and finish on the day they're set to 100%
  - [x] 31. Weeks named This / Last / Next week or by their dates, instead of week numbers

## Purpose
An interactive front-end for testing, playing with, and defining what the product should eventually be.

**Backend:** the project's Supabase dev database, for sign-in and sync only (see Tech stack).

**Accounts: sign-in is required.** Signed out, the web app is only a sign-in screen: Stint logomark, "Sign in to Stint", a one-line pitch, **Continue with Google**, then "or with email" (email → 6-digit code, no password). Same email = same account, whichever way. Opened from the desktop app's Sign in, it says the timer will connect to the same account. Sign out → back to that screen, and this device's copy of "My calendar" is cleared. Someone who used Stint before sign-in was required keeps their calendar: signing in to an empty account uploads it. (No database configured, i.e. local dev without env: the app runs offline, signed out.)

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
- **Far right:** menu icon. Holds anything that doesn't fit the calendar view (profile, advanced settings, etc.). It holds a **calendar switcher** — *Sample data* (seeded, with "Reset sample data") or *My calendar* (starts empty; whatever you add is saved). Each calendar keeps its own saved items, projects and routines; switching finishes a running session first. Below it, **Settings** (see Settings), the account's email and Sign out.

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
- **Focus sessions are computer-only.** Phones and tablets (by device, not window width; iPads included) can't start one: in place of "Start a Stint", a hint "Focus sessions start on your computer" (no ⌘K, no start overlay). A session running on the computer shows as a counter only (dot + time, or "Time's up"), with no pause / stop / extend / Done and no time's-up overlay. The "Desktop app required" notice isn't shown there.

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
| **Focus session** | States: `active` (running now) or `finished`. Cannot be scheduled ahead of time; sessions only exist once started. Can be paused, extended, stopped early, or run with no timecap (counts up until stopped). There's no separate name: a session is labeled automatically by its start time and focused duration, e.g. `5:00 1.5h` (the full timeframe is in its popup). Holds its own tasks and notes (in its popup); the row shows `done/total tasks`. |
| **Note** | Free text, any length. The row shows the first sentence on one line (cut with `…`); the popup holds the whole text. |
| **Event** | Title, timeframe (`5:00–5:30`), link, notes. The row shows the start time and duration, the way it's typed: `5:00 30m Meet Dave` (the full timeframe is in its popup and tooltip). The link opens in one click, so the user can join the meeting as it starts. |
| **Routine** | A task that repeats daily, weekly, or monthly. Each copy is checked off separately. In a day, routines show grouped: one row per repeat. See **Routines** below. |
| **Process** | Ongoing work tracked by progress (0–100%), carried over from day to day. See **Processes** below. |

### Details popup
Clicking a note, event, focus session, routine row, or processes row opens a small popup beside the row (top edges aligned; it flips to the other side near the screen edge). Everything in it saves as it's changed; `Escape` or clicking outside closes it.
- **Note:** a text area with the whole note. Emptying it deletes the note.
- **Event:** title, time (start list + length chips, see **Creating items**; the event re-sorts by time), link with a Join button, project, notes.
- **Focus session:** focused time (and the planned time while running), timeframe, its tasks (type to add, check off, clear to remove), the tentative "finished during this session" list, notes.
- **Routine row:** that routine's tasks for the day (check off, edit, add, × removes it from this day on).
- **Processes row:** each process with its text and a 0–100% slider; add one; × deletes it from every day.
- Events and sessions with notes show a small notes mark on their row.

### Routines
- Created in a day with `/routine · daily|weekly|monthly`, from a routine row's popup ("Add a task"), or by dropping a task onto a routine row. That day is the first copy, and it sets the weekday (weekly) or day of the month (monthly; clamped in short months).
- Copies are generated for every month the user views.
- **Grouped in the day:** a day shows its routine copies as one row per repeat, at the top, in this order: `Monthly routine`, `Weekly routine`, `Daily routine`, each with its count (`3/5`). The row is marked finished (struck through) only when all its tasks are. Clicking it lists the tasks in a popup.
- Editing a copy's text or project applies to that copy and all later ones (earlier copies keep their history).
- Deleting a copy (Clear, Cut, Backspace) removes only that day; it isn't regenerated.
- Changing a copy's repeat restarts the routine from that day with the new repeat.
- **Stop repeating** (right-click): keeps this copy and earlier ones, removes later ones.
- Dragging a copy to another day keeps it linked to its original date.

### Processes
- Created in a day with `/process`, or from a processes row's popup. That day is its start. A percentage at the end sets its progress: `Move flat 10%` (placeholder: `Process 10%`).
- A day shows its processes as one `Processes` row (after the routines), with `done/total`. The popup has each process's text and a 0–100% slider.
- Shown on every day from its start until the day it's set to 100% on: it stays on that day (at 100%, counted as done) and stops carrying over to the next days. While open it shows up to today, not on future days (except its own start day). Moving it back below 100% reopens it.
- Progress is one value (no per-day history). Deleting a process removes it from every day.

### Weekly / monthly cells
- **Week names:** a weekly cell is named by when it is, not by a week number: **This week**, **Last week**, **Next week**, otherwise its dates (`Nov 2 – 8`, `Oct 26 – Nov 1`). The ISO week number is in the tooltip. Same naming in the mobile week view and in popups (`This week · Notes`).

Each holds three small labeled sections, stacked:
- **Goals:** checkable, with a distinct visual design so they stand out from regular items.
- **Notes:** plain text.
- **Backlog:** tasks.

## Projects
- Projects are represented by **colors**, shown as a small **color dot** on the row.
- They can be assigned to anything: tasks, sessions, notes, goals, events, backlog items, routines, processes, and the tasks inside a focus session.
- **One project per item.**
- **Colors:** a fixed palette defined in OKLCH, with consistent lightness and chroma, so every color has the same visual weight.
- **Assigning:** three ways, all opening the same project list:
  - typing `#` while writing a row (like `/` for types)
  - right-click → "Project…" on an existing item
  - **clicking the color dot**, on a row or inside a details popup. Rows and popup lines without a project show an empty dot on hover; the event and focus session popups show a "Project" line (dot + name, or "Add project").
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
- **Events: typed or picked.** Power users type everything in the row; everyone else picks the time in a popup.
  - **Typing:** a time at the start of a row turns it into an event:
    - a start time alone: `5pm Call Jon` = 17:00–17:30 (default length **30 min**);
    - a start time and a length: `5pm 1h Call Jon`, `17:00 45m Standup`, `9:30am 1.5h …`, `2pm 90min …`, `5pm 1h30 …`;
    - a range, as before: `5-6pm …`, `14:00-15:30 …`.
    - A start time needs am/pm or a colon (`5pm`, `17:00`), so `5 things to buy` stays a task.
  - **Event popup:** opens under the row as soon as `/event` is picked, or as soon as a typed time is recognized. It has a **start list** (15-minute steps, in the Settings time format), **length chips** (15m, 30m, 45m, 1h, 1.5h, 2h) showing the end time, and a **meeting link** field. Picking a time rewrites the time at the start of the row (as start + length: `17:00 30m …`), so the row and the popup always match. Picking a length with no start uses the next quarter hour.
  - Keys: `Tab` moves from the row into the popup; `Enter` saves (in the row or the link field); `Escape` saves and closes.
  - A URL at the end of an event row also becomes its join link: `14:00-15:00 Call with Jon https://meet.google.com/abc` (it wins over the link field).
  - An event without a time is saved as a task.
  - An event is edited in its details popup (title, time, link, notes).
- **Weekly / monthly sections:** the type is fixed by the section (Goals → goal, Notes → note, Backlog → task). No `/` picker or event shortcut there.
- **Editing keys:** `Enter` saves and opens a new row below; `Escape` or clicking away saves and closes; `Backspace` on an empty row deletes it and moves to the row above. A row whose text is cleared is deleted.
- **Clicking:** a task or goal row opens it for editing; a note, event, focus session, routine row or processes row opens its details popup; a checkbox toggles it; a link opens in a new tab without editing the row.

### Ordering & moving
- **Time-bound items** (events, focus sessions) sort themselves by time by default. The user can still drag them elsewhere.
- **Drag & drop:** anything can be dragged anywhere on the visible calendar (within a day, between days, into the weekly or monthly cells).
  - **Into a row:** a task dropped onto a focus session joins the session's tasks; onto a routine row, it joins that routine from that day on. The target row is outlined while the task is over it. Routine and processes rows themselves aren't draggable.
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
   - The **desktop timer** shows it (see below). Without the desktop app, the session runs in the tab only.
3. While it runs, the user can pause, resume, or stop early. A session stopped early is saved as `finished` with the time actually worked.
   - The duration shown on a session is focused time: pauses aren't counted.
   - A session stopped under 1 minute is discarded (no row is kept). During that first minute the stop button reads **Discard** (× icon) instead of Stop, so it's clear nothing will be saved.
   - A running session survives a page refresh.
4. **When the counter reaches zero** (sessions with a timecap only):
   - A soft notification sound plays.
   - A desktop notification ("Time's up · Your 25 min focus session is over.") fires every time, even when Stint is in front: this moment must not be missed, so it's fine to alert from several places at once. No buttons; clicking it brings Stint forward. It stays until dismissed where the OS allows, and closes itself once the user responds in the app.
   - Permission is asked on the first Start click. If it's denied or the OS hides it (Do Not Disturb, Focus), the sound, tab title and favicon still alert the user.
   - The browser tab is highlighted and its title text changes.
   - The app waits for the user to respond. The user can **extend** the session or **confirm** it's finished (Done).
   - **Time's-up overlay:** the same full-screen overlay as the start, in amber: pulsing dot, `0:00`, "Time's up · 25 min focused", an extend field (focused) and Done. Enter = Done when the field is empty, or extends by what's typed. Clicking outside doesn't close it; `Esc` hides it, leaving Done + extend in the navbar, and `⌘K` / `Ctrl+K` brings it back.
   - Extend: type any duration and press Enter: `20` / `20m` = minutes, `1h` / `1.5h` = hours (up to 10 h). Also available next to Done in the navbar and in the desktop timer.
   - Time spent waiting after time's up isn't counted: extending continues from the moment the counter hit zero.
5. Only once the user confirms is the row marked `finished`. Its end time is the moment the counter hit zero, not when the user clicked Done.

### Desktop timer (widget)
- The timer lives in the **desktop app** (Mac / Windows): a tiny frameless window that floats above other apps, sized to its content, with a menu bar / tray icon. There is **no browser pop-out**: it was removed for good (a browser can't hide its own frame, and it looked out of place).
- Code: the page `prototype/widget` (`/?widget`) inside the Tauri shell `prototype/desktop`.
- States (one row): **Idle** (duration field + Start), **Running** (green dot, counter, pause), **Paused** (grey dot, dimmed counter, resume), **Time's up** (amber row, Done ✓ + compact extend field), **Ended** ("Saved · 25m" / "Discarded" for ~1.5 s). The ⋮ menu holds the rest (Stop / Discard, Start without timecap, Open Stint, Hide timer, **Always on top** switch, Sign out); the window grows while it's open. Always on top: on by default, remembered per computer; off, other windows can cover the widget, but time's up always brings it on top. The widget can't be minimized into the Dock (Hide timer does that; Show timer in the menu bar brings it back).
- **Sign-in required:** signed out, the widget shows only **Sign in** (no timer), so every session belongs to the account and syncs. Sign in continues in the browser: the web app (already signed in, or signed in there once by email code) shows "Connect the desktop timer" → **Open Stint desktop**, which opens a `stint://` link that signs the app in as the same account. No second code. The link carries a single-use token and only works for the sign-in the app started. Desktop builds older than 0.2.1 fall back to an email code in the widget.
- Signed in with the same email as the web app, it shows the same session: start, pause, extend or finish in either, the other follows. A session started in the web app makes the widget appear if it was hidden (without taking focus from the browser); time's up brings it forward.
- **Opens by itself:** starting a session on the web while the desktop app isn't running opens it (`stint://open`), if this browser knows it's installed (the desktop was connected, or opened with "Open Stint", from here). The browser may ask "Open Stint?" the first time ("Always allow" makes it silent). It's signed in already and picks up the session.
- **Desktop app required notice:** when the desktop timer isn't running for the account (no widget online, detected with realtime presence), a small amber chip "Desktop app required" shows next to the session controls in the navbar and under the start bar. Same design in both places. Clicking it explains what the desktop timer does and how to set it up (install, then Sign in in the timer, which connects through the web app). The download matches the visitor's system: **Download for Mac** (first launch: "Open Anyway") or **Download for Windows** ("More info → Run anyway"), from the latest GitHub Release.
- **Auto-update:** the desktop app checks for a new version at launch and every 3 h, downloads it in the background, and installs + restarts only while no session runs. Releases are built by the "Desktop release" GitHub workflow (Mac + Windows). Not shown on phones (the timer is desktop-only) or while presence is still loading.
- Without the desktop app, sessions still run in the tab: navbar counter, tab title, time's-up overlay, sound and notification.

## Settings
Opened from the navbar menu → **Settings**: one small dialog (web only; the desktop timer has none). Saved in the browser; signed in, they sync to the account (`user_settings`), so every device gets the same ones. Last write wins.

| Setting | Options | Behavior |
|---|---|---|
| **Timer in browser tab** | on (default) / off | Off: the tab title stays "Stint" while a session runs. Time's up still flashes the tab (it's the alert, not the timer). |
| **Time format** | 12h / **24h** (default) | Event and session times: `14:30` or `2:30pm`. 12h ranges are compact: `9–10:30am`, `11am–1pm`. Editing an event shows its time the same way. Typing accepts both in either mode: `14:00-15:00`, `2-3pm` (the start takes the end's am/pm when it fits: `11-1pm` = 11am–1pm), `11am-1pm`. A time without am/pm is read as 24h (`5-5:30` = 5am). |
| **Week starts on** | **Monday** (default) / Sunday | The month grid, the mobile week and its swipe. The weekly cell's goals / notes / backlog stay attached to the same week whichever day it starts on (they're keyed by the Monday inside the week). Week numbers (ISO) only show in tooltips. |
| **Notify me when time's up** | on (default) / off | The time's-up desktop notification. Turning it on asks the browser if it hasn't been asked yet. If the browser blocked it (the user refused before), the setting shows how to allow it in the site settings. **Reminder:** while it's on but the browser doesn't allow it, an amber dot shows on the navbar menu and "Notifications off" next to Settings, until it's allowed or turned off. |
| **Desktop timer** | status | **Connected** (green): the widget is online for this account. **Not installed** (amber, no widget online) + Install for Mac / Windows; "Already installed? Open it and click Sign in." Phones / other systems: "available for Mac and Windows". |
| **Danger zone: Delete account** | signed in only | Deletes the account and everything synced to it (calendar, projects, routines, settings). Confirm by typing `DELETE`. Then back to the sign-in screen on this device (its copy of "My calendar" is cleared). Function: `supabase/functions/delete-account`. |

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| App | React + TypeScript + Vite | Single-page app; no SSR needed |
| Styling | Tailwind CSS v4, `@/index.css` tokens, `cn()` (clsx + tailwind-merge), cva | The project palette is defined in OKLCH |
| Fonts / icons | Geist, dseg (7-segment timer), pixelarticons via svgr | |
| State + persistence | Zustand + `persist` middleware → localStorage | |
| Row text editing | TipTap | Minimal: single line, text + links only. **Only the row being edited mounts an editor**; every other row renders static text. The Link extension handles inline links (non-inclusive, so typing after a link doesn't extend it). The `/` picker and link popover are small custom components anchored with radix Popover; TipTap's Suggestion utility is still an option for `#` (which, unlike `/`, can appear mid-text). |
| Drag & drop | dnd-kit (core + sortable) | Drag across days, the weekly and monthly cells, and within a day; auto-scrolls inside scrollable cells |
| Menus / popovers | radix-ui | Context menu (copy / cut / paste / clear), the start overlay (Dialog), the project popover, the navbar menu (with the calendar switcher), the desktop notice |
| Desktop timer | Tauri 2 (Rust shell) loading `/?widget` | Frameless always-on-top window, menu bar / tray icon, native notifications. See `prototype/desktop/README.md`. |
| Dates | date-fns | Month grid (weeks start Monday or Sunday, per Settings), mobile week navigation, timeframe math, routine repeats |
| Backend | Supabase (dev project): Postgres + row level security + realtime, email-code sign-in | Schema in `/supabase/migrations`, shared with the real product. Signed-in users' "My calendar" and settings sync between the web app and the desktop widget; last write wins per row. Edge functions: `desktop-link`, `delete-account`. |

**No library needed:**
- **Timer:** calculated from the start timestamp, so it stays accurate while the tab is in the background.
- **End-of-session alert:** Web Audio / a short sound file, `document.title`, a favicon swap, and the Notifications API (`new Notification`, no service worker or server needed while the tab is open).
- **Mobile week swipe:** CSS scroll-snap.
- **Event shortcut (`5pm 1h …`, `5:00-5:30 …`):** a regex (`lib/parse.ts`).
- **Routine repeats:** computed with date-fns.

## Tentative: linking sessions to tasks
**Status:** placeholder idea. The real design is still open.

Any task checked off while a session is `active` gets attributed to that session automatically. The finished session row then shows it, e.g. `50 min · 3 tasks`, and expanding the row lists those tasks. This needs no extra setup from the user.

## Open questions
- How should focus sessions and tasks be linked? (The tentative version above is a stand-in.)
- Code signing to remove the first-launch warnings: Apple ($99/year) and a Windows certificate.
- Email sender for sign-in codes (Resend or similar, ~15 min). Supabase's built-in sender allows ~2 emails/hour for the whole project: sign-in is now required, so email-code users are capped by it (Google sign-ins aren't). Fine for a few testers. Needs a verified domain: an existing one now, or the Stint domain once bought (moving later = re-verify + change the sender address).

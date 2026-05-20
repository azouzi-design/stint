# Easy Task — Product Specification (MVP)

**Document type:** Product Specification / PRD
**Version:** 0.2
**Status:** Active
**Last updated:** May 17, 2026
**Owner:** Ahmed A. Azouzi

---

## Changelog

| Version | Changes |
|---|---|
| 0.2 | Confirmed task states (default/done only). Clarified session task model (reference + removal from Today + return logic). Resolved History view (week grid for MVP, month view post-MVP). Confirmed unchecked task behavior at session end. Removed auth/accounts from MVP scope. Colors marked as TBD. Naming fully resolved (Later/History canonical). One open question remains (§11). |
| 0.1 | Initial draft. |

---

## 1. Overview

Easy Task is a productivity app built around a single, opinionated workflow: capture tasks as free-form text, drag the ones that matter into a **Focus Session**, run a live timer, and review your work afterward in History.

It is deliberately not a feature-heavy todo manager. There are no projects, labels, due dates, priorities, or assignees. The product is one person's working method made into software — a clean text list at the core, a focus timer as the centerpiece, and an always-visible desktop gadget that keeps the session in front of you while you work in other apps.

### 1.1 Problem statement

General-purpose todo apps are good at *storing* tasks but weak at *doing* them. They optimize for organization (lists, tags, filters) rather than execution. Easy Task optimizes for execution: the loop is **capture → focus → review**, and the focus step is the product's reason to exist.

### 1.2 Product principles

1. **Text-first.** A task is just a line of text. Creating, editing, and reordering tasks should feel like editing a document, not filling out forms.
2. **Focus is the centerpiece.** The Focus Session is the most important surface in the app. Every other screen feeds into it or reviews it.
3. **Minimal, opinionated scope.** No feature is added unless it serves the capture → focus → review loop.
4. **Stay in view.** On desktop, the session should remain visible while the user works elsewhere.

---

## 2. Goals & non-goals

### 2.1 Goals (MVP)

- Ship a working **web app** covering the three core pages and the Focus Session.
- Make task capture and editing feel as fast and frictionless as writing in a text editor.
- Deliver a Focus Session experience that is reliable, accurate, and pleasant to run.
- Persist data locally so the user can close and reopen the app without losing tasks or history.

### 2.2 Non-goals (MVP)

- **Desktop apps (Windows / Mac).** Specified here for context and forward-planning, but **not built in the MVP.**
- **User accounts and authentication.** MVP is local-first — no login required. Accounts are a post-MVP feature.
- Multi-user, collaboration, or sharing.
- Mobile apps or mobile-optimized layouts.
- Integrations (calendar, Slack, etc.).
- Native OS notifications (part of the desktop gadget scope, post-MVP).

---

## 3. Platforms

| Platform | Status | Notes |
|---|---|---|
| **Web app** | **MVP** | Primary platform. Desktop-width layout (wireframe designed at 1440px). Local data persistence via IndexedDB. |
| Windows app | Post-MVP | Native gadget shell. See §8. |
| Mac app | Post-MVP | Native gadget shell. See §8. |

---

## 4. Information architecture

The app has three top-level pages, reachable from a persistent tab navigation centered in the header:

| Tab | Purpose |
|---|---|
| **Today** | Tasks for today + the Focus Session widget + today's completed sessions. |
| **Later** | A holding space for tasks to do at some future point. |
| **History** | Week-grid view of all past Focus Sessions. |

Navigation tabs: `Today` · `Later` · `History`, visible on every page.

---

## 5. Core concepts & data model

### 5.1 The block model

Each list page (Today, Later) is a **document of ordered blocks**. There are two block types:

- **Task** — a checkable line of text. The default block type.
- **Title** — a non-checkable heading used to group tasks visually. Created with the `/h` command.

Tasks and titles share one ordered list. A title groups every task beneath it until the next title — grouping is **positional**, not a stored relationship. Titles are optional.

Tasks can be **nested** (task → subtask) via drag-and-drop. Nesting is a parent/child relationship stored via `parentId`.

### 5.2 Entities

**Block**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier. |
| `type` | `task` \| `title` | Block type. |
| `content` | rich text string | Text with inline formatting marks (see §6.3). |
| `listType` | `today` \| `later` | Which page the block lives on. |
| `parentId` | string \| null | Parent task id for subtasks; null for top-level. |
| `order` | number | Position within its parent/list (fractional index for drag-and-drop). |
| `state` | `default` \| `done` | Task completion state. Titles have no state. |
| `inSession` | boolean | `true` while the task is inside an active Focus Session — hides it from the Today list. |
| `createdAt` / `updatedAt` | timestamp | |

**Focus Session**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier. |
| `date` | date string | The day the session belongs to. |
| `plannedDurationMin` | number | Duration the user set before running. |
| `startedAt` / `endedAt` | timestamp \| null | Actual wall-clock start/end. |
| `status` | enum | `empty` \| `running` \| `paused` \| `completed` \| `canceled`. |
| `taskRefs` | array | Tasks included in this session — see §5.3. |

**Session task reference** (`taskRefs[]`)

| Field | Type | Notes |
|---|---|---|
| `taskId` | string | References the original Block. |
| `textSnapshot` | string | Copy of the task text at the moment it was dropped in. Ensures History stays accurate even if the original is later edited or deleted. |
| `completedInSession` | boolean | Whether it was checked off during this session. |

### 5.3 Tasks in a Focus Session — confirmed behavior

Tasks in a Focus Session are **references** to original task blocks. The lifecycle is:

1. **Drop into session** → task sets `inSession: true`. It disappears from the Today task list and appears only inside the Focus Session widget.
2. **During the session** → the task is checkable inside the widget. Checking it sets `state: done`.
3. **Session ends (completed or canceled)** → all tasks in the session have `inSession` reset to `false`. They return to the Today list in their original position. Checked tasks stay `done`; unchecked tasks stay `default`.
4. **Manual drag-out** → the user can drag a task back to the Today list at any time, which also sets `inSession: false`.

A `textSnapshot` is written to each `taskRef` at drop time so History always has the original text regardless of subsequent edits.

---

## 6. Feature specifications

### 6.1 Today page

The main page and the app's default landing screen.

**Layout (top to bottom):**
1. **Header** — app nav tabs.
2. **Focus Session widget** — see §6.5. Always at the top of the content area.
3. **Today's task list** — block document for `listType: today`. Tasks with `inSession: true` are hidden while a session is active.
4. **Today's sessions** — summary list of Focus Sessions completed today.

**Today's task list**
- Freely editable block document supporting all interactions in §6.2 and rich text in §6.3.
- Tasks may be grouped under optional titles and nested as subtasks.

**Today's sessions section**
- Lists each completed session today: **time range** (e.g. `11:00 → 13:00`), **duration** (e.g. `3H`), **task count** (e.g. `2 tasks`).
- Read-only summary; full detail and editing is in History.

### 6.2 Task interactions

**Selecting a task**
- Clicking the **task container** selects the whole item.
- With a task selected: `Delete` removes the task; `Ctrl+C` copies it.

**Context menu (right-click)**
- Right-clicking the task container or its text:
  - **Move to Later** (on the Today page)
  - **Move to today's list** (on the Later page)
  - **Copy**
  - **Duplicate**
  - **Delete**

**Inline text editing**
- Clicking directly on the task text enters edit mode immediately — no separate dialog.

**Reordering**
- When a task is selected, a reorder handle appears next to its checkbox.
- Drag-and-drop moves tasks anywhere in the list, including nesting under another task as a subtask.

**Checkbox**
- Each task row has a 24×24 checkbox. Checking → `state: done`; unchecking → `state: default`.

### 6.3 Rich text formatting

Selecting text within a task shows an inline formatting toolbar. Supported marks:

| Mark | Style |
|---|---|
| Bold | **text** |
| Italic | *text* |
| Underline | <u>text</u> |
| Strikethrough | ~~text~~ |

### 6.4 Task states

Tasks have exactly **two states**. No others.

| State | Meaning |
|---|---|
| `default` | Not done (initial state). |
| `done` | Completed (checkbox checked). |

Session pausing is a property of the Focus Session itself, not of individual tasks. There are no `paused` or `canceled` task states.

### 6.5 Focus Session widget

The core feature of the product. Lives at the top of the Today page.

**Four states:**

| State | Trigger | Display |
|---|---|---|
| **Empty** | No session running | "Empty focus session" + "Click to start *or* Drop tasks here." |
| **Running — no tasks** | Session started, no tasks added | Large timer + "0 tasks" + Pause + Cancel |
| **Running — has tasks** | Session started with tasks | Large timer + task count + Pause + Cancel + task list |
| **Paused** | User pressed Pause | Large timer + "Paused — N tasks" + Resume + Cancel + task list |

**Activation**
- Clicking the widget or dropping a task into it activates it.

**Setup flow**
1. Drop one or more tasks from the Today list into the widget (or start with zero tasks).
2. Set the session duration.
3. Click **Run**.

**Running session display:**
- Progress counter: e.g. `2 / 5 tasks completed`.
- Time block: total duration + start and end times, e.g. `2h · 12:15 → 14:15`.
- Live countdown: e.g. `5:31` — ticks down in real time, survives tab switches.
- **Pause** / **Resume** and **Cancel** buttons.
- The task list, each task checkable.

**When the timer reaches zero:**
- Session status → `completed`. Saved to History.
- All tasks have `inSession` reset to `false` and return to the Today list.
- Checked tasks stay `done`. Unchecked tasks return as `default` — no trace of them in History.
- History records **only tasks that were checked off** (`completedInSession: true`) during the session.
- An **end-of-session notification** is displayed. Form TBD — see §11.

**Cancel behavior:**
- Session status → `canceled`. Not saved to History.
- All tasks return to Today with `inSession: false`, state unchanged.

### 6.6 Later page

A space for tasks to do at some future point.

- Identical layout to the Today task list: ordered block document with tasks and optional titles.
- Titles are used to create loose groupings (e.g. "Tomorrow", "This week", "Weekend"). Optional.
- Right-click any task → "Move to today's list."
- No Focus Session widget. No sessions section.

### 6.7 History page

A log of all past Focus Sessions.

**View: week grid (MVP)**
- 7-column grid, Monday–Sunday, with a time axis on the left.
- Each day cell shows the sessions run that day.
- Each session entry shows: time range, duration, and the list of **completed tasks only** (tasks checked off during the session — `completedInSession: true`).
- User can navigate backward and forward by week.

**Manual editing**
- The user can manually add, edit, and delete sessions and their completed task entries directly in History.

**Post-MVP:** month view will be added as an alternative layout.

---

## 7. Design system

### 7.1 Colors — TBD

Not finalized. The Figma wireframe uses a warm-grey placeholder palette — these will be revisited in the high-fidelity design phase:

| Token | Hex | Wireframe usage |
|---|---|---|
| Warm-grey/10 | `#F7F3F2` | Surface / Focus Session widget background. |
| Warm-grey/40 | `#ADA8A8` | Icons, tertiary elements. |
| Warm-grey/70 | `#565151` | Secondary text. |
| Warm-grey/90 | `#272525` | Buttons. |
| Warm-grey/100 | `#171414` | Primary text. |

The prototype will use these values. Final palette to be defined before high-fidelity design.

### 7.2 Typography

- **Typeface:** Geist.
- Sizes: 50px (timer), 21px (section labels / title blocks), 16px (nav tabs), 14px (body / task text / buttons).

### 7.3 Iconography

- **Icon set:** Hugeicons (`hugeicons.com`).
- Common sizes: 24×24 (task row), 20×20 and 16×16 (controls).

### 7.4 Buttons

- Primary: `#272525` background, white 14px label, ~32px tall, 12px horizontal / 8px vertical padding.

---

## 8. Desktop gadget (post-MVP — reference only)

Not built in the MVP. Documented so the architecture can accommodate it cleanly.

- A small always-visible window showing the live timer and active session tasks.
- Links to open Today, Later, History in the full web app.
- Setting: always-on-top toggle.
- Delivers native OS notifications when a session ends.
- Allows instant editing of the session from the gadget.

**Architectural note:** the Focus Session must be a self-contained, observable module so it can serve as the desktop gadget's root view without a rewrite.

---

## 9. MVP scope summary

**In scope**
- Web app, desktop-width, no login required (local-first, data in IndexedDB).
- Today, Later, History pages with tab navigation.
- Block-based task list: tasks + titles, drag-and-drop reorder, nesting, rich text formatting.
- Task interactions: select, keyboard shortcuts, context menu, inline editing, checkbox.
- Focus Session: all four states, drag tasks in/out, duration setting, live countdown, pause/resume/cancel, completion flow.
- Session task behavior: removed from Today while in session, returned on session end or manual drag-out.
- History records completed tasks only.
- Today's sessions summary.
- History week-grid view with manual add/edit/delete.

**Out of scope (post-MVP)**
- User accounts and authentication.
- Cloud sync / multi-device.
- Windows / Mac desktop gadget.
- Native OS notifications.
- History month view.
- Mobile layouts, collaboration, integrations.

---

## 10. Success criteria

The MVP is successful if a single user can, without friction:

1. Capture and reorganize a day's tasks as fast as typing in a notes app.
2. Drag tasks into a session, run a timer, and trust the countdown.
3. Reopen the app the next day and see an accurate History of completed work.

---

## 11. Open questions

One open question remains. All others have been resolved.

| # | Question | Notes |
|---|---|---|
| 6.5b | **How is session-end signaled in the web app?** The goal is something intrusive — more than a subtle color change. Options: full-screen overlay, a persistent banner that requires dismissal, a sound + visual pulse, or a browser push notification (requires user permission). | Open — to be decided during UI design. |

---

*End of specification — v0.2. Ready to use as the source of truth for the prototype.*

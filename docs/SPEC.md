# Stint — Product Specification (MVP)

**Document type:** Product Specification / PRD
**Version:** 0.9
**Status:** Active
**Last updated:** Jun 28, 2026
**Owner:** Ahmed A. Azouzi

---

## Changelog

| Version | Changes |
|---|---|
| 0.2 | Confirmed task states (default/done only). Clarified session task model. Resolved History view (week grid). Confirmed unchecked task behavior at session end. Removed auth/accounts from scope. Naming fully resolved (Later/History canonical). |
| 0.1 | Initial draft. |

---

## 1. Overview

Stint is a productivity app built around a single, opinionated workflow: capture tasks as free-form text, drag the ones that matter into a **Focus Session**, run a live timer, and review your work afterward in History.

It is deliberately not a feature-heavy todo manager. There are no projects, labels, due dates, priorities, or assignees. The product is one person's working method made into software — a clean text list at the core, a focus timer as the centerpiece, and an always-visible desktop gadget that keeps the session in front of you while you work in other apps.

### 1.1 Problem statement

General-purpose todo apps are good at *storing* tasks but weak at *doing* them. They optimize for organization (lists, tags, filters) rather than execution. Stint optimizes for execution: the loop is **capture → focus → review**, and the focus step is the product's reason to exist.

### 1.2 Product principles

1. **Text-first.** A task is just a line of text. Creating, editing, and reordering tasks should feel lightweight and direct.
2. **Focus is the centerpiece.** The Focus Session is the most important surface in the app. Every other screen feeds into it or reviews it.
3. **Minimal, opinionated scope.** No feature is added unless it serves the capture → focus → review loop.
4. **Stay in view.** On desktop, the session should remain visible while the user works elsewhere.

---


## 2. Platforms

| Platform | Notes |
|---|---|
| **Web app** | Primary platform. Desktop-width layout. Data persisted in Supabase (no auth). |
| Windows app | Native gadget shell. See §6. |
| Mac app | Native gadget shell. See §6. |

---

## 3. Information architecture

The app has three top-level pages, reachable from a persistent tab navigation centered in the header:

| Tab | Purpose |
|---|---|
| **Today** | Tasks for today + the Focus Session widget + today's completed sessions. |
| **Later** | A holding space for tasks to do at some future point. |
| **History** | Weekly calendar view of past Focus Sessions. |

Navigation tabs: `Today` · `Later` · `History`, visible on every page.

---

## 4. Core concepts & data model

### 4.1 The block model

Each list page (Today, Later) is a **document of ordered blocks**. There are two block types:

- **Task** — a checkable, draggable, and editable line of text. The default block type.
- **Title** — a non-checkable, draggable, and editable heading used to group tasks visually.

Tasks and titles share one ordered list. A title groups every task beneath it until the next title — grouping is **positional**, not a stored relationship. Titles are optional.


### 4.2 Entities

**Block**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier. |
| `type` | `task` \| `title` | Block type. |
| `content` | string | The text content of the block. |
| `list_type` | `today` \| `later` | Which page the block lives on. |
| `order` | number | Position within its parent/list (fractional index for drag-and-drop). |
| `state` | `default` \| `done` | Task completion state. Titles have no state. |
| `in_session` | boolean | Tasks only. `true` while the task is inside an active Focus Session — hides it from the Today list. |

**Focus Session**

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier. |
| `date` | date string | The day the session belongs to. |
| `planned_duration_min` | number | Duration the user set before running. |
| `started_at` | timestamp | Wall-clock start time. |
| `ended_at` | timestamp \| null | Wall-clock end time. Null while session is active. |
| `status` | enum | `running` \| `paused` \| `completed` \| `canceled`. |
| `completed_task_count` | number | Number of tasks checked off during this session. |

### 4.3 Tasks in a Focus Session — confirmed behavior

Tasks in a Focus Session are tracked via `in_session: true` on the Block. The lifecycle is:

1. **Drop into session** → task sets `in_session: true`. It disappears from the Today task list and appears only inside the Focus Session widget.
2. **During the session** → the task is checkable inside the widget. Checking it sets `state: done`.
3. **Session ends (completed or canceled)** → all tasks in the session have `in_session` reset to `false`. They return to the Today list in their original position. Checked tasks stay `done`; unchecked tasks stay `default`.
4. **Manual drag-out** → the user can drag a task back to the Today list at any time, which also sets `in_session: false`.

---

## 5. Feature specifications

### 5.1 Today page

The main page and the app's default landing screen.

**Layout (top to bottom):**
1. **Header** — app nav tabs.
2. **Focus Session widget** — the web app's widget looks different from the desktop one.
3. **Today's task list** — block document for `list_type: today`. Tasks with `in_session: true` are hidden while a session is active.
4. **Today's sessions** — summary list of Focus Sessions completed today.

**Today's task list**
- Freely editable block document supporting all task interactions in §5.2.

**Today's sessions section**
- Lists each completed session today: **starting time** (e.g. `11:00`), **duration** (e.g. `3hrs`), **task count** (e.g. `2 tasks`).
- Read-only summary; full detail and editing is in History.

### 5.2 Task interactions

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
- When a user clicks while keeping mouse down on a task or title, it shrinks 0.98 in size and opacity down to 0.9, and follows the user's mouse cursor while user is moving mouse to where it should be relocated.
- Drag-and-drop moves tasks and titles anywhere in the list.

**Checkbox**
- Each task row has a checkbox. Checking → `state: done`; unchecking → `state: default`.

### 5.3 Task states

Tasks have exactly **two states**. No others.

| State | Meaning |
|---|---|
| `default` | Not done (initial state). |
| `done` | Completed (checkbox checked). |

Session pausing is a property of the Focus Session itself, not of individual tasks. There are no `paused` or `canceled` task states.

### 5.4 Focus Session widget

The core feature of the product. Lives at the top of the Today page, and as the main view in Desktop.

**Four states:**

| State | Trigger | Display |
|---|---|---|
| **Empty** | No session running | "Empty focus session" + "Click to start *or* Drop tasks here." |
| **Running — no tasks** | Session started, no tasks added | Large timer + no tasks + Pause + Cancel |
| **Running — has tasks** | Session started with tasks | Large timer + tasks + Pause + Cancel + task list |
| **Paused** | User pressed Pause | Large timer + "Paused — N tasks" + Resume + Cancel + task list |

**Activation**
- Clicking the widget or dropping a task into it activates it.

**Setup flow**
1. Drop one or more tasks from the Today list into the widget (or start with zero tasks).
2. Set the session duration.
3. Click **Run**.

**Running session display:**
- Tasks counter: e.g. `4 tasks`.
- Starting time, e.g. `14:15`.
- Live countdown: e.g. `15:31` — ticks down in real time, survives tab switches.
- **Pause** / **Resume** and **Cancel** buttons.
- The task list, each task checkable.

**When the timer reaches zero:**
- Session status → `completed`. Saved to History.
- Tasks return to Today per §4.3. The count of tasks checked during the session is recorded in History.
- An **end-of-session notification** is displayed.

**Cancel behavior:**
- Session status → `canceled`. Not saved to History.
- All tasks return to Today with `in_session: false`, state unchanged.

### 5.5 Later page

A space for tasks to do at some future point.

- Identical layout to the Today task list: ordered block document with tasks and optional titles.
- Titles are used to create loose groupings (e.g. "Tomorrow", "This week", "Weekend"). Optional.
- Right-click any task → "Move to today's list, Duplicate, Delete."
- No Focus Session widget. No sessions section.

### 5.6 History page

A log of all past Focus Sessions.

**View: week grid**
- 7-column grid, Monday–Sunday, with a time axis on the left.
- Each day cell shows the sessions run that day.
- Each session entry shows: duration (in minutes and in hours), starting time, number of completed tasks.
- Each day shows: number of sessions completed, and total hours worked.
- User can navigate backward and forward by week.


---

## 6. Desktop gadget

Not built in the MVP. Documented so the architecture can accommodate it cleanly.

- A small always-visible window showing the live timer and active session tasks.
- Links to open Today, Later, History in the full web app.
- Setting: always-on-top toggle, pause/resume, cancel, expand/minimise
- Delivers native OS notifications when a session ends.
- Allows instant editing of the tasks and creating new session tasks from the gadget.


---

*End of specification — v0.9. Ready to use as the source of truth for the prototype.*

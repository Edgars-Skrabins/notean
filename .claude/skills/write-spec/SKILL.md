---
name: write-spec
description: Write or revise a Notean feature spec in specs/ with three parts (functionality, technical decisions, step-by-step implementation TODO), after researching both frontend/ and backend/ and interviewing the user about every open decision. Use this whenever the user describes a feature they want planned, specced, scoped or "prepared", asks for a spec, spec sheet, plan or TODO for a feature, or wants an existing spec changed, extended or given a TODO, even if they don't say the word "spec". Do not use it to implement a spec that already exists.
---

# Write a feature spec

A spec is the single source of truth for one feature across the whole Notean app. Someone (often Claude in a later session, with no memory of this conversation) will implement it task by task from the TODO, so it has to stand on its own: every decision made, every file named, nothing left to guess.

The user's standing rule is that Claude never decides technology, architecture, naming, UX or scope on their behalf. A spec is where those decisions get pinned down, so the interview step matters more than the writing.

## Where specs live

- `specs/personal/` (gitignored) by default.
- `specs/shared/` (committed) only when the user explicitly asks for it.
- File name: `SCREAMING_SNAKE_CASE` ending in `_SPEC.md`, e.g. `FAVORITES_SPEC.md`.
- Writing a spec never touches `frontend/` or `backend/` and never commits anything.

## Workflow for a new spec

### 1. Understand the request

Restate the feature to yourself in plain terms: who uses it, what they can do, where it appears, what is explicitly excluded. Note everything the user already decided so you don't ask about it again.

### 2. Research the code

Read before asking, so questions are concrete and options are real. Look at both halves even if the feature sounds one-sided, because most Notean features touch both:

- `CLAUDE.md` at the repo root for conventions you must follow (they don't need re-deciding, just applying).
- Existing specs in `specs/` for related features, past decisions and naming.
- Backend: `backend/db/schema.rb`, the relevant models, controllers, `config/routes.rb`, strong params in `ApplicationController`, and the matching tests.
- Frontend: the relevant routes in `frontend/src/app/app/app.routes.ts`, pages, components, services, models, `config/phrases.ts`, and shared components that can be reused (buttons, icon buttons, dialogs, toasts).
- Record the current test counts (`bin/rails test` in `backend/`, `npx ng test --watch=false --browsers=ChromeHeadless` in `frontend/`) so the TODO can state a baseline.

### 3. Interview the user

List every decision the spec needs that the user hasn't made and the codebase conventions don't settle. Typical ones: data model shape, where state lives (server, `localStorage`, both), endpoint shape, permissions, ordering and limits, empty states, what happens on delete, naming of new concepts, new libraries, edge cases.

Ask with the AskUserQuestion tool, up to four questions per call, in as many rounds as needed. For each question give real options grounded in what you read, put the one you'd recommend first with "(Recommended)" in its label, and say in the description what each option costs. Don't fold several decisions into one question, and don't silently pick an answer for anything the user hasn't decided. If an answer raises a new question, ask it before writing.

### 4. Write the spec

Use the template below. All three parts are required and kept separate: Part 1 is readable by someone who never looks at code, Part 2 is the technical design, Part 3 is the build order.

### 5. Hand it back

Tell the user the file path, summarise each part in a few lines, and list any decision you recorded that they should double-check. Don't start implementing.

## Workflow for adjusting an existing spec

1. Read the whole spec first, including its decisions and any ticked TODO items.
2. Interview the user about anything the change leaves open (same rules as above).
3. Update every part the change touches. A behaviour change usually ripples into Part 2 (data model, API) and Part 3 (new or changed tasks), so check all three.
4. Never untick or delete completed TODO items. Add new tasks with the next free ID in the right block, and mark tasks made obsolete by the change as `~~struck through~~` with a short reason.
5. Add each new decision to the decisions list with the date, so the history of why stays visible.
6. If the spec predates the three-part structure, restructure it into the three parts as part of the adjustment, keeping all its content and decisions.

## Spec template

```markdown
# <Feature name> — Spec

**Status:** ready for implementation | in progress | done
**Last updated:** <YYYY-MM-DD>

# Part 1 — Functionality

## 1.1 Summary
Two or three sentences: what the feature is and why it exists.

## 1.2 Scope
**In scope:** bullet list.
**Out of scope:** bullet list, each with a word on why (future spec, not needed, dropped).

## 1.3 Business rules
The rules the system enforces, independent of UI: who can do what, ownership, uniqueness, limits, ordering, what happens when related things are deleted.

## 1.4 User interactions
One subsection per screen or surface. For each: where it is, what the user sees (including empty, loading and error states), what each control does, and the feedback they get. Write it as behaviour, not components.

## 1.5 Text shown to users
Every new user-facing string in English and Latvian, as a table with columns for the phrase key, English and Latvian. Leave Latvian for the user to confirm if you aren't sure.

# Part 2 — Technical decisions

## 2.1 Stack and libraries
What existing stack pieces this uses and any new dependency (with version and why). Say "no new dependencies" if that's the case.

## 2.2 Data model
Tables, columns, types, null rules, indexes, foreign keys, migrations, model validations and associations.

## 2.3 API
Each endpoint: method, path, params (strong params name), success response shape, every error status with its `statusMessage`, authorization.

## 2.4 Frontend architecture
Models, services and their methods with return types, components (new and reused), routes and guards, state and `localStorage` keys, realtime channels if any.

## 2.5 Decisions
Numbered list. Each entry: the question, the answer, and the reason, plus the date for decisions added after the first version. Include alternatives that were rejected and why, so they don't get re-proposed.

# Part 3 — Implementation TODO

Baseline before starting: <N> backend and <M> frontend tests passing.
Run `bin/rails test` in `backend/` and the frontend tests in `frontend/` after each block.

### A. <Block name>
- [ ] A1. <One concrete change: what, in which file(s), and how to tell it's done.>
- [ ] A2. ...

### Z. Wrap-up
- [ ] Z1. Full backend and frontend test runs, `npm run build` in `frontend/` (watch the style budgets), `bin/rubocop` in `backend/`.
- [ ] Z2. Manual check in the running app: <the end-to-end path a user would take>.
```

## Writing the TODO

The TODO is what makes a spec implementable in small, reviewable steps, so be specific:

- Order blocks so each builds on the previous one: backend data model, backend API, frontend shared building blocks, frontend data layer (models, services), frontend screens, wrap-up.
- One task is one change a reviewer can check on its own, naming the files it touches. "Add favorites" is a block, not a task.
- Put the tests for a change in the same task or in a test task at the end of its block, never only in wrap-up.
- Include the chores that are easy to forget: updating existing tests and fixtures broken by the change, both translation files, resetting the dev database when a migration needs it, removing code or phrases that become unused.
- Follow the conventions in the root `CLAUDE.md` (path aliases, `PHRASES` keys, `map*` functions, discriminated-union results, strong params in `ApplicationController`, camelCase BEM classes, no comments in code). The TODO should never ask for something that breaks them.

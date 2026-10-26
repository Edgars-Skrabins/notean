# Content size limits — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Titles, rich-text content and descriptions accept any length today. One request can store megabytes in a title or page, which then slows every list, search and broadcast that includes it. This spec adds maximum sizes, enforced by the API and reflected in the inputs.

How to reproduce today: `PATCH` a page with a 5 MB `content` string or a 10,000-character `title`. Both are saved.

- **Users:** everyone creating or editing content.
- **Usage:**
  - Title and name inputs stop accepting characters at the limit (`maxlength`), and so do description textareas. No counters are shown.
  - Saving a page or diagram whose content is over the limit shows the translated error "This content is too large to save", and the user stays in edit mode with their draft.
  - If the API rejects a title or description anyway (bypassed input), its translated error shows in the usual alert area.
- **Rules:**

| Field | Limit |
|---|---|
| Titles and names: page, diagram, board, ticket, folder, column, project name, team name | 200 characters |
| Page `content` (sanitised HTML) and diagram `content` (X6 JSON) | 1 MB (1,048,576 bytes, measured after sanitising) |
| Ticket `description`, project `description` | 10,000 characters |

  - Existing limits stay as they are: nickname 3–30 and priority name 40.
  - Limits are checked on create and update.
- **Out of scope:**
  - Request body size limits at the server or proxy level (deploy work).
  - Limits on avatar images, which already exist.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies.

## 2.2 Structure

**Backend:**
- New concern `backend/app/models/concerns/content_limits.rb`:
  - `TITLE_MAX_LENGTH = 200`.
  - `CONTENT_MAX_BYTES = 1.megabyte`.
  - `DESCRIPTION_MAX_LENGTH = 10_000`.
- Models validate with these constants:
  - `Page`, `Diagram`, `Board`, `Ticket`, `Folder`, `Column`: `validates :title, length: { maximum: TITLE_MAX_LENGTH }`.
  - `Project` and `Team`: `validates :name, length: { maximum: TITLE_MAX_LENGTH }`.
  - `Page` and `Diagram`: a custom `content_size` validation using `content.bytesize`.
  - `Ticket` and `Project`: `validates :description, length: { maximum: DESCRIPTION_MAX_LENGTH }`.
- New error codes in `backend/app/errors/error_codes/common.rb`:
  - `TITLE_TOO_LONG` (422).
  - `CONTENT_TOO_LARGE` (422).
  - `DESCRIPTION_TOO_LONG` (422).
- Each controller's failure branch checks `errors.of_kind?(<attr>, :too_long)` (or the content validation's kind) and renders the matching code before falling back to its existing `*_FAILED` code. That covers create and update in Pages, Diagrams, Boards, Tickets, Folders, Columns, Projects, and Teams create and rename. A shared private helper in `ApplicationController`, `limit_error_code(record)`, returns the code or nil, so each controller only adds one line.

**Frontend:**
- New `config/contentLimits.ts` exporting `TITLE_MAX_LENGTH = 200` and `DESCRIPTION_MAX_LENGTH = 10000`.
- `maxlength` on every title and name input and every description textarea:
  - The detail layouts.
  - `create-named-item-dialog`.
  - The inline rename in `item-tree` and `kanban-column`.
  - The ticket popup title and description.
  - `project-form` name and description.
  - Create team and the Manage team rename.
- `config/errorCodes/common.ts`: the three codes. Translations under `ERRORS.COMMON.*` in every translation file.

## 2.3 Decisions
1. **Title and name limit?** 200 characters. Rejected: 255, and 100. (2026-10-26)
2. **Page and diagram content limit?** 1 MB each. Rejected: 5 MB for diagrams, and 5 MB each. (2026-10-26)
3. **Description limit?** 10,000 characters for both ticket and project descriptions. (2026-10-26)
4. **Frontend?** `maxlength` plus translated error codes, with no counters. (2026-10-26)
5. **Error codes?** Three generic codes in `ErrorCodes::Common`, not per-domain codes, because the message is the same whatever the item. (2026-10-26, recorded while writing the spec; confirm during review)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` and `npm test` and note the counts.

### A. Backend validations
- [ ] A1. Add the `ContentLimits` concern and the validations to `Page`, `Diagram`, `Board`, `Ticket`, `Folder`, `Column`, `Project` and `Team`. Model tests per model: at the limit is valid, one over is invalid (for content: 1 MB valid, 1 MB + 1 byte invalid).
- [ ] A2. Add the three codes to `error_codes/common.rb`, plus `limit_error_code` in `ApplicationController`, and use it in every create and update failure branch listed in 2.2. Controller tests: one per endpoint family showing the right code for an over-limit title; content for pages and diagrams; description for tickets and projects.

### B. Frontend
- [ ] B1. Add `config/contentLimits.ts` and the error codes, with translations in every file in `public/assets/translations/`.
- [ ] B2. Add `maxlength` to every input and textarea listed in 2.2. Spot-check spec tests on `create-named-item-dialog` and the ticket popup that the attribute is set from the constants.
- [ ] B3. Page and diagram detail: a `CONTENT_TOO_LARGE` save failure shows the message and keeps edit mode with the draft. Spec test.

### Z. Wrap-up
- [ ] Z1. Full test runs, build and lint, using the commands in `CLAUDE.md`.
- [ ] Z2. Manual check in the running app:
  - Type past 200 characters in a ticket title (input stops).
  - Paste a very large text into a page and save (error shown, draft kept).
  - Create and rename a folder near the limit.

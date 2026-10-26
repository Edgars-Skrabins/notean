# Search trigram indexes — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

Global search, and the list screens' server search, match with `LOWER(column) LIKE '%term%'`. No B-tree index can serve a pattern that starts with `%`, so every search scans every row of the team's pages, diagrams, tickets, boards and projects, including the large `search_text` and `description` columns. One global search request runs up to five of these scans. This change adds PostgreSQL trigram (GIN) indexes, so these searches use an index instead of a full scan. Search results and behaviour don't change.

- **Users:** anyone using the header's global search, or the search boxes on the Pages, Diagrams, Projects and board List screens.
- **Usage:** unchanged. The same results in the same order, just faster as data grows.
- **Rules:** none new. Search matching (case-insensitive substring, `title_match_first` ordering, escaping of `%` and `_`) stays exactly as it is.
- **Out of scope:**
  - Full-text search (`tsvector`, ranking, stemming): a different feature.
  - Terms shorter than 3 characters still scan, since trigrams can't help with them. That's acceptable.

# Part 2 — Technical details

## 2.1 Tools and libraries

PostgreSQL's built-in `pg_trgm` extension (ships with PostgreSQL 17, nothing to install in the `postgres` Docker image). No new gems or npm packages.

## 2.2 Structure

**Schema** (`backend/db/migrate/20261026120000_create_schema.rb`, the single squashed migration; edit it and rebuild the dev and test databases, no new migration file):

- `enable_extension "pg_trgm"`.
- GIN trigram expression indexes on every `text_searchable` column, matching the exact expressions the queries use (`LOWER(table.column)`):
  - `pages`: `lower(title)`, `lower(search_text)`
  - `diagrams`: `lower(title)`, `lower(search_text)`
  - `tickets`: `lower(title)`, `lower(description)`
  - `boards`: `lower(title)`
  - `projects`: `lower(name)`, `lower(description)`
  - Written as e.g. `t.index "lower((title)::text) gin_trgm_ops", using: :gin, name: "index_pages_on_lower_title_trgm"`.
- Regenerate `backend/db/schema.rb` from the rebuilt database. Per the shared-dev-DB note, make sure no other branch's tables leak into it.

**Queries:** `TextSearchable` (`LOWER(table.col) LIKE :pattern ESCAPE '\'`) and `TitleSearchable` (`LOWER(title) LIKE ?`) already use these exact expressions. Change them only if the planner can't match an index; `TitleSearchable` leaves `title` unqualified, and that is fine for the expression index.

**Verification:** a test that seeds enough rows and checks `EXPLAIN` shows the trigram index being used is unreliable on small test tables. Verify by hand instead (see Z2) and keep the existing search tests as the regression guard.

## 2.3 Decisions

1. **pg_trgm GIN indexes on `LOWER(column)`.** Chosen 2026-10-26: they speed up the existing `LIKE '%…%'` queries without changing them.
2. **Index every searched column (9 indexes).** Chosen 2026-10-26, so all search sections benefit. Rejected: only the big text columns, which would leave project and board search scanning.
3. **Edit the squashed `create_schema` migration and rebuild.** This is the project's standing schema-change approach; existing data doesn't matter.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test` in `backend/` and note the count here.

### A. Schema
- [ ] A1. Add `enable_extension "pg_trgm"` and the 9 GIN trigram indexes to `backend/db/migrate/20261026120000_create_schema.rb`.
- [ ] A2. Rebuild the dev and test databases (`bin/rails db:drop db:create db:migrate`, using this worktree's own `DATABASE_URL` / `TEST_DATABASE_URL` if set), and check that `backend/db/schema.rb` contains the extension and exactly these new indexes and nothing from other branches.
- [ ] A3. Run `backend/test/controllers/search_controller_test.rb` and the pages, diagrams, projects and tickets index search tests. They must pass unchanged.

### Z. Wrap-up
- [ ] Z1. Full backend test run, `bin/rubocop`.
- [ ] Z2. Manual check: in `bin/rails dbconsole` on the dev DB, insert or seed a few thousand pages, run `SET enable_seqscan = off; EXPLAIN SELECT … WHERE LOWER(pages.search_text) LIKE '%abc%'` and confirm a Bitmap Index Scan on the trigram index. Then run a global search in the app and check the results are unchanged.
- [ ] Z3. Update `CLAUDE.md`'s `TextSearchable` bullet to mention the trigram indexes and that new `text_searchable` columns need one.

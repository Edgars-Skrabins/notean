---
name: implement-notean-spec
description: Implement a Notean spec from specs/ on its own branch in its own git worktree, so parallel sessions can each work on a different spec. Creates the feature/<spec-name> or fix/<spec-name> branch from origin/master, adds a worktree for it and moves the session into it, then works through the spec's TODO in order: ticking tasks as they are done, running the tests after each block, stopping for the user's review between blocks, and asking instead of guessing when the spec is unclear or the work starts to outgrow it. Finished work goes to master through a pull request. Use this in the Notean project instead of implement-spec whenever the user asks to implement, build, start, continue or finish a spec or a feature that has a spec, or to work through a spec's TODO.
---

# Implement a Notean spec

The spec is the source of truth. Build exactly what it describes, nothing more, and keep the spec up to date as you go, so the user and any later session can see where the work stands.

Every spec is implemented on its own branch, worked on in its own local worktree. Commits and pushes go to that branch; the worktree never leaves this machine. Several sessions share the main checkout, so never switch branches there and never change app code there.

## Before starting

1. Find the spec in `specs/`. If there isn't one for the work, stop and ask the user; offer to write one with the `write-spec` skill.
2. Read the whole spec: Part 1 for the purpose and business logic, Part 2 for the technical decisions, Part 3 for the TODO and what is already ticked.
3. Set up the branch and worktree, as described below.
4. Read the project's `CLAUDE.md` and the code the first block touches, so the work follows the project's conventions.
5. Run the test suites and compare against the baseline in Part 3. If tests already fail before you change anything, tell the user before starting.
6. Set the spec's **Status** to `in progress` and its **Last updated** date to today.

## Branch and worktree

1. Work out the names. `<spec-name>` is the spec's filename without `_SPEC.md`, lowercased, with underscores turned into hyphens. The branch is `feature/<spec-name>` for a feature and `fix/<spec-name>` for a bug fix. If it isn't clear which one the spec is, ask the user.
2. If the session is already in `.claude/worktrees/<spec-name>` on that branch, keep working there and skip the rest of this section.
3. If the session is in a different worktree, such as one the app created with a generated name, stop and ask the user how to proceed. Don't rename its branch or reuse it for this spec.
4. From the main checkout, run `git fetch origin`, then:
   - If the branch doesn't exist yet, create it from master: `git branch <branch> origin/master`.
   - If the branch already has a worktree (`git worktree list`), use that worktree.
   - Otherwise add a worktree for it: `git worktree add .claude/worktrees/<spec-name> <branch>`.
5. Move the session into the worktree with `EnterWorktree` and its `path`. All reading, editing, testing and committing for this spec happens there from now on.
6. Install the frontend dependencies in the worktree (`npm install` in `frontend/`), since `node_modules` isn't shared between worktrees.

## Working through the TODO

- Work in the order the TODO gives, one task at a time. Don't skip ahead or merge tasks.
- Tick each task (`- [x]`) in the spec as soon as it is done, not in a batch at the end.
- Write the tests a task asks for as part of that task. Tests cover the important logic and must be meaningful, not there just to have tests.
- Run the relevant tests at the end of each block, using the commands in `CLAUDE.md`. Fix failures before moving on, and never tick a task whose tests fail.

## Stopping for review

- If the TODO has more than one block besides wrap-up, stop after each block: summarise what changed, which tasks are ticked and the test results, and wait for the user's review before starting the next block.
- If the TODO is small, a single block plus wrap-up, finish it and stop for review at the end.
- If the user said to run through without stopping, do that and stop for review at the end.
- Never commit or push until the user has reviewed the changes and told you to. Commits and pushes go to the spec's branch, never to `master`.

## When the spec is unclear or wrong

- If the spec doesn't settle something, contradicts the code, or turns out not to work as written, stop and ask the user. Present the decision and the options, and let them choose. Never guess.
- Once they answer, update the spec: add the answer to the decisions list in Part 2 with the date, and adjust Part 1, Part 2 or the TODO wherever the answer changes them. Never untick or delete completed tasks; strike through obsolete ones with a short reason.

## When the work outgrows the spec

If the work turns out to need something the spec doesn't cover, such as a second feature, a separate bug fix or a large unplanned change, stop and ask the user whether to split it into a new spec file. Don't quietly widen the scope of the current spec.

## Finishing

1. Do the wrap-up block: full test runs, build and lint, and the manual check described in the spec.
2. If the implementation changed something the project's `CLAUDE.md` or README describes, such as the structure, routing, stack, setup or commands, update them in the same piece of work.
3. Set the spec's **Status** to `done` and update **Last updated**.
4. Summarise the result for the user's review: what was built, the branch and worktree it is on, the test results, any spec changes made along the way, and anything left open.
5. Once the user has approved and told you to push, push the branch and open a pull request from it into `master` (`gh pr create --base master`). Never merge it yourself; it is merged only after it has been approved.

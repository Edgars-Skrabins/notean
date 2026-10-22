---
name: implement-notean-spec
description: Implement a Notean spec by following the global implement-spec skill, plus Notean's branch, worktree and pull request rules: the work happens on a feature/<spec-name> or fix/<spec-name> branch created from origin/master, in a local worktree for that branch, so parallel sessions can each work on a different spec, and finished work reaches master through a pull request. Use this in the Notean project instead of implement-spec whenever the user asks to implement, build, start, continue or finish a spec or a feature that has a spec, or to work through a spec's TODO.
---

# Implement a Notean spec

Load the global `implement-spec` skill and follow all of its rules. This skill only adds the Notean rules below on top of it. Where the two overlap, these rules add to `implement-spec`, they don't replace it.

Every spec is implemented on its own branch, worked on in its own local worktree. Commits and pushes go to that branch; the worktree never leaves this machine. Several sessions share the main checkout, so never switch branches there and never change app code there.

## Branch and worktree

Set these up right after reading the spec, before reading the code or running the baseline tests.

1. Work out the names. `<spec-name>` is the spec's filename without `_SPEC.md`, lowercased, with underscores turned into hyphens. The branch is `feature/<spec-name>` for a feature and `fix/<spec-name>` for a bug fix. If it isn't clear which one the spec is, ask the user.
2. If the session is already in `.claude/worktrees/<spec-name>` on that branch, keep working there and skip the rest of this section.
3. If the session is in a different worktree, such as one the app created with a generated name, stop and ask the user how to proceed. Don't rename its branch or reuse it for this spec.
4. From the main checkout, run `git fetch origin`, then:
   - If the branch doesn't exist yet, create it from master: `git branch <branch> origin/master`.
   - If the branch already has a worktree (`git worktree list`), use that worktree.
   - Otherwise add a worktree for it: `git worktree add .claude/worktrees/<spec-name> <branch>`.
5. Move the session into the worktree with `EnterWorktree` and its `path`. All reading, editing, testing and committing for this spec happens there from now on.
6. Install the frontend dependencies in the worktree (`npm install` in `frontend/`), since `node_modules` isn't shared between worktrees.

## Committing and pushing

- Commits and pushes go to the spec's branch, never to `master`, and only after the user has reviewed the changes and told you to.

## Finishing

- In the summary for the user's review, name the branch and worktree the work is on.
- Once the user has approved and told you to push, push the branch and open a pull request from it into `master` (`gh pr create --base master`). Never merge it yourself; it is merged only after it has been approved.

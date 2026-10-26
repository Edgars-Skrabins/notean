# Rails 8 upgrade — Spec

**Type:** bug fix
**Status:** ready for implementation
**Last updated:** 2026-10-26

# Part 1 — Business logic and usage

The backend runs Rails 7.2.1.1. Brakeman reports, at high confidence, that support for this version ended on 2026-08-09, and the whole 7.2 line is out of security support, so no further security patches arrive. This spec upgrades the backend to the latest Rails 8.x release, with no change to app behaviour.

How to reproduce: run `bundle exec brakeman -q --no-pager` in `backend/` and see the warning "Support for Rails 7.2.1.1 ended on 2026-08-09".

- **Users:** none directly. Developers and any future deployment get a supported framework.
- **Usage:** no visible change. Every endpoint, channel and test behaves as before.
- **Rules:**
  - Ruby stays at 3.3.5 (`backend/.ruby-version`). Rails 8 supports it.
  - Rails 8's new default infrastructure (Solid Cache, Solid Cable, Solid Queue, Kamal, Thruster, the authentication generator) is not adopted. Those belong to the deferred deploy-readiness work.
  - Brakeman must report no Rails end-of-life warning afterwards.
- **Out of scope:**
  - Upgrading Ruby.
  - Upgrading Angular.
  - Adopting new Rails 8 features.
  - Production configuration (Redis, cache store, storage), which waits for a hosting decision.

# Part 2 — Technical details

## 2.1 Tools and libraries
- `rails`: from `~> 7.2.1` to `~> 8.<minor>.0`, where `<minor>` is the latest Rails 8 minor release on rubygems.org when this spec is implemented. Check with `gem search ^rails$ --remote` or rubygems.org, and record the exact version in Decisions when starting.
- Gems whose versions must allow the new Rails: `rack-cors`, `rack-attack`, `jwt`, `pg`, `puma`, `bootsnap`, `rubocop-rails-omakase` and `brakeman`. Update them only as far as `bundle update rails` requires, plus `brakeman` and `rubocop-rails-omakase` to their latest versions.

## 2.2 Structure
- `backend/Gemfile` and `backend/Gemfile.lock`: the Rails version bump.
- `bin/rails app:update` regenerates framework files. Review each prompt:
  - Keep project changes (the CORS and rack-attack initializers, `filter_parameter_logging.rb`, `cable.yml`, `database.yml`, `production.rb` settings).
  - Take framework-only changes (bin stubs, new defaults file).
  - Don't accept files that add Solid Cache, Queue or Cable, Kamal or Thruster.
- `config/application.rb`: `config.load_defaults 7.2` stays during the upgrade. The generated `config/initializers/new_framework_defaults_8_*.rb` is worked through one setting at a time: enable each, run the tests, keep it if green. Then switch to `config.load_defaults 8.<minor>` and delete the defaults file.
- Fix any deprecation warnings the test suite prints under the new version.
- `db/schema.rb` may get a new version header after `db:prepare`. That's expected.
- Docs: the root `CLAUDE.md` Backend tech stack ("Rails 7.2" becomes the new version) and the `README.md` tech stack if it names a version.

## 2.3 Decisions
1. **Target?** The latest Rails 8.x, keeping Ruby 3.3.5 and not adopting the Solid gems. Rejected: also bumping Ruby. A later 7.2 patch isn't an option, because the whole line is out of support. (2026-10-26)
2. **New framework defaults?** Enabled one at a time with tests, then `load_defaults` is raised. This avoids a big-bang behaviour change. (2026-10-26, recorded while writing the spec)

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: run `bin/rails test`, `bin/rubocop` and `bundle exec brakeman -q --no-pager` in `backend/`, and record the test count and the Brakeman warning.

### A. Upgrade
- [ ] A1. Look up the latest Rails 8.x and record it in Decisions. Bump `rails` in `Gemfile`, run `bundle update rails` (plus `brakeman` and `rubocop-rails-omakase`), and confirm `bundle exec rails -v`.
- [ ] A2. Run `bin/rails app:update` and resolve each file as described in 2.2. Show the resulting diff of config files in the review notes.
- [ ] A3. Run the full test suite on `load_defaults 7.2` and fix failures and deprecation warnings until it's green.

### B. Framework defaults
- [ ] B1. Enable the settings in `new_framework_defaults_8_*.rb` one at a time, running tests after each. Note any setting that breaks something and how it was fixed.
- [ ] B2. Switch `config.load_defaults` to the new version, delete the defaults initializer, and run all tests.

### C. Docs
- [ ] C1. Update the Rails version in the root `CLAUDE.md` Backend tech stack and in `README.md` if it's named.

### Z. Wrap-up
- [ ] Z1. Full test runs and lint in both apps, using the commands in `CLAUDE.md`. `bundle exec brakeman -q --no-pager` must show no end-of-life warning.
- [ ] Z2. Manual check in the running app:
  - Register, create a team, create a page and edit it in two browsers (editing presence shows).
  - Create a board and move a ticket.
  - Upload an avatar.
  - Toggle a team feature (TeamChannel broadcast arrives).

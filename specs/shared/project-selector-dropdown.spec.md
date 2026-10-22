# Project selector dropdown — Spec

**Type:** feature
**Status:** ready for implementation
**Last updated:** 2026-10-22

# Part 1 — Business logic and usage

The project pickers use the browser's native `<select>`, which doesn't match the app's style. Its built-in arrow also sits flush against the right edge, so it looks squished. This spec adds one shared custom dropdown in the app's style and uses it for every native select in the app:

- the project selector in the dashboard header, next to the "Notean" title (`app-project-selector`)
- the project picker on the board page and in the page/diagram detail sidebar (`app-project-select`)
- the owner field in the project form (`app-project-form`)

It also hides the project pickers when the user has no projects to choose from.

- **Users:** every team member using the dashboard. Admins and owners also use the project form.
- **Usage:**
  - **Closed:** the dropdown is a button showing the current option's label and a chevron. The chevron has proper spacing on its right. Long labels are cut off with an ellipsis.
  - **Opening:** clicking the button, or pressing Enter, Space or Arrow Down while it has focus, opens a panel below it. The panel looks like the header's user menu: gradient card background, rounded items, hover highlight and the same slide-in animation. The selected option shows a checkmark.
  - **Picking:** clicking an option selects it and closes the panel.
  - **Keyboard:** with the panel open, Arrow Up and Arrow Down move the active option and stop at the first and last option (no wrapping). Home and End jump to the first and last option. Enter or Space selects the active option and closes the panel. Escape closes the panel without changing anything and returns focus to the button. Tab closes the panel and moves focus on as usual. When the panel opens, the active option is the selected one.
  - **Closing:** clicking anywhere outside the dropdown closes it without changing anything.
  - **Many options:** the panel has a maximum height and scrolls. The active option is kept scrolled into view.
  - **Header selector:** options are "All projects", then the visible projects in alphabetical order. This is unchanged.
  - **Board page and detail sidebar picker:** options are "No project", then the visible projects. The picker keeps showing the saved project until the parent confirms the change, which is the current behaviour.
  - **Project form owner field:** options are the team members by nickname. Read-only mode is unchanged and still shows plain text.
  - **No projects:** when the user can see no projects, the header selector is not shown at all. The board page picker is not shown either. In the detail sidebar, the whole "Project" block (label and picker) is not shown. Before the project list has loaded, it counts as empty, so the pickers appear once projects arrive.
- **Rules:** this is UI only. Project visibility, the stored header selection per team and how project changes are saved all stay as they are.
- **Out of scope:**
  - Search or type-to-filter inside the dropdown. The lists are short.
  - Multi-select.
  - Changing which projects a user can see, or how a selection is stored.

# Part 2 — Technical details

## 2.1 Tools and libraries
Angular standalone components, RxJS and ngx-translate, all already in the stack. No new dependencies.

## 2.2 Structure

**New model:** `src/app/models/dropdown.model.ts`
```ts
export interface DropdownOption {
  value: string | number | null;
  label?: string;
  labelKey?: string;
}
```
Each option has exactly one of `label` (plain text, e.g. a project name or nickname) or `labelKey` (a `PHRASES` key the dropdown translates, e.g. `ALL_PROJECTS`). Values are compared with `===`.

**New component:** `src/app/components/dropdown/` (`DropdownComponent`, selector `app-dropdown`, CSS block `dropdown`), created with `npm run newcomponent dropdown`.
- Inputs:
  - `@Input({required: true}) options: DropdownOption[]`
  - `@Input() value: string | number | null`
  - `@Input() ariaLabel: string`, a `PHRASES` key that the dropdown translates
- Output: `@Output() valueChange = new EventEmitter<string | number | null>()`. It emits only when the picked value differs from `value`.
- It is a controlled component. The button always shows the option matching the `value` input and never changes its own value, so a parent can keep the old value until a save succeeds. This replaces `ProjectSelectComponent`'s current trick of resetting `select.value`.
- Template:
  - Trigger: a `<button type="button" class="dropdown__trigger">` with `aria-haspopup="listbox"`, `aria-expanded` and `aria-label`. It holds the label (`dropdown__label`, with ellipsis) and `<app-icon name="chevron-right">` rotated 90° (pointing down), flipped when open, with right padding so it isn't flush with the border.
  - Panel: `<ul class="dropdown__panel" role="listbox">` with `aria-activedescendant`. Each option is an `<li role="option" class="dropdown__option">` with a unique `id`, `aria-selected`, `dropdown__option--active` for the keyboard-active option, and a checkmark on the selected one. Its styling copies the values of `.dashboardHeader__dropdown` and `.dashboardHeader__dropdownItem`, plus a `max-height` with `overflow-y: auto`.
- Logic: `isOpen`, `activeIndex`, `open()`, `close()`, `select(option)`, and `handleKeydown(event)` for the keys in Part 1.
  - The panel is rendered with the CDK overlay pattern from `popup-clipping-fix.spec.md` (2.2), so no container can clip it:
    - the trigger gets `cdkOverlayOrigin`
    - the panel goes in a `cdkConnectedOverlay` template with `DROPDOWN_POSITIONS`, `cdkConnectedOverlayMinWidth` set to the trigger's width, and a reposition scroll strategy
  - Outside clicks are handled with `(overlayOutsideClick)` → `handleOutsideClick(event)`, which closes unless the target is inside the trigger. This replaces a `document:click` HostListener.
  - Focus returns to the trigger on Escape.
- Sizing: `:host { display: inline-block; }`. Callers set the width through the host element: the header keeps `max-width: 220px`, and the board/sidebar picker and project form use `width: 100%`. The panel is at least as wide as the trigger.
- Component CSS must stay under the 4kB budget.

**`ProjectFilterService`** (`services/project-filter.service.ts`): add `readonly hasProjects$: Observable<boolean>`, which is `projects$` mapped to `projects.length > 0`.

**`ProjectSelectorComponent`** (header): the template becomes `<app-dropdown>` wrapped in `*ngIf="hasProjects$ | async"`.
- The options are built in the component's `options$` from `projects$`: `{value: null, labelKey: ALL_PROJECTS}`, then the sorted projects.
- `value` is `getSelectedProjectId()`.
- `handleChange(value)` calls `projectFilterService.select(value)` with the id as `number | null`.
- The `ALL_OPTION` string sentinel and the string `selectedValue` are removed. The native-select CSS is removed.

**`ProjectSelectComponent`** (board page and detail sidebar): the template becomes `<app-dropdown>` wrapped in `*ngIf="hasProjects$ | async"`.
- Options: `{value: null, labelKey: NO_PROJECT}` plus the projects.
- `value` is `projectId`.
- `handleChange(value)` emits `projectChange` with it. The dropdown already skips unchanged values.
- The `NO_PROJECT` sentinel, the `HTMLSelectElement` handling and the native-select CSS are removed.

**`ItemDetailLayoutComponent`**: wrap the sidebar's Project block (`itemDetail__sidebarLabel` plus `app-project-select`) in `*ngIf="hasProjects$ | async"` from `ProjectFilterService`.

**`ProjectFormComponent`**: replace the owner `<select>` with `<app-dropdown>`.
- Options: `members` mapped to `{value: member.id, label: member.nickname}`.
- `[value]="params.ownerUserId"` and `(valueChange)="handleOwnerChange($event)"`.
- Remove `.projectForm__select` styles. The `<label for="projectOwner">` becomes a plain label, since there is no input to point at, and the dropdown gets `ariaLabel` `PROJECT_OWNER`.

## 2.3 Decisions
1. **One spec or several?** One spec. Hiding when empty, the custom dropdown and the arrow spacing are one piece of work. The arrow bug disappears with the native select, and the new trigger gets proper right padding. Splitting into two specs was rejected as too small to justify.
2. **Scope of the custom dropdown:** a shared component that replaces all three native selects (header selector, board/sidebar project picker, project form owner). Header-only was rejected because the look would be inconsistent.
3. **Look:** the same style as the header user menu, with a checkmark on the selected option. Highlighting the selected option without a checkmark was rejected.
4. **Keyboard support:** full, as described in Part 1, so nothing is lost compared with the native select. Mouse plus Escape only was rejected.
5. **Hiding when empty:** applies to the header selector and also to the board page and detail sidebar pickers (including the sidebar's "Project" label). Header-only was rejected, because a picker offering only "No project" is pointless.
6. **Name:** `DropdownComponent` / `app-dropdown`. `SelectComponent` was rejected as easy to confuse with `ProjectSelectComponent`.
7. **API:** plain `@Input`/`@Output` (`value` / `valueChange`), following the project's convention. `ControlValueAccessor` was rejected because the project doesn't use that pattern. The project form moves from `ngModel` to these bindings.
8. **Chevron:** reuse the existing `chevron-right` icon rotated to point down, rather than adding a new icon. (Implementation choice, not one the user asked for.)
9. **Empty check:** a `hasProjects$` observable on `ProjectFilterService`, so the header, the picker and the sidebar label all use one source. (Implementation choice, not one the user asked for.)
10. **(2026-10-22) Overlay from the start:** the dropdown panel uses the CDK overlay pattern from `popup-clipping-fix.spec.md`, so it can't be clipped in the detail sidebar or anywhere else. This replaces the earlier `document:click` HostListener approach. Retrofitting it after both specs land was rejected.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend `npm test`, 375 of 375 passing.

### A. Shared dropdown
- [ ] A0. Check that the overlay setup from `popup-clipping-fix.spec.md` (block A: the prebuilt CSS in `angular.json` and `config/overlayPositions.ts`) is in place. If not, add it here exactly as that spec describes.
- [ ] A1. Add `DropdownOption` in `src/app/models/dropdown.model.ts`.
- [ ] A2. Generate `components/dropdown` with `npm run newcomponent dropdown` and build the trigger, panel, inputs, output and styling from 2.2.
- [ ] A3. Add open/close, option selection, keyboard handling, outside-click closing and focus return from Part 1 to `DropdownComponent`.
- [ ] A4. Add `components/dropdown/dropdown.component.spec.ts`, instantiating the class with an `ElementRef` like `ticket-assignees.component.spec.ts`. Cover:
  - it emits on picking a different value, and not on the same value
  - the trigger label follows the `value` input, not the last pick
  - arrow keys move the active option and stop at both ends
  - Home and End jump to the ends
  - Enter selects and closes
  - Escape closes without emitting
  - `handleOutsideClick` closes for an outside target, and not for a target inside the trigger

### B. Empty-state source
- [ ] B1. Add `hasProjects$` to `ProjectFilterService` and extend `project-filter.service.spec.ts` to cover it switching between empty and non-empty lists. Update `testing/projectFilterStub.ts` if the stub needs it.

### C. Use the dropdown
- [ ] C1. Rewrite `ProjectSelectorComponent` (ts, html, css) as described in 2.2, including the `hasProjects$` guard. Update its spec:
  - options list "All projects" first, then projects alphabetically
  - picking a project or All updates `ProjectFilterService`
- [ ] C2. Rewrite `ProjectSelectComponent` (ts, html, css) as described in 2.2, including the `hasProjects$` guard. Update its spec:
  - emits the chosen project id, or null for No project
  - the select-reset test is replaced by the dropdown's controlled-value behaviour, so drop it here
- [ ] C3. In `item-detail-layout.component.html` and `.ts`, hide the sidebar Project block when there are no projects.
- [ ] C4. Replace the owner `<select>` in `project-form.component.html` with `app-dropdown`, update `project-form.component.ts`, and remove `.projectForm__select` from its CSS. Fix any project form spec broken by the change.
- [ ] C5. Check that no native `<select>` is left in `src/app`, and remove imports that are now unused (`NgFor`, `FormsModule` where it's no longer needed).

### Z. Wrap-up
- [ ] Z1. Run `npm test` and `npm run build` in `frontend/`. All tests pass and no style budget is exceeded.
- [ ] Z2. Manual check in the running app:
  - With projects: the header dropdown opens, picks and filters lists, and works by keyboard (Tab to it, Arrow Down, arrows, Enter, Escape). The chevron has right spacing.
  - The board page picker changes a board's project.
  - The page/diagram sidebar picker does the same, and the panel isn't clipped by the sidebar.
  - The project form owner field changes the owner.
  - With no visible projects (a team without projects): the header selector, the board page picker and the sidebar "Project" block are all hidden.

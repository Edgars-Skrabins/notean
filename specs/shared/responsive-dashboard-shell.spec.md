# Responsive dashboard shell — Spec

**Type:** feature
**Status:** in progress
**Last updated:** 2026-11-04

# Part 1 — Business logic and usage

The dashboard shell (header, sidebar and content area around every `/dashboard/...` screen) was built for desktop only. At a 375px wide viewport the sidebar keeps its fixed 220px width, the content area shrinks to about 155px, the header is clipped (avatar at x=382, nickname at x=428) and the account menu cannot be reached at all. `dashboard.component.css` has no layout breakpoints. The item and ticket popups already adapt below 720px, so the shell is the part that blocks phone use.

This feature makes the shell work below 768px: the sidebar becomes an off-canvas drawer opened from a header button, the header becomes compact, the avatar becomes the account-menu trigger (on every width), and the language switcher leaves the dashboard header and moves into Settings. The auth card keeps its own language switcher.

- **Users:** every team member using Notean on a phone, a narrow browser window or a split screen; keyboard and screen-reader users on every width (the account menu trigger and the drawer get proper names, state and focus handling).
- **Usage:**
  - **Wide (768px and wider):** the layout stays as today: header on top, sidebar on the left (expandable and collapsible as now), content on the right. The header changes in two ways: the language switcher is gone, and the avatar plus nickname (with a small down chevron) is now one button that opens the account menu (Profile, Settings, Teams, Manage team for admins and owners, Log out). The separate hamburger "Menu" icon button next to the nickname is removed.
  - **Narrow (below 768px):** the header shows, from left to right, a "Menu" icon button (opens the navigation drawer), the global search filling the free width, and the avatar button (nickname hidden) that opens the account menu. The Notean brand text and the project selector are hidden in the header. The content area uses a 16px side gutter and the full width.
  - **Opening the drawer:** tapping "Menu" slides the sidebar in from the left over the content (about 200ms, no motion with reduced motion), with a dimmed scrim over the rest of the screen. The drawer shows a top row with the project selector (when the team has projects) and a Close icon button, then the usual sidebar entries (Home with unread badge, Chat list, Projects, Pages, Diagrams, Boards list, Favorites when enabled in Settings, Trash), always with labels. The collapse/expand sidebar toggle is not shown in the drawer. Focus moves to the first focusable element in the drawer and stays inside it while it is open.
  - **Closing the drawer:** the Close button, tapping the scrim, pressing Esc, or following any link in the drawer (once the navigation completes) closes it. After Close, scrim or Esc, focus returns to the "Menu" button. After a navigation, focus is left to the new screen. Widening the window to 768px or more closes the drawer and shows the normal sidebar.
  - **Account menu:** opening it with the avatar button moves focus to its first item; Tab and Shift+Tab stay inside the menu; Esc, an outside click or choosing an item closes it, and focus returns to the avatar button (unless an item navigated away).
  - **Language:** Settings gets a "Language" field in its Appearance section with the same language dropdown the auth card uses, plus the hint "Applies right away and is remembered on this device." Picking a language switches the UI immediately; it is not part of the Settings Save button and never marks Settings as having unsaved changes.
- **Rules:**
  - The breakpoint is a viewport width of 767px and below ("compact"); 768px and above is the current desktop layout. Tablet widths (768–1023px) keep the desktop layout.
  - Language stays a per-device preference stored in `localStorage` (`language`), exactly as today; nothing new is sent to the backend.
  - Controls that are new or changed in the compact header (Menu button, avatar button, drawer Close button) have a hit area of at least 44×44px.
  - Nothing is hidden on phones that exists on desktop: the project selector moves into the drawer, the language moves into Settings (for every width), every sidebar entry is in the drawer.
- **Out of scope:**
  - Layout of individual dashboard screens on phones (Kanban columns, List tab rows, Overview charts, chat page, diagram editor). Each screen keeps its own layout; `kanban-card-readability` and `list-tab-polish` own those screens.
  - Global search behaviour and its result panel (`global-search-polish`). This spec only checks the search still fits the compact header.
  - Toast position on phones (`announced-status-messages`).
  - Dialog semantics and focus traps for dialogs and item popups (`dialog-accessibility`).
  - Rendering Settings, Profile and Manage team inside the shell (`account-pages-in-shell`).
  - The decorative waves behind the dashboard (`quiet-dashboard-background`).
  - Saving the language on the user account (would need a backend column; see Decisions to double-check).
  - Bottom tab navigation, swipe-to-open gestures.

# Part 2 — Technical details

## 2.1 Tools and libraries
No new dependencies. Uses `@angular/cdk` (already `^22.2.0`): `BreakpointObserver` from `@angular/cdk/layout` for the compact state and `A11yModule` / `CdkTrapFocus` from `@angular/cdk/a11y` for focus handling in the drawer and the account menu. `EscapeService` for Esc on the drawer.

## 2.2 Structure

### Compact state and drawer state (`pages/dashboard/dashboard.component.ts`, `.html`, `.css`)
- `DashboardComponent` gets `isCompact = false` and `isNavOpen = false`.
  - Inject `BreakpointObserver` and subscribe in `ngOnInit` to `observe('(max-width: 767px)')`; set `isCompact` from `matches`. When `isCompact` becomes false, call `closeNav(false)`.
  - Inject `DOCUMENT` (or use `document`) only as needed for focus restore.
  - Subscribe to `router.events` filtered to `NavigationEnd` and call `closeNav(false)` (no focus restore).
  - `openNav()`: remember `document.activeElement` as the return-focus element, set `isNavOpen = true`, push an Esc handler with `escapeService.push(() => this.closeNav(true))` and keep the unregister function, then (after change detection, e.g. `setTimeout` or `afterNextRender`) call `focusFirstTabbableElementWhenReady()` on the drawer's `CdkTrapFocus.focusTrap` (`@ViewChild(CdkTrapFocus)`).
  - `closeNav(restoreFocus: boolean)`: no-op when already closed; set `isNavOpen = false`, call the Esc unregister function, and when `restoreFocus` focus the remembered element if it is still connected.
  - `toggleNav()`: open when closed, otherwise `closeNav(true)`.
  - Unsubscribe both subscriptions and unregister Esc in `ngOnDestroy`.
- Template: wrap `<app-dashboard-sidebar>` in a `div.dashboardShell__nav` with `[class.dashboardShell__nav--compact]="isCompact"` and `[class.dashboardShell__nav--open]="isNavOpen"`, `[cdkTrapFocus]="isCompact && isNavOpen"`, and, only while compact, `role="dialog"`, `aria-modal="true"` and `[attr.aria-label]="PHRASES.NAVIGATION | translate"` (bind with `[attr.role]="isCompact ? 'dialog' : null"` and so on). Pass `[compact]="isCompact"` and `(closeRequested)="closeNav(true)"` to the sidebar. Add `<div class="dashboardShell__scrim" *ngIf="isCompact && isNavOpen" (click)="closeNav(true)"></div>` as a sibling. Pass `[compact]="isCompact"`, `[navOpen]="isNavOpen"` and `(navToggle)="toggleNav()"` to `<app-dashboard-header>`.
- CSS (add after the `.dashboardShell__content` rule, leave every wave rule untouched, see Parallel work):
  - `.dashboardShell__nav` is a plain flex child on desktop (`display: flex`, `flex-shrink: 0`, `height: 100%`).
  - `@media (max-width: 767px)`: `.dashboardShell__content { padding: var(--space-4); }`; `.dashboardShell__nav` becomes `position: fixed; top: 0; bottom: 0; left: 0; z-index: 40; width: min(280px, 85vw); background: var(--dashboard-background); transform: translateX(-100%); visibility: hidden; transition: transform 200ms cubic-bezier(0.25, 1, 0.5, 1), visibility 0s linear 200ms;` and `.dashboardShell__nav--open` sets `transform: none; visibility: visible; transition-delay: 0s; box-shadow: var(--shadow-card);`. `.dashboardShell__scrim { position: fixed; inset: 0; z-index: 39; background: var(--color-overlay); }`.
  - Inside `@media (prefers-reduced-motion: reduce)`: `.dashboardShell__nav { transition: none; }`.
  - z-index 40/39 sits above the header (10) and below item and ticket popups (50) and toasts (70).

### Sidebar (`components/dashboard-sidebar/`)
- New inputs/outputs: `@Input() compact = false;` and `@Output() closeRequested = new EventEmitter<void>();`.
- New getter `get isCollapsed(): boolean { return this.collapsed && !this.compact; }`. Every template use of `collapsed` (the `--collapsed` class, `appTooltip` conditions, `[collapsed]` passed to `app-sidebar-chat` and `app-sidebar-boards`, `[dot]` on the unread badge, the favorites `*ngIf`) switches to `isCollapsed`.
- When `compact`, render a top row `div.dashboardSidebar__drawerHeader` (first child of the `nav`): `<app-project-selector>` and `<app-icon-button icon="x" [tooltip]="PHRASES.CLOSE | translate" [size]="44" (pressed)="closeRequested.emit()">`. Import `ProjectSelectorComponent` and `IconButtonComponent`.
- Hide the collapse toggle when `compact` (`*ngIf="!compact"`). Replace its native `[title]` with `[appTooltip]` shown only when collapsed (same pattern as the nav items) and keep its `aria-label`; the project rule forbids native `title`.
- `.dashboardSidebar--compact` (bound to `compact`): `width: 100%; border-right: none;`. `.dashboardSidebar__drawerHeader`: flex row, `align-items: center`, `justify-content: space-between`, `gap: var(--space-2)`, `margin-bottom: var(--space-3)`; the project selector takes the free width (`flex: 1; min-width: 0`). Keep the file under the 4kB style budget.

### Header (`components/dashboard-header/`)
- New inputs/outputs: `@Input() compact = false;`, `@Input() navOpen = false;`, `@Output() navToggle = new EventEmitter<void>();`.
- Template:
  - In `.dashboardHeader__start`, first child when `compact`: `<app-icon-button icon="menu" [tooltip]="PHRASES.MENU | translate" [size]="44" [expanded]="navOpen" (pressed)="navToggle.emit()">`. Brand and `app-project-selector` get `*ngIf="!compact"`.
  - Remove `<app-language-switcher>` and the `LanguageSwitcherComponent` import.
  - Replace the `div.dashboardHeader__trigger` (avatar, nickname, menu icon button) with `<button type="button" class="dashboardHeader__trigger" cdkOverlayOrigin #origin="cdkOverlayOrigin" aria-haspopup="true" [attr.aria-expanded]="isMenuOpen" [attr.aria-label]="PHRASES.ACCOUNT_MENU | translate" (click)="toggleMenu()">` containing the avatar (size 28), the nickname span (`*ngIf="!compact"`) and, when not compact, `<app-icon name="chevron-right" class="dashboardHeader__chevron">` rotated 90° in CSS. Keep the class name `dashboardHeader__trigger` so `handleOutsideClick` keeps working.
  - Add `cdkTrapFocus [cdkTrapFocusAutoCapture]="true"` to `div.dashboardHeader__dropdown`. Because the overlay content is created on open and destroyed on close, auto-capture focuses the first item on open and returns focus to the avatar button on close. Import `A11yModule` (or `CdkTrapFocus`) from `@angular/cdk/a11y` and `IconComponent`.
- CSS:
  - `.dashboardHeader__trigger` becomes a reset button: `background: none; border: none; padding: 4px 8px 4px 4px; border-radius: var(--radius-sm); font-family: var(--font-ui); cursor: pointer; min-height: 44px;` with a hover background `color-mix(in srgb, var(--color-tint) 6%, transparent)` and a visible `:focus-visible` outline (`outline: 2px solid var(--color-input-border-focus); outline-offset: 2px;`; `styles.css` has no shared focus-ring class yet). Remove the gap rule that served the old icon button.
  - `.dashboardHeader__chevron`: 14px, `transform: rotate(90deg)`, `color: var(--color-text-muted)`.
  - `@media (max-width: 767px)`: `.dashboardHeader { height: 56px; padding: 0 var(--space-4); display: flex; gap: var(--space-2); }`, `.dashboardHeader__search { flex: 1; min-width: 0; }`, `.dashboardHeader__trigger { min-width: 44px; justify-content: center; padding: 0; }`.
  - Keep the file under the 4kB budget; the old icon-button rules removed free room.

### Icon button (`components/icon-button/`)
- `size` accepts `28 | 36 | 44`; add `.iconButton--size44 { width: 44px; height: 44px; }` with an 18px icon, next to the other size rules.
- New `@Input() expanded: boolean | null = null;` bound as `[attr.aria-expanded]="expanded"` (null leaves the attribute off, so existing uses are unchanged).

### Settings language field (`pages/dashboard/settings/`)
- In `settings.component.html`, inside `section.settings__appearance`, add a third `div.settings__field` after the Theme field: `span.settings__label` with `PHRASES.LANGUAGE`, `<app-language-switcher>`, and `<span class="settings__hint">` with `PHRASES.LANGUAGE_DEVICE_HINT`. Import `LanguageSwitcherComponent` in `settings.component.ts`.
- `.settings__hint` in `settings.component.css`: `color: var(--color-text-muted); font-size: var(--font-xs);`.
- The language is not part of `UserSettings` and not part of `hasUnsavedChanges`; `LanguageSwitcherComponent` already writes `localStorage` and calls `TranslateService.use`.
- `auth-card` keeps its `app-language-switcher` unchanged.

### Translations
New `PHRASES` keys in `config/phrases.ts`: `ACCOUNT_MENU` (next to `MENU`), `NAVIGATION` (next to `MENU`), `LANGUAGE_DEVICE_HINT` (next to `LANGUAGE`). Add each next to the matching existing key in every translation file, not at the end:

| key | en | lv | et | lt | ru | sv | fi | de | da | fr | es |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ACCOUNT_MENU | Account menu | Konta izvēlne | Konto menüü | Paskyros meniu | Меню аккаунта | Kontomeny | Tilivalikko | Kontomenü | Kontomenu | Menu du compte | Menú de la cuenta |
| NAVIGATION | Navigation | Navigācija | Navigeerimine | Navigacija | Навигация | Navigering | Navigointi | Navigation | Navigation | Navigation | Navegación |
| LANGUAGE_DEVICE_HINT | Applies right away and is remembered on this device. | Tiek piemērota uzreiz un saglabāta šajā ierīcē. | Rakendub kohe ja jäetakse selles seadmes meelde. | Pritaikoma iš karto ir įsimenama šiame įrenginyje. | Применяется сразу и запоминается на этом устройстве. | Gäller direkt och sparas på den här enheten. | Otetaan käyttöön heti ja muistetaan tällä laitteella. | Gilt sofort und wird auf diesem Gerät gespeichert. | Gælder med det samme og huskes på denne enhed. | S'applique immédiatement et est mémorisée sur cet appareil. | Se aplica al instante y se recuerda en este dispositivo. |

`MENU` stays (now the drawer button's label). `CLOSE` and `LANGUAGE` already exist.

### Parallel work
These specs are implemented at the same time on other branches:
- **account-pages-in-shell** also edits `dashboard-header.component.ts` and `settings.component.*`. That spec only changes the route arguments inside `handleGoToProfile`, `handleGoToSettings` and `handleGoToManageTeam`, removes the Settings back button, its card styling (`.settings` width/background/shadow/padding) and its Esc handler. This spec changes the header template, CSS, inputs/outputs and imports, and adds only the Language field inside `section.settings__appearance` plus `.settings__hint`. Do not touch the `handleGoTo*` methods, the Settings back button or the `.settings` container rule here.
- **quiet-dashboard-background** also edits `dashboard.component.html` and `.css`: it deletes `div.dashboardShell__backdrop` with its SVG, all `.dashboardShell__wave*` / `.dashboardShell__backdrop` / `.dashboardShell__waves` rules, the `dashboardWaveDrift` keyframes and the wave reduced-motion block. This spec adds the nav wrapper, scrim and media queries and must not edit those wave lines; add the new CSS after the `.dashboardShell__content` rule and put the drawer's reduced-motion rule in its own new `@media (prefers-reduced-motion: reduce)` block.
- **settings-switch-toggles** replaces the `app-checkbox` rows in `div.settings__options`; this spec only touches `section.settings__appearance`.
- **row-actions-keyboard-access** edits `sidebar-boards` and `sidebar-chat`; this spec only changes the `[collapsed]` binding passed to them from `dashboard-sidebar.component.html`.
- **dialog-accessibility** adds `cdkTrapFocus` to dialogs; same CDK API, no shared files.
- **item-title-hierarchy** may change heading levels in the sidebar (Favorites) or header; this spec does not change any heading.
- If another branch also changes `icon-button` (sizes or ARIA inputs), keep both sets of inputs when merging.

## 2.3 Decisions
1. **Breakpoint** (2026-11-04): one breakpoint, compact at `max-width: 767px`. Reason: Impeccable adapt.md "content-driven breakpoints … 640, 768, 1024"; the shell breaks between 375 and ~700 (220px sidebar leaves no usable content), while at 768px a 548px content area still works. The project already writes `max-width` queries (`item-detail-layout` 720px, `styles.css` 480px), so this follows that convention. Rejected: a separate tablet breakpoint that auto-collapses the sidebar (surprising state change, the user can already collapse it); mobile-first rewrite of the shell CSS (breaks the project's desktop-first convention for no user gain).
2. **Navigation pattern on phones** (2026-11-04): off-canvas left drawer opened from a header Menu button, with scrim. Reason: adapt.md "Transform complex nav to hamburger/drawer on mobile"; operate.md "Standard navigation patterns"; the sidebar holds expandable Chat and Boards lists that do not fit a bottom tab bar. Rejected: bottom navigation (5+ destinations plus nested lists), keeping a 72px collapsed rail on phones (still eats 20% of 375px and loses labels).
3. **Drawer covers the header, with its own Close button** (2026-11-04): full-height drawer, Close icon button in its top row. Reason: a focus-trapped modal drawer must contain its own close control (WCAG 2.1.2 no keyboard trap, 2.4.3 focus order); the header's Menu button is outside the trap. Rejected: drawer below the header with the Menu button as the close control (cannot trap focus and still reach the toggle).
4. **Drawer is a modal dialog only while compact** (2026-11-04): `role="dialog"`, `aria-modal`, `aria-label` "Navigation", focus moved in and trapped, Esc and scrim close, focus restored to the Menu button. Reason: WCAG 2.4.3, 2.1.2 and the WAI-ARIA dialog pattern; Esc through `EscapeService` keeps the project's single Esc stack. On desktop the sidebar is ordinary page navigation and gets no dialog role.
5. **Drawer closes on every completed navigation and when the window widens** (2026-11-04). Reason: the user picked a destination; leaving the drawer over the new screen hides it (Nielsen #1 visibility of status). Focus is not restored after a navigation because the new screen owns focus.
6. **Project selector moves into the drawer on phones** (2026-11-04). Reason: adapt.md "Avoid: hide core functionality on mobile"; the header has room for only toggle, search and avatar at 375px. It is a second `ProjectSelectorComponent` instance backed by the same `ProjectFilterService`, so the value is shared. Rejected: dropping it on phones (lists would follow a filter the user cannot see or change); squeezing it into the header (search would shrink below ~120px).
7. **Brand text hidden in the compact header** (2026-11-04). Reason: it carries no function and costs ~70px the search needs; layout.md "make responsive behavior structural: … reveal based on what remains important". Rejected: shrinking the brand font (still costs width).
8. **Avatar becomes the account-menu trigger on every width** (2026-11-04); the separate hamburger "Menu" icon next to the nickname is removed. Reason: avatar-in-the-corner account menus are the known pattern (operate.md "patterns the visitor already knows"); it frees the hamburger icon for the drawer so the screen never shows two hamburgers with different meanings (Nielsen #4 consistency). The trigger is a real `<button>` with `aria-haspopup`, `aria-expanded` and the label "Account menu" (WCAG 4.1.2). A small down chevron on desktop keeps the affordance visible. Rejected: keeping both the avatar and a menu icon (redundant; two targets for one action).
9. **Account menu focus** (2026-11-04): `cdkTrapFocus` with auto-capture on the menu panel, so opening moves focus to the first item and closing returns it to the trigger. Reason: the CDK overlay is appended at the end of `<body>`, so without this a keyboard user cannot Tab into the menu (WCAG 2.1.1, 2.4.3). Rejected: full `role="menu"` with arrow-key roving focus (more code, and the items are ordinary navigation buttons; the disclosure pattern is enough).
10. **Language moves from the dashboard header into Settings, for every width** (2026-11-04); the auth card keeps its switcher. Reason: language is a set-once preference; a permanent header slot spends prime space on a rare action (Impeccable quieter.md "reduce visual noise", operate.md scanability) and does not fit at 375px. Before login the auth card switcher is still needed. Rejected: keeping it in the header on desktop only (two places to find it, Nielsen #4); putting it in the account menu (menus hold destinations and actions, not form fields).
11. **Language applies immediately, outside the Save button** (2026-11-04), with a hint saying it applies right away on this device. Reason: it is stored per device in `localStorage` and already applied instantly by `LanguageSwitcherComponent`; tying it to Save would need a new pending-language state and a revert on leave for no benefit. The hint prevents the user expecting Save to be needed or the choice to follow them to other devices (Nielsen #1, Impeccable clarify). Rejected: including it in unsaved changes.
12. **44×44px hit areas for the compact header and drawer controls** (2026-11-04) via a new `44` icon-button size and a 44px minimum on the avatar button. Reason: adapt.md "Touch targets 44x44px minimum"; the critique measured 28×28 icon buttons on mobile. Other screens' icon buttons are out of scope.
13. **`expanded` input on `app-icon-button`** (2026-11-04). Reason: the drawer toggle must expose its state (WCAG 4.1.2) and the project rule is to reuse `app-icon-button` for icon-only controls rather than building a new button. Null by default so existing uses are unchanged.
14. **Sidebar collapse toggle uses `appTooltip` instead of native `title`** (2026-11-04). Reason: project rule (icon-only controls get `appTooltip` plus `aria-label`, never `title`); the sidebar is edited here anyway and no other spec owns this control.
15. **Motion** (2026-11-04): drawer slides in 200ms with an ease-out-quart curve, no transition under `prefers-reduced-motion`. Reason: operate.md "150–250 ms on most transitions … Motion conveys state"; the slide shows where the drawer comes from and goes back to.

### Decisions to double-check
- **Language stays per device** (2026-11-04): moving the switcher into Settings could suggest it is saved on the account, but it stays in `localStorage` as today (the hint says so). Syncing it across devices would need a `language` column on `users`, the settings API and `SessionService` applying it; not done here.
- **Header "Menu" hamburger removed on desktop** (2026-11-04): the account menu now opens only from the avatar/nickname button. This changes a visible control every user knows.

# Part 3 — Implementation TODO

Read Part 1 and Part 2 before starting. Work through the tasks in order and tick each one when it is done.

Baseline before starting: frontend 980 specs passing, backend 896 runs / 2398 assertions, 0 failures (master f15abdf, 2026-11-04).

### A. Shared building blocks
- [x] A1. Add `ACCOUNT_MENU`, `NAVIGATION` and `LANGUAGE_DEVICE_HINT` to `frontend/src/app/config/phrases.ts` (next to `MENU` / `LANGUAGE`) and to all 11 files in `frontend/public/assets/translations/` with the values from the table in Part 2.2, each placed next to the related existing key.
- [x] A2. `components/icon-button/`: allow `size` `44` (`iconButton--size44`, 44×44 with an 18px icon, next to the other size rules) and add `@Input() expanded: boolean | null = null` bound to `[attr.aria-expanded]`. Add a spec (`icon-button.component.spec.ts`, TestBed) checking `aria-expanded` is absent by default and reflects `true`/`false` when set.

### B. Sidebar as drawer content
- [x] B1. `components/dashboard-sidebar/`: add `compact` input, `closeRequested` output and the `isCollapsed` getter; switch every template use of `collapsed` to `isCollapsed`; render the `dashboardSidebar__drawerHeader` row (project selector + 44px Close icon button) only when `compact`; hide the collapse toggle when `compact`; replace the toggle's `[title]` with `[appTooltip]` (only when collapsed) keeping `aria-label`; add `.dashboardSidebar--compact` and `.dashboardSidebar__drawerHeader` CSS. Stay under the 4kB style budget.
- [x] B2. Add `dashboard-sidebar.component.spec.ts` (constructed with `new` and simple stubs): `isCollapsed` is false when `compact` even after `toggleCollapsed()`, and true when not compact and collapsed; the Close action emits `closeRequested`.

### C. Header
- [x] C1. `components/dashboard-header/`: add `compact`, `navOpen` inputs and `navToggle` output; add the compact Menu icon button (size 44, `[expanded]="navOpen"`); hide brand and project selector when compact; remove `app-language-switcher` and its import.
- [x] C2. Replace the trigger `div` and the hamburger icon button with the avatar `<button class="dashboardHeader__trigger">` (aria-haspopup, aria-expanded, aria-label `ACCOUNT_MENU`, avatar, nickname when not compact, rotated `chevron-right` when not compact); add `cdkTrapFocus` with auto-capture to the dropdown panel; update the CSS (button reset, hover, focus-visible, chevron, the `max-width: 767px` block). Stay under the 4kB budget.
- [x] C3. Update `dashboard-header.component.spec.ts`: existing tests still pass (the outside-click test still uses `.dashboardHeader__trigger`); add a test that the nav toggle handler emits `navToggle`, and a TestBed test that the trigger button's `aria-expanded` follows `isMenuOpen`.

### D. Shell
- [x] D1. `pages/dashboard/dashboard.component.ts`: add `isCompact`, `isNavOpen`, the `BreakpointObserver` and `NavigationEnd` subscriptions, `openNav`, `closeNav(restoreFocus)`, `toggleNav`, the Esc registration through `EscapeService`, focus move into the drawer via `CdkTrapFocus.focusTrap`, focus restore, and cleanup in `ngOnDestroy`. Import `A11yModule`/`CdkTrapFocus` and `TranslatePipe`; expose `PHRASES`.
- [x] D2. `dashboard.component.html` / `.css`: nav wrapper with compact/open classes, dialog attributes only while compact, `cdkTrapFocus`, scrim, header and sidebar bindings; the compact media query, drawer transition and its own reduced-motion block, added after `.dashboardShell__content` without touching wave rules (see Parallel work).
- [x] D3. Add `pages/dashboard/dashboard.component.spec.ts` (construct with `new`, stub services, `escapeServiceStub()` from `testing/`, a `Subject` for router events and for the breakpoint observer): `toggleNav` opens and registers one Esc handler; Esc (calling the registered handler) closes and unregisters; a `NavigationEnd` closes without restoring focus; leaving compact closes the drawer; `closeNav(true)` focuses the element that was focused before opening.

### E. Language in Settings
- [x] E1. `pages/dashboard/settings/`: add the Language field (label, `app-language-switcher`, hint) as the last field in `section.settings__appearance`, import `LanguageSwitcherComponent`, add `.settings__hint`. Add a test in `settings.component.spec.ts` only if it guards real logic (e.g. that the template renders the language switcher); `LanguageSwitcherComponent` behaviour is already covered by its own spec.

### Z. Wrap-up
- [x] Z1. Update the root `CLAUDE.md` Frontend section: describe the compact breakpoint (767px), the drawer (state in `DashboardComponent`, `compact` inputs on header and sidebar, Esc through `EscapeService`, focus trap), the avatar button as the account-menu trigger, the language switcher living in Settings and the auth card only, the new `44` size and `expanded` input of `app-icon-button`, and `@angular/cdk/layout` / `@angular/cdk/a11y` in the tech stack list.
- [x] Z2. Full test runs, build and lint, using the commands in `CLAUDE.md` (`npm test`, `npm run build` in `frontend/`; check the component style budgets in the build output).
- [ ] Z3. Manual check in the running app at 375×812, 768×1024 and 1280×800, in Purple haze dark and Paper light: at 375 the header shows Menu, search and avatar without clipping and the content has a 16px gutter; the drawer opens, focus lands inside, Tab stays inside, Esc / scrim / Close close it and focus returns to Menu; picking Boards → a board navigates and closes the drawer; the project selector in the drawer changes the lists; the avatar opens the account menu, focus moves into it and back on Esc; at 768 and 1280 the desktop layout is unchanged apart from the avatar trigger and the missing language switcher; Settings → Language switches the UI at once and the Save button stays disabled; widening from 375 to 1280 with the drawer open closes it; with reduced motion enabled the drawer appears without sliding.

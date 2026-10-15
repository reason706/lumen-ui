# Lumen framework simplification plan

## Goal and scope

Make a framework that people can install, understand, and compose as easily as Bootstrap, while keeping Lumen's larger collection of visual variants. Reduce the concepts people must learn, repeated CSS, and inconsistent implementations. The studio remains a component workspace with previews and copyable examples, rather than a documentation site.

This is a staged implementation plan. The button foundation below is implemented; the remaining stages are planned work, not claims that every original example already uses the public API.

## Findings from the current repository

- The catalog contains 524 examples in 12 categories. Examples are not 524 independent component APIs; many are variations or compositions of the same primitive.
- `components/core.css` offers a namespaced `lm-` public API. Original category styles use abbreviated global classes, including `.b`, `.ib`, `.p`, `.sec`, `.sm`, `.soft`, and `.outline`. Loading all original category styles can cause collisions. The studio isolates previews with Shadow DOM, which does not establish that copied examples safely coexist on a consumer page.
- Buttons previously repeated their dimensions in text and icon implementations, including copied base definitions across eight category stylesheets. Public core sizes also differed from original sizes. Shared color and gradient tokens already exist in `tokens/brand.css`.
- Forms, navigation, surfaces, and other original styles repeat example scaffolding (`.p`, `.sec`, `.sh`, etc.). That scaffolding belongs to the studio, not the framework API.
- The catalog, HTML templates, CSS, interaction hooks, and offline snapshot must stay synchronized. Renaming only the visible title or a CSS selector is insufficient.
- Responsive spacing utilities already share a token scale. Preserve useful existing conventions instead of introducing another shorthand language.

## Naming decisions

Use one public namespace: `lm-`. Keep familiar words and established abbreviations such as `btn`, `nav`, and `sm`. Do not add a second set of public names such as `l-btn`, `button-primary`, or unprefixed `.primary`.

| Purpose | Convention | Example |
| --- | --- | --- |
| Component | `lm-<component>` | `lm-btn`, `lm-card`, `lm-input` |
| Component-specific appearance or geometry | `lm-<component>--<modifier>` | `lm-btn--tonal`, `lm-btn--icon` |
| Semantic color | Existing `lm-<color>` | `lm-primary`, `lm-success` |
| Named gradient | Existing `lm-gradient-<name>` | `lm-gradient-ocean` |
| Size | Component modifier, shared values | `lm-btn--sm`, later `lm-input--sm` |
| Layout and spacing | Existing namespaced utilities | `lm-stack`, `lm-gap-4`, `lm-md-col-6` |
| Behavior | `data-lm-*` hooks | `data-lm-dialog`, `data-lm-menu-toggle` |
| State | Native HTML and ARIA first | `disabled`, `aria-pressed`, `aria-expanded` |
| Application events | Existing `lumen:*` events | `lumen:action`, `lumen:select` |
| Component customization | `--lm-<component>-<property>`; shared controls use `--lm-control-*` | `--lm-btn-size`, `--lm-control-sm` |
| Component parts | Existing clear component names; add a part only when needed | `lm-label`, `lm-help`, `lm-menu` |

Preserve existing Foundation token names such as `--lumen-color-primary` as the palette source during migration. Do not create a second independently editable color scale. Use classes for appearance and `data-lm-*` for behavior; do not add a parallel `data-size` or `data-color` API for the same styling options.

Defaults need no modifier: a primary, solid, medium button is simply `lm-btn`. Use `tonal` consistently in public names; retain original `soft` as a compatibility name during migration. Use `danger` as the semantic color; reserve `invalid` for form state. Avoid opaque numbered gradient names in new snippets. Do not use global `.sm` or `.active` as the new framework API.

A component-specific size modifier is a small amount of intentional repetition: it prevents a size class on a parent from accidentally resizing every child. Shared values and generated rules remove implementation duplication without introducing global selector conflicts.

## Button foundation — implemented

- Text buttons and icon buttons share base rules and the XS / SM / MD / LG / XL height scale: 32 / 40 / 44 / 52 / 62px.
- `tokens/controls.css` owns button height, text padding, font size, and radius values. Both original buttons and public core buttons consume it.
- `components/button-base.css` now supplies original button geometry across actions, forms, navigation, sliders, surfaces, feedback, foundations, and data/media styles, replacing their copied base definitions.
- Original icon examples now use `b ib`: `b` supplies the base and `ib` changes square geometry. Existing standalone `ib` remains supported.
- Public consumers use `lm-btn lm-btn--icon`, with the same size modifiers as text buttons. XS and XL now join the existing SM and LG modifiers. Medium is the default.
- Icon padding is zero inside an explicit square. Text buttons use horizontal padding. Colors, gradients, focus, hover, press, and disabled behavior remain shared within each API.
- Preserve accessible names on icon-only controls and native button semantics. Compact sizes remain available; use the default 44px or larger size where touch targeting is required.

Example of the intended public pattern:

```html
<button type="button" class="lm-btn lm-btn--tonal lm-success lm-btn--sm">Save</button>
<button type="button" class="lm-btn lm-btn--tonal lm-success lm-btn--sm lm-btn--icon" aria-label="Save">
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg>
</button>
```

## Merge rules for the whole framework

Merge items when they share markup, behavior, and semantic purpose and differ only in appearance, size, color, shape, or optional content. Keep one preview family with standard colors first and gradients immediately below, in the same order across appearances. Make decorative effects modifiers, not new independent button components.

Keep separate components when their interaction contract differs: tabs change panels, menus present actions, selects choose a value, and dialogs manage focus. A similar rounded rectangle does not justify merging those behaviors. Also keep badges, actionable chips, and removable chips distinct in semantics even when they share surface and typography tokens.

| Area | Consolidation target | Preserve |
| --- | --- | --- |
| Foundations | One semantic palette, named gradients, type scale, spacing, radius, elevation, motion, focus tokens | Theme overrides and intentional brand palettes |
| Actions | One button primitive; icon, FAB, split action and toolbar composed from it | Link semantics, menu keyboard handling, toggle state |
| Forms | Shared field layout, label, help, error, and control dimensions across text/select/textarea | Native input types; distinct checkbox, radio, switch semantics |
| Selection | Shared styling tokens for choices, chips and segmented controls | Single vs multiple selection; tabs vs radio groups |
| Surfaces | One card/panel foundation with elevation, border, media and header/footer parts | Semantic structure and independently useful compositions |
| Navigation | Shared action styling and list spacing across nav, pagination and breadcrumbs | `aria-current`, tab panels, menu roles and keyboard rules |
| Overlays | Shared surface/backdrop/motion; compose drawers and command surfaces from dialog primitives where appropriate | Modal focus trapping, return focus, nonmodal popover behavior |
| Feedback | Shared status colors and container spacing for alerts/toasts; common progress tokens | Live-region announcements, progress values, dismiss behavior |
| Data and media | Table density variants, consistent list/media layout, avatar sizing | Sorting, selection, pagination and media accessibility |
| Sliders and values | Shared track, thumb, size, state and value tokens | Native keyboard/value behavior; distinct range vs progress semantics |
| Layout | Reuse container/grid/stack/spacing utilities; extract studio scaffolding | Responsive behavior, RTL logical properties |

## Implementation sequence and acceptance gates

### 1. Inventory and freeze the public vocabulary

Create a machine-readable component registry that references catalog keys and lists each component's public classes, supported modifiers, state attributes, interaction hooks, and source CSS. Record original aliases separately. Audit conflicting short selectors and unused rules in every category. Treat preview family labels and search keywords as discoverability metadata, not extra CSS APIs.

Gate: every catalog entry maps to a primitive or a documented composition in the registry; no new public synonym is added without a concrete need. Existing keys, favorites, and recent links still resolve.

### 2. Complete actions migration

Move retained button appearances, icons, groups, split actions, toggles, loading and workflow examples to the `lm-btn` primitive. Keep specialized animations as optional effects. Promote named gradients over `g1`–`g8`. Consolidate group and toolbar naming around actual semantics. Remove old CSS implementations only after their examples and copies use the replacement.

Gate: a mixed page of text/icon buttons in every size and appearance works with `lumen-core.css`; examples copy public classes; no duplicate implementation of the same appearance remains. Check keyboard focus, disabled states, long text, RTL, and touch sizing.

### 3. Shared fields and selection

Apply the button control scale to suitable form controls after checking native metrics. Consolidate label/help/error layouts and input groups. Provide one obvious pattern for each native control. Keep advanced widgets progressively enhanced, with explicit keyboard contracts and native fallbacks where possible.

Gate: labels, validation messages and ARIA relationships survive composition; compact and large controls align with adjacent buttons; required behavior works without inline event handlers.

### 4. Surfaces, navigation, overlays and feedback

Migrate one family at a time using the merge table. Move common surface, typography, status, focus and motion values into tokens. Extract repeated studio wrappers rather than renaming them into framework components. Keep effect-specific CSS local.

Gate: components from different categories coexist in one DOM without Shadow DOM, selector leakage or unwanted size/color changes. Verify focus return, Escape, outside-click behavior, live announcements and reduced motion where relevant.

### 5. Make the studio teach by composition

Keep native HTML templates as the source of markup. Use JavaScript for catalog rendering and behavior; do not introduce a template framework or replace all preview code. Put the simplest working pattern first, followed by sizes, appearances, states and compositions. Search accepts familiar synonyms such as soft/tonal and icon/IB, but copied snippets use one canonical vocabulary.

Add registry-backed variant controls only when they can produce the same HTML used by previews. Keep the offline snapshot generated and validate parsed templates, aliases, exports and all catalog items.

Gate: no missing-template cards, duplicate demo families or dead copy snippets; direct-file and server previews remain supported; every snippet includes its real CSS, script and icon dependencies.

### 6. Distribution and adoption

Offer a stable default CSS bundle and optional JS; preserve component imports for selective use. Generate compatibility styles from the registry rather than maintaining a second implementation. Define versioning, alias deprecation periods, package exports and a reproducible build before publishing a package. A Bootstrap migration guide should map supported behaviors and gaps, not claim drop-in class compatibility.

Gate: clean HTML projects can combine forms, navigation, cards, dialogs and data controls without studio assets. Measure shipped CSS/JS and eliminate duplicate rules. Publish only after install, accessibility, responsive, theme and lifecycle checks pass.

## Migration safeguards

1. Add the canonical implementation and explicit aliases.
2. Migrate templates, catalog metadata and JavaScript selectors together; retain stable catalog keys or relocation aliases.
3. Verify old and new markup side by side, including multiple categories on one page.
4. Make copy/export use the canonical API and list compatibility imports only where required.
5. Rebuild the offline snapshot and run the relevant suites.
6. Delete an old implementation only when no retained example requires it. Removing supported aliases belongs in a separately announced major release.

Avoid global search-and-replace of abbreviated names: `.sm`, `.on`, `.p`, and similar selectors can mean different things in different files. Do not merge components just to reduce their count. Track progress by fewer independently maintained implementations and fewer concepts required to build a real screen.

## Definition of success

- One discoverable public name for each component and modifier concept.
- Reusable base components with color, size, appearance and behavior composed predictably.
- All retained visual variety organized under those components.
- Shared tokens actually control the rendered examples across themes.
- Copyable examples work together on an ordinary page and do not depend on studio isolation.
- HTML remains usable, interactions are keyboard accessible, and JavaScript mounts/destroys cleanly.
- Migration aliases and actual completion status remain explicit throughout the work.

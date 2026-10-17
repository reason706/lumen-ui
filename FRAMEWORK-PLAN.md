# Lumen framework plan

## Version 3.4 attachment integration — implemented

- Matched the supplied preview palette: Secondary `#64748B`, Light `#D5DBEC`, and explicit tonal background/ink pairs, with theme-aware dark equivalents. Foundation swatches and every button category consume those same roles.
- Made gradient labels and SVG icons the default for tonal/outline treatments; added 16% two-stop tonal fills, 2px gradient outlines, full hover/press fills, gradient ghost/link details and solid hover feedback. Existing class names and color ramps remain unchanged. The shared `btn-label` part and independent SVG paint IDs are prepared for preview and export.
- Added 17 functional examples covering image magnification, a button-operated card deck, tilt/spotlight/border cards, poll/quiz cards, drawn/typed signatures, counters, color fields, payment preview, US phone/USD formatting, faders, vertical/ruler ranges, meters, knob, XY and direction controls. Existing dual ranges and related references remain canonical examples rather than being copied into a new implementation.
- Added one widget lifecycle module, public styles, contracts and catalog metadata. Native controls, typed alternatives, keyboard input, disabled state, reduced motion, high contrast, RTL and form data are included in the implementation.
- Added focused workflow/accessibility/export checks and refreshed visual baselines; full catalog and theme checks include the new examples. Local Firefox/WebKit installation remains blocked by the managed network policy; the existing CI matrix remains configured.


## Version 3.3 roadmap — stages 1–7 implemented

| Stage | Delivered | Evidence / boundary |
| --- | --- | --- |
| 1. Token architecture | One JSON source for primitives, roles, themes, aliases, breakpoints and component sizing; generated CSS/JS and dependency validation. | Builds reject cycles, missing references, incomplete theme roles and stale outputs. Existing token aliases remain. |
| 2. Visual language | Shared typography, surface radius/elevation, content spacing, fluid headings and application parts. | Scoped token changes affect actual components; intentionally distinct reference artwork remains. |
| 3. Themes and states | Eight scoped themes, nested light reset, contrast roles, compact density, focus/motion, forced colors and high contrast. | Core/theme audits, explicit native state attributes and theme-aware foregrounds. Brand edits warn on text contrast; they are not automatic accessibility certification. |
| 4. Primitive contracts | Machine-readable anatomy/state/keyboard contracts; default medium equals explicit medium across 22 families; button/icon dimensions share tokens. | Rendered metrics, combined DOM checks and canonical/compatibility bundles. |
| 5. Interaction system | Validation summary/associations, cancellable dirty forms, request race protection, anchored top-layer menus with typeahead, persistent undo and paused notifications. | Workflow, timing, keyboard and cleanup checks; application persistence/auth remain integration work. |
| 6. Component workspace | Larger readable controls, supported-instance customization, preserved anatomy/icons, token editing, URL workspace restoration, focused export actions and matching portable output. | Studio/export parity and URL reload checks. Unsupported reference examples remain explicitly labeled. |
| 7. Connected application | Shared app shell, overview, records, filters/sort/page/CSV/selection, details, create/edit, bulk archive/undo, settings and attachments with cancel/retry/permissions. | Connected workflow tests plus desktop/mobile/RTL/dark audits; session data and simulated requests are deliberate reference-app behavior. |

The agreed public naming convention remains unchanged: component base, component-specific style, shared color and size, component-specific parts. The studio remains a component workspace. New generic parts compose the app rather than requiring a separate app stylesheet.

The token editor uses `LumenDesign`; forms and requests use `LumenUI.form` and `LumenUI.resource`. Both studio and standalone app render `templates/workspace.html` with `js/workspace.js`. No copied app-specific component implementation is maintained.

Verification includes Chromium behavior/accessibility/reflow and generated asset checks. Firefox/WebKit compatibility jobs are configured in `.github/workflows/browser-compatibility.yml`; local engine installation was blocked by the network allowlist. Native `file://` navigation is blocked by managed Chromium policy, with offline snapshot loading checked through the same loader over HTTP. These are explicit verification limits, not passing engine results.

Stages 8–9 remain outside this requested delivery. Further specialized reference consolidation should preserve distinct visuals, stable keys and truthful capability labels. Production backend/authentication integration, package publishing and manual assistive-technology review remain application/release work.

## Naming migration — implemented

The user-approved naming convention replaces the earlier `lm-` proposal. Every catalog template now uses canonical class names, while compiled styles retain original aliases. Stable catalog keys, category organization, IDs, native states, `data-lm-*` interaction hooks and `lumen:*` events remain intact.

| Purpose | Convention | Examples |
| --- | --- | --- |
| Component | Component noun | `btn`, `card`, `badge`, `input`, `tabs`, `dialog`, `table` |
| Appearance | Component-specific style prefix | `btn-style-tonal`, `card-style-raised`, `badge-style-outline` |
| Size | Shared keyword | `size-xs`, `size-sm`, `size-md`, `size-lg`, `size-xl` |
| Component color | Shared keyword | `color-red`, `color-blue`, `color-success` |
| Gradient | Shared named gradient | `color-gradient-violet`, `color-gradient-ocean` |
| Component parts/options | Component prefix | `input-label`, `input-help`, `btn-icon`, `table-striped` |
| Font family | `font-*` | `font-sans`, `font-serif`, `font-mono` |
| Weight | `weight-*` | `weight-medium`, `weight-semibold`, `weight-bold` |
| Text size/alignment/color | `text-*` | `text-lg`, `text-center`, `text-muted` |
| Line/letter spacing | Dedicated prefixes | `leading-relaxed`, `tracking-wide` |
| Layout/spacing | Short established utilities | `grid`, `stack`, `gap-4`, `p-4`, `md-col-6` |
| Surface/dimensions | Shared utilities | `radius-lg`, `shadow-sm`, `border-dashed`, `width-full` |

Medium and solid are defaults for buttons. A gradient color provides the fill without requiring a second gradient class. Typography size uses `text-*`; component dimensions use `size-*`. A size affects its own element, not nested controls. Color sets coordinated component variables; `text-*` and `bg-*` change only foreground or background.

## Architecture and compatibility

- `naming/classes.json` records canonical names, original aliases and template-specific mappings. Context matters: an abbreviation can have different meanings in forms, charts and galleries.
- Source CSS remains the single implementation. `scripts/build-naming.mjs` uses CSS and selector parsers to generate `public-*.css` with both canonical selectors and original aliases, sharing declarations rather than duplicating implementations.
- The full and core bundles import compiled styles. Catalog entries identify their canonical stylesheet dependencies and wrapper. Previews, inspection, copying and standalone exports all consume the migrated templates.
- `components/appearance.css` supplies the shared public color, typography and size vocabulary. `tokens/design-tokens.json` owns the button dimension scale and generates `tokens/controls.css`. Original category buttons share `components/button-base.css`.
- `js/components.js` recognizes canonical and original interaction classes. Native attributes, behavior hooks, lifecycle API and events retain their existing contracts.
- `npm run build:offline` compiles the naming registry and rebuilds the direct-file snapshot. Tests reject stale generated files. Add new aliases or names through the registry and regenerate.
- Original stylesheet paths remain available. Existing integrations using original classes can continue using them. New integrations should use the canonical bundles and names shown by the studio.

## Verification for this migration

Verify the parsed templates and every retained preview, rather than checking names only as strings. Exercise real copied HTML without Shadow DOM, combining buttons, icons, cards, fields, badges, typography and menus on one page. Check shared size alignment, nested defaults, semantic colors, gradient fills, hover/press, keyboard behavior, compatibility aliases, responsive layout, themes and accessibility. Test offline snapshot rendering and server hosting.

The existing content status remains meaningful: renaming a visual reference does not turn it into a JavaScript widget. The studio remains a component workspace, not a separate documentation site.

## Continuing specialized reference consolidation

### 1. Reduce repeated reference implementations

The naming migration establishes a common API but does not make every original reference composition a single implementation. Consolidate each family only after comparing markup, behavior and semantic purpose. Keep aliases during migration. Delete obsolete rules after no retained example needs them.

### 2. Expand common form primitives

Standardize label/help/error layouts across text fields, selects and textareas. Align sizes with adjacent buttons. Preserve distinct native checkbox, radio and switch behavior. Advanced selection widgets need explicit keyboard and validation contracts.

### 3. Consolidate surfaces, navigation and overlays

Share surface, border, typography, focus and motion tokens. Compose cards with clear parts. Keep tabs, menus, selects, dialogs and popovers distinct where their behavior differs. Verify focus return, Escape, announcements and reduced motion. Give new component styles their own prefix rather than adding global `style-*` synonyms.

### 4. Expand feedback, data, media and value controls

Share status and progress styling while preserving live regions and values. Consolidate table density and list/media layouts. Reuse range track/thumb tokens while retaining native keyboard behavior. Give specialized reference artwork descriptive component parts rather than exporting opaque abbreviations.

### 5. Improve discoverability and distribution

Keep one canonical demo for each primitive, with standard colors and gradients grouped consistently. Search can accept familiar synonyms without adding CSS synonyms. Offer the simplest pattern first, then states, sizes and compositions. Measure bundle size and plan a versioned compatibility deprecation policy before removing aliases or publishing package exports.

## Completion rules for future changes

1. Update source CSS, registry, template and behavior selectors together.
2. Preserve catalog keys or supply relocation aliases.
3. Check canonical and original markup side by side.
4. Check real combinations outside studio isolation.
5. Regenerate styles and offline assets; run appropriate checks.
6. Keep implemented work distinct from planned expansion. Do not merge components solely because they look alike or to reduce their count.

## Version 3.1 improvement pass — implemented

- Consolidated 58 repeated rules from eight category sources into one primitive source; retained original selectors through generated aliases.
- Connected public spacing, typography, weights, radii, elevation, palette and focus to shared tokens, with rendered token-change checks.
- Added live customization for eight primitives, shared icons, search synonyms, expanded CSS copying and portable HTML downloads.
- Improved disabled/busy handling, menu keyboard/outside-focus behavior, validation/reset/live correction, dialog focus and close events, responsive navigation, table filtering/pagination/selection, CSV downloads and undo.
- Built six functional application patterns and merged three matching original form entries through aliases, retaining 524 examples.
- Added import-free CSS and optional JavaScript distributions, an asset manifest and starter page. Deduplication removes 2,623 repeated rules from the flattened full collection.
- Added mixed-DOM, portable export, bundle parity, token, workflow, accessibility and desktop/mobile RTL visual regression checks.

The earlier consolidation stages remain guidance for expanding additional specialized reference families. This improvement pass covers the shared public components and tested application patterns; visual references continue to state their behavior requirements explicitly.

## Version 3.2 consistency and expansion pass — implemented

- Extracted 485 repeated reference nodes into three shared source fragments, removing 2,720 repeated copies without merging distinct visuals. Expansion retains the importing category's naming context.
- Connected reference palette, focus and spacing values to tokens; moved reference layout directions and grouped-control corners to logical CSS. Shared control dimensions now drive public size modifiers.
- Fixed preview-host navigation visibility/ARIA agreement and prevented resize notifications from closing an opened menu within the same breakpoint. Nested mounted roots now process actions once.
- Added copied-instance ID remapping, scoped reference markup, included icon definitions, and complete-context exports for stateful controls.
- Added editable inventory, status presentations, validated multi-step forms, combined column filters, and file selection/size validation. Native grouping, focus movement, scrolling access, reset and form data are tested.
- Added optional canonical-only distributions, reusable build helpers, readable source formatting and reviewed gzip budgets. Default compatibility bundles remain supported.
- Expanded regression checks across copied instances, exports, shared-core canonical bundle parity, reference families, mobile RTL and accessibility. Visual reference/application-integration distinctions remain explicit.

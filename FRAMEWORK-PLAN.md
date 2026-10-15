# Lumen framework plan

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
- `components/appearance.css` supplies the shared public color, typography and size vocabulary. `tokens/controls.css` owns the button dimension scale. Original category buttons share `components/button-base.css`.
- `js/components.js` recognizes canonical and original interaction classes. Native attributes, behavior hooks, lifecycle API and events retain their existing contracts.
- `npm run build:offline` compiles the naming registry and rebuilds the direct-file snapshot. Tests reject stale generated files. Add new aliases or names through the registry and regenerate.
- Original stylesheet paths remain available. Existing integrations using original classes can continue using them. New integrations should use the canonical bundles and names shown by the studio.

## Verification for this migration

Verify the parsed templates and every retained preview, rather than checking names only as strings. Exercise real copied HTML without Shadow DOM, combining buttons, icons, cards, fields, badges, typography and menus on one page. Check shared size alignment, nested defaults, semantic colors, gradient fills, hover/press, keyboard behavior, compatibility aliases, responsive layout, themes and accessibility. Test offline snapshot rendering and server hosting.

The existing content status remains meaningful: renaming a visual reference does not turn it into a JavaScript widget. The studio remains a component workspace, not a separate documentation site.

## Remaining consolidation work

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

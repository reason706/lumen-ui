# Lumen UI — Component Library & Live Studio

![Version](https://img.shields.io/badge/version-3.3.0-6366f1)
![Runtime](https://img.shields.io/badge/runtime-framework%20free-10b981)
![Examples](https://img.shields.io/badge/examples-530-8b5cf6)
![Themes](https://img.shields.io/badge/themes-8-ec4899)

Lumen UI is a modular HTML, CSS, and JavaScript component library with **530 examples across 12 categories and 69 families**. Its live studio organizes related items so you can find, compare, inspect, and copy them into your own interfaces.

Version 3 preserves the content of all **473 original examples**, with repeated button demonstrations merged into canonical sections. The original color, typography, spacing, effects, and component styles remain available. It adds **60 public core examples**, a single catalog, native HTML templates, reusable interactions, and responsive utilities. Lumen follows a Bootstrap-style approach to composing interfaces with classes and optional JavaScript; migrating an existing Bootstrap application requires adapting its markup and classes to Lumen's API.

## What's new

- **3.3 foundation system:** one validated JSON token source generates shared roles, eight scoped themes, aliases, responsive breakpoints and component size recipes. Default medium and `size-md` now agree across 22 families; buttons and text/icon controls share their existing scale.
- **Interaction contracts:** associated labels/errors, validation summaries, cancellable form/resource controllers, persistent undo, paused notifications and top-layer keyboard menus.
- **Accurate workspace editing:** customization edits an existing supported instance while preserving its composition. Token editing, shareable workspace state and portable exports use the same configuration.
- **Connected reference app:** open [workspace.html](workspace.html) for records, details, editing, settings, attachments, request failures/retry, permissions and undo. It uses public components and simulated, session-only data.


- **3.2 consistency pass:** shared reference spacing/palette/focus tokens, logical directions, responsive grids, and control-size tokens; preview navigation uses one breakpoint decision for visibility and ARIA state.
- **Source consolidation:** three shared reference fragments remove 2,720 repeated source blocks. The naming compiler expands them in each category's context, preserving existing names and useful variants.
- **Reliable instances:** copied examples have independent IDs, and nested mounts handle each action once. `LumenUI.fragment(html)` provides the same ID remapping for dynamic insertion, including SVG paint references.
- **Maintainable builds:** formatted authored source, reusable naming/import helpers, minified runtime distribution, optional smaller canonical bundles, and enforced size budgets.

- **One catalog:** categories, families, search tags, dependencies, example types, and stable keys come from `catalog/components.json`.
- **Purposeful organization:** components have a canonical category, related variants stay together, and existing moved-item links remain supported through aliases.
- **Shared button palette:** standard colors and eight gradients use the same Foundation tokens. Tonal and outline buttons, including icons, fill on hover/press; disabled controls retain their resting appearance.
- **Paired button variants:** solid, tonal, outline, ghost, and link examples place gradient treatments directly below standard variants.
- **Reusable core:** component bases with component-specific styles and shared color/size classes, logical spacing, responsive columns, theme-aware styles, visible focus, and reduced-motion support.
- **Shared interactions:** menus, tabs, dialogs, drawers, collapse, notifications, validation, comboboxes, tables, sliders, uploads, selection trees, and carousels.
- **Studio tools:** global search, family/type filters, grid/list layouts, comparisons of up to four examples, favorites, recent items, and deep links.
- **Copying and inspection:** inspect HTML and CSS, choose an individual control, copy a complete example with dependencies, or open it independently of the studio.
- **Preview controls:** desktop/tablet/mobile widths, LTR/RTL direction, and eight themes. Responsive styles inside isolated previews respond to the preview width.

## Categories

| Category | Examples |
| --- | ---: |
| Foundations | 51 |
| Layout & utilities | 8 |
| Buttons & actions | 52 |
| Forms & selection | 69 |
| Sliders & values | 36 |
| Navigation | 42 |
| Cards & surfaces | 42 |
| Disclosure & overlays | 21 |
| Status & feedback | 50 |
| Data & content | 49 |
| Media & imagery | 75 |
| Compositions | 35 |
| **Total** | **530** |

Examples are labeled by capability:

| Type | Meaning |
| --- | --- |
| Interactive core | Public JavaScript provides the demonstrated interaction. |
| CSS / native controls | CSS and native browser controls provide the demonstrated behavior. |
| Visual reference | A styling example; full application behavior is not implied. |
| Composition | An assembled interface whose application-specific actions and data need integration. |

The 60 core examples include interactive controls, CSS/native examples, and compositions. Example counts are distinct from component-family counts and individual variant counts.

## Open the studio

You can double-click `studio-preview.html` to open the complete studio directly from your filesystem. No server or dependency installation is required. The included `js/studio-data.js` snapshot supplies the catalog, templates, and styles without local-file fetch requests. Standalone `example.html` pages also support direct-file opening.

Alternatively, use VS Code **Live Server → Open with Live Server**, or run this command from the repository root with Node.js/npm and Python 3 available:

```bash
npm start
```

The command starts a Python static HTTP server on port 8000, bound to the local machine. Open `studio-preview.html` through that server; `index.html` also redirects there. Server mode reads the current catalog and templates over HTTP without reusing cached responses. Template files are checked against the catalog after HTML parsing; if a server returns incomplete templates, the studio and standalone previews recover from the included snapshot. Both opening methods support previewing, searching, inspecting HTML/CSS, and copying examples. When serving over HTTP, add `?offline=1` to exercise the included snapshot instead of fetching source data.

No framework, backend, or credentials are required to view the studio. Google Fonts is optional; when its domains are unavailable, the configured font stacks fall back to local fonts.

Use the category sidebar or **Ctrl / Command + K** to search. Select **Inspect** on an example for its preview, HTML, CSS, and copying tools. Use **⇄** to select examples for comparison. Favorites, recent items, and the theme choice are stored in your browser.

## Ready-built files

For a project that only needs the framework, copy `dist/lumen-core.css` and optionally `dist/lumen.js`. These files have no build-time dependencies or CSS imports. `dist/lumen.css` includes the larger reference collection. `dist/index.html` is a working starter page; `dist/manifest.json` records sizes and checksums. The compatibility core is about 33 KB gzip and the full collection about 130 KB gzip. New projects using only the agreed public names can choose `dist/lumen-core-modern.css` (about 27 KB gzip) or `dist/lumen-modern.css` (about 116 KB gzip). These optional bundles omit generated legacy selector aliases; the default bundles continue to support existing integrations. The minified optional runtime is about 12 KB gzip. Exact sizes and checksums are in the manifest; reviewed gzip limits in `bundle-budgets.json` are enforced during every build.

```html
<link rel="stylesheet" href="lumen-core.css">
<script src="lumen.js" defer></script>
<div class="lumen">
  <button class="btn btn-style-tonal color-blue" data-lm-toast="Ready">Try Lumen</button>
</div>
```

Run `npm ci && npm run build` to regenerate icons, canonical styles, distribution files and offline assets. `npm pack` creates a local asset package with CSS/JS exports; this repository remains private for npm publishing. The package also includes component/token modules for selective imports. For example, load the core, then `lumen-ui/components/public-forms.css` and `lumen-ui/components/appearance.css` for the form reference collection.

## Build and export a variant

Open **Inspect → Customize** on a supported example. Select an existing instance on examples marked customizable, then adjust its style, color/gradient, size, shape, state, label and icon where supported. Preview, HTML, copying and the standalone link use the same validated configuration. Focus/hover/pressed choices demonstrate those states; disabled and busy choices use native attributes.

**Copy HTML** supplies markup with its required scope, inline icon definitions where needed, and fresh IDs so repeated copies keep their labels and behavior targets independent. Stateful controls are copied with their complete context; individual selection is available for self-contained visual controls. **Copy CSS** supplies expanded stylesheet dependencies. **Copy complete example** includes the source stylesheet/script links and icon definitions. **Download HTML** embeds the CSS and interaction script so the downloaded page can run independently. External images in visual references retain their original URLs. Direct-file studio opening supports these tools through the generated snapshot.

Search understands familiar synonyms including “IB,” “btn,” “soft,” and “modal.” Example labels distinguish shared interactive components, native controls, and appearance references that need application behavior.

## Connected reference workspace

Open `workspace.html`, or **Compositions → Connected workspace** in the studio. Overview, records, detail drawer, create/edit dialogs, settings and attachments share the public primitives. Search, sort, page selection, CSV, bulk archive/undo, dirty-change confirmation, errors/retry, upload cancellation and viewer/editor states work together. The **Fail next request** control makes error paths reproducible.

Data and attachments remain in memory for the session. Viewer mode demonstrates UI permissions; production authorization belongs on your server. For application integration, `LumenWorkspace.mount(root, {adapter})` accepts optional asynchronous `list`, `save`, `archive`, `settings` and `upload` handlers, each receiving `(payload, {signal})`. `list` returns an array of records; the other handlers complete the operation before the local view updates. The standalone page and portable studio export use the same template and controller. This optional app controller stays outside the core runtime bundle.

## Application patterns

The Compositions category includes tested login, settings, checkout, dashboard, order-management, and confirmation/undo patterns. Version 3.2 adds editable inventory, empty/loading/error presentations, a multi-step project form, combined search/team filters, and file selection with size validation. They use the same public components:

- Forms support client validation, error associations, live correction, reset, and a `lumen:submit` event. Applications own authentication, persistence and payments; the examples do not call a backend.
- Order management combines search, sorting, pagination, visible-row selection and CSV download.
- Navigation collapses at mobile widths, including narrow studio previews. Tables scroll inside their own container, and layouts support RTL.
- Dialogs restore focus after closing; removal actions expose Undo.
- Multi-step forms validate before advancing, move keyboard focus, retain previous-step values, submit all steps, and reset to the first step.
- Filters combine search and selection values; `data-lm-filter-column="1"` restricts a filter to a zero-based table column.
- File inputs accept `data-lm-max-size` in bytes, announce selection/errors, and support clearing. Repeated form names produce arrays in `lumen:submit` details; single values retain their existing shape.
- Status presentations demonstrate application states. Retry/create actions are integration examples, not backend requests.

Matching older form entries redirect through catalog aliases instead of duplicating the working patterns. The inventory now includes 530 examples, retaining all original entries through examples and aliases.

## Authoring design tokens

Edit [tokens/design-tokens.json](tokens/design-tokens.json) for primitives, semantic roles, theme assignments, component roles, compatibility aliases, breakpoints and size recipes. `npm run build:tokens` generates the CSS modules, size stylesheet and JavaScript metadata. The build rejects unknown references, dependency cycles, incomplete themes and invalid customization contracts. Authored utilities live in `tokens/source/`; responsive utilities expand from one base definition at the shared breakpoints. Generated token modules, `components/utilities.css` and `components/sizes.css` should not be edited directly.

The studio **Tokens** dialog adjusts palette, radii, spacing, control height and font, warns about configured text contrast and copies scoped CSS. `LumenDesign.apply(element, configuration)` and `LumenDesign.css(configuration, selector)` expose the same validated settings to applications and exports. Set `data-density="compact"` for denser surfaces/tables while keeping explicit control dimensions. [components/contracts.json](components/contracts.json) records anatomy, states, sizes and keyboard contracts. Existing class names and aliases remain supported.

## Shared foundations and parts

Fifty-eight repeated primitive rules now have one source in `components/primitives.css`, used across eight category stylesheets. Public components consume palette, spacing, type, weight, radius, elevation, focus and control-size tokens. Bespoke reference artwork keeps its intentional styling.

Use `card-header`, `card-body`, `card-footer`, `dialog-header`, `dialog-body`, `dialog-footer`, `input-label`, `input-help`, `input-error`, `toolbar`, and `navbar` to compose a screen. Changing a Foundation spacing, type or palette token updates the corresponding public primitives; automated checks verify real rendered changes.

## Icons and asynchronous actions

The shared icon source is `icons/icons.json`. Its 12 icons generate `icons/lumen.svg` and an inline SVG helper included in `dist/lumen.js`:

```js
button.prepend(LumenIcons.create('download')); // Decorative icon inside a labelled button.
container.append(LumenIcons.create('check', {label: 'Completed'}));

await LumenUI.run(button, async () => {
  await saveChanges();
});
```

`LumenUI.run` sets busy/disabled state while the task runs and restores the previous state on success or failure. It rejects concurrent runs on the same busy button. Mount lifecycle cleanup also restores busy controls. Icon-only buttons still need an accessible name on the button.

## Use the public core

Include the core stylesheet and optional interaction script, and apply `lumen` to the component container:

```html
<link rel="stylesheet" href="lumen-core.css">
<script src="js/components.js" defer></script>

<div class="lumen">
  <button type="button" class="btn">Primary action</button>
  <button type="button" class="btn btn-style-tonal">Tonal action</button>
  <button type="button" class="btn btn-style-outline">Outline action</button>
  <button type="button" class="btn color-gradient-violet">Gradient action</button>
</div>
```

Paths are relative to the location where you host Lumen's files. Keep the `tokens/` and `components/` directories available: stylesheets import their dependencies. The inspector's **Copy complete example** action includes the exact stylesheet, script, and icon definitions required by the selected example.

`lumen-core.css` loads the design tokens, public core components, and utilities. `lumen.css` remains the full bundle containing the original component styles as well as the new core. Category examples use `lumen-core.css` as their shared foundation, then their generated stylesheet, such as `components/public-buttons.css`, and `components/appearance.css`. The original stylesheet paths remain available for existing integrations.

### Buttons and icon buttons

Use the same base, appearance, color, and size classes for both. Add `btn-icon` for a square icon-only control and provide an accessible name:

```html
<button type="button" class="btn btn-style-tonal color-success size-sm">Save</button>
<button type="button" class="btn btn-style-tonal color-success size-sm btn-icon" aria-label="Add">+</button>
```

Sizes are `size-xs` (32px), `size-sm` (40px), default (44px), `size-lg` (52px), and `size-xl` (62px). Text buttons use horizontal padding; icon buttons use the same height as their square width with zero padding. Both APIs consume the generated `tokens/controls.css`; original category styles share `components/button-base.css` instead of repeating button geometry. All icon examples now use `btn btn-icon`. The compiled styles also support the original `b ib`, standalone `ib`, and `lm-*` aliases. Public core button dimensions now match the original scale, including the previously different small and large sizes.

The [framework plan](FRAMEWORK-PLAN.md) records the completed stages 1–7 and verification boundaries. Naming now applies to every catalog template; visual references retain their existing behavior status.

### Shared naming convention

Use a component base plus its own style prefix. Sizes and colors are shared:

```html
<button class="btn btn-style-tonal color-red size-xl">Delete</button>
<button class="btn btn-icon btn-style-outline color-red size-xl" aria-label="Add">+</button>
<button class="btn color-gradient-violet width-full">Continue</button>
<article class="card card-style-raised color-blue size-lg">Card content</article>
<span class="badge badge-style-outline color-success size-sm">Ready</span>
<input class="input color-blue size-lg" aria-label="Name">
```

- Component styles: `btn-style-solid`, `btn-style-tonal`, `btn-style-outline`, `btn-style-ghost`, `btn-style-link`; `card-style-raised`, `card-style-glass`, `card-style-outline`, `card-style-tonal`, `card-style-solid`.
- Shared sizes: `size-xs`, `size-sm`, default medium, `size-md`, `size-lg`, `size-xl`. A size affects the element carrying it; nested components keep their defaults. Each component defines the dimensions appropriate to it.
- Shared colors: `color-red`, `color-blue`, `color-green`, `color-teal`, `color-orange`, `color-yellow`, `color-purple`, `color-pink`, `color-slate`, `color-black`, `color-white`, plus Foundation semantic colors such as `color-primary`, `color-success`, and `color-danger`.
- Gradients: `color-gradient-violet`, `color-gradient-ocean`, `color-gradient-sunset`, `color-gradient-candy`, `color-gradient-forest`, `color-gradient-midnight`, `color-gradient-rose`, `color-gradient-aurora`.
- Typography: `font-sans`, `font-serif`, `font-mono`; `weight-normal`, `weight-medium`, `weight-semibold`, `weight-bold`; `text-sm`, `text-md`, `text-xl`, `text-2xl`; `leading-tight`, `leading-normal`, `leading-relaxed`; `tracking-tight`, `tracking-normal`, `tracking-wide`; `text-start`, `text-center`, `text-end`.
- Text/background utilities: `text-red` changes foreground only; `bg-red` changes background only. `color-red` coordinates a component's accent, foreground and interaction colors. Use `text-muted` and `bg-surface` for theme-aware neutral colors.
- Presets: `heading-xl`, `heading-lg`, `heading-md`, `heading-sm`, `body-lg`, `body-md`, `body-sm`, and `caption`. Heading tags retain their semantic level regardless of visual size.
- Parts and options stay component-specific: `input-label`, `input-help`, `input-error`, `carousel-controls`, `btn-icon`, `table-striped`, `table-compact`. Native state attributes and existing `data-lm-*` behavior hooks remain unchanged.
- Layout and surface utilities: `container`, `row`, `stack`, `grid`, `gap-4`, `p-4`, `px-4`, `py-2`, `width-full`, `height-full`, `shape-pill`, `radius-lg`, `shadow-md`, `border-dashed`.

The canonical mapping is in [naming/classes.json](naming/classes.json). New examples and copied snippets use these names. Generated `public-*.css` files contain canonical selectors and original aliases sharing the same declarations; do not edit generated files. Keep `lumen` on the container for the framework's font, form reset and box-sizing rules.

### Responsive layout and spacing

```html
<div class="lumen container">
  <div class="grid gap-4">
    <article class="card col-12 md-col-6 lg-col-4 p-6">
      Card content
    </article>
  </div>
</div>
```

Responsive prefixes are `sm`, `md`, `lg`, `xl`, and `xxl` (the `2xl` token). Their shared breakpoints are 40rem, 48rem, 64rem, 80rem and 96rem. Grid column gaps shrink when necessary to keep twelve tracks inside narrow containers, including enlarged text. Spacing suffixes match the original `--space-*` tokens: for example, `p-4` uses `--space-4` (1rem), while `p-6` uses `--space-6` (1.5rem). Logical utilities such as `ps-4` and `me-4` support RTL layouts.

### Themes

Set `data-theme` on the document root or a component scope:

```js
document.documentElement.dataset.theme = 'dark';
```

Supported themes: `light`, `dark`, `oled`, `cyberpunk`, `obsidian`, `arctic`, `sport`, and `luxury`. Public core controls use theme-aware foregrounds; visual references retain their original example palettes.

### JavaScript lifecycle

The interaction script automatically mounts the document. For dynamically inserted content or Shadow DOM, mount or refresh the appropriate root:

```js
const ui = LumenUI.mount(rootNode);
ui.refresh();

// Release listeners, timers, notifications, and open dialogs on removal.
ui.destroy();
```

For request-backed forms and data, use the shared controllers:

```js
const form = LumenUI.form(document.querySelector('form'), {
  submit: async (values, {signal}) => {
    const response = await fetch('/api/settings', {
      method: 'POST', body: JSON.stringify(values), signal,
      headers: {'Content-Type': 'application/json'}
    });
    if (!response.ok) throw Error('Could not save. Try again.');
  },
  onState: ({status, dirty}) => { /* update your status presentation */ }
});
// form.state, form.commit(), form.cancel(), form.destroy()

const resource = LumenUI.resource({
  load: async ({signal}) => {
    const response = await fetch('/api/records', {signal});
    if (!response.ok) throw Error('Could not load records.');
    return response.json();
  },
  onState: ({status, data, error}) => { /* render loading/empty/error/success */ }
});
await resource.refresh();
// resource.cancel(); resource.destroy();
```

Forms lock data controls during submission, retain values on errors and commit reset defaults on success. Add an output with `data-lm-form-status` for errors. Call `cancel()` before resetting an in-flight form. Resource refresh aborts the preceding request and ignores stale results. `LumenUI.prepare(root)` supplies stable label/help/error associations before serializing markup. Notifications accept `{duration, action: {label, run}, politeness}`; duration zero keeps an undo action available until dismissed.

Calling `LumenUI.mount` again on a mounted root refreshes it without adding duplicate delegated listeners. Components dispatch bubbling `lumen:*` events, including `lumen:action`, `lumen:tabchange`, `lumen:submit`, `lumen:select`, `lumen:sort`, and `lumen:page`, for application integration.

The original theme manager, telemetry simulator, and automotive controls remain available in `js/theme-manager.js`, `js/telemetry.js`, `js/controls.js`, and `js/lumen.js`. They are optional modules and are separate from the public core interaction layer.

## Repository structure

```text
 catalog/components.json   Category and example metadata, stable keys, aliases
 templates/               Native HTML templates for all examples
 naming/classes.json      Canonical names, original aliases, per-template mappings
 components/public-*.css  Generated canonical selectors and compatibility aliases
 components/appearance.css Shared colors, sizes, typography and appearance utilities
 tokens/design-tokens.json Authoritative primitives, roles, themes and size contracts
 tokens/source/           Authored utility source
 components/contracts.json Public component anatomy and interaction contracts
 tokens/brand.css         Generated Foundation palette aliases
 tokens/                  Original colors, typography, spacing, effects, breakpoints
 components/core.css      Component source styles; compiled names live in public-core.css
 components/utilities.css Responsive layout and logical spacing utilities
 components/*.css         Original component styles
 js/assets.js             Shared HTTP / direct-file asset loader
 js/studio-data.js         Generated direct-file snapshot
 js/components.js         Public interaction, form/resource and lifecycle API
 js/design.js             Shared validated branding API
 js/workspace.js          Optional connected application controller
 workspace.html           Connected reference application
 js/studio.js             Catalog-driven studio and inspector
 js/example.js            Standalone example loader
 js/theme-manager.js      Original theme manager
 js/telemetry.js           Optional vehicle simulator
 js/controls.js            Optional automotive controls
 js/lumen.js               Original module facade
 lumen-core.css           Public core stylesheet entrypoint
 lumen.css                Full stylesheet entrypoint
 studio-preview.html      Studio entrypoint
 studio.css               Studio shell styling
 example.html             Standalone examples selected with ?item=source/id
 scripts/build-offline.mjs Regenerates the direct-file snapshot
 tests/                   Catalog, browser, direct-file, accessibility, theme checks
```

For example, `example.html?item=core/dialog` renders the public modal example. The item's stable key, template source, CSS dependencies, and category are defined in the catalog.

To reorganize an item, update its catalog category and family while retaining its stable key. To add an example, add its HTML template and catalog record. Navigation, search, category counts, and inspection derive from those records; the studio shell does not need a separate inventory update. After changing catalog records, templates, or CSS, run `npm run build:offline` and commit generated `public-*.css` files and the updated `js/studio-data.js`. This command compiles the naming registry before generating the snapshot. It is generated from those source files; edit the sources rather than the snapshot. Tests verify that the snapshot is current.

## Validation

Install the development-only test dependencies from the lockfile:

```bash
npm ci
npm test
```

Browser checks require Chromium at `/usr/bin/chromium`, or an alternative executable selected with `CHROMIUM_PATH`.

The suite checks:

- Catalog integrity, unique keys, template dependencies, and preservation of the original content through canonical sections and merged aliases.
- Rendering all 530 previews over HTTP and through the offline snapshot loader, plus navigation, aliases, filtering, favorites, comparison, and standalone exports.
- Windows direct-file path resolution without fetch requests, offline snapshot rendering, HTML/CSS inspection, standalone interactions, paths containing spaces, and HTTP hosting under a subdirectory. The suite attempts real `file://` browser navigation; if an administrator policy blocks that scheme, it reports the check as skipped and tests the same snapshot loader using HTTP offline mode.
- Core and selected original interactions, keyboard behavior, runtime lifecycle, responsive preview containers, and mobile layout.
- Foundation/button palette parity, merged button aliases, text/icon hover and press states, disabled behavior, and 48 canonical button/theme accessibility checks.
- **480 public core/theme combinations**: 60 core examples across eight themes, including open dialogs/menus, validation errors, automated WCAG checks through axe-core, and narrow-layout checks.

Additional checks cover token dependencies, scoped brand changes, every default/medium size contract, nested themes, request races, notification timing, anatomy-preserving configuration and branded exports. The connected app has workflow checks and 12 desktop/mobile-RTL/dark WCAG audits. `npm run test:compat` checks native forms, keyboard menus, app CRUD, 320px/200% text reflow and Chromium forced colors. Set `LUMEN_BROWSER=firefox` or `webkit` after installing that Playwright browser. GitHub Actions runs this compatibility matrix separately.

Local 3.3 verification uses Chromium. Firefox/WebKit downloads and native `file://` navigation are blocked by this managed environment's network/browser policies; those engine runs and direct-file navigation are not claimed as locally verified. Snapshot-based offline loading is exercised with source requests disabled.

Focused commands are `npm run test:catalog`, `npm run test:buttons`, `npm run test:file`, and `npm run test:themes`. Automated checks cover the public core and selected interactions; they are not an accessibility certification of every retained visual reference or a substitute for manual testing in target applications.

## License

MIT. Copyright © 2026 Santosh Ghimire.

### Functional and visual regression checks

`npm test` verifies generated assets, every retained preview, mixed components, interaction behavior, configured exports, distribution parity, token changes, themes and accessibility. The quality suite includes 54 application/configurator accessibility audits, plus eight committed desktop/mobile-RTL screenshot baselines. Pixel differences are written to `/tmp/lumen-visual-diffs` when a baseline fails.

Run `npm run test:quality` for this feature suite. After an intentional visual change, run `npm run test:visual:update`, inspect the changed PNG files in `tests/visual`, and commit the reviewed baselines. Test fonts use local fallbacks and reduced motion for repeatability. Browser snapshots complement semantic and keyboard checks; they do not replace them.

## Maintaining shared styles and copied instances

Author source CSS in `components/`; do not edit generated `public-*.css`, distribution files, or `js/studio-data.js`. Repeated reference declarations live in `reference-actions.css`, `reference-forms.css`, and `reference-fields.css`. The build expands those fragments before applying each importing category's naming map. Reference selectors stay within their existing category wrappers, which copying includes; loading the full collection does not apply reference artwork styles to unrelated core components. Core and reference variants retain their original order and behavior contracts.

For dynamic repeated instances, insert trusted component HTML through the fragment helper, then refresh the mounted root:

```js
container.append(LumenUI.fragment(componentHTML));
LumenUI.refresh(document);
```

The helper updates IDs, labels, ARIA relationships, fragment links, behavior targets, and inline SVG `url(#...)` references. It does not mount listeners until the fragment is inserted and its root is mounted/refreshed. Call the mount API's `destroy()` when disposing an independently mounted root.

Use `npm run format` for authored JavaScript/CSS, `npm run build` for generated assets, and `npm test` before merging. `npm run test:improvements` checks repeated copies, nested mounts, responsive preview state, multi-step forms, combined filters, upload limits, canonical bundle parity, and mobile RTL accessibility. Default compatibility bundles retain aliases; switching to an optional modern bundle is an explicit project choice.

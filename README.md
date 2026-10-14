# Lumen UI — Component Library & Live Studio

![Version](https://img.shields.io/badge/version-3.0.0-6366f1)
![Runtime](https://img.shields.io/badge/runtime-framework%20free-10b981)
![Examples](https://img.shields.io/badge/examples-533-8b5cf6)
![Themes](https://img.shields.io/badge/themes-8-ec4899)

Lumen UI is a modular HTML, CSS, and JavaScript component library with **533 examples across 12 categories and 70 families**. Its live studio organizes related items so you can find, compare, inspect, and copy them into your own interfaces.

Version 3 preserves all **473 original examples** and their color, typography, spacing, effects, and component styles. It adds **60 public core examples**, a single catalog, native HTML templates, reusable interactions, and responsive utilities. Lumen follows a Bootstrap-style approach to composing interfaces with classes and optional JavaScript; migrating an existing Bootstrap application requires adapting its markup and classes to Lumen's API.

## What's new

- **One catalog:** categories, families, search tags, dependencies, example types, and stable keys come from `catalog/components.json`.
- **Purposeful organization:** components have a canonical category, related variants stay together, and existing moved-item links remain supported through aliases.
- **Paired button variants:** solid, tonal, outline, ghost, and link examples place gradient treatments directly below standard variants.
- **Reusable core:** namespaced `lm-` classes, logical spacing, responsive columns, theme-aware styles, visible focus, and reduced-motion support.
- **Shared interactions:** menus, tabs, dialogs, drawers, collapse, notifications, validation, comboboxes, tables, sliders, uploads, selection trees, and carousels.
- **Studio tools:** global search, family/type filters, grid/list layouts, comparisons of up to four examples, favorites, recent items, and deep links.
- **Copying and inspection:** inspect HTML and CSS, choose an individual control, copy a complete example with dependencies, or open it independently of the studio.
- **Preview controls:** desktop/tablet/mobile widths, LTR/RTL direction, and eight themes. Responsive styles inside isolated previews respond to the preview width.

## Categories

| Category | Examples |
| --- | ---: |
| Foundations | 51 |
| Layout & utilities | 8 |
| Buttons & actions | 61 |
| Forms & selection | 69 |
| Sliders & values | 36 |
| Navigation | 42 |
| Cards & surfaces | 42 |
| Disclosure & overlays | 21 |
| Status & feedback | 50 |
| Data & content | 49 |
| Media & imagery | 75 |
| Compositions | 29 |
| **Total** | **533** |

Examples are labeled by capability:

| Type | Meaning |
| --- | --- |
| Interactive core | Public JavaScript provides the demonstrated interaction. |
| CSS / native controls | CSS and native browser controls provide the demonstrated behavior. |
| Visual reference | A styling example; full application behavior is not implied. |
| Composition | An assembled interface whose application-specific actions and data need integration. |

The 60 core examples include interactive controls, CSS/native examples, and compositions. Example counts are distinct from component-family counts and individual variant counts.

## Run the studio

From the repository root, with Node.js/npm and Python 3 available:

```bash
npm start
```

The command starts a Python static HTTP server on port 8000, bound to the local machine. Open `studio-preview.html` through that server; `index.html` also redirects there. The studio fetches its catalog and templates over HTTP, so opening the file directly is not supported.

No dependency installation, build, framework, backend, or credentials are required to view the studio. Google Fonts is optional; when its domains are unavailable, the configured font stacks fall back to local fonts.

Use the category sidebar or **Ctrl / Command + K** to search. Select **Inspect** on an example for its preview, HTML, CSS, and copying tools. Use **⇄** to select examples for comparison. Favorites, recent items, and the theme choice are stored in your browser.

## Use the public core

Include the core stylesheet and optional interaction script, and apply `lm-scope` to the component container:

```html
<link rel="stylesheet" href="lumen-core.css">
<script src="js/components.js" defer></script>

<div class="lm-scope">
  <button type="button" class="lm-btn">Primary action</button>
  <button type="button" class="lm-btn lm-btn--tonal">Tonal action</button>
  <button type="button" class="lm-btn lm-btn--outline">Outline action</button>
  <button type="button" class="lm-btn lm-btn--gradient">Gradient action</button>
</div>
```

Paths are relative to the location where you host Lumen's files. Keep the `tokens/` and `components/` directories available: stylesheets import their dependencies. The inspector's **Copy complete example** action includes the exact stylesheet, script, and icon definitions required by the selected example.

`lumen-core.css` loads the design tokens, public core components, and utilities. `lumen.css` remains the full bundle containing the original component styles as well as the new core. Original examples can also use their individual stylesheets, such as `components/buttons.css`.

### Responsive layout and spacing

```html
<div class="lm-scope lm-container">
  <div class="lm-grid lm-gap-4">
    <article class="lm-card lm-col-12 lm-md-col-6 lm-lg-col-4 lm-p-6">
      Card content
    </article>
  </div>
</div>
```

Responsive prefixes are `sm`, `md`, `lg`, `xl`, and `xxl`. Spacing suffixes match the original `--space-*` tokens: for example, `lm-p-4` uses `--space-4` (1rem), while `lm-p-6` uses `--space-6` (1.5rem). Logical utilities such as `lm-ps-4` and `lm-me-4` support RTL layouts.

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

Calling `LumenUI.mount` again on a mounted root refreshes it without adding duplicate delegated listeners. Components dispatch bubbling `lumen:*` events, including `lumen:action`, `lumen:tabchange`, `lumen:submit`, `lumen:select`, `lumen:sort`, and `lumen:page`, for application integration.

The original theme manager, telemetry simulator, and automotive controls remain available in `js/theme-manager.js`, `js/telemetry.js`, `js/controls.js`, and `js/lumen.js`. They are optional modules and are separate from the public core interaction layer.

## Repository structure

```text
 catalog/components.json   Category and example metadata, stable keys, aliases
 templates/               Native HTML templates for all examples
 tokens/                  Original colors, typography, spacing, effects, breakpoints
 components/core.css      Public lm- component styles
 components/utilities.css Responsive layout and logical spacing utilities
 components/*.css         Original component styles
 js/components.js         Public interaction and lifecycle API
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
 tests/                   Catalog, browser, accessibility, and theme checks
```

For example, `example.html?item=core/dialog` renders the public modal example. The item's stable key, template source, CSS dependencies, and category are defined in the catalog.

To reorganize an item, update its catalog category and family while retaining its stable key. To add an example, add its HTML template and catalog record. Navigation, search, category counts, and inspection derive from those records; the studio shell does not need a separate inventory update.

## Validation

Install the development-only test dependencies from the lockfile:

```bash
npm ci
npm test
```

Browser checks require Chromium at `/usr/bin/chromium`, or an alternative executable selected with `CHROMIUM_PATH`.

The suite checks:

- Catalog integrity, unique keys, template dependencies, and retention of all 473 original records.
- Rendering all 533 previews, navigation, aliases, filtering, favorites, comparison, and standalone exports.
- Core and selected original interactions, keyboard behavior, runtime lifecycle, responsive preview containers, and mobile layout.
- **480 public core/theme combinations**: 60 core examples across eight themes, including open dialogs/menus, validation errors, automated WCAG checks through axe-core, and narrow-layout checks.

Focused commands are `npm run test:catalog` and `npm run test:themes`. Automated checks cover the public core and selected interactions; they are not an accessibility certification of every retained visual reference or a substitute for manual testing in target applications.

## License

MIT. Copyright © 2026 Santosh Ghimire.

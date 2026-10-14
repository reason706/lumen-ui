# Lumen UI — Modular Design System & Live Component Studio

![Lumen UI Banner](https://img.shields.io/badge/Lumen%20UI-Design%20System-6366f1?style=for-the-badge&logo=css3&logoColor=white)
![Version](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)
![Tokens](https://img.shields.io/badge/tokens-rem--based-emerald?style=flat-square)
![Accessibility](https://img.shields.io/badge/WCAG-AAA%20Compliant-purple?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-zero-success?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)

**Lumen UI** is an ultra-modern, production-ready, `rem`-based modular design system and interactive component library with **474+ curated UI components** across 9 foundational categories. Engineered for enterprise dashboards, modern SaaS, mobile web apps, and automotive human-machine interfaces (HMI).

---

## ✦ Key Features

- **Zero Framework Lock-in:** Pure semantic CSS3 with CSS custom properties and lightweight vanilla JavaScript. Works seamlessly with React, Vue, Svelte, Angular, Flutter Web, or vanilla HTML/CSS.
- **`rem`-Based Fluid Architecture:** Scalable responsive typography, standard 4px/8px spatial rhythm (`0.25rem` to `6rem`), and minimum 44px touch targets.
- **Multi-Theme Engine:** Out-of-the-box support for Daylight, Slate Dark, True OLED Black, Cyberpunk Neon, Obsidian, Arctic, Sport, and Luxury palettes.
- **Gradient Button & Variant Suite:** Comprehensive solid, soft/tonal, outline, ghost, and 8-ramp gradient buttons (`g1` through `g8`) embedded seamlessly across core action groups.
- **Automotive & Telemetry Ready:** Includes radial speedometers, battery state-of-charge (SoC) rings, rotary dual-zone HVAC dials, ADAS sensor arcs, and a 60 FPS mock CAN-bus physics engine.
- **Live Component Studio & Inspector:** Real-time component preview with responsive viewport modes (Desktop, Tablet, Mobile), instant search (⌘K / Ctrl+K), and 1-click clipboard code extraction.

---

## 📁 Repository Structure

```
lumen-ui/
├── tokens/
│   ├── colors.css             /* Semantic palettes, 50-900 ramps, dark/OLED themes, tone scopes */
│   ├── typography.css         /* Fluid rem type scale, font pairings, tabular numbers, tracking */
│   ├── spacing-sizing.css     /* 4px/8px rem spacing scale, widths, heights, radii, touch targets */
│   ├── effects.css            /* Elevation shadows (0-5), glassmorphism, neumorphism, motion */
│   └── media-queries.css      /* Breakpoints (xs-xxl), responsive container, 12-col grid */
├── components/
│   ├── foundations.css        /* Color ramps, palettes, pairings, typography, grid, borders */
│   ├── buttons.css            /* Solid, soft, outline, ghost, 8 gradient ramps, FAB, morphs */
│   ├── forms.css              /* Inputs, floating labels, choice cards, switches, calendar, OTP */
│   ├── sliders-values.css     /* Range sliders, circular dials, steppers, gauges, equalizers */
│   ├── navigation.css         /* Navbars, sidebars, tabs, breadcrumbs, command bar, docks */
│   ├── surfaces.css           /* Cards, modals, drawers, bento grids, glass/skeuomorphic panels */
│   ├── feedback.css           /* Alerts, toasts, skeletons, progress rings, status indicators */
│   └── data-media.css         /* Tables, charts, speedometers, avatars, audio/video players */
├── js/
│   ├── theme-manager.js       /* Multi-palette dynamic switcher (Daylight, Dark, OLED, Cyberpunk) */
│   ├── telemetry.js           /* Observable vehicle state store & 60 FPS live CAN-bus simulator */
│   ├── controls.js            /* Interactive virtual rotary dials, rocker switches, hold-to-confirm */
│   ├── lumen.js               /* Master framework controller & auto-initialization */
│   └── studio.js              /* Component Studio client controller & inspector drawer */
├── lumen.css                  /* Master barrel stylesheet (@import tokens + components) */
├── studio.css                 /* Component Studio shell styling */
├── studio-preview.html        /* Interactive Live Component Studio & Variant Inspector */
├── index.html                 /* Fast redirect entrypoint to studio-preview.html */
├── .gitignore                 /* Clean version control exclusion rules */
└── README.md                  /* Documentation & usage guide */
```

---

## 🚀 Quick Start

### 1. Import Master Bundle
Drop the master bundle into your HTML document to access the entire token and component suite:

```html
<link rel="stylesheet" href="lumen.css">
```

### 2. Or Import Modular Stylesheets Individually
Use only the specific categories your project requires:

```html
<!-- Design Tokens -->
<link rel="stylesheet" href="tokens/colors.css">
<link rel="stylesheet" href="tokens/typography.css">
<link rel="stylesheet" href="tokens/spacing-sizing.css">

<!-- Specific Components -->
<link rel="stylesheet" href="components/buttons.css">
<link rel="stylesheet" href="components/forms.css">
<link rel="stylesheet" href="components/surfaces.css">
```

### 3. Include JavaScript Controllers (Optional)

```html
<!-- Theme Management & Dynamic Controllers -->
<script src="js/theme-manager.js"></script>
<script src="js/telemetry.js"></script>
<script src="js/controls.js"></script>
<script src="js/lumen.js"></script>
```

---

## 🎨 Design Tokens Overview

### Color System (`tokens/colors.css`)
- **Semantic Palettes:** `--color-primary`, `--color-info`, `--color-success`, `--color-warning`, `--color-danger`, `--color-violet`, `--color-ink`, `--color-muted`, `--color-border`, `--color-surface`.
- **50-900 Primitive Ramps:** Slate, Gray, Indigo, Cyan, Emerald, Amber, Rose, and Violet.
- **Dark & OLED Themes:** Activated automatically via `body.dark`, `:root[data-theme="dark"]`, or `[data-theme="oled"]`.

### Spacing & Sizing (`tokens/spacing-sizing.css`)
- Based on standard 4px/8px scale expressed in `rem` (`1rem = 16px`):
  - `--space-1`: `0.25rem` (4px)
  - `--space-2`: `0.5rem` (8px)
  - `--space-4`: `1rem` (16px)
  - `--space-6`: `1.5rem` (24px)
  - `--space-8`: `2rem` (32px)
  - `--space-12`: `3rem` (48px)
  - `--space-16`: `4rem` (64px)

---

## 🖥️ Live Component Studio

To launch the interactive studio:
1. Open [`studio-preview.html`](studio-preview.html) directly in any modern browser, or run a local static server:
   ```bash
   npx serve .
   ```
2. Navigate between all 9 component categories.
3. Switch between **Desktop**, **Tablet**, and **Mobile** viewports to inspect responsive ergonomics.
4. Use **◎ Inspect** to inspect the clean markup and copy component code directly.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright © 2026 Santosh Ghimire.

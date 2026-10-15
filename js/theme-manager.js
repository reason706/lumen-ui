/**
 * Lumen UI / Car-UI Theme Manager
 * Manages themes (light, dark, oled, obsidian, arctic, cyberpunk, sport, luxury),
 * handles persistence, and toggles data-theme attributes across DOM roots.
 */

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CarThemeManager = factory();
    if (!root.Lumen) root.Lumen = {};
    root.Lumen.ThemeManager = root.CarThemeManager;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STORAGE_KEY = "lumen-ui-theme";
  const VALID_THEMES = [
    "light",
    "dark",
    "oled",
    "obsidian",
    "arctic",
    "cyberpunk",
    "sport",
    "luxury",
  ];

  class ThemeManager {
    constructor() {
      this.currentTheme = this.getStoredTheme() || "dark";
      this.init();
    }

    init() {
      this.applyTheme(this.currentTheme);
    }

    getStoredTheme() {
      try {
        const saved =
          localStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem("car-ui-theme");
        return VALID_THEMES.includes(saved) ? saved : null;
      } catch (e) {
        return null;
      }
    }

    setTheme(themeName) {
      if (!VALID_THEMES.includes(themeName)) {
        console.warn(
          `[LumenThemeManager] Invalid theme: "${themeName}". Fallback to "dark".`,
        );
        themeName = "dark";
      }

      this.currentTheme = themeName;
      this.applyTheme(themeName);

      try {
        localStorage.setItem(STORAGE_KEY, themeName);
        localStorage.setItem("car-ui-theme", themeName);
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent("lumen-theme-changed", {
          detail: { theme: themeName },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("car-theme-changed", {
          detail: { theme: themeName },
        }),
      );
    }

    applyTheme(themeName) {
      document.documentElement.setAttribute("data-theme", themeName);
      if (document.body) {
        document.body.setAttribute("data-theme", themeName);
        // Toggle dark class for light/arctic vs dark variants
        const isLight = themeName === "light" || themeName === "arctic";
        document.body.classList.toggle("dark", !isLight);
      }
    }

    getThemes() {
      return [
        {
          id: "dark",
          label: "Lumen Dark",
          desc: "Deep indigo & slate twilight theme",
        },
        {
          id: "light",
          label: "Lumen Light",
          desc: "Clean paper surface with vibrant accents",
        },
        {
          id: "obsidian",
          label: "Obsidian OLED",
          desc: "Glare-free pure black night mode",
        },
        {
          id: "arctic",
          label: "Arctic Pure",
          desc: "High-contrast sunlight readable mode",
        },
        {
          id: "cyberpunk",
          label: "Cyberpunk HUD",
          desc: "Phosphor cyan & neon violet glow",
        },
        {
          id: "sport",
          label: "Porsche Sport",
          desc: "Titanium, carbon & guards red",
        },
        {
          id: "luxury",
          label: "Luxury Brass",
          desc: "Warm slate & champagne gold",
        },
      ];
    }
  }

  return new ThemeManager();
});

/**
 * Lumen UI - Master JavaScript Bundle
 * Unifies Theme Manager, Telemetry CAN-Bus Engine, and Haptic Controls.
 * 
 * Usage:
 *   <script src="lumen-ui/js/lumen.js"></script>
 *   Lumen.ThemeManager.setTheme('cyberpunk');
 *   Lumen.Telemetry.startSimulation();
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./theme-manager', './telemetry', './controls'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./theme-manager'),
      require('./telemetry'),
      require('./controls')
    );
  } else {
    root.Lumen = factory(
      root.CarThemeManager,
      root.CarTelemetry,
      root.CarControls
    );
  }
})(typeof self !== 'undefined' ? self : this, function (ThemeManager, Telemetry, Controls) {
  'use strict';

  const Lumen = {
    version: '2.0.0',
    ThemeManager: ThemeManager || (typeof window !== 'undefined' ? window.CarThemeManager : null),
    Telemetry: Telemetry || (typeof window !== 'undefined' ? window.CarTelemetry : null),
    Controls: Controls || (typeof window !== 'undefined' ? window.CarControls : null),

    /**
     * Helper to quickly set theme
     */
    setTheme(theme) {
      if (this.ThemeManager) {
        this.ThemeManager.setTheme(theme);
      }
    },

    /**
     * Start vehicle simulation
     */
    startTelemetry() {
      if (this.Telemetry) {
        this.Telemetry.startSimulation();
      }
    },

    /**
     * Stop vehicle simulation
     */
    stopTelemetry() {
      if (this.Telemetry) {
        this.Telemetry.stopSimulation();
      }
    },

    /**
     * Re-bind interactive controls across newly mounted DOM nodes
     */
    refresh(rootNode = document) {
      if (this.Controls) {
        this.Controls.bindAll(rootNode);
      }
    }
  };

  // Auto-expose on window
  if (typeof window !== 'undefined') {
    window.Lumen = Lumen;
  }

  return Lumen;
});


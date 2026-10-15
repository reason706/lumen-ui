/**
 * Lumen UI / Car-UI Interactive Controls & Haptic Behaviors
 * Manages virtual rotary dials, hold-to-confirm safety triggers, reactive gauges, and segmented switches.
 */

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CarControls = factory();
    if (!root.Lumen) root.Lumen = {};
    root.Lumen.Controls = root.CarControls;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class ControlsEngine {
    constructor() {
      this.init();
    }

    init() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.bindAll());
      } else {
        this.bindAll();
      }
    }

    /**
     * Scan document or shadow root and attach interactive behaviors
     * @param {HTMLElement|Document|ShadowRoot} rootNode
     */
    bindAll(rootNode = document) {
      this.bindRotaryKnobs(rootNode);
      this.bindHoldButtons(rootNode);
      this.bindSegmentedSwitches(rootNode);
      this.bindTelemetryDisplays(rootNode);
    }

    /**
     * Virtual rotary knobs with circular touch / drag tracking
     */
    bindRotaryKnobs(rootNode) {
      const knobs = rootNode.querySelectorAll(
        ".car-rotary-knob:not([data-bound])",
      );
      knobs.forEach((knob) => {
        knob.setAttribute("data-bound", "true");
        let isDragging = false;

        const updateRotation = (e) => {
          if (!isDragging) return;
          const rect = knob.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;

          const rad = Math.atan2(clientY - centerY, clientX - centerX);
          let deg = rad * (180 / Math.PI) + 90;
          if (deg < 0) deg += 360;

          // Clamp to 270 degree travel
          const min = parseFloat(knob.dataset.min || 16);
          const max = parseFloat(knob.dataset.max || 28);
          const normalized = Math.min(1, Math.max(0, deg / 270));
          const val = Math.round((min + normalized * (max - min)) * 10) / 10;

          knob.style.setProperty("--knob-angle", `${deg}deg`);
          knob.dataset.value = val;

          const readout = knob.querySelector(".car-rotary-knob__value");
          if (readout) readout.textContent = `${val}°C`;

          knob.dispatchEvent(
            new CustomEvent("car-knob-change", {
              detail: { value: val, angle: deg },
            }),
          );
        };

        const onStart = (e) => {
          isDragging = true;
          document.addEventListener("mousemove", updateRotation);
          document.addEventListener("mouseup", onEnd);
          document.addEventListener("touchmove", updateRotation, {
            passive: false,
          });
          document.addEventListener("touchend", onEnd);
        };

        const onEnd = () => {
          isDragging = false;
          document.removeEventListener("mousemove", updateRotation);
          document.removeEventListener("mouseup", onEnd);
          document.removeEventListener("touchmove", updateRotation);
          document.removeEventListener("touchend", onEnd);
        };

        knob.addEventListener("mousedown", onStart);
        knob.addEventListener("touchstart", onStart, { passive: true });
      });
    }

    /**
     * Safety hold-to-activate buttons (e.g., Hold 1.5s to disconnect autopilot / open frunk)
     */
    bindHoldButtons(rootNode) {
      const holdBtns = rootNode.querySelectorAll(
        ".car-hold-btn:not([data-bound])",
      );
      holdBtns.forEach((btn) => {
        btn.setAttribute("data-bound", "true");
        let timer = null;
        const duration = parseFloat(btn.dataset.holdDuration || 1500);

        const startHold = (e) => {
          btn.classList.add("is-holding");
          btn.style.setProperty("--hold-duration", `${duration}ms`);

          timer = setTimeout(() => {
            btn.classList.remove("is-holding");
            btn.classList.add("is-confirmed");
            btn.dispatchEvent(
              new CustomEvent("car-hold-confirm", { detail: { target: btn } }),
            );
            setTimeout(() => btn.classList.remove("is-confirmed"), 2000);
          }, duration);
        };

        const cancelHold = () => {
          btn.classList.remove("is-holding");
          clearTimeout(timer);
        };

        btn.addEventListener("mousedown", startHold);
        btn.addEventListener("mouseup", cancelHold);
        btn.addEventListener("mouseleave", cancelHold);
        btn.addEventListener("touchstart", startHold, { passive: true });
        btn.addEventListener("touchend", cancelHold);
      });
    }

    /**
     * Sliding segmented control indicator animations
     */
    bindSegmentedSwitches(rootNode) {
      const segments = rootNode.querySelectorAll(
        ".car-segmented:not([data-bound]), .tab-group-pills:not([data-bound])",
      );
      segments.forEach((seg) => {
        seg.setAttribute("data-bound", "true");
        const items = seg.querySelectorAll("button, label");

        items.forEach((item, index) => {
          item.addEventListener("click", () => {
            items.forEach((i) => i.classList.remove("is-active"));
            item.classList.add("is-active");
            seg.style.setProperty("--active-index", index);
            seg.dispatchEvent(
              new CustomEvent("lumen-segment-change", {
                detail: { index, text: item.textContent.trim() },
              }),
            );
          });
        });
      });
    }

    /**
     * Automatically bind radial gauges and battery indicators to live telemetry if available
     */
    bindTelemetryDisplays(rootNode) {
      if (typeof window !== "undefined" && window.CarTelemetry) {
        window.CarTelemetry.subscribe((state) => {
          const radialGauges = rootNode.querySelectorAll(".car-gauge-radial");
          radialGauges.forEach((gauge) => {
            if (gauge.hasAttribute("data-auto-telemetry")) {
              gauge.style.setProperty("--gauge-value", state.speed);
              const valEl = gauge.querySelector(".car-gauge-radial__value");
              if (valEl) valEl.textContent = state.speed;
            }
          });

          const batteryRings = rootNode.querySelectorAll(".car-battery-ring");
          batteryRings.forEach((ring) => {
            if (ring.hasAttribute("data-auto-telemetry")) {
              ring.style.setProperty("--battery-level", state.battery);
              const textEl = ring.querySelector(".car-battery-ring__text");
              if (textEl) textEl.textContent = `${Math.round(state.battery)}%`;
            }
          });
        });
      }
    }
  }

  return new ControlsEngine();
});

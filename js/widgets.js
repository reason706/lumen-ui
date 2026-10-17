/* Shared optional control initializers. The public mount owns their lifecycle. */
(function (global) {
  "use strict";
  const instances = new WeakMap();
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const fire = (node, name, detail) =>
    node.dispatchEvent(
      new CustomEvent("lumen:" + name, {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  const setup = {
    "[data-lm-slider]"(node, on) {
      const input = node.querySelector('input[type="range"]'),
        output = node.querySelector("output");
      const update = () => {
        const min = Number(input.min) || 0,
          max = Number(input.max) || 100,
          value = Number(input.value),
          p = (value - min) / (max - min || 1);
        node.style.setProperty("--range-value", p * 100 + "%");
        node.style.setProperty("--knob-angle", -135 + p * 270 + "deg");
        if (output) output.value = input.value + (node.dataset.unit || "");
      };
      on(input, "input", update);
      if (node.classList.contains("knob")) {
        let dragging = false;
        const move = (e) => {
          if (!dragging || input.disabled || input.matches(":disabled")) return;
          const r = node.getBoundingClientRect();
          let a =
            (Math.atan2(
              e.clientY - r.top - r.height / 2,
              e.clientX - r.left - r.width / 2,
            ) *
              180) /
              Math.PI +
            90;
          if (a > 180) a -= 360;
          const min = Number(input.min) || 0,
            max = Number(input.max) || 100,
            step = Number(input.step) || 1;
          input.value = String(
            min +
              Math.round((clamp((a + 135) / 270, 0, 1) * (max - min)) / step) *
                step,
          );
          input.dispatchEvent(
            new Event("input", { bubbles: true, composed: true }),
          );
        };
        on(node, "pointerdown", (e) => {
          if (e.button !== 0 || input.matches(":disabled")) return;
          e.preventDefault();
          input.focus();
          dragging = true;
          node.setPointerCapture(e.pointerId);
          move(e);
        });
        on(node, "pointermove", move);
        for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
          on(node, name, () => (dragging = false));
      }
      return { refresh: update };
    },
    "[data-lm-xy]"(node, on) {
      const plane = node.querySelector(".xy-pad-plane"),
        x = node.querySelector("[name=x]"),
        y = node.querySelector("[name=y]"),
        output = node.querySelector("output");
      let dragging = false;
      const update = () => {
        node.style.setProperty("--xy-x", x.value + "%");
        node.style.setProperty("--xy-y", y.value + "%");
        output.value = "X " + x.value + " · Y " + y.value;
      };
      const move = (e) => {
        if (!dragging || x.matches(":disabled") || y.matches(":disabled"))
          return;
        const r = plane.getBoundingClientRect();
        x.value = Math.round(
          clamp(((e.clientX - r.left) / r.width) * 100, 0, 100),
        );
        y.value = Math.round(
          clamp(((e.clientY - r.top) / r.height) * 100, 0, 100),
        );
        x.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      };
      on(plane, "pointerdown", (e) => {
        if (e.button !== 0 || x.matches(":disabled")) return;
        dragging = true;
        plane.setPointerCapture(e.pointerId);
        plane.focus();
        move(e);
      });
      on(plane, "pointermove", move);
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        on(plane, name, () => (dragging = false));
      on(plane, "keydown", (e) => {
        const keys = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        if (x.matches(":disabled") || y.matches(":disabled")) return;
        if (keys[e.key]) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          x.value = Number(x.value) + keys[e.key][0] * step;
          y.value = Number(y.value) + keys[e.key][1] * step;
          x.dispatchEvent(
            new Event("input", { bubbles: true, composed: true }),
          );
        }
      });
      const changed = () => {
        update();
        fire(node, "xychange", { x: Number(x.value), y: Number(y.value) });
      };
      on(x, "input", changed);
      on(y, "input", changed);
      return { refresh: update };
    },
    "[data-lm-direction]"(node, on) {
      const output = node.querySelector("output"),
        buttons = [...node.querySelectorAll("button[data-direction]")];
      const select = (button) => {
        if (button.matches(":disabled")) return;
        buttons.forEach((b) =>
          b.setAttribute("aria-pressed", String(b === button)),
        );
        output.value = button.dataset.direction;
        fire(node, "directionchange", { direction: button.dataset.direction });
      };
      buttons.forEach((b) => on(b, "click", () => select(b)));
      on(node, "keydown", (e) => {
        const direction = {
          ArrowUp: "Up",
          ArrowDown: "Down",
          ArrowLeft: "Left",
          ArrowRight: "Right",
          Home: "Center",
        }[e.key];
        const b = buttons.find((b) => b.dataset.direction === direction);
        if (b) {
          e.preventDefault();
          b.focus();
          select(b);
        }
      });
      return {};
    },
    "[data-lm-deck]"(node, on) {
      const cards = [...node.querySelectorAll(".card-deck-items>.card")],
        output = node.querySelector("output");
      let index = 0;
      const update = () => {
        cards.forEach((card, i) => {
          const offset = (i - index + cards.length) % cards.length;
          card.style.setProperty("--deck-offset", offset);
          card.style.zIndex = cards.length - offset;
          card.inert = offset !== 0;
          card.setAttribute("aria-hidden", String(offset !== 0));
        });
        output.value = "Card " + (index + 1) + " of " + cards.length;
      };
      node.querySelectorAll("[data-deck-step]").forEach((b) =>
        on(b, "click", () => {
          index =
            (index + Number(b.dataset.deckStep) + cards.length) % cards.length;
          update();
          fire(node, "deckchange", { index });
        }),
      );
      return {
        refresh: update,
        destroy: () =>
          cards.forEach((c) => {
            c.inert = false;
            c.removeAttribute("aria-hidden");
          }),
      };
    },
    "[data-lm-poll]"(node, on) {
      const buttons = [...node.querySelectorAll("button[data-votes]")],
        output = node.querySelector("output");
      let done = false;
      buttons.forEach((b) =>
        on(b, "click", () => {
          if (done || b.disabled) return;
          done = true;
          const total = buttons.reduce(
            (n, b) => n + Number(b.dataset.votes),
            1,
          );
          buttons.forEach((choice) => {
            const p = Math.round(
              ((Number(choice.dataset.votes) + (b === choice ? 1 : 0)) /
                total) *
                100,
            );
            choice.setAttribute("aria-pressed", String(choice === b));
            choice.disabled = true;
            const meter = choice.parentElement.querySelector("meter");
            meter.value = p;
            meter.hidden = false;
            choice.parentElement.querySelector(
              "[data-poll-result]",
            ).textContent = p + "%";
          });
          output.value =
            "Vote recorded for " + b.value + ". " + total + " votes in total.";
          fire(node, "vote", { value: b.value, total });
        }),
      );
      on(node.querySelector("[data-poll-reset]"), "click", () => {
        done = false;
        buttons.forEach((b) => {
          b.disabled = false;
          b.setAttribute("aria-pressed", "false");
          b.parentElement.querySelector("meter").hidden = true;
          b.parentElement.querySelector("[data-poll-result]").textContent = "";
        });
        output.value = "Choose an option to vote.";
      });
      return {};
    },
    "[data-lm-quiz]"(node, on) {
      const buttons = [...node.querySelectorAll("button[data-answer]")],
        output = node.querySelector("output");
      let done = false;
      buttons.forEach((b) =>
        on(b, "click", () => {
          if (done || b.disabled) return;
          done = true;
          const correct = b.dataset.answer === node.dataset.correct;
          buttons.forEach((choice) => {
            choice.disabled = true;
            choice.dataset.result =
              choice.dataset.answer === node.dataset.correct
                ? "correct"
                : choice === b
                  ? "incorrect"
                  : "";
          });
          output.value = correct
            ? "Correct. rem uses the root font size."
            : "Incorrect. The correct answer is the root font size.";
          fire(node, "answer", { value: b.dataset.answer, correct });
        }),
      );
      on(node.querySelector("[data-quiz-reset]"), "click", () => {
        done = false;
        buttons.forEach((b) => {
          b.disabled = false;
          delete b.dataset.result;
        });
        output.value = "Choose one answer.";
      });
      return {};
    },
    "[data-lm-card-effect]"(node, on) {
      const move = (e) => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = node.getBoundingClientRect(),
          x = (e.clientX - r.left) / r.width,
          y = (e.clientY - r.top) / r.height;
        node.style.setProperty("--pointer-x", x * 100 + "%");
        node.style.setProperty("--pointer-y", y * 100 + "%");
        node.style.setProperty("--tilt-x", (0.5 - y) * 12 + "deg");
        node.style.setProperty("--tilt-y", (x - 0.5) * 12 + "deg");
      };
      const reset = () => {
        for (const p of ["--pointer-x", "--pointer-y", "--tilt-x", "--tilt-y"])
          node.style.removeProperty(p);
      };
      on(node, "pointermove", move);
      on(node, "pointerleave", reset);
      return { destroy: reset };
    },
    "[data-lm-magnifier]"(node, on) {
      const view = node.querySelector(".magnifier-view"),
        zoom = node.querySelector("input[type=range]"),
        toggle = node.querySelector("button"),
        image = node.querySelector("img"),
        lens = node.querySelector(".magnifier-lens");
      let x = 50,
        y = 50;
      if (image)
        node.style.setProperty(
          "--magnifier-image",
          "url(" + JSON.stringify(image.currentSrc || image.src) + ")",
        );
      const update = () => {
        node.style.setProperty("--lens-x", x + "%");
        node.style.setProperty("--lens-y", y + "%");
        const rect = view.getBoundingClientRect(),
          size = lens.getBoundingClientRect(),
          factor = Number(zoom.value);
        const cx = clamp(
            (rect.width * x) / 100,
            size.width / 2,
            rect.width - size.width / 2,
          ),
          cy = clamp(
            (rect.height * y) / 100,
            size.height / 2,
            rect.height - size.height / 2,
          );
        node.style.setProperty("--lens-width", rect.width * factor + "px");
        node.style.setProperty("--lens-height", rect.height * factor + "px");
        node.style.setProperty(
          "--lens-bg-x",
          size.width / 2 - cx * factor + "px",
        );
        node.style.setProperty(
          "--lens-bg-y",
          size.height / 2 - cy * factor + "px",
        );
        node.querySelector("output").value = zoom.value + "×";
      };
      on(view, "pointermove", (e) => {
        const r = view.getBoundingClientRect();
        x = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
        y = clamp(((e.clientY - r.top) / r.height) * 100, 0, 100);
        update();
      });
      on(view, "keydown", (e) => {
        const dirs = {
          ArrowLeft: [-5, 0],
          ArrowRight: [5, 0],
          ArrowUp: [0, -5],
          ArrowDown: [0, 5],
        };
        if (dirs[e.key]) {
          e.preventDefault();
          x = clamp(x + dirs[e.key][0], 0, 100);
          y = clamp(y + dirs[e.key][1], 0, 100);
          update();
        }
      });
      on(zoom, "input", update);
      on(toggle, "click", () => {
        const active = toggle.getAttribute("aria-pressed") !== "true";
        toggle.setAttribute("aria-pressed", String(active));
        node.dataset.active = String(active);
      });
      const observer = new ResizeObserver(update);
      observer.observe(view);
      return { refresh: update, destroy: () => observer.disconnect() };
    },
    "[data-lm-count]"(node, on) {
      const input = node.querySelector("textarea,input"),
        output = node.querySelector("output"),
        status = node.querySelector("[role=status]");
      const update = () => {
        output.value = input.value.length + " / " + input.maxLength;
        node.dataset.limit = String(input.value.length >= input.maxLength);
        if (status)
          status.textContent =
            input.value.length >= input.maxLength
              ? "Character limit reached."
              : "";
      };
      on(input, "input", update);
      return { refresh: update };
    },
    "[data-lm-color]"(node, on) {
      const picker = node.querySelector("input[type=color]"),
        hex = node.querySelector("input[type=text]"),
        swatch = node.querySelector(".color-field-swatch");
      const update = () => (swatch.style.backgroundColor = picker.value);
      on(picker, "input", () => {
        hex.value = picker.value.toUpperCase();
        hex.setCustomValidity("");
        update();
        fire(node, "colorchange", { value: picker.value });
      });
      on(hex, "input", () => {
        const valid = /^#[0-9a-f]{6}$/i.test(hex.value);
        hex.setCustomValidity(
          valid ? "" : "Enter # followed by six hexadecimal digits.",
        );
        if (valid) {
          picker.value = hex.value;
          update();
          fire(node, "colorchange", { value: picker.value });
        }
      });
      return { refresh: update };
    },
    "[data-lm-payment-preview]"(node, on) {
      const number = node.querySelector("[name=card-number]"),
        name = node.querySelector("[name=card-name]"),
        expiry = node.querySelector("[name=card-expiry]");
      const update = () => {
        node.querySelector("[data-card-number]").textContent =
          number.value || "•••• •••• •••• ••••";
        node.querySelector("[data-card-name]").textContent =
          name.value || "YOUR NAME";
        node.querySelector("[data-card-expiry]").textContent =
          expiry.value || "MM/YY";
      };
      on(number, "input", () => {
        number.value = number.value
          .replace(/\D/g, "")
          .slice(0, 19)
          .replace(/(.{4})/g, "$1 ")
          .trim();
        update();
      });
      on(expiry, "input", () => {
        const v = expiry.value.replace(/\D/g, "").slice(0, 4);
        expiry.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v;
        update();
      });
      on(name, "input", update);
      return { refresh: update };
    },
    "input[data-lm-mask]"(input, on) {
      if (input.dataset.lmMask === "phone")
        on(input, "input", () => {
          const v = input.value.replace(/\D/g, "").slice(0, 10);
          input.value =
            v.length > 6
              ? "(" + v.slice(0, 3) + ") " + v.slice(3, 6) + "-" + v.slice(6)
              : v.length > 3
                ? "(" + v.slice(0, 3) + ") " + v.slice(3)
                : v;
        });
      else if (input.dataset.lmMask === "currency")
        on(input, "blur", () => {
          const text = input.value.replace(/[$,\s]/g, "");
          if (text !== "" && Number.isFinite(Number(text)))
            input.value = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(Number(text));
        });
      return {};
    },
    "[data-lm-meter]"(node, on) {
      const input = node.querySelector("input[type=range]"),
        meter = node.querySelector("meter"),
        output = node.querySelector("output");
      const update = () => {
        meter.value = Number(input.value);
        node.style.setProperty("--meter-value", input.value + "%");
        output.value = input.value + "%";
      };
      on(input, "input", update);
      return { refresh: update };
    },
    "[data-lm-signature]"(node, on) {
      const canvas = node.querySelector("canvas"),
        name = node.querySelector("input[type=text]"),
        value = node.querySelector("input[type=hidden]"),
        output = node.querySelector("output"),
        context = canvas.getContext("2d");
      let paths = [],
        active = null;
      try {
        const stored = JSON.parse(value.value || "{}");
        if (Array.isArray(stored.paths))
          paths = stored.paths
            .slice(0, 500)
            .filter(Array.isArray)
            .map((path) =>
              path
                .slice(0, 10000)
                .filter(
                  (point) =>
                    Array.isArray(point) &&
                    point.length === 2 &&
                    point.every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
                ),
            );
      } catch {}

      const paint = () => {
        const r = canvas.getBoundingClientRect(),
          dpr = Math.min(devicePixelRatio || 1, 3);
        if (!r.width || !r.height) return;
        canvas.width = Math.round(r.width * dpr);
        canvas.height = Math.round(r.height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.strokeStyle = getComputedStyle(node).color;
        context.fillStyle = context.strokeStyle;
        context.lineWidth = 2;
        context.lineCap = "round";
        context.lineJoin = "round";
        for (const path of paths) {
          context.beginPath();
          path.forEach(([x, y], i) =>
            i
              ? context.lineTo(x * r.width, y * r.height)
              : context.moveTo(x * r.width, y * r.height),
          );
          context.stroke();
        }
        if (!paths.length && name.value) {
          context.font = "italic 28px Georgia";
          context.direction = getComputedStyle(name).direction;
          context.textAlign = context.direction === "rtl" ? "right" : "left";
          context.fillText(
            name.value,
            context.direction === "rtl" ? r.width - 16 : 16,
            r.height / 2,
            Math.max(1, r.width - 32),
          );
        }
      };
      const publish = (changed = true) => {
        value.value = JSON.stringify({ name: name.value, paths });
        output.value = paths.length
          ? "Drawn signature captured."
          : name.value
            ? "Typed signature captured."
            : "Draw or type your signature.";
        if (changed) {
          value.dispatchEvent(
            new Event("input", { bubbles: true, composed: true }),
          );
          fire(node, "signaturechange", {
            name: name.value,
            paths: paths.map((p) => p.map((point) => [...point])),
          });
        }
      };
      const point = (e) => {
        const r = canvas.getBoundingClientRect();
        return [
          clamp((e.clientX - r.left) / r.width, 0, 1),
          clamp((e.clientY - r.top) / r.height, 0, 1),
        ];
      };
      on(canvas, "pointerdown", (e) => {
        if (e.button !== 0) return;
        active = [point(e)];
        paths.push(active);
        canvas.setPointerCapture(e.pointerId);
        paint();
      });
      on(canvas, "pointermove", (e) => {
        if (active) {
          active.push(point(e));
          paint();
        }
      });
      for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
        on(canvas, event, () => {
          if (active) {
            active = null;
            publish();
          }
        });
      on(name, "input", () => {
        paint();
        publish();
      });
      on(node.querySelector("[data-signature-clear]"), "click", () => {
        paths = [];
        active = null;
        name.value = "";
        paint();
        publish();
      });
      const observer = new ResizeObserver(paint);
      observer.observe(canvas);
      const themeObserver = new MutationObserver(paint);
      for (
        let scope = node;
        scope;
        scope = scope.parentElement || scope.getRootNode().host
      )
        themeObserver.observe(scope, {
          attributes: true,
          attributeFilter: ["data-theme", "style", "class"],
        });
      publish(false);
      return {
        refresh: paint,
        destroy: () => {
          observer.disconnect();
          themeObserver.disconnect();
        },
      };
    },
  };
  function mount(root) {
    const held = new Map();
    const release = (node) => {
      const state = held.get(node);
      if (state && !--state.refs) {
        state.controller.abort();
        state.api.destroy?.();
        instances.delete(node);
      }
      held.delete(node);
    };
    const lifecycle = new AbortController();
    root.addEventListener(
      "reset",
      () =>
        queueMicrotask(() => {
          for (const state of held.values()) state.api.refresh?.();
        }),
      { signal: lifecycle.signal },
    );
    return {
      refresh() {
        for (const node of held.keys()) if (!root.contains(node)) release(node);
        for (const [selector, initialize] of Object.entries(setup))
          for (const node of root.querySelectorAll(selector)) {
            if (held.has(node)) {
              held.get(node).api.refresh?.();
              continue;
            }
            let state = instances.get(node);
            if (!state) {
              const controller = new AbortController(),
                on = (target, type, handler) =>
                  target.addEventListener(type, handler, {
                    signal: controller.signal,
                  });
              state = { refs: 0, controller, api: initialize(node, on) };
              instances.set(node, state);
            }
            state.refs++;
            held.set(node, state);
            state.api.refresh?.();
          }
      },
      destroy() {
        lifecycle.abort();
        for (const node of [...held.keys()]) release(node);
      },
    };
  }
  global.LumenWidgets = Object.freeze({ mount });
})(window);

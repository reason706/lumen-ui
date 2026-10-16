/* Lumen public interaction layer. Mount once per Document or ShadowRoot. */
(function (global) {
  "use strict";
  const mounts = new WeakMap();
  let seq = 0;
  const closest = (event, selector) =>
    event.composedPath().find((n) => n?.matches?.(selector));
  function mount(root = document) {
    if (mounts.has(root)) {
      const existing = mounts.get(root);
      existing.refresh();
      return existing;
    }
    const abort = new AbortController(),
      cleanups = [],
      timers = new Set(),
      dialogs = new WeakSet(),
      responsive = new WeakSet(),
      busyButtons = new Map();
    const on = (type, fn) =>
      root.addEventListener(
        type,
        (event) => {
          // The nearest mounted root owns actions. Outer roots still dismiss overlays.
          if (!["pointerdown", "focusin"].includes(type)) {
            for (const node of event.composedPath()) {
              if (node === root) break;
              if (mounts.has(node)) return;
            }
          }
          fn(event);
        },
        { signal: abort.signal },
      );
    const query = (id) =>
      id ? root.querySelector("#" + CSS.escape(id)) : null;
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };
    const emit = (el, name, detail = {}) =>
      el.dispatchEvent(
        new CustomEvent("lumen:" + name, {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
    function toast(message, options = {}) {
      let region = root.querySelector(":is(.lm-toast-region,.toast-region)");
      if (!region) {
        region = document.createElement("div");
        region.className = "toast-region lumen";
        region.setAttribute("aria-label", "Notifications");
        (root.body || root).append(region);
        cleanups.push(() => region.remove());
      }
      const el = document.createElement("div");
      el.className = "toast";
      el.setAttribute(
        "role",
        options.politeness === "assertive" ? "alert" : "status",
      );
      const text = document.createElement("span");
      text.textContent = message;
      const close = document.createElement("button");
      close.className = "btn btn-icon btn-style-ghost";
      close.type = "button";
      close.textContent = "×";
      close.setAttribute("aria-label", "Dismiss notification");
      let remaining =
          Number.isFinite(options.duration) && options.duration >= 0
            ? options.duration
            : 5000,
        started = 0,
        timer = null,
        hover = false;
      const stop = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timers.delete(timer);
          remaining = Math.max(0, remaining - (Date.now() - started));
          timer = null;
        }
      };
      const dismiss = () => {
        stop();
        el.remove();
      };
      const resume = () => {
        if (
          !remaining ||
          hover ||
          el.contains(root.activeElement || document.activeElement) ||
          !el.isConnected
        )
          return;
        started = Date.now();
        timer = later(dismiss, remaining);
      };
      el.addEventListener(
        "pointerenter",
        () => {
          hover = true;
          stop();
        },
        { signal: abort.signal },
      );
      el.addEventListener(
        "pointerleave",
        () => {
          hover = false;
          resume();
        },
        { signal: abort.signal },
      );
      el.addEventListener("focusin", stop, { signal: abort.signal });
      el.addEventListener("focusout", () => queueMicrotask(resume), {
        signal: abort.signal,
      });
      close.onclick = dismiss;
      el.append(text);
      if (options.action) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = "btn btn-style-ghost";
        action.textContent = options.action.label;
        action.onclick = async () => {
          try {
            await options.action.run();
            dismiss();
          } catch (error) {
            text.textContent = error.message;
            el.setAttribute("role", "alert");
          }
        };
        el.append(action);
      }
      el.append(close);
      region.append(el);
      resume();
      return el;
    }
    function positionMenu(drop) {
      const button = drop.querySelector("[data-lm-menu-toggle]"),
        menu = drop.querySelector("[role=menu]");
      if (!button || !menu || menu.hidden) return;
      const rect = button.getBoundingClientRect(),
        size = menu.getBoundingClientRect(),
        rtl = getComputedStyle(drop).direction === "rtl",
        gap = 6;
      const x = Math.max(
        8,
        Math.min(
          innerWidth - size.width - 8,
          rtl ? rect.right - size.width : rect.left,
        ),
      );
      const below = innerHeight - rect.bottom - gap,
        above = rect.top - gap;
      const upward = below < Math.min(size.height, 180) && above > below;
      const y = upward
        ? Math.max(8, rect.top - size.height - gap)
        : rect.bottom + gap;
      Object.assign(menu.style, {
        position: "fixed",
        margin: "0",
        inset: "auto",
        left: x + "px",
        top: y + "px",
        maxHeight: Math.max(80, (upward ? above : below) - 8) + "px",
      });
    }
    function openMenu(drop, focus = false) {
      const button = drop.querySelector("[data-lm-menu-toggle]"),
        menu = drop.querySelector("[role=menu]");
      if (!menu) return;
      menu.hidden = false;
      button?.setAttribute("aria-expanded", "true");
      if (menu.showPopover) {
        menu.setAttribute("popover", "manual");
        if (!menu.matches(":popover-open")) menu.showPopover();
      }
      positionMenu(drop);
      if (focus)
        menu
          .querySelector(
            "[role=menuitem]:not(:disabled):not([aria-disabled=true])",
          )
          ?.focus();
    }
    function closeMenu(drop, focus = false) {
      const button = drop.querySelector("[data-lm-menu-toggle]"),
        menu = drop.querySelector("[role=menu]");
      if (menu) {
        if (menu.hidePopover && menu.matches(":popover-open"))
          menu.hidePopover();
        menu.hidden = true;
      }
      button?.setAttribute("aria-expanded", "false");
      if (focus) button?.focus();
    }
    const menus = () => root.querySelectorAll(".dropdown,.lm-dropdown");
    const reposition = () => menus().forEach(positionMenu);
    global.addEventListener("resize", reposition, { signal: abort.signal });
    root.addEventListener("scroll", reposition, {
      capture: true,
      signal: abort.signal,
    });
    cleanups.push(() => menus().forEach((drop) => closeMenu(drop)));
    function selectTab(tab) {
      const list = tab.closest("[role=tablist]");
      if (tab.dataset.lmRadio) {
        const radio = query(tab.dataset.lmRadio);
        if (radio) radio.checked = true;
      }
      list.querySelectorAll("[role=tab]").forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", selected);
        t.tabIndex = selected ? 0 : -1;
        const panel = query(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      emit(tab, "tabchange", { id: tab.id });
    }
    function carousel(el, step) {
      const slides = [...el.querySelectorAll("[data-lm-slide]")];
      if (!slides.length) return;
      let index = slides.findIndex((s) => !s.hidden);
      index = (index + step + slides.length) % slides.length;
      slides.forEach((s, i) => (s.hidden = i !== index));
      const out = el.querySelector("[data-lm-slide-count]");
      if (out) out.textContent = index + 1 + " / " + slides.length;
      emit(el, "slide", { index });
    }
    function busy(button, value = true) {
      if (value && !busyButtons.has(button)) {
        busyButtons.set(button, {
          disabled: button.disabled,
          busy: button.getAttribute("aria-busy"),
        });
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
      } else if (!value && busyButtons.has(button)) {
        const state = busyButtons.get(button);
        button.disabled = state.disabled;
        if (state.busy === null) button.removeAttribute("aria-busy");
        else button.setAttribute("aria-busy", state.busy);
        busyButtons.delete(button);
      }
    }
    function syncSelection(table) {
      const all = table.querySelector("thead [data-lm-select-all]");
      if (all) {
        const visible = [
          ...table.querySelectorAll(
            "tbody tr:not([hidden]) input[type=checkbox]",
          ),
        ];
        all.checked = visible.length > 0 && visible.every((c) => c.checked);
        all.indeterminate = visible.some((c) => c.checked) && !all.checked;
      }
    }
    function pageTable(table, reset = false) {
      if (!table) return;
      const filters = [
        ...root.querySelectorAll(
          '[data-lm-filter="' + CSS.escape(table.id) + '"]',
        ),
      ];
      const group = root.querySelector(
        '[data-lm-pagination][data-lm-table="' + CSS.escape(table.id) + '"]',
      );
      const rows = [...table.tBodies[0].rows],
        matches = rows.filter((r) =>
          filters.every((filter) => {
            const column = filter.dataset.lmFilterColumn;
            const text =
              column === undefined
                ? r.textContent
                : r.cells[Number(column)]?.textContent || "";
            return text
              .toLowerCase()
              .includes(filter.value.trim().toLowerCase());
          }),
        ),
        size = Number(group?.dataset.lmPageSize) || matches.length || 1;
      const pages = Math.max(1, Math.ceil(matches.length / size));
      let page = Math.max(
        1,
        Math.min(pages, reset ? 1 : Number(table.dataset.lmCurrentPage) || 1),
      );
      table.dataset.lmCurrentPage = page;
      rows.forEach((r) => (r.hidden = true));
      matches
        .slice((page - 1) * size, page * size)
        .forEach((r) => (r.hidden = false));
      if (group) {
        group.querySelectorAll("[data-lm-page]").forEach((b) => {
          const n = b.dataset.lmPage;
          b.disabled =
            (n === "previous" && page === 1) ||
            (n === "next" && page === pages);
          if (Number(n) === page) b.setAttribute("aria-current", "page");
          else b.removeAttribute("aria-current");
        });
        const out = group.querySelector("output");
        if (out)
          out.textContent =
            "Page " +
            page +
            " of " +
            pages +
            " · " +
            matches.length +
            " results";
      }
      syncSelection(table);
    }
    on("pointerdown", (e) => {
      root.querySelectorAll(".dropdown,.lm-dropdown").forEach((drop) => {
        if (!e.composedPath().includes(drop)) closeMenu(drop);
      });
      root.querySelectorAll(".combobox,.lm-combobox").forEach((combo) => {
        if (!e.composedPath().includes(combo)) {
          const input = combo.querySelector("[role=combobox]"),
            list = combo.querySelector("[role=listbox]");
          if (input && list) {
            list.hidden = true;
            input.setAttribute("aria-expanded", "false");
            input.removeAttribute("aria-activedescendant");
          }
        }
      });
    });
    on("click", (e) => {
      if (
        closest(
          e,
          "button:disabled,[aria-disabled=true],button[aria-busy=true],a[aria-busy=true]",
        )
      ) {
        e.preventDefault();
        return;
      }
      const download = closest(e, "[data-lm-download]");
      if (download) {
        const table = query(download.dataset.lmDownload);
        if (table) {
          const csv = [...table.querySelectorAll("tr:not([hidden])")]
              .map((row) =>
                [...row.cells]
                  .map(
                    (cell) =>
                      '"' + cell.textContent.trim().replaceAll('"', '""') + '"',
                  )
                  .join(","),
              )
              .join("\r\n"),
            url = URL.createObjectURL(
              new Blob([csv], { type: "text/csv;charset=utf-8" }),
            ),
            link = document.createElement("a");
          link.href = url;
          link.download = (table.id || "table") + ".csv";
          link.click();
          later(() => URL.revokeObjectURL(url), 1000);
          emit(table, "download");
        }
        return;
      }
      const remove = closest(e, "[data-lm-remove]");
      if (remove) {
        const target = query(remove.dataset.lmRemove);
        if (target) {
          target.hidden = true;
          toast("Item removed", {
            duration: 0,
            action: {
              label: "Undo",
              run: () => {
                target.hidden = false;
                remove.focus();
              },
            },
          });
          emit(target, "remove");
        }
        return;
      }

      const stepButton = closest(e, "[data-lm-step-next],[data-lm-step-back]");
      if (stepButton) {
        const form = stepButton.closest("[data-lm-steps]");
        const steps = [...form.querySelectorAll("[data-lm-step]")];
        const index = steps.findIndex((step) => !step.hidden);
        if (stepButton.hasAttribute("data-lm-step-next")) {
          const invalid = validate(steps[index]);
          if (invalid) {
            invalid.focus();
            return;
          }
        }
        const next =
          index + (stepButton.hasAttribute("data-lm-step-next") ? 1 : -1);
        if (next < 0 || next >= steps.length) return;
        steps.forEach((step, i) => {
          step.hidden = i !== next;
          step.disabled = i !== next;
        });
        form.querySelector("[data-lm-step-status]").textContent =
          "Step " + (next + 1) + " of " + steps.length;
        steps[next].querySelector("input,select,textarea,button")?.focus();
        emit(form, "step", { index: next });
        return;
      }
      const tab = closest(e, "[role=tab]");
      if (tab && !tab.hasAttribute("data-inspect")) {
        selectTab(tab);
        return;
      }
      const legacyStep = closest(e, "[data-lm-legacy-step]");
      if (legacyStep) {
        const out = legacyStep.parentElement.querySelector("b");
        if (out) {
          const value = parseFloat(out.textContent) || 0;
          out.textContent = out.textContent.replace(
            /-?\d+(?:\.\d+)?/,
            String(
              Math.max(0, value + Number(legacyStep.dataset.lmLegacyStep)),
            ),
          );
        }
        return;
      }
      const legacyDismiss = closest(e, "[data-lm-legacy-dismiss]");
      if (legacyDismiss) {
        const check = query(legacyDismiss.dataset.lmLegacyDismiss);
        if (check) check.checked = true;
        return;
      }
      const menuToggle = closest(e, "[data-lm-menu-toggle]");
      root.querySelectorAll(":is(.lm-dropdown,.dropdown)").forEach((d) => {
        if (
          d !== menuToggle?.closest(":is(.lm-dropdown,.dropdown)") &&
          !e.composedPath().includes(d)
        )
          closeMenu(d);
      });
      if (menuToggle) {
        const d = menuToggle.closest(":is(.lm-dropdown,.dropdown)"),
          m = d?.querySelector("[role=menu]");
        if (!m) return;
        if (m.hidden) openMenu(d, true);
        else closeMenu(d, true);
        return;
      }
      const menuItem = closest(e, "[role=menuitem]");
      if (menuItem) {
        const d = menuItem.closest(":is(.lm-dropdown,.dropdown)");
        if (d) closeMenu(d, true);
        emit(menuItem, "action", { value: menuItem.textContent.trim() });
        return;
      }
      const opener = closest(e, "[data-lm-dialog]");
      if (opener) {
        const dialog = query(opener.dataset.lmDialog);
        if (dialog?.showModal) {
          dialog._lmOpener = opener;
          dialog.showModal();
          emit(dialog, "open");
        }
        return;
      }
      const close = closest(e, "[data-lm-close]");
      if (close) {
        const dialog = close.closest("dialog");
        if (dialog) dialog.close();
        if (close.dataset.lmToast) toast(close.dataset.lmToast);
        return;
      }
      const dismiss = closest(e, "[data-lm-dismiss]");
      if (dismiss) {
        const target = dismiss.closest(
          ":is(.lm-alert,.alert),:is(.lm-toast,.toast),:is(.lm-chip,.chip)",
        );
        if (target) {
          target.hidden = true;
          emit(target, "dismiss");
        }
        return;
      }
      const toggle = closest(e, "[data-lm-toggle]");
      if (toggle) {
        toggle.setAttribute(
          "aria-pressed",
          String(toggle.getAttribute("aria-pressed") !== "true"),
        );
        emit(toggle, "toggle", {
          pressed: toggle.getAttribute("aria-pressed") === "true",
        });
        return;
      }
      const toastBtn = closest(e, "[data-lm-toast]");
      if (toastBtn) {
        toast(toastBtn.dataset.lmToast);
        return;
      }
      const collapse = closest(e, "[data-lm-collapse]");
      if (collapse) {
        const target = query(collapse.dataset.lmCollapse);
        if (target) {
          target.hidden = !target.hidden;
          collapse.setAttribute("aria-expanded", String(!target.hidden));
          emit(target, "collapse", { open: !target.hidden });
        }
        return;
      }
      const stepper = closest(e, "[data-lm-step]");
      if (stepper) {
        const input = stepper
          .closest("[data-lm-stepper]")
          .querySelector("input");
        if (stepper.dataset.lmStep === "up") input.stepUp();
        else input.stepDown();
        input.dispatchEvent(
          new Event("input", { bubbles: true, composed: true }),
        );
        return;
      }
      const pager = closest(e, "[data-lm-page]");
      if (pager) {
        const group = pager.closest("[data-lm-pagination]");
        if (group.dataset.lmTable) {
          const table = query(group.dataset.lmTable),
            current = Number(table.dataset.lmCurrentPage) || 1;
          table.dataset.lmCurrentPage =
            pager.dataset.lmPage === "next"
              ? current + 1
              : pager.dataset.lmPage === "previous"
                ? current - 1
                : Number(pager.dataset.lmPage);
          pageTable(table);
          emit(group, "page", { page: Number(table.dataset.lmCurrentPage) });
          return;
        }
        group.querySelectorAll("[data-lm-page]").forEach((b) => {
          if (b === pager) b.setAttribute("aria-current", "page");
          else b.removeAttribute("aria-current");
        });
        const out = group.querySelector("output");
        if (out) out.textContent = "Page " + pager.dataset.lmPage;
        emit(group, "page", { page: Number(pager.dataset.lmPage) });
        return;
      }
      const slide = closest(e, "[data-lm-slide-step]");
      if (slide) {
        carousel(
          slide.closest(":is(.lm-carousel,.carousel)"),
          Number(slide.dataset.lmSlideStep),
        );
        return;
      }
      const sort = closest(e, "[data-lm-sort]");
      if (sort) {
        const th = sort.closest("th"),
          table = th.closest("table"),
          body = table.tBodies[0],
          index = th.cellIndex;
        const ascending = th.getAttribute("aria-sort") !== "ascending";
        table
          .querySelectorAll("th[aria-sort]")
          .forEach((t) => t.setAttribute("aria-sort", "none"));
        th.setAttribute("aria-sort", ascending ? "ascending" : "descending");
        [...body.rows]
          .sort(
            (a, b) =>
              a.cells[index].textContent
                .trim()
                .localeCompare(b.cells[index].textContent.trim(), undefined, {
                  numeric: true,
                }) * (ascending ? 1 : -1),
          )
          .forEach((row) => body.append(row));
        if (
          root.querySelector('[data-lm-table="' + CSS.escape(table.id) + '"]')
        )
          pageTable(table);
        emit(table, "sort", { index, ascending });
        return;
      }
      const option = closest(e, "[data-lm-option]");
      if (option) {
        const combo = option.closest(":is(.lm-combobox,.combobox)"),
          input = combo.querySelector("[role=combobox]");
        input.value = option.textContent.trim();
        input.dataset.value = option.dataset.lmOption;
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        combo.querySelector("[role=listbox]").hidden = true;
        input.focus();
        emit(input, "select", { value: option.dataset.lmOption });
        return;
      }
      const copy = closest(e, "[data-lm-copy]");
      if (copy) {
        const target = query(copy.dataset.lmCopy);
        if (target)
          global.LumenUI.copy(target.textContent)
            .then(() => toast("Copied"))
            .catch(() => toast("Clipboard unavailable"));
        return;
      }
      const uploadRemove = closest(e, "[data-lm-upload-remove]");
      if (uploadRemove) {
        const wrap = uploadRemove.closest("[data-lm-upload]");
        wrap.querySelector("input").value = "";
        wrap.querySelector("input").setCustomValidity("");
        wrap.querySelector("input").removeAttribute("aria-invalid");
        wrap.querySelector("output").textContent = "No files selected";
        return;
      }
    });
    on("keydown", (e) => {
      const legacyButton = closest(e, "[data-lm-legacy-dismiss]");
      if (legacyButton && ["Enter", " "].includes(e.key)) {
        e.preventDefault();
        legacyButton.click();
        return;
      }
      const tab = closest(e, "[role=tab]");
      if (
        tab &&
        [
          "ArrowRight",
          "ArrowLeft",
          "ArrowDown",
          "ArrowUp",
          "Home",
          "End",
        ].includes(e.key)
      ) {
        e.preventDefault();
        const list = tab.closest("[role=tablist]"),
          vertical = list.getAttribute("aria-orientation") === "vertical";
        if (
          (vertical && ["ArrowRight", "ArrowLeft"].includes(e.key)) ||
          (!vertical && ["ArrowUp", "ArrowDown"].includes(e.key))
        )
          return;
        const tabs = [
          ...list.querySelectorAll(
            "[role=tab]:not(:disabled):not([aria-disabled=true])",
          ),
        ];
        let i = tabs.indexOf(tab);
        const rtl = getComputedStyle(tab).direction === "rtl";
        if (e.key === "Home") i = 0;
        else if (e.key === "End") i = tabs.length - 1;
        else
          i =
            (i +
              (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1) *
                (rtl && ["ArrowRight", "ArrowLeft"].includes(e.key) ? -1 : 1) +
              tabs.length) %
            tabs.length;
        tabs[i].focus();
        selectTab(tabs[i]);
        return;
      }
      const drop = closest(e, ":is(.lm-dropdown,.dropdown)");
      if (drop) {
        const menu = drop.querySelector("[role=menu]");
        if (!menu) return;
        const items = [
          ...menu.querySelectorAll(
            "[role=menuitem]:not(:disabled):not([aria-disabled=true])",
          ),
        ];
        if (e.key === "Tab") {
          closeMenu(drop);
          return;
        }
        if (e.key === "Escape") {
          closeMenu(drop, true);
          e.preventDefault();
        } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          openMenu(drop);
          let i = items.indexOf(e.composedPath()[0]);
          i =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? items.length - 1
                : i < 0
                  ? e.key === "ArrowDown"
                    ? 0
                    : items.length - 1
                  : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                    items.length;
          items[i]?.focus();
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now(),
            previous = drop._lumenSearch;
          const term =
            (previous && now - previous.time < 600 ? previous.term : "") +
            e.key.toLowerCase();
          drop._lumenSearch = { term, time: now };
          const target = items.find((item) =>
            item.textContent.trim().toLowerCase().startsWith(term),
          );
          if (target) {
            e.preventDefault();
            openMenu(drop);
            target.focus();
          }
        }
        return;
      }
      const combo = closest(e, ":is(.lm-combobox,.combobox)");
      if (combo) {
        const input = combo.querySelector("[role=combobox]"),
          list = combo.querySelector("[role=listbox]"),
          options = [...list.querySelectorAll("[role=option]")].filter(
            (o) => !o.hidden,
          );
        if (e.key === "Escape") {
          if (!list.hidden) e.preventDefault();
          list.hidden = true;
          input.setAttribute("aria-expanded", "false");
          input.removeAttribute("aria-activedescendant");
        } else if (
          ["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(e.key)
        ) {
          const id = input.getAttribute("aria-activedescendant");
          let i = options.findIndex((o) => o.id === id);
          if (e.key === "Enter") {
            if (i >= 0 && !list.hidden) {
              e.preventDefault();
              options[i].click();
            }
          } else {
            e.preventDefault();
            list.hidden = false;
            input.setAttribute("aria-expanded", "true");
            i =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? options.length - 1
                  : (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                    options.length;
            options.forEach((o, n) =>
              o.setAttribute("aria-selected", String(n === i)),
            );
            if (options[i]) {
              input.setAttribute("aria-activedescendant", options[i].id);
              options[i].scrollIntoView({ block: "nearest" });
            }
          }
        }
        return;
      }
      if (e.key === "Escape")
        root.querySelectorAll("[popover]").forEach((el) => {
          if (el.matches(":popover-open")) el.hidePopover();
        });
    });
    on("focusout", (e) => {
      const drop = closest(e, ":is(.lm-dropdown,.dropdown)");
      if (drop && !drop.contains(e.relatedTarget)) closeMenu(drop);
      const combo = closest(e, ":is(.lm-combobox,.combobox)");
      if (combo && !combo.contains(e.relatedTarget)) {
        const input = combo.querySelector("[role=combobox]");
        combo.querySelector("[role=listbox]").hidden = true;
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
      }
    });
    on("input", (e) => {
      const input = e.composedPath()[0];
      if (
        input.hasAttribute?.("aria-invalid") &&
        input.closest("[data-lm-validate]")
      ) {
        if (!input.willValidate) return;
        const valid = input.checkValidity();
        input.setAttribute("aria-invalid", String(!valid));
        if (
          !valid &&
          !input
            .getAttribute("aria-describedby")
            ?.split(/\s+/)
            .some((id) => query(id)?.matches(".input-error,.lm-error"))
        ) {
          const field = input.closest(".field,.lm-field");
          if (field) {
            const error = document.createElement("span");
            error.className = "input-error";
            error.id = "lumen-error-" + ++seq;
            error.hidden = true;
            field.append(error);
            input.setAttribute(
              "aria-describedby",
              (
                (input.getAttribute("aria-describedby") || "") +
                " " +
                error.id
              ).trim(),
            );
          }
        }
        for (const id of (input.getAttribute("aria-describedby") || "").split(
          /\s+/,
        )) {
          const error = query(id);
          if (error?.matches(".input-error,.lm-error")) {
            error.textContent = valid ? "" : input.validationMessage;
            error.hidden = valid;
          }
        }
      }
      const validated = input.closest?.("[data-lm-validate]");
      if (validated?.querySelector("[data-lm-error-summary]:not([hidden])"))
        validationSummary(validated);
      if (input.matches?.("[data-lm-compare]")) {
        const target = query(input.dataset.lmCompare);
        target?.style.setProperty("--lm-compare", input.value + "%");
      }
      if (input.matches?.("[data-lm-dual]")) {
        const wrap = input.closest("[data-lm-range]"),
          low = wrap.querySelector("[data-lm-dual=low]"),
          high = wrap.querySelector("[data-lm-dual=high]");
        if (Number(low.value) > Number(high.value)) {
          if (input === low) low.value = high.value;
          else high.value = low.value;
        }
        const out = wrap.querySelector("output");
        if (out) out.textContent = low.value + " – " + high.value;
      }
      if (input.matches?.("[data-lm-output]")) {
        const out = query(input.dataset.lmOutput);
        if (out) out.textContent = input.value;
      }
      if (input.matches?.("[role=combobox]")) {
        const list = input
          .closest(":is(.lm-combobox,.combobox)")
          .querySelector("[role=listbox]");
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
        input.removeAttribute("aria-activedescendant");
        list.querySelectorAll("[role=option]").forEach((o) => {
          o.hidden = !o.textContent
            .toLowerCase()
            .includes(input.value.toLowerCase());
          o.setAttribute("aria-selected", "false");
        });
      }
      if (input.matches?.("[data-lm-filter]"))
        pageTable(query(input.dataset.lmFilter), true);
      if (input.matches?.("[data-lm-markdown]")) {
        const out = query(input.dataset.lmMarkdown);
        if (out) {
          out.replaceChildren();
          input.value.split("\n").forEach((line) => {
            const h = /^(#{1,3})\s+(.*)/.exec(line);
            const el = document.createElement(h ? "h" + h[1].length : "p");
            el.textContent = h ? h[2] : line;
            out.append(el);
          });
        }
      }
      if (input.matches?.("[data-lm-password]")) {
        const out = query(input.dataset.lmPassword);
        if (out) {
          const v = input.value,
            score = [
              v.length >= 8,
              /[A-Z]/.test(v),
              /[0-9]/.test(v),
              /[^a-zA-Z0-9]/.test(v),
            ].filter(Boolean).length;
          out.value = score;
          out.setAttribute(
            "aria-label",
            "Password strength " + score + " of 4",
          );
        }
      }
    });
    on("change", (e) => {
      const input = e.composedPath()[0];
      if (input.matches?.("[data-lm-filter]"))
        pageTable(query(input.dataset.lmFilter), true);
      if (input.matches?.("[data-lm-tree-parent]")) {
        const branch = input.closest("li");
        branch.querySelectorAll("input[type=checkbox]").forEach((c) => {
          c.checked = input.checked;
          c.indeterminate = false;
        });
      }
      const tree = input.closest?.("[data-lm-tree]");
      if (tree) {
        const parent = tree.querySelector("[data-lm-tree-parent]"),
          leaves = [
            ...tree.querySelectorAll(
              "input[type=checkbox]:not([data-lm-tree-parent])",
            ),
          ];
        parent.checked = leaves.every((c) => c.checked);
        parent.indeterminate = !parent.checked && leaves.some((c) => c.checked);
      }
      if (input.matches?.("[data-lm-date-start]")) {
        const end = query(input.dataset.lmDateStart);
        if (end) {
          end.min = input.value;
          if (end.value && end.value < input.value) end.value = input.value;
        }
      }
      if (input.matches?.("[data-lm-select-all]")) {
        query(input.dataset.lmSelectAll)
          ?.querySelectorAll("tbody tr:not([hidden]) input[type=checkbox]")
          .forEach((c) => (c.checked = input.checked));
      }
      const table = input.closest?.("table");
      if (table?.id) {
        if (
          root.querySelector('[data-lm-table="' + CSS.escape(table.id) + '"]')
        )
          pageTable(table);
        else syncSelection(table);
        emit(table, "selection", {
          count: table.querySelectorAll("tbody input[type=checkbox]:checked")
            .length,
        });
      }
      if (input.matches?.("[type=file]")) {
        const wrap = input.closest("[data-lm-upload]");
        if (wrap) {
          const limit = Number(input.dataset.lmMaxSize) || Infinity;
          const oversized = [...input.files].some((file) => file.size > limit);
          input.setCustomValidity(
            oversized
              ? "Each file must be no larger than " +
                  Math.round(limit / 1024) +
                  " KB."
              : "",
          );
          input.setAttribute("aria-invalid", String(oversized));
          wrap.querySelector("output").textContent = oversized
            ? input.validationMessage
            : [...input.files]
                .map((f) => f.name + " (" + Math.ceil(f.size / 1024) + " KB)")
                .join(", ") || "No files selected";
        }
      }
    });
    function validationSummary(form) {
      if (!form?.matches("[data-lm-validate]")) return;
      let summary = form.querySelector("[data-lm-error-summary]");
      if (!summary) {
        summary = document.createElement("div");
        summary.dataset.lmErrorSummary = "";
        summary.setAttribute("role", "alert");
        summary.hidden = true;
        form.prepend(summary);
      }
      const invalid = [...form.querySelectorAll("[aria-invalid=true]")].filter(
        (input) => !input.disabled && !input.closest("fieldset:disabled"),
      );
      summary.replaceChildren();
      summary.hidden = !invalid.length;
      if (!invalid.length) return;
      const title = document.createElement("strong");
      title.textContent =
        "Please check " +
        invalid.length +
        " field" +
        (invalid.length === 1 ? "" : "s") +
        ".";
      const list = document.createElement("ul");
      for (const input of invalid) {
        input.id ||= "lumen-field-" + ++seq;
        const li = document.createElement("li"),
          link = document.createElement("a");
        link.href = "#" + input.id;
        const label = input.labels?.[0];
        link.textContent =
          label?.querySelector(".input-label,.lm-label")?.textContent ||
          input.getAttribute("aria-label") ||
          input.name ||
          "Field";
        link.onclick = (event) => {
          event.preventDefault();
          input.focus();
        };
        li.append(link);
        list.append(li);
      }
      summary.append(title, list);
    }
    function validate(container) {
      let first = null;
      container.querySelectorAll("input,select,textarea").forEach((input) => {
        if (!input.willValidate) return;
        const valid = input.checkValidity();
        input.setAttribute("aria-invalid", String(!valid));
        if (
          !valid &&
          !input
            .getAttribute("aria-describedby")
            ?.split(/\s+/)
            .some((id) => query(id)?.matches(".input-error,.lm-error"))
        ) {
          const field = input.closest(".field,.lm-field");
          if (field) {
            const error = document.createElement("span");
            error.className = "input-error";
            error.id = "lumen-error-" + ++seq;
            error.hidden = true;
            field.append(error);
            input.setAttribute(
              "aria-describedby",
              (
                (input.getAttribute("aria-describedby") || "") +
                " " +
                error.id
              ).trim(),
            );
          }
        }
        const errors = (input.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .map(query)
          .filter((error) => error?.matches(".lm-error,.input-error"));
        for (const error of errors) {
          error.textContent = valid ? "" : input.validationMessage;
          error.hidden = valid;
        }
        if (!valid && !first) first = input;
      });
      validationSummary(
        container.matches("form") ? container : container.closest("form"),
      );
      return first;
    }
    on("submit", (e) => {
      const form = closest(e, "[data-lm-validate]");
      if (!form) return;
      e.preventDefault();
      if (form.dataset.state === "loading") return;
      const steps = [...form.querySelectorAll("[data-lm-step]")];
      steps.forEach((step) => (step.disabled = false));
      const first = validate(form);
      if (first && steps.length) {
        steps.forEach((step) => {
          step.hidden = !step.contains(first);
          step.disabled = step.hidden;
        });
        form.querySelector("[data-lm-step-status]").textContent =
          "Step " +
          (steps.findIndex((step) => !step.hidden) + 1) +
          " of " +
          steps.length;
      }
      if (first) first.focus();
      else {
        const data = new FormData(form);
        const payload = Object.fromEntries(
          [...new Set(data.keys())].map((key) => {
            const values = data.getAll(key);
            return [key, values.length === 1 ? values[0] : values];
          }),
        );
        emit(form, "submit", payload);
        steps.forEach((step) => (step.disabled = step.hidden));
        if (form.hasAttribute("data-lm-managed")) return;
        const status = form.querySelector("[data-lm-form-status]");
        if (status) status.textContent = "Details validated. Ready to submit.";
        const dialog = query(form.dataset.lmSuccessDialog);
        if (dialog?.showModal) {
          dialog._lmOpener = e.submitter;
          dialog.showModal();
        } else toast("Form validated successfully.");
      }
    });
    on("reset", (e) => {
      const form = e.composedPath()[0];
      const summary = form.querySelector("[data-lm-error-summary]");
      if (summary) {
        summary.hidden = true;
        summary.replaceChildren();
      }
      form
        .querySelectorAll("[type=file]")
        .forEach((input) => input.setCustomValidity(""));
      form
        .querySelectorAll("[data-lm-form-status]")
        .forEach((output) => (output.textContent = ""));
      if (form.matches("[data-lm-upload]"))
        form.querySelector("output").textContent = "No files selected";
      const steps = [...form.querySelectorAll("[data-lm-step]")];
      steps.forEach((step, i) => {
        step.hidden = i !== 0;
        step.disabled = i !== 0;
      });
      const status = form.querySelector("[data-lm-step-status]");
      if (status) status.textContent = "Step 1 of " + steps.length;
      form
        .querySelectorAll("[aria-invalid]")
        .forEach((n) => n.removeAttribute("aria-invalid"));
      form.querySelectorAll(".input-error,.lm-error").forEach((n) => {
        n.textContent = "";
        n.hidden = true;
      });
    });
    function refresh() {
      prepare(root);
      root
        .querySelectorAll("[data-lm-collapse][data-lm-responsive]")
        .forEach((button) => {
          if (responsive.has(button)) return;
          responsive.add(button);
          let previousNarrow;
          const media = matchMedia(
              "(max-width:" +
                (global.LumenTokens?.breakpoints.md || "48rem") +
                ")",
            ),
            host = root.host,
            sync = () => {
              const target = query(button.dataset.lmCollapse);
              if (target) {
                const narrow = host
                  ? host.clientWidth <=
                    parseFloat(global.LumenTokens?.breakpoints.md || "48rem") *
                      parseFloat(
                        getComputedStyle(document.documentElement).fontSize,
                      )
                  : media.matches;
                if (previousNarrow === narrow) return;
                previousNarrow = narrow;
                target.hidden = narrow;
                button.setAttribute("aria-expanded", String(!narrow));
              }
            };
          sync();
          if (host && global.ResizeObserver) {
            const observer = new ResizeObserver(sync);
            observer.observe(host);
            cleanups.push(() => observer.disconnect());
          }
          media.addEventListener("change", sync);
          cleanups.push(() => media.removeEventListener("change", sync));
        });
      // Adapt existing native demo controls without changing their visual classes.
      root.querySelectorAll(":is(.tabs,.tabs-native)").forEach((tabs) => {
        const list = tabs.querySelector(":is(.tl,.tabs-list-native)");
        if (!list) return;
        list.setAttribute("role", "tablist");
        list.setAttribute("aria-label", "Example tabs");
        if (tabs.matches(".vt,.tabs-vertical"))
          list.setAttribute("aria-orientation", "vertical");
        const panels = tabs.querySelectorAll(":is(.pn,.tabs-panel-native)");
        list.querySelectorAll("label[for]").forEach((label, i) => {
          const input = query(label.htmlFor);
          if (!input || !panels[i]) return;
          label.setAttribute("role", "tab");
          label.dataset.lmRadio = input.id;
          label.id = label.id || "lm-tab-" + ++seq;
          panels[i].id = panels[i].id || "lm-panel-" + ++seq;
          label.setAttribute("aria-controls", panels[i].id);
          label.setAttribute("aria-selected", String(input.checked));
          label.tabIndex = input.checked ? 0 : -1;
          panels[i].setAttribute("role", "tabpanel");
          panels[i].setAttribute("aria-labelledby", label.id);
          panels[i].hidden = !input.checked;
        });
      });
      root
        .querySelectorAll(":is(.aw,.alert-wrapper) :is(.cl,.alert-close)[for]")
        .forEach((label) => {
          label.dataset.lmLegacyDismiss = label.htmlFor;
          label.tabIndex = 0;
          label.setAttribute("role", "button");
        });
      root
        .querySelectorAll(
          "input[type=range]:not([data-lm-output]):not([data-lm-dual]):not([data-lm-compare])",
        )
        .forEach((input) => {
          const line = input.parentElement.querySelector(
            ":is(.vl,.range-value)",
          );
          const out = line?.querySelector("b");
          if (out) {
            out.id = out.id || "lm-range-" + ++seq;
            input.dataset.lmOutput = out.id;
            input.setAttribute(
              "aria-label",
              line.querySelector("span")?.textContent || "Value",
            );
          }
        });
      root
        .querySelectorAll(
          ":is(.stp,.stepper-native)>button[aria-label],:is(.vst,.stepper-vertical)>button[aria-label]",
        )
        .forEach((button) => {
          if (button.getAttribute("aria-label") === "Less")
            button.dataset.lmLegacyStep = "-1";
          if (button.getAttribute("aria-label") === "More")
            button.dataset.lmLegacyStep = "1";
        });
      root.querySelectorAll("table").forEach((table) => {
        table.querySelectorAll(":is(.srt,.table-sort)").forEach((span) => {
          if (span.tagName === "BUTTON") return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = span.className;
          button.dataset.lmSort = "";
          button.style.cssText =
            "border:0;background:none;color:inherit;font:inherit;cursor:pointer";
          button.append(...span.childNodes);
          span.replaceWith(button);
          button.closest("th").setAttribute("aria-sort", "none");
        });
        const all = table.querySelector("thead input[type=checkbox]");
        if (all && !all.dataset.lmSelectAll) {
          table.id = table.id || "lm-table-" + ++seq;
          all.dataset.lmSelectAll = table.id;
        }
      });
      root
        .querySelectorAll(":is(.lm-combobox,.combobox) [role=option]")
        .forEach((o) => {
          if (!o.id) o.id = "lm-option-" + ++seq;
        });
      root.querySelectorAll("dialog").forEach((d) => {
        if (dialogs.has(d)) return;
        dialogs.add(d);
        const closed = () => {
          d._lmOpener?.focus();
          emit(d, "close");
        };
        d.addEventListener("close", closed, { signal: abort.signal });
        cleanups.push(() => {
          if (d.open) d.close();
        });
      });
      root
        .querySelectorAll("[data-lm-pagination][data-lm-table]")
        .forEach((group) => pageTable(query(group.dataset.lmTable)));
    }
    refresh();
    const api = {
      toast,
      busy,
      refresh,
      destroy() {
        for (const button of busyButtons.keys()) busy(button, false);
        abort.abort();
        timers.forEach(clearTimeout);
        cleanups.forEach((fn) => fn());
        mounts.delete(root);
      },
    };
    mounts.set(root, api);
    return api;
  }
  async function copy(text) {
    if (navigator.clipboard && global.isSecureContext)
      return navigator.clipboard.writeText(text);
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.append(t);
    t.select();
    const success = document.execCommand("copy");
    t.remove();
    if (!success) throw Error("Clipboard unavailable");
  }
  function fragment(markup) {
    const template = document.createElement("template");
    template.innerHTML = markup;
    const ids = new Map();
    template.content.querySelectorAll("[id]").forEach((node) => {
      const previous = node.id;
      const id = "lumen-" + ++seq + "-" + previous;
      if (!ids.has(previous)) ids.set(previous, id);
      node.id = id;
    });
    const references = new Set([
      "for",
      "aria-controls",
      "aria-labelledby",
      "aria-describedby",
      "aria-activedescendant",
      "aria-owns",
      "aria-flowto",
      "aria-details",
      "aria-errormessage",
      "headers",
      "list",
      "form",
      "popovertarget",
      "data-lm-dialog",
      "data-lm-collapse",
      "data-lm-copy",
      "data-lm-remove",
      "data-lm-filter",
      "data-lm-table",
      "data-lm-select-all",
      "data-lm-download",
      "data-lm-output",
      "data-lm-password",
      "data-lm-date-start",
      "data-lm-success-dialog",
      "data-lm-radio",
      "data-lm-compare",
      "data-lm-markdown",
      "data-lm-legacy-dismiss",
    ]);
    template.content.querySelectorAll("*").forEach((node) => {
      for (const attr of [...node.attributes]) {
        if (references.has(attr.name))
          node.setAttribute(
            attr.name,
            attr.value
              .split(/\s+/)
              .map((id) => ids.get(id) || id)
              .join(" "),
          );
        if (attr.value.includes("url(")) {
          node.setAttribute(
            attr.name,
            attr.value.replace(
              /url\((['"]?)#([^)'"\s]+)\1\)/g,
              (value, quote, id) =>
                ids.has(id) ? "url(#" + ids.get(id) + ")" : value,
            ),
          );
        }
        if (
          ["href", "xlink:href"].includes(attr.name) &&
          attr.value.startsWith("#")
        ) {
          const id = ids.get(attr.value.slice(1));
          if (id) node.setAttribute(attr.name, "#" + id);
        }
      }
    });
    return template.content;
  }
  function prepare(root) {
    root.querySelectorAll(".field,.lm-field").forEach((field) => {
      const input = field.querySelector("input,select,textarea"),
        label = field.querySelector(".input-label,.lm-label");
      if (
        input &&
        label &&
        !input.hasAttribute("aria-label") &&
        !input.hasAttribute("aria-labelledby")
      ) {
        label.id ||= "lumen-label-" + ++seq;
        input.setAttribute("aria-labelledby", label.id);
      }
      if (input) {
        const descriptions = (input.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter(Boolean);
        field
          .querySelectorAll(".input-help,.input-error,.lm-help,.lm-error")
          .forEach((help) => {
            help.id ||= "lumen-help-" + ++seq;
            if (!descriptions.includes(help.id)) descriptions.push(help.id);
          });
        if (descriptions.length)
          input.setAttribute("aria-describedby", descriptions.join(" "));
      }
    });
    return root;
  }
  const fire = (element, name, detail) =>
    element.dispatchEvent(
      new CustomEvent("lumen:" + name, {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  function resource({ load, onState = () => {} }) {
    let state = { status: "idle", data: null, error: null },
      request = null,
      sequence = 0,
      disposed = false;
    const publish = (next) => {
      state = { ...state, ...next };
      if (!disposed) onState(state);
    };
    return {
      get state() {
        return state;
      },
      async refresh(options) {
        const generation = ++sequence;
        request?.abort();
        request = new AbortController();
        publish({ status: "loading", error: null });
        try {
          const data = await load({ signal: request.signal, options });
          if (disposed || generation !== sequence) return;
          publish({
            status: Array.isArray(data) && !data.length ? "empty" : "success",
            data,
            error: null,
          });
          return data;
        } catch (error) {
          if (
            disposed ||
            generation !== sequence ||
            error.name === "AbortError"
          )
            return;
          publish({ status: "error", error });
          return undefined;
        }
      },
      cancel() {
        sequence++;
        request?.abort();
        publish({ status: "idle", error: null });
      },
      destroy() {
        disposed = true;
        sequence++;
        request?.abort();
      },
    };
  }
  function formController(form, { submit, onState = () => {} }) {
    const abort = new AbortController();
    let pending = null,
      disposed = false,
      state = "idle",
      dirty = false,
      baseline = "",
      generation = 0;
    const signature = () =>
      JSON.stringify(
        [...new FormData(form)].map(([key, value]) => [
          key,
          typeof value === "string"
            ? value
            : [value.name, value.size, value.lastModified],
        ]),
      );
    const publish = () => {
      form.dataset.state = state;
      form.dataset.dirty = String(dirty);
      form.setAttribute("aria-busy", String(state === "loading"));
      onState({ status: state, dirty });
      fire(form, "formstate", { status: state, dirty });
    };
    const commit = () => {
      for (const input of form.elements) {
        if (input.type === "file") continue;
        if (input.matches("input")) {
          input.defaultValue = input.value;
          input.defaultChecked = input.checked;
        } else if (input.matches("textarea")) input.defaultValue = input.value;
        else if (input.matches("select"))
          for (const option of input.options)
            option.defaultSelected = option.selected;
      }
      baseline = signature();
      dirty = false;
    };
    const changed = () => {
      dirty = signature() !== baseline;
      if (state === "success" || state === "error") state = "idle";
      publish();
    };
    form.setAttribute("data-lm-managed", "");
    form.setAttribute("data-lm-validate", "");
    form.noValidate = true;
    commit();
    publish();
    for (const type of ["input", "change"])
      form.addEventListener(type, changed, { signal: abort.signal });
    form.addEventListener(
      "reset",
      () =>
        queueMicrotask(() => {
          if (!disposed) {
            state = "idle";
            dirty = false;
            baseline = signature();
            publish();
          }
        }),
      { signal: abort.signal },
    );
    const busyButtons = new Set(),
      lockedControls = new Map();
    const unlock = () => {
      for (const [input, disabled] of lockedControls) input.disabled = disabled;
      lockedControls.clear();
    };
    const release = () => {
      unlock();
      const ui = mount(form.getRootNode());
      for (const button of busyButtons) ui.busy(button, false);
      busyButtons.clear();
    };
    form.addEventListener(
      "lumen:submit",
      async (event) => {
        if (event.target !== form || state === "loading") return;
        const current = ++generation;
        pending = new AbortController();
        state = "loading";
        publish();
        for (const input of form.querySelectorAll("input,select,textarea")) {
          lockedControls.set(input, input.disabled);
          input.disabled = true;
        }
        const buttons = form.querySelectorAll(
          "button[type=submit],button:not([type])",
        );
        const ui = mount(form.getRootNode());
        buttons.forEach((button) => {
          busyButtons.add(button);
          ui.busy(button, true);
        });
        try {
          await submit(event.detail, { signal: pending.signal });
          if (disposed || current !== generation) return;
          unlock();
          commit();
          state = "success";
          publish();
        } catch (error) {
          if (disposed || current !== generation || error.name === "AbortError")
            return;
          state = "error";
          const output = form.querySelector("[data-lm-form-status]");
          if (output) output.textContent = error.message;
          publish();
          fire(form, "formerror", { error });
        } finally {
          if (current === generation) release();
        }
      },
      { signal: abort.signal },
    );
    return {
      get state() {
        return { status: state, dirty };
      },
      commit() {
        commit();
        state = "idle";
        publish();
      },
      cancel() {
        generation++;
        pending?.abort();
        release();
        state = "idle";
        publish();
      },
      destroy() {
        disposed = true;
        generation++;
        pending?.abort();
        release();
        abort.abort();
        form.removeAttribute("data-lm-managed");
        form.removeAttribute("aria-busy");
      },
    };
  }
  global.LumenUI = {
    version: "3.3.0",
    mount,
    fragment,
    prepare,
    resource,
    form: formController,
    async run(button, task) {
      if (button.getAttribute("aria-busy") === "true")
        throw Error("Action already in progress");
      const ui = mount(button.getRootNode());
      ui.busy(button, true);
      try {
        return await task();
      } finally {
        ui.busy(button, false);
      }
    },
    refresh: (root) => mount(root).refresh(),
    copy,
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => mount(document), {
      once: true,
    });
  else mount(document);
})(window);

/* Connected reference application. Uses only public Lumen components and lifecycle APIs. */
(function (global) {
  "use strict";
  const mounts = new WeakMap();
  let sequence = 0;
  const seed = () => [
    {
      id: "r1",
      name: "Workspace kit",
      owner: "Alex Morgan",
      quantity: 12,
      status: "Active",
    },
    {
      id: "r2",
      name: "Notebook set",
      owner: "Jamie Lee",
      quantity: 8,
      status: "Active",
    },
    {
      id: "r3",
      name: "Desk organizer",
      owner: "Sam Taylor",
      quantity: 0,
      status: "Paused",
    },
    {
      id: "r4",
      name: "Studio lamp",
      owner: "Alex Morgan",
      quantity: 16,
      status: "Active",
    },
    {
      id: "r5",
      name: "Travel pouch",
      owner: "Morgan Chen",
      quantity: 5,
      status: "Paused",
    },
    {
      id: "r6",
      name: "Cable kit",
      owner: "Jamie Lee",
      quantity: 24,
      status: "Active",
    },
  ];
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const abortError = () => new DOMException("Request cancelled", "AbortError");
  function mount(root, options = {}) {
    if (mounts.has(root)) return mounts.get(root);
    const abort = new AbortController(),
      prefix = "workspace-" + ++sequence,
      query = (selector) => root.querySelector(selector),
      main = query("[data-workspace-main]");
    let records = seed(),
      view = "overview",
      access = "editor",
      failNext = false,
      recordSequence = 10,
      disposed = false,
      loader = null,
      currentForm = null,
      editorForm = null,
      activeRecord = null,
      confirmAction = null,
      filterTimer = null,
      uploads = [],
      savedBrand = {},
      settings = {
        name: "Lumen Workspace",
        email: "alex@example.com",
        density: "comfortable",
        direction: "ltr",
      };
    const ui = LumenUI.mount(root),
      on = (type, handler) =>
        root.addEventListener(type, handler, { signal: abort.signal });
    function delay(signal, ms = 180) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(abortError());
          return;
        }
        const timer = setTimeout(done, ms);
        function done() {
          signal?.removeEventListener("abort", cancel);
          resolve();
        }
        function cancel() {
          clearTimeout(timer);
          reject(abortError());
        }
        signal?.addEventListener("abort", cancel, { once: true });
      });
    }
    async function request(operation, payload, signal = abort.signal) {
      const failed = failNext;
      failNext = false;
      query("[data-workspace-failure]").checked = false;
      await delay(signal);
      if (failed)
        throw Error(
          "Connection interrupted. Your changes were kept. Try again.",
        );
      if (options.adapter?.[operation]) {
        const result = await options.adapter[operation](payload, { signal });
        if (signal.aborted) throw abortError();
        return result;
      }
      return payload;
    }
    function header(title, description, actions = "") {
      return (
        '<header class="page-header"><div><h1 class="heading-md" tabindex="-1">' +
        escape(title) +
        '</h1><p class="body-sm text-muted">' +
        escape(description) +
        '</p></div><div class="row">' +
        actions +
        "</div></header>"
      );
    }
    function button(label, attributes = "", style = "") {
      return (
        '<button type="button" class="btn ' +
        style +
        '" ' +
        attributes +
        ">" +
        escape(label) +
        "</button>"
      );
    }
    function permission() {
      return access === "viewer"
        ? '<div class="alert color-info"><p>You have view-only access. Editing actions are unavailable.</p></div>'
        : "";
    }
    function notify(message, action) {
      return ui.toast(message, action ? { duration: 0, action } : {});
    }
    function updateNav() {
      root.querySelectorAll("nav [data-workspace-view]").forEach((button) => {
        if (button.dataset.workspaceView === view)
          button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
    }
    function safeNavigate(next, focus = true) {
      const dirty = currentForm?.state.dirty || editorForm?.state.dirty;
      if (dirty) {
        confirm(
          "Discard unsaved changes?",
          "Your saved data will stay unchanged.",
          "Discard changes",
          () => navigate(next, focus),
        );
        return;
      }
      navigate(next, focus);
    }
    function cleanupView() {
      loader?.destroy();
      loader = null;
      currentForm?.destroy();
      currentForm = null;
      clearTimeout(filterTimer);
      if (query("[data-workspace-editor]").open) closeEditor();
      if (query("[data-workspace-detail]").open)
        query("[data-workspace-detail]").close();
    }
    function navigate(next, focus = true) {
      if (disposed) return;
      cleanupView();
      view = ["overview", "records", "files", "settings"].includes(next)
        ? next
        : "overview";
      updateNav();
      main.removeAttribute("aria-busy");
      main.dataset.state = "idle";
      ({
        overview: renderOverview,
        records: renderRecords,
        files: renderFiles,
        settings: renderSettings,
      })[view]();
      ui.refresh();
      if (focus) main.querySelector("h1")?.focus();
      if (options.routing) {
        const url = new URL(location.href);
        url.searchParams.set("view", view);
        history.replaceState(null, "", url);
      }
    }
    function renderOverview() {
      const active = records.filter(
          (record) => record.status === "Active",
        ).length,
        total = records.reduce((sum, record) => sum + record.quantity, 0);
      main.innerHTML =
        header(
          "Your workspace",
          "An overview of the records and activity in your team.",
          button("Manage records", 'data-workspace-view="records"'),
        ) +
        '<div class="grid gap-4"><article class="card col-12 md-col-4"><h2 class="text-sm text-muted">Records</h2><p class="stat-value">' +
        records.length +
        '</p><span class="badge color-primary">Across your workspace</span></article><article class="card col-12 md-col-4"><h2 class="text-sm text-muted">Active records</h2><p class="stat-value">' +
        active +
        '</p><span class="badge color-success">Ready for work</span></article><article class="card col-12 md-col-4"><h2 class="text-sm text-muted">Available units</h2><p class="stat-value">' +
        total +
        '</p><span class="badge color-info">Current inventory</span></article><article class="card col-12"><header class="card-header"><h2 class="heading-sm">Continue your work</h2></header><div class="detail-grid"><div><h3>Keep records current</h3><p class="text-muted">Find an item, review its details, and update the quantity.</p>' +
        button(
          "Browse records",
          'data-workspace-view="records"',
          "btn-style-tonal",
        ) +
        '</div><div><h3>Make it your workspace</h3><p class="text-muted">Apply one brand configuration across every shared component.</p>' +
        button(
          "Open settings",
          'data-workspace-view="settings"',
          "btn-style-outline",
        ) +
        "</div></div></article></div>";
    }
    function renderRecords() {
      main.innerHTML =
        header(
          "Records",
          "Search, filter, select, and maintain your team inventory.",
          button(
            "New record",
            "data-workspace-create " + (access === "viewer" ? "disabled" : ""),
          ),
        ) +
        permission() +
        '<article class="card"><div class="filter-bar"><label class="field"><span class="input-label">Search records</span><input class="input" type="search" data-workspace-search placeholder="Name or owner"></label><label class="field"><span class="input-label" id="' +
        prefix +
        '-status-label">Status</span><select class="input" data-workspace-status aria-labelledby="' +
        prefix +
        '-status-label"><option value="">All statuses</option><option>Active</option><option>Paused</option><option>Archived</option></select></label>' +
        button(
          "Archive selected",
          "data-workspace-bulk disabled",
          "btn-style-outline color-danger",
        ) +
        '</div><div data-workspace-results aria-live="polite"></div><p class="input-help" data-workspace-record-count role="status"></p></article>';
      loader = LumenUI.resource({
        load: async ({ signal }) => {
          const term = query("[data-workspace-search]")
              .value.trim()
              .toLowerCase(),
            status = query("[data-workspace-status]").value;
          const data = records.filter(
            (record) =>
              (!term ||
                (record.name + " " + record.owner)
                  .toLowerCase()
                  .includes(term)) &&
              (!status || record.status === status),
          );
          return request("list", data, signal);
        },
        onState: renderResults,
      });
      loader.refresh();
    }
    function renderResults(state) {
      if (disposed || view !== "records") return;
      const container = query("[data-workspace-results]"),
        count = query("[data-workspace-record-count]");
      container.dataset.state = state.status;
      container.setAttribute("aria-busy", String(state.status === "loading"));
      if (state.status === "loading") {
        if (!container.children.length)
          container.innerHTML =
            '<div class="empty-state"><p>Loading records…</p><progress class="progress" aria-label="Loading records"></progress></div>';
        count.textContent = "Loading records…";
        return;
      }
      if (state.status === "error") {
        container.innerHTML =
          '<div class="empty-state"><h2 class="heading-sm">Records could not be loaded</h2><p>' +
          escape(state.error.message) +
          "</p>" +
          button("Try again", "data-workspace-retry") +
          "</div>";
        count.textContent = "Request failed. You can retry.";
        return;
      }
      if (state.status === "idle") {
        count.textContent = "Request cancelled.";
        return;
      }
      const data = Array.isArray(state.data) ? state.data : [];
      if (!data.length) {
        container.innerHTML =
          '<div class="empty-state"><h2 class="heading-sm">No matching records</h2><p>Try another search or clear your filters.</p>' +
          button("Clear filters", "data-workspace-clear", "btn-style-outline") +
          "</div>";
        count.textContent = "0 results";
        return;
      }
      container.innerHTML =
        '<div class="table-wrap" tabindex="0" role="region" aria-label="Records table"><table class="table table-striped" id="' +
        prefix +
        '-table"><caption>Workspace inventory</caption><thead><tr><th scope="col"><input type="checkbox" aria-label="Select visible records" data-lm-select-all="' +
        prefix +
        '-table" ' +
        (access === "viewer" ? "disabled" : "") +
        '></th><th scope="col" aria-sort="none"><button data-lm-sort>Name</button></th><th scope="col">Owner</th><th scope="col" aria-sort="none"><button data-lm-sort>Quantity</button></th><th scope="col">Status</th><th scope="col">Details</th></tr></thead><tbody>' +
        data
          .map(
            (record) =>
              '<tr><td><input type="checkbox" aria-label="Select ' +
              escape(record.name) +
              '" data-workspace-select="' +
              escape(record.id) +
              '" ' +
              (access === "viewer" ? "disabled" : "") +
              '></td><th scope="row">' +
              escape(record.name) +
              "</th><td>" +
              escape(record.owner) +
              "</td><td>" +
              record.quantity +
              '</td><td><span class="badge color-' +
              (record.status === "Active"
                ? "success"
                : record.status === "Paused"
                  ? "warning"
                  : "secondary") +
              '">' +
              escape(record.status) +
              "</span></td><td>" +
              button(
                "Open " + record.name,
                'data-workspace-open="' + escape(record.id) + '"',
                "btn-style-ghost size-sm",
              ) +
              "</td></tr>",
          )
          .join("") +
        '</tbody></table></div><footer class="toolbar card-footer"><div class="row" data-lm-pagination data-lm-table="' +
        prefix +
        '-table" data-lm-page-size="4">' +
        button("Previous", 'data-lm-page="previous"', "btn-style-outline") +
        '<output role="status"></output>' +
        button("Next", 'data-lm-page="next"', "btn-style-outline") +
        "</div>" +
        button(
          "Download visible records",
          'data-lm-download="' + prefix + '-table"',
          "btn-style-tonal",
        ) +
        "</footer>";
      count.textContent = data.length + " matching records";
      ui.refresh();
      syncBulk();
    }
    function syncBulk() {
      const button = query("[data-workspace-bulk]");
      if (!button) return;
      const selected = root.querySelectorAll("[data-workspace-select]:checked");
      button.disabled = access === "viewer" || !selected.length;
      button.textContent = selected.length
        ? "Archive selected (" + selected.length + ")"
        : "Archive selected";
    }
    function openDetail(id, opener) {
      const record = records.find((record) => record.id === id);
      if (!record) return;
      activeRecord = id;
      const dialog = query("[data-workspace-detail]");
      query("[data-workspace-detail-title]").textContent = record.name;
      query("[data-workspace-detail-body]").innerHTML =
        '<dl class="detail-grid"><div><dt>Owner</dt><dd>' +
        escape(record.owner) +
        "</dd></div><div><dt>Quantity</dt><dd>" +
        record.quantity +
        "</dd></div><div><dt>Status</dt><dd>" +
        escape(record.status) +
        "</dd></div></dl>" +
        permission() +
        '<div class="form-actions">' +
        button(
          "Edit record",
          'data-workspace-edit="' +
            escape(id) +
            '" ' +
            (access === "viewer" ? "disabled" : ""),
        ) +
        button(
          "Archive record",
          'data-workspace-archive="' +
            escape(id) +
            '" ' +
            (access === "viewer" ? "disabled" : ""),
          "btn-style-outline color-danger",
        ) +
        "</div>";
      if (!dialog.open) {
        dialog._lmOpener = opener;
        dialog.showModal();
      }
    }
    function recordFields(record) {
      return (
        '<fieldset class="stack"><label class="field"><span class="input-label">Record name</span><input class="input" name="name" required maxlength="100" value="' +
        escape(record?.name || "") +
        '"></label><label class="field"><span class="input-label">Owner</span><input class="input" name="owner" required maxlength="100" value="' +
        escape(record?.owner || "") +
        '"></label><label class="field"><span class="input-label">Quantity</span><input class="input" name="quantity" type="number" min="0" max="1000000" step="1" required value="' +
        (record?.quantity ?? 0) +
        '"></label><label class="field"><span class="input-label" id="' +
        prefix +
        '-edit-status">Status</span><select class="input" name="status" aria-labelledby="' +
        prefix +
        '-edit-status"><option' +
        (record?.status === "Active" ? " selected" : "") +
        ">Active</option><option" +
        (record?.status === "Paused" ? " selected" : "") +
        ">Paused</option><option" +
        (record?.status === "Archived" ? " selected" : "") +
        ">Archived</option></select></label></fieldset>"
      );
    }
    function openEditor(id, opener) {
      if (access !== "editor") return;
      const record = records.find((record) => record.id === id);
      const dialog = query("[data-workspace-editor]");
      query("[data-workspace-editor-title]").textContent = record
        ? "Edit record"
        : "New record";
      query("[data-workspace-editor-body]").innerHTML =
        "<form data-lm-validate novalidate>" +
        recordFields(record) +
        '<footer class="form-actions"><button class="btn" type="submit">Save record</button>' +
        button("Cancel", "data-workspace-editor-cancel", "btn-style-outline") +
        '<output role="status" data-lm-form-status></output></footer></form>';
      const form = query("[data-workspace-editor] form");
      editorForm = LumenUI.form(form, {
        submit: async (data, { signal }) => {
          if (access !== "editor")
            throw Error("Editing is unavailable for viewers.");
          const value = {
            id: record?.id || "r" + ++recordSequence,
            name: data.name.trim(),
            owner: data.owner.trim(),
            quantity: Number(data.quantity),
            status: data.status,
          };
          if (!value.name || !value.owner)
            throw Error("A name and owner are required.");
          await request("save", value, signal);
          if (signal.aborted) throw abortError();
          const index = records.findIndex((record) => record.id === value.id);
          if (index < 0) records.push(value);
          else records[index] = value;
        },
        onState: (state) => {
          const output = form.querySelector("output");
          if (state.status === "loading") output.textContent = "Saving record…";
          if (state.status === "success") {
            const wasNew = !record;
            closeEditor();
            notify(wasNew ? "Record created" : "Record saved");
            if (query("[data-workspace-detail]").open) openDetail(record.id);
            if (view === "records") loader?.refresh();
            else if (view === "overview") renderOverview();
          }
        },
      });
      dialog._lmOpener = opener;
      dialog.showModal();
      form.querySelector("input").focus();
      ui.refresh();
    }
    function closeEditor() {
      editorForm?.destroy();
      editorForm = null;
      const dialog = query("[data-workspace-editor]");
      if (dialog.open) dialog.close();
      query("[data-workspace-editor-body]").replaceChildren();
    }
    function confirm(title, message, label, action) {
      const dialog = query("[data-workspace-confirm]");
      query("[data-workspace-confirm-title]").textContent = title;
      query("[data-workspace-confirm-message]").textContent = message;
      query("[data-workspace-confirm-action]").textContent = label;
      confirmAction = action;
      dialog._lmOpener =
        root.getRootNode().activeElement || document.activeElement;
      if (!dialog.open) dialog.showModal();
    }
    async function archive(ids) {
      if (access !== "editor") return;
      const previous = records
        .filter((record) => ids.includes(record.id))
        .map((record) => ({ ...record }));
      const button = query("[data-workspace-confirm-action]");
      await LumenUI.run(button, async () => {
        await request("archive", ids);
        records = records.map((record) =>
          ids.includes(record.id) ? { ...record, status: "Archived" } : record,
        );
      });
      query("[data-workspace-confirm]").close();
      query("[data-workspace-detail]").close();
      notify(
        previous.length +
          " record" +
          (previous.length === 1 ? "" : "s") +
          " archived",
        {
          label: "Undo",
          run: () => {
            records = records.map(
              (record) =>
                previous.find((old) => old.id === record.id) || record,
            );
            if (view === "records") loader?.refresh();
            if (view === "overview") renderOverview();
          },
        },
      );
      if (view === "records") loader?.refresh();
      else if (view === "overview") renderOverview();
    }
    function renderSettings() {
      main.innerHTML =
        header(
          "Workspace settings",
          "One set of tokens styles forms, cards, controls, tables, and dialogs.",
        ) +
        '<form class="card" data-lm-validate novalidate><div class="grid gap-4"><label class="field col-12 md-col-6"><span class="input-label">Workspace name</span><input class="input" name="name" required value="' +
        escape(settings.name) +
        '"></label><label class="field col-12 md-col-6"><span class="input-label">Contact email</span><input class="input" name="email" type="email" required value="' +
        escape(settings.email) +
        '"></label><label class="field col-12 md-col-6"><span class="input-label">Primary color</span><input class="input" name="primary" type="color" value="' +
        (savedBrand.primary || "#4338ca") +
        '"></label><label class="field col-12 md-col-6"><span class="input-label">Corner radius (px)</span><input class="input" name="radius" type="number" min="0" max="32" value="' +
        (savedBrand.radius ?? 12) +
        '"></label><label class="field col-12 md-col-6"><span class="input-label">Panel spacing (px)</span><input class="input" name="space" type="number" min="8" max="40" value="' +
        (savedBrand.space ?? 20) +
        '"></label><label class="field col-12 md-col-6"><span class="input-label">Medium control height (px)</span><input class="input" name="control" type="number" min="32" max="64" value="' +
        (savedBrand.control ?? 44) +
        '"></label><label class="field col-12 md-col-6"><span class="input-label" id="' +
        prefix +
        '-font-label">Font family</span><select class="input" name="font" aria-labelledby="' +
        prefix +
        '-font-label"><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label><label class="field col-12 md-col-6"><span class="input-label" id="' +
        prefix +
        '-density-label">Density</span><select class="input" name="density" aria-labelledby="' +
        prefix +
        '-density-label"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label class="field col-12 md-col-6"><span class="input-label" id="' +
        prefix +
        '-direction-label">Direction</span><select class="input" name="direction" aria-labelledby="' +
        prefix +
        '-direction-label"><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label></div><footer class="form-actions"><button class="btn" type="submit" ' +
        (access === "viewer" ? "disabled" : "") +
        '>Save settings</button><button class="btn btn-style-outline" type="reset">Reset</button><output role="status" data-lm-form-status></output></footer></form>' +
        permission();
      const form = main.querySelector("form");
      form.elements.font.value = savedBrand.font || "sans";
      form.elements.density.value = settings.density;
      form.elements.direction.value = settings.direction;
      currentForm = LumenUI.form(form, {
        submit: async (data, { signal }) => {
          if (access !== "editor")
            throw Error("Editing is unavailable for viewers.");
          await request("settings", data, signal);
          if (signal.aborted) throw abortError();
          settings = {
            ...settings,
            name: data.name,
            email: data.email,
            density: data.density,
            direction: data.direction,
          };
          savedBrand = LumenDesign.normalize({
            primary: data.primary,
            radius: data.radius,
            space: data.space,
            control: data.control,
            font: data.font,
          });
          LumenDesign.apply(root, savedBrand);
          root.dataset.density = settings.density;
          root.dir = settings.direction;
          root.querySelector(".navbar-brand").textContent = settings.name;
        },
        onState: (state) => {
          const output = form.querySelector("output");
          if (state.status === "loading")
            output.textContent = "Saving settings…";
          if (state.status === "success") {
            output.textContent = "Settings saved.";
            notify("Workspace settings saved");
          }
        },
      });
    }
    function renderFiles() {
      main.innerHTML =
        header(
          "Files",
          "Select attachments, check limits, and follow upload progress.",
        ) +
        '<form class="card stack" data-lm-upload data-lm-validate novalidate><label class="field"><span class="input-label">Choose files</span><input class="input" type="file" name="documents" required multiple data-lm-max-size="1048576" aria-describedby="' +
        prefix +
        '-file-hint"><span class="input-help" id="' +
        prefix +
        '-file-hint">Up to 1 MB per file.</span></label><output role="status">No files selected</output><progress class="progress" value="0" max="100" aria-label="File upload progress"></progress><footer class="form-actions"><button class="btn" type="submit" ' +
        (access === "viewer" ? "disabled" : "") +
        ">Upload files</button>" +
        button(
          "Cancel upload",
          "data-workspace-upload-cancel",
          "btn-style-outline",
        ) +
        '<button class="btn btn-style-ghost" type="reset">Clear files</button><output role="status" data-lm-form-status></output></footer></form><article class="card my-4"><h2 class="heading-sm">Session attachments</h2><ul class="list" data-workspace-files-list></ul></article>' +
        permission();
      const form = main.querySelector("form"),
        progress = form.querySelector("progress");
      renderFileList();
      currentForm = LumenUI.form(form, {
        submit: async (data, { signal }) => {
          if (access !== "editor")
            throw Error("Uploading is unavailable for viewers.");
          const files = [].concat(data.documents);
          progress.value = 0;
          for (let index = 1; index <= 4; index++) {
            await delay(signal, 100);
            progress.value = index * 20;
          }
          await request("upload", files, signal);
          if (signal.aborted) throw abortError();
          progress.value = 100;
          uploads.push(
            ...files.map((file) => ({ name: file.name, size: file.size })),
          );
          renderFileList();
        },
        onState: (state) => {
          const output = form.querySelector("[data-lm-form-status]");
          if (state.status === "loading")
            output.textContent = "Uploading files…";
          if (state.status === "success") {
            output.textContent = "Files added to this session.";
            notify("Files added");
          }
          if (
            state.status === "idle" &&
            progress.value > 0 &&
            progress.value < 100
          )
            output.textContent =
              "Upload cancelled. Your selection is ready to retry.";
        },
      });
    }
    function renderFileList() {
      const list = query("[data-workspace-files-list]");
      if (list)
        list.innerHTML = uploads.length
          ? uploads
              .map(
                (file) =>
                  "<li>" +
                  escape(file.name) +
                  " · " +
                  Math.ceil(file.size / 1024) +
                  " KB</li>",
              )
              .join("")
          : "<li>No attachments in this session.</li>";
    }
    on("input", (event) => {
      if (event.target.matches("[data-workspace-search]")) {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(() => loader?.refresh(), 180);
      }
    });
    on("lumen:selection", syncBulk);
    on("change", (event) => {
      if (event.target.matches("[data-workspace-status]")) loader?.refresh();
      if (event.target.matches("[data-workspace-theme]"))
        root.dataset.theme = event.target.value;
      if (event.target.matches("[data-workspace-access]")) {
        const next = event.target.value;
        if (currentForm?.state.dirty || editorForm?.state.dirty) {
          event.target.value = access;
          notify("Save or discard your changes before changing access.");
        } else {
          access = next;
          navigate(view);
        }
      }
      if (event.target.matches("[data-workspace-failure]"))
        failNext = event.target.checked;
    });
    on("click", (event) => {
      const target = event.target.closest("button,a");
      if (
        !target ||
        target.disabled ||
        target.getAttribute("aria-disabled") === "true"
      )
        return;
      if (target.dataset.workspaceView) {
        event.preventDefault();
        safeNavigate(target.dataset.workspaceView);
        return;
      }
      if (target.hasAttribute("data-workspace-create"))
        openEditor(null, target);
      if (target.hasAttribute("data-workspace-open"))
        openDetail(target.dataset.workspaceOpen, target);
      if (target.hasAttribute("data-workspace-edit"))
        openEditor(target.dataset.workspaceEdit, target);
      if (target.hasAttribute("data-workspace-retry")) loader?.refresh();
      if (target.hasAttribute("data-workspace-clear")) {
        query("[data-workspace-search]").value = "";
        query("[data-workspace-status]").value = "";
        loader?.refresh();
      }
      if (target.hasAttribute("data-workspace-archive"))
        confirm(
          "Archive this record?",
          "You can undo this action.",
          "Archive record",
          () => archive([target.dataset.workspaceArchive]),
        );
      if (target.hasAttribute("data-workspace-bulk")) {
        const ids = [
          ...root.querySelectorAll("[data-workspace-select]:checked"),
        ].map((input) => input.dataset.workspaceSelect);
        confirm(
          "Archive selected records?",
          "You can undo this action.",
          "Archive records",
          () => archive(ids),
        );
      }
      if (target.hasAttribute("data-workspace-stay"))
        query("[data-workspace-confirm]").close();
      if (target.hasAttribute("data-workspace-confirm-action")) {
        Promise.resolve(confirmAction?.()).catch((error) =>
          notify(error.message),
        );
        if (
          !target.hasAttribute("aria-busy") &&
          query("[data-workspace-confirm]").open
        )
          query("[data-workspace-confirm]").close();
      }
      if (target.hasAttribute("data-workspace-editor-cancel")) {
        if (editorForm?.state.dirty)
          confirm(
            "Discard record changes?",
            "The record will keep its saved values.",
            "Discard changes",
            closeEditor,
          );
        else closeEditor();
      }
      if (target.hasAttribute("data-workspace-upload-cancel"))
        currentForm?.cancel();
      if (target.hasAttribute("data-workspace-reset"))
        confirm(
          "Reset demo data?",
          "Session changes will be cleared.",
          "Reset demo",
          () => {
            records = seed();
            uploads = [];
            savedBrand = {};
            LumenDesign.apply(root, {});
            navigate("overview");
          },
        );
    });
    query("[data-workspace-editor]").addEventListener(
      "cancel",
      (event) => {
        if (editorForm?.state.dirty) {
          event.preventDefault();
          confirm(
            "Discard record changes?",
            "The record will keep its saved values.",
            "Discard changes",
            closeEditor,
          );
        }
      },
      { signal: abort.signal },
    );
    query("[data-workspace-editor]").addEventListener(
      "close",
      () => {
        editorForm?.destroy();
        editorForm = null;
        query("[data-workspace-editor-body]").replaceChildren();
      },
      { signal: abort.signal },
    );
    global.addEventListener(
      "beforeunload",
      (event) => {
        if (currentForm?.state.dirty || editorForm?.state.dirty) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      { signal: abort.signal },
    );
    const theme =
      root.closest("[data-theme]")?.dataset.theme ||
      document.documentElement.dataset.theme ||
      "light";
    query("[data-workspace-theme]").value = LumenTokens.themes.includes(theme)
      ? theme
      : "light";
    const api = {
      navigate: safeNavigate,
      get records() {
        return records.map((record) => ({ ...record }));
      },
      destroy() {
        disposed = true;
        loader?.destroy();
        currentForm?.destroy();
        editorForm?.destroy();
        clearTimeout(filterTimer);
        root
          .querySelectorAll("dialog[open]")
          .forEach((dialog) => dialog.close());
        abort.abort();
        ui.destroy();
        mounts.delete(root);
      },
    };
    mounts.set(root, api);
    navigate(
      options.routing
        ? new URLSearchParams(location.search).get("view") || "overview"
        : "overview",
      false,
    );
    return api;
  }
  global.LumenWorkspace = { mount };
  function initialize() {
    document
      .querySelectorAll("[data-lumen-workspace]")
      .forEach((root) => mount(root));
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})(window);

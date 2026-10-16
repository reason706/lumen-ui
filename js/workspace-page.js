(async () => {
  "use strict";
  try {
    const catalog = await LumenAssets.json("catalog/components.json");
    const doc = await LumenAssets.templateDocument(
      "templates/workspace.html",
      catalog.items,
    );
    const root = document.getElementById("workspace-root");
    root.replaceChildren(
      doc.querySelector("template#workspace").content.cloneNode(true),
    );
    LumenUI.refresh(document);
    LumenWorkspace.mount(root.querySelector("[data-lumen-workspace]"), {
      routing: true,
    });
    root.dataset.ready = "true";
  } catch (error) {
    const root = document.getElementById("workspace-root");
    root.textContent = error.message;
    root.setAttribute("role", "alert");
  }
})();

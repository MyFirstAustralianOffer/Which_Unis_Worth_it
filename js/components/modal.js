/**
 * Pop-up dialogs (used by the admin page). No browser alert/confirm boxes.
 *
 *   openModal({ title, body, actions, wide })  → { el, close }
 *     actions: [{ label, kind: "primary" | "outline" | "danger", onClick(close) }]
 *   confirmModal({ title, text, confirm, danger, typeToConfirm }) → Promise<boolean>
 */
import { esc } from "../lib/dom.js?v=5a71cd6c";

export function openModal({ title, body = "", actions = [], wide = false, onClose } = {}) {
  const el = document.createElement("div");
  el.className = "modal-backdrop";
  el.innerHTML = `
    <div class="modal${wide ? " modal-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-head">
        <h2 id="modalTitle">${esc(title)}</h2>
        <button type="button" class="modal-x" aria-label="Close">×</button>
      </div>
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-actions">${actions.map((a, i) =>
        `<button type="button" class="btn ${a.kind === "danger" ? "btn-danger" : a.kind === "outline" ? "btn-outline" : "btn-primary"}${a.left ? " modal-left" : ""}" data-action="${i}">${esc(a.label)}</button>`).join("")}</div>` : ""}
    </div>`;
  const previousFocus = document.activeElement;
  const close = () => {
    el.remove();
    document.removeEventListener("keydown", onKey);
    document.body.classList.remove("modal-open");
    previousFocus?.focus?.();
    onClose?.();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  el.addEventListener("click", (e) => { if (e.target === el) close(); });
  el.querySelector(".modal-x").addEventListener("click", close);
  el.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => actions[Number(btn.dataset.action)].onClick?.(close, btn));
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(el);
  document.body.classList.add("modal-open");
  (el.querySelector("input, select, textarea") || el.querySelector(".modal-actions .btn:last-child") || el.querySelector(".modal-x"))?.focus();
  return { el, close };
}

export function confirmModal({ title, text, confirm = "Confirm", danger = false, typeToConfirm = "" }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v, close) => { done = true; close(); resolve(v); };
    const { el } = openModal({
      title,
      body: `<p>${text}</p>${typeToConfirm ? `
        <label class="choice-label" for="typeConfirm">Type <b>${esc(typeToConfirm)}</b> to confirm</label>
        <input class="field" id="typeConfirm" type="text" autocomplete="off">` : ""}`,
      actions: [
        { label: "Cancel", kind: "outline", onClick: (close) => finish(false, close) },
        { label: confirm, kind: danger ? "danger" : "primary", onClick: (close) => {
          if (typeToConfirm && el.querySelector("#typeConfirm").value.trim() !== typeToConfirm) {
            el.querySelector("#typeConfirm").classList.add("invalid");
            return;
          }
          finish(true, close);
        } },
      ],
      onClose: () => { if (!done) resolve(false); },
    });
  });
}

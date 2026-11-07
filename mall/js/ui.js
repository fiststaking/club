// Shared DOM helpers. Deliberately tiny: no framework, no build step.

import { t } from "./i18n.js";

export const $ = (id) => document.getElementById(id);

export function msg(el, text, kind = "info") {
  const node = typeof el === "string" ? $(el) : el;
  if (!node) return;
  node.className = `msg ${kind}`;
  node.textContent = text;
}

export function clearMsg(el) {
  const node = typeof el === "string" ? $(el) : el;
  if (!node) return;
  node.className = "msg";
  node.textContent = "";
}

/**
 * Rejects after `ms` instead of leaving a promise pending forever.
 *
 * Why this exists: a wallet that never resolves `signTypedData` (prompt dismissed, unsupported
 * method, extension backgrounded) or an RPC that never answers would otherwise leave the button
 * stuck on "processing" with no way out. Every step of the buy flow is wrapped in this.
 */
export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`TIMEOUT:${label}:${Math.round(ms / 1000)}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function busy(button, on, label) {
  if (!button) return;
  button.disabled = on;
  if (label !== undefined) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    if (on) {
      button.textContent = label;
    } else {
      // Restore from the i18n key when the button is translated, so a language switch made while the
      // button was busy does not leave the previous language behind.
      button.textContent = button.dataset.i18n ? t(button.dataset.i18n) : button.dataset.label;
    }
  }
}

export function shortErr(e) {
  return e?.shortMessage || e?.info?.error?.message || e?.message || String(e);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

/**
 * Wires every `[data-copy]` button under `root` to copy its value.
 * Used by the ciphertext block so the raw hex can be pasted into a block explorer or a wallet.
 */
export function bindCopy(root = document) {
  if (!root) return;
  root.querySelectorAll("[data-copy]").forEach((btn) => {
    if (btn.dataset.copyBound === "1") return;
    btn.dataset.copyBound = "1";
    btn.onclick = async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard API needs a secure context; fall back to a temporary selection.
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } finally {
          ta.remove();
        }
      }
      const original = btn.textContent;
      btn.textContent = t("cipher.copied");
      setTimeout(() => {
        btn.textContent = original;
      }, 1200);
    };
  });
}

/** Persists the last connected account so the page can restore the view without a prompt. */
export const store = {
  get(k, fallback = "") {
    try {
      return localStorage.getItem("ecomall." + k) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("ecomall." + k, v);
    } catch {
      /* private mode */
    }
  },
};

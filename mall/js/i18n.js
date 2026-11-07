// UI localisation runtime.
//
// Language set matches the main site (https://fiststaking.github.io/club/):
//   zh en hi ja ko es fr de pt
// so a visitor who picked a language there finds the same one here.
//
// Design:
//   * static markup carries `data-i18n="key"` (text), `data-i18n-placeholder`, `data-i18n-title`
//   * dynamic strings go through `t("key", { name: value })`
//   * lookup order: selected language -> en -> the key itself
//   * `web/i18n.check.mjs` enforces key parity across all nine dictionaries, so a missing
//     translation fails CI instead of showing a raw key to a customer.
//
// Note: encryption is language-agnostic (it works on UTF-8 bytes), so nothing here touches the
// payload format. This module is presentation only.

import zh from "./i18n/zh.js";
import en from "./i18n/en.js";
import hi from "./i18n/hi.js";
import ja from "./i18n/ja.js";
import ko from "./i18n/ko.js";
import es from "./i18n/es.js";
import fr from "./i18n/fr.js";
import de from "./i18n/de.js";
import pt from "./i18n/pt.js";

export const SUPPORTED_LANGS = ["zh", "en", "hi", "ja", "ko", "es", "fr", "de", "pt"];
export const DEFAULT_LANG = "zh";

export const LANG_NAMES = {
  zh: "中文",
  en: "English",
  hi: "हिन्दी",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
};

const DICTS = { zh, en, hi, ja, ko, es, fr, de, pt };

/** Languages written right-to-left. None of the nine are, but the layout hook is here. */
const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

const STORAGE_KEY = "ecomall.lang";

let current = DEFAULT_LANG;
const listeners = new Set();

function normalize(lang) {
  const l = String(lang || "")
    .toLowerCase()
    .split("-")[0];
  return SUPPORTED_LANGS.includes(l) ? l : null;
}

/** Persisted choice, then browser preference, then the default. */
function detect() {
  let saved = "";
  try {
    saved = localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    /* private mode */
  }
  const direct = normalize(saved);
  if (direct) return direct;

  const cands = (typeof navigator !== "undefined" && (navigator.languages || [navigator.language])) || [];
  for (const cand of cands) {
    const n = normalize(cand);
    if (n) return n;
  }
  return DEFAULT_LANG;
}

export function getLang() {
  return current;
}

/**
 * Looks a key up in `lang` -> `en` -> the key itself.
 * `{name}` placeholders are replaced from `params`; unknown placeholders are left untouched.
 */
export function t(key, params, lang) {
  const l = lang || current;
  const dict = DICTS[l] || DICTS[DEFAULT_LANG];
  let s = dict[key];
  if (s === undefined) s = DICTS.en[key];
  if (s === undefined) return key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m
  );
}

/** Order-status label, translated. */
export function statusLabel(status) {
  return t(`status.${Number(status)}`);
}

/**
 * Turns a wallet/contract error into a localised sentence.
 * Contract custom errors are matched by name (`EcoMall_Xxx`) and mapped through `err.*` keys;
 * anything unrecognised keeps the original message so support still sees the raw cause.
 */
export function errorText(e) {
  const raw = e?.shortMessage || e?.info?.error?.message || e?.message || String(e ?? "");
  if (/ACTION_REJECTED|user rejected|User denied/i.test(raw)) return t("err.ACTION_REJECTED");
  const m = raw.match(/EcoMall_[A-Za-z0-9_]+/);
  if (m) {
    const key = `err.${m[0]}`;
    const hit = t(key);
    if (hit !== key) return hit;
  }
  return raw;
}

// ─────────────────────────────────────────────────────────────
//  Applying a language to the DOM
// ─────────────────────────────────────────────────────────────

/** Rewrites every `data-i18n*` node under `root`. Safe to call repeatedly, and a no-op without a DOM. */
export function applyI18n(root) {
  const doc = root || (typeof document !== "undefined" ? document : null);
  if (!doc) return;

  doc.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(key);
  });

  doc.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });

  doc.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });

  // Optional page title: <body data-i18n-title-key="app.title.mall">
  const titleKey = doc.body?.dataset?.i18nTitleKey;
  if (titleKey) doc.title = t(titleKey);

  // Keep the selector's accessible label in the active language too.
  const sel = doc.getElementById?.("lang");
  if (sel) sel.setAttribute("aria-label", t("common.lang"));

  const html = doc.documentElement;
  if (html) {
    html.lang = current;
    html.dir = RTL_LANGS.has(current) ? "rtl" : "ltr";
  }
}

/** Switches language, persists it, re-renders and notifies subscribers. */
export function setLang(lang) {
  const next = normalize(lang);
  if (!next || next === current) return current;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  applyI18n();
  for (const fn of listeners) {
    try {
      fn(current);
    } catch {
      /* a broken subscriber must not block the switch */
    }
  }
  return current;
}

/** Registers a callback fired after every language switch. */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Builds the language `<select>` and applies the initial language.
 * Call once per page after the DOM exists, before rendering any dynamic text.
 */
export function initLang(selectId = "lang") {
  current = detect();

  const sel = document.getElementById(selectId);
  if (sel) {
    sel.innerHTML = SUPPORTED_LANGS.map(
      (l) => `<option value="${l}">${LANG_NAMES[l]}</option>`
    ).join("");
    sel.value = current;
    sel.setAttribute("aria-label", t("common.lang"));
    sel.onchange = () => setLang(sel.value);
  }

  applyI18n();
  return current;
}

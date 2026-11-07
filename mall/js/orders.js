// Reading orders and turning them into plaintext records.
//
// Every envelope is bound to (chainId, mall, buyer, productId, supplier, key ids), so the AAD needs
// the chain order record. That is why every open call takes `order` built from `getOrderInfo`.

import { openAsBuyer, openAsMerchant, openAsAdmin, parseEnvelope } from "./crypto.js";
import { mallContract, fmtUsd, short } from "./chain.js";
import { MALL_ABI } from "./abi.js";
import { t, statusLabel } from "./i18n.js";

/** Reads one order's metadata + raw envelope. Throws if the caller may not read the payload. */
export async function readOrder(reader, cfg, orderId) {
  const mall = mallContract(reader, cfg, MALL_ABI);
  const [buyer, supplier, productId, amountUsd, refundAmount, createdAt, status, payload] =
    await mall.getOrderInfo(orderId);
  return {
    id: Number(orderId),
    buyer,
    supplier,
    productId: Number(productId),
    amountUsd,
    refundAmount,
    createdAt: Number(createdAt),
    status: Number(status),
    payload,
    statusLabel: statusLabel(Number(status)),
  };
}

/** Reads the envelope header only (no access check, no PII). */
export async function readEnvelope(reader, cfg, orderId) {
  const mall = mallContract(reader, cfg, MALL_ABI);
  const [supplierKeyId, buyerKeyId, adminCount, adminSetHash, payloadChunks] =
    await mall.getOrderEnvelope(orderId);
  return {
    supplierKeyId: Number(supplierKeyId),
    buyerKeyId: Number(buyerKeyId),
    adminCount: Number(adminCount),
    adminSetHash,
    payloadChunks: Number(payloadChunks),
  };
}

/** The AAD context for an order: everything except the key ids, which come from the envelope. */
export function orderContext(order) {
  return { buyer: order.buyer, supplier: order.supplier, productId: order.productId };
}

export function decryptAsBuyer({ signer, account, blob, order, cfg, keyId }) {
  return openAsBuyer({
    signer,
    account,
    keyId,
    blob,
    order: orderContext(order),
    chainId: cfg.chainId,
    mall: cfg.mall,
  });
}

export function decryptAsMerchant({ signer, account, blob, order, cfg, keyId }) {
  return openAsMerchant({
    signer,
    account,
    keyId,
    blob,
    order: orderContext(order),
    chainId: cfg.chainId,
    mall: cfg.mall,
  });
}

export function decryptAsAdmin({ signer, account, blob, order, cfg, keyId, deriveVersion }) {
  return openAsAdmin({
    signer,
    account,
    keyId,
    deriveVersion,
    blob,
    order: orderContext(order),
    chainId: cfg.chainId,
    mall: cfg.mall,
  });
}

/** Pages through `getUserOrderIdsPaged`. */
export async function userOrderIds(reader, cfg, account, limit = 100) {
  const mall = mallContract(reader, cfg, MALL_ABI);
  const total = Number(await mall.getUserOrderCount(account));
  const out = [];
  for (let offset = 0; offset < total; offset += limit) {
    const ids = await mall.getUserOrderIdsPaged(account, offset, limit);
    for (const id of ids) out.push(Number(id));
  }
  return out;
}

/** Pages through `getSupplierOrderIdsPaged`. */
export async function supplierOrderIds(reader, cfg, supplier, limit = 100) {
  const mall = mallContract(reader, cfg, MALL_ABI);
  const total = Number(await mall.getSupplierOrderCount(supplier));
  const out = [];
  for (let offset = 0; offset < total; offset += limit) {
    const ids = await mall.getSupplierOrderIdsPaged(supplier, offset, limit);
    for (const id of ids) out.push(Number(id));
  }
  return out;
}

/**
 * Aggregates the caller's orders across every mall registered in MallRegistry.
 * Old versions keep their history readable; only the newest one accepts new orders.
 *
 * Purged orders (`purgeOrders`) revert on read and are skipped, so an admin cleanup never breaks the
 * list for a buyer who still has the id in `_userOrders`.
 */
export async function allUserOrders(reader, cfg, account, registry) {
  const malls = registry ? await registry.activeMalls() : [cfg.mall];
  const perMall = await Promise.all(
    malls.map(async (addr) => {
      const local = addr.toLowerCase() === cfg.mall.toLowerCase()
        ? cfg
        : { ...cfg, mall: addr };
      try {
        const ids = await userOrderIds(reader, local, account);
        const settled = await Promise.all(
          ids.map((id) => readOrder(reader, local, id).catch(() => null))
        );
        return settled.filter(Boolean).map((o) => ({ ...o, mall: addr }));
      } catch {
        return [];
      }
    })
  );
  return perMall.flat().sort((a, b) => a.createdAt - b.createdAt);
}

/** HTML-escapes text for interpolation into the templates below. */
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/**
 * Renders the on-chain ciphertext verbatim: no truncation, no masking.
 * The bytes are already public on chain, so hiding them in the UI would only make the tool harder to
 * audit. A `<details>` keeps a long blob from flooding the list while still showing everything.
 *
 * @param {string} payloadHex raw bytes from `getOrderInfo`
 * @param {{chunkSize?: number, emptyKey?: string}} [opts] `emptyKey` lets a caller explain *why* the
 *        blob is empty (e.g. "buyer has not unlocked yet" vs "purged").
 */
export function cipherHtml(payloadHex, opts = {}) {
  const { chunkSize = 2048, emptyKey = "cipher.empty" } = opts;
  const hex = typeof payloadHex === "string" ? payloadHex : "";
  const bytes = hex.startsWith("0x") ? (hex.length - 2) / 2 : 0;
  if (bytes === 0) {
    return `<div class="cipher empty">${esc(t(emptyKey))}</div>`;
  }
  const chunks = Math.ceil(bytes / chunkSize);
  return (
    `<details class="cipher">` +
    `<summary>${esc(t("cipher.title"))} · ${esc(t("cipher.size", { b: bytes, c: chunks }))}</summary>` +
    `<pre class="hex">${esc(hex)}</pre>` +
    `<div class="actions"><button class="ghost" data-copy="${esc(hex)}">${esc(
      t("cipher.copy")
    )}</button></div>` +
    `</details>`
  );
}

/** Wraps a decrypted record with its label so the plaintext is shown explicitly. */
export function plainHtml(rec) {
  return `<div class="plain-title">${esc(t("plain.title"))}</div>` + recordHtml(rec);
}

export function recordHtml(rec) {
  return (
    `<div class="pii">` +
    `<div><span>${esc(t("rec.receiver"))}</span>${esc(rec.receiver)}</div>` +
    `<div><span>${esc(t("rec.phone"))}</span>${esc(rec.phone)}</div>` +
    `<div><span>${esc(t("rec.address"))}</span>${esc(rec.address)}</div>` +
    `<div><span>${esc(t("rec.note"))}</span>${esc(rec.note || "—")}</div>` +
    `</div>`
  );
}

export function orderLine(o) {
  // A cancelled (or purged) order has no readable payload, so the header cannot be parsed.
  let adminCopies = "—";
  try {
    adminCopies = String(parseEnvelope(o.payload).adminCount);
  } catch {
    adminCopies = "—";
  }
  return (
    `<div class="order">` +
    `<div class="row"><b>#${o.id}</b><span class="tag">${esc(statusLabel(o.status))}</span>` +
    `<span class="muted">${fmtUsd(o.amountUsd)} USD</span></div>` +
    `<div class="muted small">${esc(
      t("mall.orderMeta", { product: o.productId, supplier: short(o.supplier) })
    )} · ${esc(t("common.buyer"))} ${short(o.buyer)}</div>` +
    `<div class="muted small">${esc(t("rec.adminCopies", { n: adminCopies }))}</div>` +
    `</div>`
  );
}

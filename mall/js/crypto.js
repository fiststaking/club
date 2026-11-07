// PII envelope -- v3 (EcoMallV4)
//
// One order = one random data key (DEK), sealed once for every party that must be able to read it:
//   • N admin copies  (N = active PII admin keys, in on-chain order, N <= 5)
//   • 1 merchant copy (the product's supplier)
//   • 1 buyer copy
//
// All three parties use the **same** mechanism: a P-256 scalar derived from an EIP-712 signature
// opens an ECIES box that wraps the DEK. One code path, one wallet prompt per session.
//
// Why a random DEK instead of a signature-derived one: a wallet signature is reproducible forever, so
// a derived key can never be revoked. With a random DEK the sealed blob is the only copy of the data
// key, and the boxes are the only way in.
//
// Layout (see docs/plan-onchain-mall.md §4.2):
//   [0]         version (3)
//   [1]         flags: bit0 = admin copies, bit1 = merchant, bit2 = buyer (all required)
//   [2..4]      headerLen = 46 (uint16 BE)
//   [4..8]      merchantKeyId (uint32 BE)
//   [8..12]     buyerKeyId (uint32 BE)
//   [12..32]    adminKeyIds[5] (uint32 BE each, 0 = unused)
//   [32]        adminCount (1..5)
//   [33]        reserved: bit0 = payload is deflate-raw compressed
//   [34..46]    iv (12) for the payload ciphertext
//   [46..]      admin boxes (N) | merchant box | buyer box | payload ciphertext
//
// Each box = epk(65) + iv(12) + ct(48) = 125 bytes and wraps the same 32-byte DEK with ECIES
// (ephemeral P-256 ECDH -> SHA-256 -> AES-256-GCM).

const VERSION = 3;
const FLAG_ADMIN = 1;
const FLAG_MERCHANT = 2;
const FLAG_BUYER = 4;
const FLAGS_REQUIRED = FLAG_ADMIN | FLAG_MERCHANT | FLAG_BUYER;

const HEADER = 46;
const BOX = 125;
const TAG = 16;
const MAX_ADMIN_KEYS = 5;
const MAX_PAYLOAD_BYTES = 8192;
const PAD_BLOCK = 256;

const OFF_FLAGS = 1;
const OFF_HEADER_LEN = 2;
const OFF_MERCHANT_KEY = 4;
const OFF_BUYER_KEY = 8;
const OFF_ADMIN_KEYS = 12;
const OFF_ADMIN_COUNT = 32;
const OFF_RESERVED = 33;
const OFF_IV = 34;

const RESERVED_DEFLATE = 1;
/// @dev Bit1 records that the buyer key was derived with `personal_sign` instead of EIP-712 typed
///      data, because some wallets do not implement `eth_signTypedData_v4`. The contract ignores this
///      byte (it is documented as reserved), and the reader needs it to reproduce the same key.
const RESERVED_PERSONAL_SIGN = 2;

export const SIG_TYPED = "typed-data";
export const SIG_PERSONAL = "personal";

const EC = { name: "ECDH", namedCurve: "P-256" };

// ─────────────────────────────────────────────────────────────
//  Small helpers
// ─────────────────────────────────────────────────────────────

const te = new TextEncoder();
/// @dev `fatal: true` on purpose. The default decoder replaces malformed bytes with U+FFFD, so a
///      corrupted payload would silently turn a shipping address into "����" instead of failing.
///      For a multi-language shop a mangled address means a lost parcel, so corruption must throw.
const td = new TextDecoder("utf-8", { fatal: true });

export function b64(u8) {
  let bin = "";
  const a = new Uint8Array(u8);
  for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
  return btoa(bin);
}

export function unb64(s) {
  const bin = atob(String(s));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function hex(u8) {
  return (
    "0x" +
    Array.from(new Uint8Array(u8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function unhex(s) {
  const t = String(s).replace(/^0x/i, "");
  if (t.length % 2) throw new Error("hex length must be even");
  const out = new Uint8Array(t.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(t.substr(i * 2, 2), 16);
  return out;
}

function concat(...parts) {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const u16be = (v) => new Uint8Array([(v >> 8) & 0xff, v & 0xff]);
const u32be = (v) => new Uint8Array([(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]);
const readU16 = (b, o) => (b[o] << 8) | b[o + 1];
const readU32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

function addr32(addr) {
  const raw = unhex(addr);
  if (raw.length !== 20) throw new Error("bad address: " + addr);
  const out = new Uint8Array(32);
  out.set(raw, 12);
  return out;
}

function u256be(v) {
  const out = new Uint8Array(32);
  let x = BigInt(v);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  P-256 scalar arithmetic (BigInt, Jacobian)
// ─────────────────────────────────────────────────────────────

const P256 = (() => {
  const P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
  const N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
  const A = P - 3n;
  const B = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
  const GX = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n;
  const GY = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n;
  const SPKI_PREFIX = [
    0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
    0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00, 0x04,
  ];

  const mod = (x, m) => {
    const r = x % m;
    return r < 0n ? r + m : r;
  };

  function inv(a, m) {
    let oldR = mod(a, m);
    let r = m;
    let oldS = 1n;
    let s = 0n;
    while (r !== 0n) {
      const q = oldR / r;
      const t1 = oldR - q * r;
      oldR = r;
      r = t1;
      const t2 = oldS - q * s;
      oldS = s;
      s = t2;
    }
    if (oldR !== 1n) throw new Error("p256: not invertible");
    return mod(oldS, m);
  }

  const dbl = (X, Y, Z) => {
    if (Z === 0n || Y === 0n) return [0n, 1n, 0n];
    const YY = mod(Y * Y, P);
    const S = mod(4n * X * YY, P);
    const M = mod(3n * X * X + A * mod(mod(Z * Z, P) * mod(Z * Z, P), P), P);
    const X3 = mod(M * M - 2n * S, P);
    const Y3 = mod(M * (S - X3) - 8n * YY * YY, P);
    const Z3 = mod(2n * Y * Z, P);
    return [X3, Y3, Z3];
  };

  const add = (p1, p2) => {
    const [X1, Y1, Z1] = p1;
    const [X2, Y2, Z2] = p2;
    if (Z1 === 0n) return p2;
    if (Z2 === 0n) return p1;
    const Z1Z1 = mod(Z1 * Z1, P);
    const Z2Z2 = mod(Z2 * Z2, P);
    const U1 = mod(X1 * Z2Z2, P);
    const U2 = mod(X2 * Z1Z1, P);
    const S1 = mod(Y1 * Z2 * Z2Z2, P);
    const S2 = mod(Y2 * Z1 * Z1Z1, P);
    if (U1 === U2) return S1 !== S2 ? [0n, 1n, 0n] : dbl(X1, Y1, Z1);
    const H = mod(U2 - U1, P);
    const I = mod(4n * H * H, P);
    const J = mod(H * I, P);
    const r = mod(2n * (S2 - S1), P);
    const V = mod(U1 * I, P);
    const X3 = mod(r * r - J - 2n * V, P);
    const Y3 = mod(r * (V - X3) - 2n * S1 * J, P);
    const Z3 = mod((mod((Z1 + Z2) * (Z1 + Z2), P) - Z1Z1 - Z2Z2) * H, P);
    return [X3, Y3, Z3];
  };

  const toAffine = (X, Y, Z) => {
    if (Z === 0n) throw new Error("p256: infinity");
    const zi = inv(Z, P);
    const zi2 = mod(zi * zi, P);
    return [mod(X * zi2, P), mod(Y * zi2 * zi, P)];
  };

  function mul(k, pt) {
    const base = pt || [GX, GY];
    let acc = [0n, 1n, 0n];
    let cur = [base[0], base[1], 1n];
    let e = mod(k, N);
    while (e > 0n) {
      if (e & 1n) acc = add(acc, cur);
      cur = dbl(cur[0], cur[1], cur[2]);
      e >>= 1n;
    }
    return toAffine(acc[0], acc[1], acc[2]);
  }

  const bytes32 = (v) => {
    const out = new Uint8Array(32);
    let x = v;
    for (let i = 31; i >= 0; i--) {
      out[i] = Number(x & 0xffn);
      x >>= 8n;
    }
    return out;
  };

  const bytesToBigInt = (u8) => {
    let v = 0n;
    for (let i = 0; i < u8.length; i++) v = (v << 8n) | BigInt(u8[i]);
    return v;
  };

  /// @dev Rejects points that are not on the curve, or the point at infinity. Without this an
  ///      attacker-supplied ephemeral key can be used for invalid-curve attacks on the shared secret.
  function assertOnCurve(epk) {
    if (!epk || epk.length !== 65 || epk[0] !== 0x04) throw new Error("ecies: bad ephemeral key");
    const x = bytesToBigInt(epk.slice(1, 33));
    const y = bytesToBigInt(epk.slice(33, 65));
    if (x === 0n && y === 0n) throw new Error("ecies: point at infinity");
    if (x >= P || y >= P) throw new Error("ecies: coordinate out of range");
    if (mod(y * y, P) !== mod(x * x * x + A * x + B, P)) throw new Error("ecies: point not on curve");
  }

  return {
    N,
    modN: (v) => mod(v, N),
    spkiFromScalar(k) {
      const [x, y] = mul(k);
      const out = new Uint8Array(91);
      out.set(SPKI_PREFIX, 0);
      out.set(bytes32(x), 27);
      out.set(bytes32(y), 59);
      return out;
    },
    sharedX(k, epkBytes) {
      assertOnCurve(epkBytes);
      const x = bytesToBigInt(epkBytes.slice(1, 33));
      const y = bytesToBigInt(epkBytes.slice(33, 65));
      const [sx] = mul(k, [x, y]);
      return bytes32(sx);
    },
  };
})();

// ─────────────────────────────────────────────────────────────
//  Wallet-derived keys (cached per account for the session)
// ─────────────────────────────────────────────────────────────

const cache = new Map();

/** Canonical, dependency-free salt so the same wallet derives the same key on any device. */
function domainSalt(chainId, mall) {
  return te.encode(`EcoMall|${Number(chainId)}|${String(mall).toLowerCase()}|v3`);
}

async function hkdf(sigBytes, salt, info) {
  const ikm = await crypto.subtle.importKey("raw", sigBytes, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: te.encode(info) },
    ikm,
    256
  );
  return new Uint8Array(bits);
}

const PII_TYPES = {
  PiiKey: [
    { name: "purpose", type: "string" },
    { name: "account", type: "address" },
    { name: "keyId", type: "uint32" },
  ],
};

export function piiDomain(chainId, mall) {
  return { name: "EcoMall", version: "3", chainId: Number(chainId), verifyingContract: mall };
}

function requireSigner(signer) {
  if (!signer || typeof signer.signTypedData !== "function") {
    throw new Error("钱包不支持 EIP-712 签名，无法派生解密密钥");
  }
}

/**
 * True when the wallet rejected the request because it cannot do EIP-712 typed data at all.
 * Distinguishing this from "user pressed cancel" matters: cancel must surface as an error, while
 * "unsupported" should silently fall back to `personal_sign`.
 */
function isUnsupportedTypedData(e) {
  const code = e?.code ?? e?.info?.error?.code;
  const msg = String(e?.shortMessage || e?.message || e?.info?.error?.message || "");
  if (code === 4200 || code === -32601 || code === -32000) return true;
  return /unsupported|not supported|does not support|method not found|eth_signTypedData/i.test(msg);
}

/** Deterministic text used only when typed data is unavailable. */
function personalMessage({ purpose, account, keyId, chainId, mall }) {
  return (
    `EcoMall PII key v1\n` +
    `purpose: ${purpose}\n` +
    `account: ${String(account).toLowerCase()}\n` +
    `keyId: ${keyId}\n` +
    `chainId: ${Number(chainId)}\n` +
    `contract: ${String(mall).toLowerCase()}`
  );
}

/**
 * Produces the signature bytes and reports which method was used.
 * @param preferredMethod force a method (used when decrypting an envelope that recorded one)
 */
async function signPii({ signer, account, purpose, keyId, chainId, mall, preferredMethod }) {
  const typedData = async () => {
    const sig = await signer.signTypedData(piiDomain(chainId, mall), PII_TYPES, {
      purpose,
      account,
      keyId,
    });
    return { sig: unhex(sig), method: SIG_TYPED };
  };

  const personal = async () => {
    if (typeof signer.signMessage !== "function") {
      throw new Error("this wallet can neither sign typed data nor sign messages");
    }
    const sig = await signer.signMessage(personalMessage({ purpose, account, keyId, chainId, mall }));
    return { sig: unhex(sig), method: SIG_PERSONAL };
  };

  if (preferredMethod === SIG_PERSONAL) return personal();
  if (preferredMethod === SIG_TYPED) return typedData();

  try {
    return await typedData();
  } catch (e) {
    if (!isUnsupportedTypedData(e)) throw e;
    return personal();
  }
}

/**
 * P-256 scalar for one role. Cached per (purpose, account, keyId, chain, mall), so a session only
 * ever signs once per role even across many orders.
 */
export async function piiScalarAndMethod({
  signer,
  account,
  purpose,
  keyId,
  chainId,
  mall,
  preferredMethod,
}) {
  const ck = `${purpose}:${String(account).toLowerCase()}:${keyId}:${chainId}:${String(mall).toLowerCase()}:${preferredMethod || ""}`;
  if (cache.has(ck)) return cache.get(ck);
  requireSigner(signer);
  const { sig, method } = await signPii({
    signer,
    account,
    purpose,
    keyId,
    chainId,
    mall,
    preferredMethod,
  });
  const bits = await hkdf(sig, domainSalt(chainId, mall), `ecomall/${purpose}/v3`);
  let d = 0n;
  for (let i = 0; i < bits.length; i++) d = (d << 8n) | BigInt(bits[i]);
  d = P256.modN(d);
  if (d === 0n) d = 1n;
  const out = { d, method };
  cache.set(ck, out);
  return out;
}

export async function piiScalar(args) {
  return (await piiScalarAndMethod(args)).d;
}

const buyerScalar = (o) => piiScalar({ ...o, purpose: "buyer-ecdh" });
const merchantScalar = (o) => piiScalar({ ...o, purpose: "merchant-ecdh" });
const adminScalar = (o) => piiScalar({ ...o, purpose: "admin-ecdh" });

/** Merchant public key (SPKI DER, 91 bytes) ready for `registerMerchantKey`. */
export async function merchantSpki({ signer, account, keyId = 1, chainId, mall }) {
  return P256.spkiFromScalar(await merchantScalar({ signer, account, keyId, chainId, mall }));
}

/**
 * Admin public key (SPKI DER, 91 bytes) ready for `registerAdminKey`.
 * @param deriveVersion the per-account EIP-712 version: 0 for the first key, 1 after one rotation.
 *        Read it back from `getAdminKey(id).deriveVersion` when decrypting an existing order.
 */
export async function adminSpki({ signer, account, deriveVersion = 0, chainId, mall }) {
  return P256.spkiFromScalar(
    await adminScalar({ signer, account, keyId: deriveVersion, chainId, mall })
  );
}

/** Buyer public key (SPKI DER, 91 bytes). Only needed for diagnostics; the buyer unseals their own box. */
export async function buyerSpki({ signer, account, keyId = 0, chainId, mall, preferredMethod }) {
  return P256.spkiFromScalar(await buyerScalar({ signer, account, keyId, chainId, mall, preferredMethod }));
}

/** Buyer public key plus the signature method that produced it. */
export async function buyerKey({ signer, account, keyId = 0, chainId, mall, preferredMethod }) {
  const { d, method } = await piiScalarAndMethod({
    signer,
    account,
    purpose: "buyer-ecdh",
    keyId,
    chainId,
    mall,
    preferredMethod,
  });
  return { spki: P256.spkiFromScalar(d), method };
}

/** Clears the in-memory key cache (call on disconnect). */
export function clearKeyCache() {
  cache.clear();
}

// ─────────────────────────────────────────────────────────────
//  Compression + padding
// ─────────────────────────────────────────────────────────────

const hasCompression = typeof CompressionStream !== "undefined";

/** Bounded pipeline budget: compression must never hold an order hostage. */
const STREAM_TIMEOUT_MS = 3000;

/**
 * Runs one CompressionStream/DecompressionStream pipeline.
 *
 * ⚠️ Do NOT write first and read afterwards. In Chromium the readable side of the transform has a
 * zero-sized queue, so `await writer.write(bytes)` only resolves once something is already pulling
 * from the readable side. The "write -> close -> read" order therefore deadlocks forever, which is
 * exactly the reported bug: the wallet signature succeeds, `sealOrder` calls `deflateRaw`, and the
 * page then hangs with no error at all (only the 90 s wallet timeout eventually fires).
 *
 * Attaching the reader before the first write fixes it. The timeout is a second safety net: if any
 * engine still stalls, the caller falls back instead of hanging the buy flow.
 */
async function runStream(makeStream, bytes) {
  const stream = makeStream();
  const writer = stream.writable.getWriter();
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("compression stream timed out")), STREAM_TIMEOUT_MS);
  });
  try {
    // Start consuming BEFORE writing: this is what prevents the deadlock.
    const readPromise = new Response(stream.readable).arrayBuffer();
    // If we abort early the reader rejects with nobody awaiting it; keep that out of the console.
    readPromise.catch(() => {});
    await Promise.race([writer.write(bytes), guard]);
    await Promise.race([writer.close(), guard]);
    return new Uint8Array(await Promise.race([readPromise, guard]));
  } catch (e) {
    try {
      await writer.abort();
    } catch {
      /* already closed */
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Compresses with deflate-raw, or returns null when the environment cannot do it.
 *
 * `CompressionStream` exists in most browsers but `"deflate-raw"` is NOT universally supported
 * (Safari before 16.4, older Chrome, and several in-app wallets such as TokenPocket / Trust).
 * `new CompressionStream("deflate-raw")` then **throws** a TypeError.
 *
 * Returning null is always safe: the envelope records whether the body is compressed in
 * `header[33] bit0`, so the reader knows either way.
 */
async function deflateRaw(bytes) {
  if (!hasCompression) return null;
  try {
    return await runStream(() => new CompressionStream("deflate-raw"), bytes);
  } catch {
    // Unsupported format, a stalled stream or a broken stream: fall back to the uncompressed body.
    return null;
  }
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("this browser cannot decompress (DecompressionStream missing)");
  }
  return runStream(() => new DecompressionStream("deflate-raw"), bytes);
}

/** Pads to a multiple of 256 and appends the pad count as uint16 BE (so lengths leak only per block). */
function pad(body) {
  const rem = body.length % PAD_BLOCK;
  const padLen = rem === 0 ? PAD_BLOCK : PAD_BLOCK - rem;
  const total = body.length + padLen;
  const out = new Uint8Array(total);
  out.set(body, 0);
  out.set(u16be(padLen), total - 2);
  return out;
}

function unpad(padded) {
  if (padded.length < 2 || padded.length % PAD_BLOCK !== 0) throw new Error("载荷填充损坏");
  const padLen = readU16(padded, padded.length - 2);
  if (padLen < 2 || padLen > PAD_BLOCK) throw new Error("载荷填充损坏");
  return padded.slice(0, padded.length - padLen);
}

// ─────────────────────────────────────────────────────────────
//  ECIES wrap / unwrap of the DEK
// ─────────────────────────────────────────────────────────────

const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));

const aesKey = (raw, usage) =>
  crypto.subtle.importKey("raw", raw, "AES-GCM", false, [usage]);

async function wrapDek(recipientSpkiBytes, dek) {
  if (!recipientSpkiBytes || recipientSpkiBytes.length !== 91) {
    throw new Error("收件人公钥必须是 91 字节 SPKI");
  }
  const recipient = await crypto.subtle.importKey("spki", recipientSpkiBytes, EC, false, []);
  const eph = await crypto.subtle.generateKey(EC, true, ["deriveBits"]);
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: recipient }, eph.privateKey, 256);
  const wrapKey = await aesKey(await sha256(new Uint8Array(shared)), "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, dek));
  const epk = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  return concat(epk, iv, ct);
}

async function unwrapDek(scalar, box) {
  if (!box || box.length !== BOX) throw new Error("密钥副本长度非法");
  const epk = box.slice(0, 65);
  const iv = box.slice(65, 77);
  const ct = box.slice(77, 125);
  const shared = P256.sharedX(scalar, epk);
  const wrapKey = await aesKey(await sha256(shared), "decrypt");
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrapKey, ct));
}

// ─────────────────────────────────────────────────────────────
//  AAD -- binds the ciphertext to this chain, this mall and this order context
// ─────────────────────────────────────────────────────────────

/**
 * Deterministic byte layout (the contract does not recompute it; the decryptor does):
 *   uint256 chainId | address mall | address buyer | uint256 productId | address supplier
 *   | uint32 merchantKeyId | uint32 buyerKeyId | uint8 adminCount
 *   | uint32 adminKeyIds[5] | uint8 flags | uint8 version
 */
export async function buildAad({
  chainId,
  mall,
  buyer,
  productId,
  supplier,
  merchantKeyId,
  buyerKeyId,
  adminKeyIds,
  flags,
}) {
  const ids = new Uint8Array(20);
  for (let i = 0; i < MAX_ADMIN_KEYS; i++) {
    ids.set(u32be(i < adminKeyIds.length ? adminKeyIds[i] : 0), i * 4);
  }
  const buf = concat(
    u256be(chainId),
    addr32(mall),
    addr32(buyer),
    u256be(productId),
    addr32(supplier),
    u32be(merchantKeyId),
    u32be(buyerKeyId),
    new Uint8Array([adminKeyIds.length]),
    ids,
    new Uint8Array([flags]),
    new Uint8Array([VERSION])
  );
  return sha256(buf);
}

// ─────────────────────────────────────────────────────────────
//  Sealing
// ─────────────────────────────────────────────────────────────

/**
 * Seals one shipping record into a v3 envelope.
 *
 * @param {object} o
 * @param {object} o.fields          { receiver, phone, address, note }
 * @param {object} o.buyer           { signer, account, keyId }   keyId = buyerKeyVersion
 * @param {Uint8Array} o.merchantSpki  supplier's 91-byte SPKI
 * @param {number} o.merchantKeyId   supplier's current key version
 * @param {Array<{spki:Uint8Array,keyId:number}>} o.adminKeys  in on-chain order (<= 5)
 * @param {number} o.chainId
 * @param {string} o.mall
 * @param {number|string} o.productId
 * @param {string} o.supplier
 * @returns {Promise<Uint8Array>} the blob to pass to `placeOrder`
 */
export async function sealOrder({
  fields,
  buyer,
  merchantSpki: mSpki,
  merchantKeyId,
  adminKeys,
  chainId,
  mall,
  productId,
  supplier,
}) {
  if (!Array.isArray(adminKeys) || adminKeys.length === 0) {
    throw new Error("至少需要一名已注册解密公钥的管理员");
  }
  if (adminKeys.length > MAX_ADMIN_KEYS) {
    throw new Error(`管理员数量超过上限 ${MAX_ADMIN_KEYS}`);
  }
  if (!buyer || !buyer.account) throw new Error("缺少买家账户");

  const buyerKeyId = buyer.keyId ?? 0;
  const buyerDerived = await buyerKey({
    signer: buyer.signer,
    account: buyer.account,
    keyId: buyerKeyId,
    chainId,
    mall,
  });
  const buyerPub = buyerDerived.spki;

  const dek = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const json = te.encode(JSON.stringify(fields));
  const compressed = await deflateRaw(json);
  const useDeflate = !!compressed && compressed.length < json.length;
  const body = useDeflate ? compressed : json;
  const plain = pad(body);

  const adminKeyIds = adminKeys.map((k) => k.keyId);
  const flags = FLAGS_REQUIRED;
  const aad = await buildAad({
    chainId,
    mall,
    buyer: buyer.account,
    productId,
    supplier,
    merchantKeyId,
    buyerKeyId,
    adminKeyIds,
    flags,
  });

  const key = await aesKey(dek, "encrypt");
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
      key,
      plain
    )
  );

  const boxes = [];
  for (const a of adminKeys) boxes.push(await wrapDek(a.spki, dek));
  boxes.push(await wrapDek(mSpki, dek));
  boxes.push(await wrapDek(buyerPub, dek));

  const header = new Uint8Array(HEADER);
  header[0] = VERSION;
  header[OFF_FLAGS] = flags;
  header.set(u16be(HEADER), OFF_HEADER_LEN);
  header.set(u32be(merchantKeyId), OFF_MERCHANT_KEY);
  header.set(u32be(buyerKeyId), OFF_BUYER_KEY);
  for (let i = 0; i < MAX_ADMIN_KEYS; i++) {
    header.set(u32be(i < adminKeyIds.length ? adminKeyIds[i] : 0), OFF_ADMIN_KEYS + i * 4);
  }
  header[OFF_ADMIN_COUNT] = adminKeyIds.length;
  header[OFF_RESERVED] =
    (useDeflate ? RESERVED_DEFLATE : 0) |
    (buyerDerived.method === SIG_PERSONAL ? RESERVED_PERSONAL_SIGN : 0);
  header.set(iv, OFF_IV);

  const blob = concat(header, ...boxes, ct);
  if (blob.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`加密后 ${blob.length} 字节，超过上限 ${MAX_PAYLOAD_BYTES}，请缩短地址或备注`);
  }
  return blob;
}

// ─────────────────────────────────────────────────────────────
//  Parsing
// ─────────────────────────────────────────────────────────────

/** Parses a v3 blob header. Throws on anything the contract would reject. */
export function parseEnvelope(blob) {
  const b = blob instanceof Uint8Array ? blob : unhex(blob);
  if (b.length < HEADER + TAG) throw new Error("载荷过短");
  if (b[0] !== VERSION) throw new Error(`不支持的载荷版本：${b[0]}`);
  if (readU16(b, OFF_HEADER_LEN) !== HEADER) throw new Error("载荷头损坏");

  const flags = b[OFF_FLAGS];
  if (flags & 0xf8) throw new Error("载荷标志非法");
  if ((flags & FLAGS_REQUIRED) !== FLAGS_REQUIRED) throw new Error("载荷缺少收件人副本");

  const adminCount = b[OFF_ADMIN_COUNT];
  if (adminCount < 1 || adminCount > MAX_ADMIN_KEYS) throw new Error("管理员副本数量非法");

  const adminKeyIds = [];
  for (let i = 0; i < MAX_ADMIN_KEYS; i++) adminKeyIds.push(readU32(b, OFF_ADMIN_KEYS + i * 4));

  const boxCount = adminCount + 2;
  const boxesEnd = HEADER + boxCount * BOX;
  if (b.length < boxesEnd + TAG) throw new Error("载荷长度与管理员数量不符");

  const boxes = [];
  for (let i = 0; i < boxCount; i++) boxes.push(b.slice(HEADER + i * BOX, HEADER + (i + 1) * BOX));

  return {
    version: VERSION,
    flags,
    merchantKeyId: readU32(b, OFF_MERCHANT_KEY),
    buyerKeyId: readU32(b, OFF_BUYER_KEY),
    adminKeyIds: adminKeyIds.slice(0, adminCount),
    adminCount,
    compressed: (b[OFF_RESERVED] & RESERVED_DEFLATE) !== 0,
    buyerSignedWith:
      (b[OFF_RESERVED] & RESERVED_PERSONAL_SIGN) !== 0 ? SIG_PERSONAL : SIG_TYPED,
    iv: b.slice(OFF_IV, OFF_IV + 12),
    adminBoxes: boxes.slice(0, adminCount),
    merchantBox: boxes[adminCount],
    buyerBox: boxes[adminCount + 1],
    ciphertext: b.slice(boxesEnd),
  };
}

/** Everything the AAD needs, taken from a chain order record. */
function orderContext(order) {
  if (!order) throw new Error("缺少订单信息");
  for (const k of ["buyer", "supplier", "productId"]) {
    if (order[k] === undefined || order[k] === null) throw new Error(`缺少订单字段：${k}`);
  }
  return order;
}

async function aadFor(env, order, chainId, mall) {
  const o = orderContext(order);
  return buildAad({
    chainId,
    mall,
    buyer: o.buyer,
    productId: o.productId,
    supplier: o.supplier,
    merchantKeyId: env.merchantKeyId,
    buyerKeyId: env.buyerKeyId,
    adminKeyIds: env.adminKeyIds,
    flags: env.flags,
  });
}

async function openWithDek(dek, env, aad) {
  const key = await aesKey(dek, "decrypt");
  const plain = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: env.iv, additionalData: aad, tagLength: 128 },
      key,
      env.ciphertext
    )
  );
  const body = unpad(plain);
  const json = env.compressed ? await inflateRaw(body) : body;
  return JSON.parse(td.decode(json));
}

// ─────────────────────────────────────────────────────────────
//  Opening
// ─────────────────────────────────────────────────────────────

/** Buyer opens their own order (uses the buyer box). */
export async function openAsBuyer({ signer, account, keyId, blob, order, chainId, mall }) {
  const env = parseEnvelope(blob);
  const aad = await aadFor(env, order, chainId, mall);
  const kid = keyId === undefined ? env.buyerKeyId : keyId;
  // Reproduce the exact method that was used at seal time, otherwise the derived key differs.
  const d = await buyerScalar({
    signer,
    account,
    keyId: kid,
    chainId,
    mall,
    preferredMethod: env.buyerSignedWith,
  });
  return openWithDek(await unwrapDek(d, env.buyerBox), env, aad);
}

/** Merchant opens an order addressed to them (uses the merchant box). */
export async function openAsMerchant({ signer, account, keyId, blob, order, chainId, mall }) {
  const env = parseEnvelope(blob);
  const aad = await aadFor(env, order, chainId, mall);
  const kid = keyId === undefined ? env.merchantKeyId : keyId;
  const d = await merchantScalar({ signer, account, keyId: kid, chainId, mall });
  return openWithDek(await unwrapDek(d, env.merchantBox), env, aad);
}

/**
 * Admin opens an order. `keyId` must be one of the ids recorded in the envelope; `deriveVersion` is
 * the per-account EIP-712 version stored next to that key (`getAdminKey(keyId).deriveVersion`).
 */
export async function openAsAdmin({
  signer,
  account,
  keyId,
  deriveVersion = 0,
  blob,
  order,
  chainId,
  mall,
}) {
  const env = parseEnvelope(blob);
  const idx = env.adminKeyIds.indexOf(keyId);
  if (idx < 0) throw new Error("该订单没有为你的管理员密钥封装副本");
  const aad = await aadFor(env, order, chainId, mall);
  const d = await adminScalar({ signer, account, keyId: deriveVersion, chainId, mall });
  return openWithDek(await unwrapDek(d, env.adminBoxes[idx]), env, aad);
}

// ─────────────────────────────────────────────────────────────
//  Helpers for the UI
// ─────────────────────────────────────────────────────────────

/** Splits a blob into the 2048-byte pieces the contract stores. */
export function chunkCount(blob) {
  const n = blob instanceof Uint8Array ? blob.length : unhex(blob).length;
  return Math.ceil(n / 2048);
}

/** Whether `keyId` appears in the envelope's admin set. */
export function canAdminOpen(blob, keyId) {
  return parseEnvelope(blob).adminKeyIds.includes(keyId);
}

export const ENVELOPE = {
  VERSION,
  HEADER,
  BOX,
  TAG,
  MAX_ADMIN_KEYS,
  MAX_PAYLOAD_BYTES,
  MIN_BYTES: HEADER + 3 * BOX + TAG,
  PAD_BLOCK,
};

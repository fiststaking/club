// Chain access: config loading, wallet connection, contract handles.
//
// Ethers is loaded as a global (UMD) by each page, so this module only wraps it.

let cfgPromise;

/** Loads ./config.json once. Throws a readable error when CI has not injected it. */
export function loadConfig() {
  if (!cfgPromise) {
    cfgPromise = fetch("./config.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("config.json 缺失或不可读"))))
      .then((c) => {
        for (const k of ["chainId", "mall", "paymentToken"]) {
          if (!c[k]) throw new Error(`config.json 缺少 ${k}`);
        }
        // ethers v6 refuses any mixed-case address whose EIP-55 checksum is wrong, and the throw
        // happens wherever that field is first used. A single wrong capital letter in `registry`
        // therefore showed up as "Failed to read: bad address checksum" in "My orders" instead of
        // pointing at config.json. Validate every address here, at load time, naming the field.
        for (const k of ["mall", "registry", "merchantModule", "paymentToken"]) {
          if (!c[k]) continue;
          try {
            getEthers().getAddress(c[k]);
          } catch {
            throw new Error(
              `config.json 的 ${k} 不是合法的 EIP-55 地址（校验和错误）：${c[k]}`
            );
          }
        }
        return c;
      });
  }
  return cfgPromise;
}

export function getEthers() {
  if (!globalThis.ethers) throw new Error("ethers 尚未加载");
  return globalThis.ethers;
}

const RPC_KEY = "ecomall.rpc";

export function customRpc() {
  try {
    return localStorage.getItem(RPC_KEY) || "";
  } catch {
    return "";
  }
}

export function setCustomRpc(url) {
  try {
    if (url) localStorage.setItem(RPC_KEY, url);
    else localStorage.removeItem(RPC_KEY);
  } catch {
    /* private mode */
  }
}

// ── RPC resilience ────────────────────────────────────────────────────────────
// ethers' default per-request timeout is 300 000 ms (5 minutes). With a single endpoint, one dead
// or rate-limited RPC therefore froze the whole shop for minutes: no products, no orders, no error,
// just "loading". Every request is now bounded and failed over across the configured endpoints.
const RPC_TIMEOUT_MS = 6000; // per request, per endpoint
const RPC_PROBE_MS = 4000; // startup race to pick a live endpoint
const RPC_COOLDOWN_MS = 60_000; // a failed endpoint is skipped for a minute
const MAX_TRIES = 4; // endpoints tried per request

/** All configured endpoints, highest priority first. */
export function rpcCandidates(cfg) {
  const out = [];
  const add = (u) => {
    const s = String(u || "").trim();
    if (/^https?:\/\//i.test(s) && !out.includes(s)) out.push(s);
  };
  add(customRpc()); // explicit user override wins
  for (const u of Array.isArray(cfg.rpcUrls) ? cfg.rpcUrls : []) add(u);
  add(cfg.rpcUrl);
  return out;
}

function raceTimeout(promise, ms, label) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error(`RPC 超时（${label}，${ms}ms）`);
      e.rpcTimeout = true;
      reject(e);
    }, ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

/**
 * Distinguishes "this node failed" from "the chain answered".
 *
 * A contract revert (`CALL_EXCEPTION`) is a valid answer: the call was wrong, not the endpoint.
 * Treating it as a node failure made every legitimate revert mark all endpoints dead for a minute
 * and surface as "RPC 全部不可用", hiding the real error (e.g. `EcoMall_NotAuthorized`).
 */
function isTransportError(e) {
  if (!e) return true;
  if (e.rpcTimeout) return true;
  if (e.revert != null || e.data != null) return false;
  const code = e.code || "";
  if (
    code === "CALL_EXCEPTION" ||
    code === "INSUFFICIENT_FUNDS" ||
    code === "NONCE_EXPIRED" ||
    code === "REPLACEMENT_UNDERPRICED" ||
    code === "UNPREDICTABLE_GAS_LIMIT"
  ) {
    return false;
  }
  if (code === "NETWORK_ERROR" || code === "SERVER_ERROR" || code === "TIMEOUT" || code === "BAD_DATA") {
    return true;
  }
  if (typeof e.status === "number") return e.status === 429 || e.status >= 500;
  return true; // anything unrecognised is treated as a transport problem
}

/**
 * Read-only provider with per-request timeout and automatic endpoint failover.
 *
 * The returned object is a real `JsonRpcProvider`, so every ethers API keeps working; only its
 * transport (`send`) is replaced, which is the single choke point every read funnels through.
 * The configured RPC comes FIRST on purpose: reading through the injected wallet makes every query
 * depend on whichever chain the wallet happens to be on (a wallet left on Ethereum mainnet would
 * answer `getAmountTiers()` with an empty array and the shop would look empty).
 */
export async function readProvider(cfg) {
  const { JsonRpcProvider, BrowserProvider } = getEthers();
  const urls = rpcCandidates(cfg);
  if (urls.length === 0) {
    if (globalThis.ethereum) return new BrowserProvider(globalThis.ethereum);
    throw new Error("no RPC available: set rpcUrl / rpcUrls in config.json");
  }

  const chainId = Number(cfg.chainId);
  const providers = urls.map(
    (u) => new JsonRpcProvider(u, chainId, { staticNetwork: true })
  );
  // Capture the untouched transports before replacing the primary's `send`.
  const sends = providers.map((p) => p.send.bind(p));
  const downUntil = new Map();
  let active = 0;

  // Pick the fastest live endpoint so the first product load does not wait on a dead primary.
  const probe = (i) =>
    raceTimeout(sends[i]("eth_chainId", []), RPC_PROBE_MS, urls[i])
      .then((v) => (String(v) === "0x" + chainId.toString(16) ? i : -1))
      .catch(() => {
        downUntil.set(urls[i], Date.now() + RPC_COOLDOWN_MS);
        return -1;
      });
  const first = await Promise.race([
    new Promise((resolve) => {
      urls.forEach((_, i) => probe(i).then((ok) => ok >= 0 && resolve(ok)));
    }),
    new Promise((resolve) => setTimeout(() => resolve(-1), RPC_PROBE_MS + 500)),
  ]);
  if (first >= 0) active = first;

  const primary = providers[active];
  primary.send = async (method, params) => {
    let lastErr;
    let tried = 0;
    for (let step = 0; step < urls.length && tried < MAX_TRIES; step++) {
      const i = (active + step) % urls.length;
      const cooling = (downUntil.get(urls[i]) || 0) > Date.now();
      if (cooling && step < urls.length - 1) continue; // skip a known-bad endpoint
      tried++;
      try {
        const out = await raceTimeout(sends[i](method, params), RPC_TIMEOUT_MS, urls[i]);
        downUntil.delete(urls[i]);
        active = i; // stick with what works
        return out;
      } catch (e) {
        // A revert or a preflight failure is the chain's answer: propagate it untouched.
        if (!isTransportError(e)) throw e;
        downUntil.set(urls[i], Date.now() + RPC_COOLDOWN_MS);
        lastErr = e;
      }
    }
    throw new Error(
      `RPC 全部不可用（已尝试 ${tried} 个节点）：${lastErr ? lastErr.message : "unknown"}`
    );
  };

  return primary;
}


/** Connects the wallet and returns { provider, signer, account, chainId }. */
export async function connectWallet(cfg) {
  const { BrowserProvider } = getEthers();
  if (!globalThis.ethereum) throw new Error("未检测到钱包，请安装 MetaMask / TokenPocket 等");
  const provider = new BrowserProvider(globalThis.ethereum);
  await provider.send("eth_requestAccounts", []);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== Number(cfg.chainId)) {
    throw new Error(`请把钱包切换到 chainId ${cfg.chainId}（当前 ${net.chainId}）`);
  }
  const signer = await provider.getSigner();
  const account = await signer.getAddress();
  return { provider, signer, account, chainId: Number(cfg.chainId) };
}

export function mallContract(runner, cfg, abi) {
  return new (getEthers().Contract)(cfg.mall, abi, runner);
}

export function moduleContract(runner, cfg, abi) {
  if (!cfg.merchantModule) throw new Error("config.json 缺少 merchantModule");
  return new (getEthers().Contract)(cfg.merchantModule, abi, runner);
}

export function tokenContract(runner, cfg, abi) {
  return new (getEthers().Contract)(cfg.paymentToken, abi, runner);
}

export function registryContract(runner, cfg, abi) {
  if (!cfg.registry) return null;
  return new (getEthers().Contract)(cfg.registry, abi, runner);
}

/** Short 0x1234…abcd form. */
export function short(a) {
  const s = String(a || "");
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

/** Formats an 18-decimal USD integer as a plain number string. */
export function fmtUsd(v) {
  const { formatUnits } = getEthers();
  return formatUnits(v, 18);
}

/** Converts a USD integer (18 decimals) into payment-token units. */
export function usdToToken(v, decimals) {
  const { parseUnits, formatUnits } = getEthers();
  if (Number(decimals) === 18) return v;
  return parseUnits(formatUnits(v, 18), Number(decimals));
}

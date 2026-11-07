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

/**
 * Read-only provider.
 *
 * The configured RPC comes FIRST on purpose. Reading through the injected wallet makes every query
 * depend on whichever chain the wallet happens to be on: a wallet left on Ethereum mainnet would
 * answer `getAmountTiers()` with an empty array and the shop would look like it has no products,
 * even though the mall is live on BSC. Pinning the read provider to `cfg.chainId` removes that
 * failure mode entirely; the wallet is only a fallback when no RPC is configured.
 */
export async function readProvider(cfg) {
  const { JsonRpcProvider, BrowserProvider } = getEthers();
  const url = customRpc() || cfg.rpcUrl;
  if (url) {
    return new JsonRpcProvider(url, Number(cfg.chainId), { staticNetwork: true });
  }
  if (globalThis.ethereum) return new BrowserProvider(globalThis.ethereum);
  throw new Error("no RPC available: set rpcUrl in config.json");
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

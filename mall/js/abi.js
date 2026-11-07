// Minimal ABIs, kept in human-readable form so they stay readable in review.
// Ethers v6 accepts these strings directly.

export const MALL_ABI = [
  // buyer
  "function placeOrder(uint256 productId, uint256 maxAmountUsd, bytes payload) returns (uint256)",
  "function placeOrderWithBNB(uint256 productId, uint256 maxAmountUsd, uint256 maxBnbIn, bytes payload) payable returns (uint256)",
  "function unlockOrder(uint256 orderId)",
  "function updateOrderInfo(uint256 orderId, bytes payload)",
  "function orderCount() view returns (uint256)",
  "function productCount() view returns (uint256)",
  "function getProductInfo(uint256 id) view returns (string name, uint256 amountUsd, address supplier, bool active)",
  "function getOrderInfo(uint256 orderId) view returns (address buyer, address supplier, uint256 productId, uint256 amountUsd, uint256 refundAmount, uint256 createdAt, uint8 status, bytes payload)",
  "function getOrderEnvelope(uint256 orderId) view returns (uint32 supplierKeyId, uint32 buyerKeyId, uint8 adminCount, bytes32 adminSetHash, uint256 payloadChunks, bool pruned)",
  "function quoteBnbForUsd(uint256 amountUsd) view returns (uint256)",
  "function unlockProgress(uint256 orderId) view returns (uint256 requiredFarmUsd, uint256 credit, uint256 consumedUsd, bool forceUnlocked, bool unlocked)",
  "function merchantKeyVersion(address) view returns (uint32)",
  "function buyerKeyVersion(address) view returns (uint32)",
  "function decryptability(uint256 orderId) view returns (bool supplierOk, uint8 liveAdminKeys, bool supplierRevoked)",

  // admin: erase sealed envelopes of finished orders (record is kept)
  "function purgePayloads(uint256[] orderIds) returns (uint256 purged)",
  "function purgeOrders(uint256[] orderIds) returns (uint256 purged)",
  "function MAX_PURGE_BATCH() view returns (uint256)",

  // admin facet (reached through the same address via fallback)
  "function isAdmin(address account) view returns (bool)",
  "function registerMerchantKey(bytes spki) returns (uint32)",
  "function registerAdminKey(bytes spki) returns (uint32)",
  "function revokeAdminKey()",
  "function rotateBuyerKey() returns (uint32)",
  "function getActiveAdminKeys() view returns (uint32[])",
  "function activeAdminKeyCount() view returns (uint256)",
  "function getAdminKey(uint32 id) view returns (bytes32 fingerprint, address keyOwner, uint64 createdAt, bool revoked, uint32 deriveVersion, bytes spki)",
  "function getCurrentMerchantKey(address merchant) view returns (uint32 version, bytes spki)",
  "function getAmountTiers() view returns (uint256[])",
  "function getProductsByAmountPaged(uint256 amountUsd, uint256 offset, uint256 limit) view returns (uint256[] ids, string[] names, address[] suppliers, bool[] actives)",
  "function getUserOrderIdsPaged(address user, uint256 offset, uint256 limit) view returns (uint256[] ids)",
  "function getSupplierOrderIdsPaged(address supplier, uint256 offset, uint256 limit) view returns (uint256[] ids)",
  "function getUserOrderCount(address user) view returns (uint256)",
  "function getSupplierOrderCount(address supplier) view returns (uint256)",
  "function adminKeyOf(address) view returns (uint32)",
  "function adminKeyDeriveVersion(address) view returns (uint32)",
  "function paused() view returns (bool)",
  "function hopSlippageBp() view returns (uint256)",
  "function finalSlippageBp() view returns (uint256)",
  "function burnFallbackToDead() view returns (bool)",
  "function setHopSlippageBp(uint256 slippageBp_)",
  "function setFinalSlippageBp(uint256 slippageBp_)",
  "function setBurnFallbackToDead(bool enabled)",
  "function bnbEnabled() view returns (bool)",
  "function paymentDecimals() view returns (uint8)",
];

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const REGISTRY_ABI = [
  "function allMalls() view returns (address[])",
  "function activeMalls() view returns (address[])",
  "function latestMall() view returns (address)",
  "function versionCount() view returns (uint256)",
  "function getVersion(uint32 id) view returns (address mall, address merchantModule, uint32 envelopeVersion, uint64 deployedAt, bool active, string label)",
];

export const MODULE_ABI = [
  "function isMerchant(address) view returns (bool)",
  "function merchantPubKey(address) view returns (bytes)",
  "function setMerchantPubKey(bytes spki)",
  "function canSubmit(address) view returns (bool)",
  "function canAdmin(address) view returns (bool)",

  // self-service listing: no approval step
  "function addProduct(string name, uint256 amountUsd) returns (uint256)",
  "function updateProduct(uint256 productId, string name, uint256 amountUsd)",
  "function setProductActive(uint256 productId, bool active)",
  "function removeProduct(uint256 productId)",
  "function getMerchantProductCount(address) view returns (uint256)",
  "function getMerchantProductsPaged(address, uint256 offset, uint256 limit) view returns (uint256[] ids)",

  // admin moderation (takedown only)
  "function delistProduct(uint256 productId)",
  "function setMerchant(address merchant, bool allowed)",
];

// Order-status labels live in js/i18n.js (`statusLabel`) so they follow the selected language.

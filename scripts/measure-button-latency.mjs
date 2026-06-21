// One-off: measure real press latency on the LIVE button, to tune the grace
// window. Fires a few gasless presses through the live relay and times how long
// each takes to (a) get relayed, (b) become visible onchain (getButton.lastPress
// changes), plus a chain-time inclusion estimate (press block ts − latest block
// ts sampled at submit). Run from bon-dashboard/: node scripts/measure-button-latency.mjs
import { Account, Address, Transaction } from "@multiversx/sdk-core";

const API = "https://testnet-api.multiversx.com";
const RELAY = "https://supernova-sprint.xyz/api/relay";
const BUTTON = "erd1qqqqqqqqqqqqqpgqm4z4vf7h2y0dmcadrj66ucxkda7950mqppuqz09pgl";
const RELAYER = "erd1ru08dt4u5e0psfrwth38u0dfed0hw8289xqdd9yghl3ec24uppuq6hgphm";
const CHAIN = "T";
const N = 6;
const SPACING_MS = 4500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decodeU64 = (b64) => {
  if (!b64) return 0;
  const bin = Buffer.from(b64, "base64");
  let v = 0n;
  for (const byte of bin) v = (v << 8n) | BigInt(byte);
  return Number(v);
};

async function shard0Account() {
  // generate fresh accounts until one lands in shard 0 (relayer's shard)
  for (let i = 0; i < 500; i++) {
    const acc = Account.newFromMnemonic(
      (await import("@multiversx/sdk-core")).Mnemonic.generate().toString(),
    );
    const pub = acc.address.getPublicKey();
    const last = pub[pub.length - 1];
    let shard = last & 3;
    if (shard > 2) shard = last & 1;
    if (shard === 0) return acc;
  }
  throw new Error("no shard-0 key");
}

async function getButton() {
  const r = await fetch(`${API}/vm-values/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scAddress: BUTTON, funcName: "getButton", args: [] }),
  });
  const j = await r.json();
  const rd = j?.data?.data?.returnData || [];
  return { roundId: decodeU64(rd[0]), lastPress: decodeU64(rd[1]) };
}

async function latestBlockTs() {
  try {
    const r = await fetch(`${API}/blocks?size=1&fields=timestamp`);
    const j = await r.json();
    return (Array.isArray(j) && j[0]?.timestamp) || 0;
  } catch {
    return 0;
  }
}

async function txInfo(hash) {
  try {
    const r = await fetch(`${API}/transactions/${hash}?fields=status,timestamp`);
    if (!r.ok) return { status: "pending", timestamp: 0 };
    const j = await r.json();
    return { status: j?.status || "pending", timestamp: j?.timestamp || 0 };
  } catch {
    return { status: "pending", timestamp: 0 };
  }
}

const acc = await shard0Account();
console.log("ephemeral:", acc.address.toBech32());
// fresh key -> nonce 0
let nonce = 0;
try {
  const r = await fetch(`${API}/accounts/${acc.address.toBech32()}`);
  if (r.ok) nonce = (await r.json()).nonce || 0;
} catch {}

const relayDeltas = [];
const visibleDeltas = [];
const inclusionChain = [];

for (let i = 0; i < N; i++) {
  const before = await getButton();
  const blockTs0 = await latestBlockTs();
  const t0 = Date.now();

  const tx = new Transaction({
    sender: acc.address,
    receiver: Address.newFromBech32(BUTTON),
    gasLimit: 8_000_000n,
    chainID: CHAIN,
    value: 0n,
    data: new Uint8Array(Buffer.from("press")),
    nonce: BigInt(nonce++),
    version: 2,
  });
  tx.relayer = Address.newFromBech32(RELAYER);
  tx.signature = await acc.signTransaction(tx);

  let txHash;
  try {
    const res = await fetch(RELAY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: tx.toPlainObject() }),
    });
    const out = await res.json();
    if (!res.ok || out.error) {
      console.log(`#${i + 1} relay error:`, out.error || res.status, out.message || "");
      await sleep(SPACING_MS);
      continue;
    }
    txHash = out.txHash;
  } catch (e) {
    console.log(`#${i + 1} relay request failed:`, e.message);
    await sleep(SPACING_MS);
    continue;
  }
  const tRelayed = Date.now();
  relayDeltas.push(tRelayed - t0);

  // wait until getButton.lastPress reflects this press (onchain-visible)
  let tVisible = 0;
  for (let p = 0; p < 40; p++) {
    await sleep(250);
    const now = await getButton();
    if (now.lastPress !== before.lastPress) {
      tVisible = Date.now();
      break;
    }
  }
  if (tVisible) visibleDeltas.push(tVisible - t0);

  // chain-time inclusion estimate (offset-free): press block ts − latest block ts at submit
  const info = await txInfo(txHash);
  if (info.timestamp && blockTs0) {
    inclusionChain.push(info.timestamp - blockTs0); // same unit; this network's ts is ms
  }

  console.log(
    `#${i + 1} relay=${tRelayed - t0}ms visible=${tVisible ? tVisible - t0 : "?"}ms ` +
      `status=${info.status} inclChain=${info.timestamp && blockTs0 ? info.timestamp - blockTs0 : "?"} hash=${txHash.slice(0, 10)}…`,
  );
  await sleep(SPACING_MS);
}

const stat = (a) => {
  if (!a.length) return "n/a";
  const s = [...a].sort((x, y) => x - y);
  const med = s[Math.floor(s.length / 2)];
  return `min=${s[0]} med=${med} max=${s[s.length - 1]} (n=${s.length})`;
};
console.log("\n=== summary ===");
console.log("submit→relayed (ms): ", stat(relayDeltas));
console.log("submit→onchain-visible (ms):", stat(visibleDeltas));
console.log("inclusion chain-time (raw units, ~ms on this net):", stat(inclusionChain));

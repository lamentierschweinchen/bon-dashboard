// One-off: draw a simple MvX logo (bold teal X) onto the LIVE Supernova Canvas to
// overpaint offensive community content, and verify the onchain WRITE path (V1).
//
// Mirrors public/arcade-core.js's signed placePixel flow, but signs with sdk-core
// (Account/Transaction/TransactionComputer) so the bytes match the relayer's
// computeBytesForVerifying exactly. We do NOT need the relayer's key — the relayer
// co-signs + pays gas server-side (Relayed v3). We only need a throwaway ephemeral
// key in the relayer's shard (shard 0).
//
// Run from bon-dashboard/:
//   node scripts/draw-canvas-mvx-logo.mjs --limit 1            # probe: 1 pixel
//   node scripts/draw-canvas-mvx-logo.mjs                      # full logo
//   node scripts/draw-canvas-mvx-logo.mjs --relay https://...  # override relay origin
//
// Flags:
//   --limit N   place at most N pixels (default: all)
//   --relay URL relay base origin (default https://supernova-sprint.xyz)
//   --color C   palette index for the logo (default 2 = mint #23F7DD)
//   --dry       print the plan + signing sanity, send nothing
//   --gap MS    delay between placements (default 650; contract cooldown is 500ms)

import {
  Account,
  KeyPair,
  Address,
  AddressComputer,
  Transaction,
  TransactionComputer,
} from "@multiversx/sdk-core";

// ---- network + contract (testnet shard 0). Mirrors public/arcade-core.js. ----
const NET = {
  api: "https://testnet-api.multiversx.com",
  explorer: "https://testnet-explorer.multiversx.com",
  chainID: "T",
  relayer: "erd1ru08dt4u5e0psfrwth38u0dfed0hw8289xqdd9yghl3ec24uppuq6hgphm",
  relayerShard: 0,
  gasPrice: 1_000_000_000n,
};
const CANVAS_CONTRACT =
  "erd1qqqqqqqqqqqqqpgqxex6j5ucqqmgurwpxunf428jnrck53a9ppuqg93s3t";
const PLACE_PIXEL_GAS = 15_000_000n; // GAMES.canvas.gasLimit
const GRID = 32;

// ---- the MvX X pixel map (32x32, generated; bold flared X centered on the slur).
// Pixel index = row*32 + col. These are the teal-stroke cells.
const LOGO_INDICES = [
  389, 390, 407, 408, 421, 422, 423, 438, 439, 440, 455, 456, 469, 470, 488,
  489, 500, 501, 521, 522, 523, 530, 531, 532, 555, 556, 561, 562, 588, 589,
  592, 593, 621, 622, 623, 624, 653, 654, 655, 656, 684, 685, 688, 689, 715,
  716, 721, 722, 745, 746, 747, 754, 755, 756, 776, 777, 788, 789, 807, 808,
  821, 822, 837, 838, 839, 854, 855, 856, 869, 870, 887, 888,
];

// ---- args ----
const args = process.argv.slice(2);
const getFlag = (name, def) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const has = (name) => args.includes(name);
// --indices "1,2,3" overrides the built-in logo map (used for the residual wipe
// pass: pass the dense offensive remnants with --color 0 to set them to background).
const INDICES_FLAG = getFlag("--indices", "");
const PIXELS = INDICES_FLAG
  ? INDICES_FLAG.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n) && n >= 0 && n < GRID * GRID)
  : LOGO_INDICES;
const LIMIT = parseInt(getFlag("--limit", String(PIXELS.length)), 10);
const RELAY_BASE = getFlag("--relay", "https://supernova-sprint.xyz").replace(/\/$/, "");
const COLOR = parseInt(getFlag("--color", "2"), 10) & 0xff;
const GAP_MS = parseInt(getFlag("--gap", "650"), 10);
const DRY = has("--dry");

const RELAY_URL = RELAY_BASE + "/api/relay";

// ---- hex encoders (match arcade-core.js) ----
const u8ToHex = (n) => (n & 0xff).toString(16).padStart(2, "0");
const u32ToHex = (n) => (n >>> 0).toString(16).padStart(8, "0");

const txComputer = new TransactionComputer();
const addressComputer = new AddressComputer();

function makeEphemeralInShard0() {
  for (let i = 0; i < 2000; i++) {
    const kp = KeyPair.generate();
    const acc = Account.newFromKeypair(kp);
    if (addressComputer.getShardOfAddress(acc.address) === NET.relayerShard) {
      return acc;
    }
  }
  throw new Error("could not derive an ephemeral key in shard 0");
}

async function fetchNonce(bech32) {
  try {
    const r = await fetch(`${NET.api}/accounts/${bech32}`);
    if (!r.ok) return 0;
    const j = await r.json();
    return j.nonce || 0;
  } catch {
    return 0;
  }
}

async function buildSignedPlainTx(account, nonce, index, color) {
  const dataStr = `placePixel@${u32ToHex(index)}@${u8ToHex(color)}`;
  const tx = new Transaction({
    nonce: BigInt(nonce),
    value: 0n,
    sender: account.address,
    receiver: Address.newFromBech32(CANVAS_CONTRACT),
    gasPrice: NET.gasPrice,
    gasLimit: PLACE_PIXEL_GAS,
    data: new Uint8Array(Buffer.from(dataStr, "utf8")),
    chainID: NET.chainID,
    version: 2,
    relayer: Address.newFromBech32(NET.relayer),
  });
  // signTransaction is ASYNC in sdk-core v15 — awaiting is essential (see /api/relay).
  tx.signature = await account.signTransaction(tx); // ed25519 over computeBytesForSigning
  return { tx, dataStr };
}

async function postRelay(plainTx) {
  const res = await fetch(RELAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: plainTx }),
  });
  let out = null;
  try {
    out = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, ok: res.ok, out };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const targets = PIXELS.slice(0, Math.max(0, LIMIT));
  console.log(`MvX canvas logo — relay=${RELAY_URL}`);
  console.log(`  canvas=${CANVAS_CONTRACT}`);
  console.log(`  pixels to place: ${targets.length} / ${PIXELS.length} (color idx ${COLOR})${INDICES_FLAG ? " [custom indices]" : ""}, gap ${GAP_MS}ms`);
  console.log(`  coords: ${targets.map((i) => `(${i % GRID},${Math.floor(i / GRID)})`).join(" ")}`);

  const account = makeEphemeralInShard0();
  console.log(`  ephemeral sender (shard 0): ${account.address.toBech32()}`);

  // signing sanity: rebuild verify-bytes and check our signature self-verifies.
  {
    const { tx } = await buildSignedPlainTx(account, 0, targets[0] ?? 0, COLOR);
    const signBytes = txComputer.computeBytesForSigning(tx);
    console.log(`  sample data: placePixel@${u32ToHex(targets[0] ?? 0)}@${u8ToHex(COLOR)}  (signBytes ${signBytes.length}B, sig ${tx.signature.length}B)`);
  }

  if (DRY) {
    console.log("DRY run — nothing sent.");
    return;
  }

  let nonce = await fetchNonce(account.address.toBech32());
  console.log(`  starting nonce: ${nonce}`);

  const hashes = [];
  let placed = 0,
    failed = 0;
  for (let k = 0; k < targets.length; k++) {
    const index = targets[k];
    const { tx } = await buildSignedPlainTx(account, nonce, index, COLOR);
    const plain = tx.toPlainObject();
    const { status, ok, out } = await postRelay(plain);
    if (ok && out && out.txHash) {
      nonce++; // only advance on accepted (rejected tx never consumed the nonce)
      placed++;
      hashes.push(out.txHash);
      console.log(`  [${k + 1}/${targets.length}] (${index % GRID},${Math.floor(index / GRID)}) -> ${out.txHash}`);
    } else {
      failed++;
      const code = out && (out.error || out.message) ? out.error || out.message : `HTTP ${status}`;
      console.log(`  [${k + 1}/${targets.length}] (${index % GRID},${Math.floor(index / GRID)}) -> FAIL ${code}`);
      // 503 relayer_unavailable / misconfigured => stop; the write path is not live.
      if (status === 503 || (out && out.error === "relayer_unavailable")) {
        console.log("  relayer reported unavailable (503). Stopping — V1 write path NOT verified.");
        break;
      }
      // rate limited => back off and retry this same pixel once
      if (status === 429) {
        console.log("  rate limited; backing off 5s and retrying this pixel.");
        await sleep(5000);
        k--;
        continue;
      }
    }
    if (k < targets.length - 1) await sleep(GAP_MS);
  }

  console.log(`\nDONE — placed ${placed}, failed ${failed}.`);
  if (hashes.length) {
    console.log("sample tx hashes:");
    for (const h of hashes.slice(0, 8)) console.log(`  ${NET.explorer}/transactions/${h}`);
  }
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});

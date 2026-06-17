// src/app/api/relay/route.ts
//
// Gasless relayer for the Supernova Sprint onchain leaderboard (Relayed v3).
//
// The player builds and signs a `submitScore` transaction in the browser with an
// ephemeral keypair (no wallet, no funds). They POST the signed transaction
// here. This route adds the RELAYER signature (Relayed v3) and broadcasts it,
// so the RELAYER pays the testnet gas and the player pays nothing.
//
// TRUST MODEL: the relayer is a trusted component. It pays gas and can refuse or
// rate-limit. It only signs transactions that (a) call `submitScore` on the
// known leaderboard contract, (b) name THIS relayer in the `relayer` field,
// (c) carry no EGLD value, and (d) ask for gas within a sane cap. It does not
// validate the SCORE itself: v1 scores are client-computed and spoofable by
// design (see the contract + the brief). That is acceptable for a fun community
// leaderboard on a test network.
//
// RELAYED v3 SHARD RULE: the transaction sender (ephemeral key) must be in the
// same shard as the relayer. The client guarantees this by generating the
// ephemeral key in the relayer's shard before signing. This route also rejects
// a sender in a different shard, so a bad client gets a clear error instead of a
// protocol-level failure.
//
// KEY HANDLING: the relayer signing key is read from process.env only. Set
// RELAYER_PEM (full PEM file contents) OR RELAYER_SECRET_KEY (64-hex secret key)
// as a Vercel env var. Never hardcoded, never committed.

import { NextResponse } from "next/server";
import {
  Account,
  AddressComputer,
  Transaction,
  TransactionComputer,
  UserSecretKey,
  UserVerifier,
} from "@multiversx/sdk-core";
import {
  CHAIN_ID,
  LEADERBOARD_CONTRACT,
  RELAYER_ADDRESS,
  SUBMIT_FUNCTION,
  SUBMIT_GAS_LIMIT,
  TESTNET_GATEWAY,
  TESTNET_EXPLORER,
} from "@/lib/onchain/leaderboard.config";

// The plain-object shape accepted by Transaction.newFromPlainObject, derived
// from the function signature so we do not depend on the type's export name.
type PlainTxObject = Parameters<typeof Transaction.newFromPlainObject>[0];

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // sdk-core crypto needs the Node runtime

// A hard ceiling on relayed gas so a malicious client cannot drain the relayer.
const MAX_RELAYED_GAS_LIMIT = SUBMIT_GAS_LIMIT + 100_000;

const addressComputer = new AddressComputer();
const txComputer = new TransactionComputer();

// Lightweight in-memory rate limit per client IP. The relayer pays gas, so this
// caps spam from a single source. Best-effort only: it resets on cold start and
// is per-instance, not a substitute for a real shared limiter, but it raises the
// cost of trivially draining the relayer. Tune as needed.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12; // submissions per IP per window
const rateHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateHits.set(ip, hits);
  // opportunistic cleanup so the map does not grow unbounded
  if (rateHits.size > 5000) {
    for (const [k, v] of rateHits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateHits.delete(k);
    }
  }
  return hits.length > RATE_MAX;
}

/** Load the relayer account from env. Returns null if no key is configured. */
async function loadRelayer(): Promise<Account | null> {
  const pem = process.env.RELAYER_PEM;
  const secretHex = process.env.RELAYER_SECRET_KEY;

  if (pem && pem.trim().length > 0) {
    return Account.newFromPem(pem);
  }
  if (secretHex && secretHex.trim().length > 0) {
    const secretKey = UserSecretKey.fromString(secretHex.trim());
    return new Account(secretKey);
  }
  return null;
}

export async function POST(request: Request) {
  let relayer: Account | null;
  try {
    relayer = await loadRelayer();
  } catch (err) {
    console.error("[/api/relay] Failed to load relayer key:", err);
    return NextResponse.json(
      { error: "relayer_misconfigured" },
      { status: 500 },
    );
  }

  // No key configured: tell the client cleanly so it can fail soft (the game
  // still plays and reveals; the onchain card just shows an unavailable state).
  if (!relayer) {
    return NextResponse.json(
      {
        error: "relayer_unavailable",
        message:
          "The gasless relayer is not configured. Set RELAYER_PEM or RELAYER_SECRET_KEY.",
      },
      { status: 503 },
    );
  }

  // Rate limit per client IP (the relayer pays gas; cap single-source spam).
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "too many submissions, slow down" },
      { status: 429 },
    );
  }

  // Sanity: the configured key must match the advertised relayer address.
  if (relayer.address.toBech32() !== RELAYER_ADDRESS) {
    console.error(
      "[/api/relay] Relayer key/address mismatch. key:",
      relayer.address.toBech32(),
      "expected:",
      RELAYER_ADDRESS,
    );
    return NextResponse.json(
      { error: "relayer_misconfigured" },
      { status: 500 },
    );
  }

  // Parse the signed transaction sent by the client.
  let plain: Record<string, unknown>;
  try {
    const body = await request.json();
    plain = body?.transaction ?? body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let tx: Transaction;
  try {
    tx = Transaction.newFromPlainObject(plain as unknown as PlainTxObject);
  } catch (err) {
    console.error("[/api/relay] Bad transaction object:", err);
    return NextResponse.json({ error: "invalid_transaction" }, { status: 400 });
  }

  // ---- validation: only relay what we intend to pay for ----

  // chain
  if (tx.chainID !== CHAIN_ID) {
    return NextResponse.json(
      { error: "wrong_chain", message: `expected chainID ${CHAIN_ID}` },
      { status: 400 },
    );
  }

  // receiver must be the leaderboard contract
  const receiver = tx.receiver.toBech32();
  if (receiver !== LEADERBOARD_CONTRACT) {
    return NextResponse.json(
      { error: "wrong_receiver", message: "not the leaderboard contract" },
      { status: 400 },
    );
  }

  // function must be submitScore
  const data = Buffer.from(tx.data ?? new Uint8Array()).toString("utf8");
  if (!data.startsWith(`${SUBMIT_FUNCTION}@`)) {
    return NextResponse.json(
      { error: "wrong_function", message: `only ${SUBMIT_FUNCTION} is relayed` },
      { status: 400 },
    );
  }

  // no value transfer
  if (tx.value !== BigInt(0)) {
    return NextResponse.json(
      { error: "value_not_allowed", message: "value must be 0" },
      { status: 400 },
    );
  }

  // the relayer field must name THIS relayer
  const relayerField = tx.relayer?.toBech32?.() ?? "";
  if (relayerField !== RELAYER_ADDRESS) {
    return NextResponse.json(
      { error: "wrong_relayer", message: "relayer field must be this relayer" },
      { status: 400 },
    );
  }

  // sender must be signed and present
  if (!tx.signature || tx.signature.length === 0) {
    return NextResponse.json(
      { error: "unsigned", message: "sender signature missing" },
      { status: 400 },
    );
  }

  // gas cap
  if (tx.gasLimit > BigInt(MAX_RELAYED_GAS_LIMIT)) {
    return NextResponse.json(
      { error: "gas_too_high", message: "gas limit exceeds relayer cap" },
      { status: 400 },
    );
  }

  // Relayed v3 shard rule: sender must be in the relayer's shard.
  try {
    const senderShard = addressComputer.getShardOfAddress(tx.sender);
    const relayerShard = addressComputer.getShardOfAddress(relayer.address);
    if (senderShard !== relayerShard) {
      return NextResponse.json(
        {
          error: "wrong_shard",
          message: `sender must be in shard ${relayerShard}`,
        },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error("[/api/relay] Shard check failed:", err);
    return NextResponse.json({ error: "invalid_transaction" }, { status: 400 });
  }

  // verify the sender's signature over the canonical signing bytes, so the
  // relayer never pays for a transaction the player did not actually sign
  try {
    const verifyBytes = txComputer.computeBytesForVerifying(tx);
    const verifier = UserVerifier.fromAddress(tx.sender);
    // verify() is async in sdk-core v15; awaiting is essential, otherwise the
    // returned Promise is always truthy and the check is a no-op.
    const valid = await verifier.verify(verifyBytes, Buffer.from(tx.signature));
    if (!valid) {
      return NextResponse.json(
        { error: "bad_signature", message: "sender signature invalid" },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error("[/api/relay] Signature verification error:", err);
    return NextResponse.json(
      { error: "bad_signature", message: "could not verify sender signature" },
      { status: 400 },
    );
  }

  // ---- sign as relayer and broadcast ----
  try {
    const relayerSignature = await relayer.signTransaction(tx);
    tx.relayerSignature = relayerSignature;

    const hash = await broadcast(tx);
    return NextResponse.json({
      txHash: hash,
      sender: tx.sender.toBech32(),
      explorerUrl: `${TESTNET_EXPLORER}/transactions/${hash}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "broadcast failed";
    console.error("[/api/relay] Broadcast failed:", message);
    return NextResponse.json(
      { error: "broadcast_failed", message },
      { status: 502 },
    );
  }
}

/**
 * Broadcast a fully-signed transaction to the testnet gateway and return the
 * transaction hash. Uses the gateway's /transaction/send endpoint directly to
 * keep the dependency surface small.
 */
async function broadcast(tx: Transaction): Promise<string> {
  const payload = tx.toPlainObject();
  const res = await fetch(`${TESTNET_GATEWAY}/transaction/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || json?.error) {
    throw new Error(json?.error || `gateway ${res.status}`);
  }
  const hash = json?.data?.txHash;
  if (!hash) {
    throw new Error("gateway returned no txHash");
  }
  return hash;
}

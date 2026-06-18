// Onchain TAP-COUNTER config for the Supernova Sprint "/onchain" experiment.
//
// This is a SEPARATE contract from the leaderboard. The "/onchain" page fires a
// real `recordTaps` transaction per tap (or per buffered window) and counts the
// ones that actually finalize on testnet. It reuses the same network, the same
// gasless relayer, and the same Relayed-v3 shard rule as the leaderboard path.
//
// NETWORK: MultiversX TESTNET, the public network currently running Supernova
// (600ms rounds), so each recordTaps finalizes on the Supernova clock. Testnet
// EGLD is free (faucet), so the relayer pays no real cost. Testnet can be reset,
// which would clear the counters; the UI frames it accordingly.
//
// These values are safe to expose to the client (addresses + public endpoints).
// The relayer SIGNING KEY is NOT here; it is read from process.env in the API
// route only (see app/api/relay/route.ts).

// Re-export the shared network + relayer values from the leaderboard config so
// there is a single source of truth for chain id, gateway, explorer, gas price,
// the relayer address, and the shard count.
export {
  CHAIN_ID,
  TESTNET_API,
  TESTNET_GATEWAY,
  TESTNET_EXPLORER,
  GAS_PRICE,
  RELAYER_ADDRESS,
  NUM_SHARDS,
} from "./leaderboard.config";

/**
 * The deployed tap-counter contract address on testnet.
 *
 * Deployed from the project's funded deployer wallet (the same wallet that
 * deployed the leaderboard) at its nonce 1, so this address differs from the
 * leaderboard's and the live leaderboard is untouched.
 *
 * Override with NEXT_PUBLIC_TAP_COUNTER_CONTRACT if the contract is redeployed
 * (a redeploy uses the next nonce and yields a different address). Always
 * confirm against the deploy output / DEPLOYED.md in the contract dir.
 */
export const TAP_COUNTER_CONTRACT =
  process.env.NEXT_PUBLIC_TAP_COUNTER_CONTRACT ||
  "erd1qqqqqqqqqqqqqpgq9tmxfe7dm4ndgzt4cx9z83mrj750kgnuenwscvaddk";

/** The contract endpoint the relayer is allowed to relay for taps. */
export const RECORD_TAPS_FUNCTION = "recordTaps";

/**
 * Gas limit for a recordTaps call. Two small storage writes + one event;
 * generous but capped. The relayer rejects transactions asking for more than
 * this. (Measured deploy/query left ~1.49e9 gas remaining out of 1.5e9 for a
 * read; a write of two u64 counters is comfortably under this.)
 */
export const RECORD_TAPS_GAS_LIMIT = 6_000_000;

/**
 * Per-call cap on `count`, mirrored from the contract's MAX_TAPS_PER_CALL.
 * The client clamps bundled windows to this; the contract also enforces it.
 */
export const MAX_TAPS_PER_CALL = 1_000;

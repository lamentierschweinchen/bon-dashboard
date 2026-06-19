// Onchain TRANSFER config for the Supernova Sprint "/onchain" experiment.
//
// The "/onchain" page fires a real value-0, EMPTY-DATA transfer per tap and
// counts the ones that actually finalize on testnet. A bare move-balance tx
// finalizes faster than a contract call (no VM, no storage), which is the point
// of the finality demo. It reuses the same network, the same gasless relayer,
// and the same Relayed-v3 shard rule as the leaderboard path.
//
// Intra-shard (default): the ephemeral sender transfers to its OWN shard-0
// address (a self-transfer). Cross-shard (the Unlimited toggle): it transfers to
// the fixed shard-1 sink below, so the tx hops shards and finality trails.
//
// NETWORK: MultiversX TESTNET, the public network currently running Supernova
// (600ms rounds), so each transfer finalizes on the Supernova clock. Testnet
// EGLD is free (faucet), so the relayer pays no real cost.
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
 * The fixed CROSS-SHARD SINK — a plain account deployed in SHARD 1. The
 * Unlimited cross-shard toggle sends each tap's value-0 transfer here; from a
 * shard-0 sender that is a CROSS-shard tx, so finality visibly trails. It is a
 * plain account (not a contract), so value-0 transfers to it are harmless
 * no-ops. The intra-shard default never uses this (it self-transfers).
 *
 * Override with NEXT_PUBLIC_CROSS_SHARD_SINK to point at a different shard-1
 * address. Whatever address is used must be in shard 1 for the cross-shard hop.
 */
export const CROSS_SHARD_SINK =
  process.env.NEXT_PUBLIC_CROSS_SHARD_SINK ||
  "erd1f0c93h5px8vwwrr3q9z3rv9h0d55mmezfw988x8ecuvvnkjcenwsl4evkl";

// NOTE: the old tap-counter contracts (the shard-0 intra one and the shard-1
// cross one) are no longer used — taps are now bare transfers, not recordTaps
// calls. The contracts stay deployed on testnet but the relayer no longer
// relays recordTaps. Their addresses and the recordTaps function/gas/cap
// constants were removed along with that path.

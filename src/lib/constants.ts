// src/lib/constants.ts

/** BoN API base URL. */
export const BON_API_BASE = "https://api.battleofnodes.com";

/** Official Battle of Nodes launch moment (Unix timestamp). 2026-03-11 13:00:00 UTC. */
export const BON_LAUNCH_TS = 1773234000;

/** Supernova activation moment (Unix timestamp). 2026-03-16 09:00:00 UTC. */
export const SUPERNOVA_ACTIVATION_TS = 1773651600;

/** Launch happened inside this epoch. */
export const BON_LAUNCH_EPOCH = 2033;

/**
 * Exact network-wide count of blocks with timestamp >= BON_LAUNCH_TS inside epoch 2033.
 * Derived via descending-order binary search on /blocks?epoch=2033.
 */
export const BON_LAUNCH_PARTIAL_BLOCKS_E2033 = 9456;

/**
 * Public API replication lag tolerance for sync detection.
 * The /nodes endpoint nonces lag ~25-60 blocks behind /network/status nonces
 * due to API indexer refresh intervals. 100 blocks accommodates this lag
 * while still catching genuinely out-of-sync nodes.
 */
export const SYNC_TOLERANCE_BLOCKS = 100;

/** Backup naming convention used by the validator track. */
export const BACKUP_NAME_REGEX = /-backup-BoN-/i;

/** Editorial classification: identities considered official infrastructure. */
export const OFFICIAL_INFRA_IDENTITIES = new Set(["multiversx"]);

/** Editorial classification: name patterns considered official infrastructure. */
export const OFFICIAL_INFRA_NAME_PATTERNS = [/^DO-SHADOWFORK-BON-ID-/i];

/** Editorial classification: owner addresses considered official infrastructure. */
export const OFFICIAL_INFRA_OWNERS = new Set<string>([]);

/** Editorial classification: provider addresses considered official infrastructure. */
export const OFFICIAL_INFRA_PROVIDERS = new Set<string>([]);

/** Client polling interval in milliseconds. */
export const SNAPSHOT_POLL_MS = 15_000;

/** Server-side cache TTL in milliseconds. */
export const CACHE_TTL_MS = 15_000;

/** Stale data threshold in milliseconds. If snapshot is older than this, show stale indicator.
 *  Set to 5 minutes — with CDN stale-while-revalidate=3 days, normal refresh cycles
 *  complete within 30-60s and should never trigger this. Only fires when something is
 *  genuinely broken (BoN API down, Vercel errors, etc.). */
export const STALE_THRESHOLD_MS = 300_000;

import type { ControlRoomLocalApiStatus } from "./types";
import { fetchJsonIfAvailable } from "./workspace";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return null;
}

function getMetricsRecord(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const metrics = (data as { metrics?: unknown }).metrics;
  if (!metrics || typeof metrics !== "object") {
    return null;
  }

  return metrics as Record<string, unknown>;
}

function getHeartbeatList(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const maybeList = (data as { heartbeats?: unknown }).heartbeats;
  return Array.isArray(maybeList) ? maybeList : null;
}

export async function loadLocalNodeApiStatus(
  port: number,
): Promise<ControlRoomLocalApiStatus | null> {
  const baseUrl = `http://127.0.0.1:${port}/node`;
  const [statusPayload, heartbeatPayload] = await Promise.all([
    fetchJsonIfAvailable(`${baseUrl}/status`),
    fetchJsonIfAvailable(`${baseUrl}/heartbeatstatus`),
  ]);

  if (!statusPayload && !heartbeatPayload) {
    return null;
  }

  const metrics = getMetricsRecord(statusPayload);
  const heartbeats = getHeartbeatList(heartbeatPayload);
  const activeHeartbeats = heartbeats
    ? heartbeats.filter((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }

        return Boolean((entry as { isActive?: unknown }).isActive);
      }).length
    : null;

  return {
    port,
    source: `${baseUrl}/status`,
    available: true,
    displayName:
      typeof metrics?.erd_node_display_name === "string"
        ? metrics.erd_node_display_name
        : null,
    syncing: toBoolean(metrics?.erd_is_syncing),
    nonce: toNumber(metrics?.erd_nonce),
    highestNonce: toNumber(metrics?.erd_probable_highest_nonce),
    nodeType:
      typeof metrics?.erd_node_type === "string"
        ? metrics.erd_node_type
        : null,
    redundancyLevel: toNumber(metrics?.erd_redundancy_level),
    heartbeatCount: heartbeats?.length ?? null,
    heartbeatActive: activeHeartbeats,
  };
}

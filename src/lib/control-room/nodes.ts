import path from "node:path";
import type { ControlRoomNodeRuntime } from "./types";
import { loadLocalNodeApiStatus } from "./local-node";
import {
  displayPath,
  pickLatestTimestamp,
  readdirIfExists,
  readTextIfExists,
  statIfExists,
} from "./workspace";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readTomlString(text: string, key: string) {
  const match = new RegExp(`${escapeRegex(key)}\\s*=\\s*"([^"]*)"`, "m").exec(
    text,
  );
  return match?.[1] ?? null;
}

function readTomlNumber(text: string, key: string) {
  const match = new RegExp(`${escapeRegex(key)}\\s*=\\s*(-?\\d+)`, "m").exec(
    text,
  );

  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function readSessionValue(text: string, key: string) {
  const escaped = escapeRegex(key);
  const colonMatch = new RegExp(`^${escaped}:(.+)$`, "m").exec(text);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  const equalsMatch = new RegExp(`^${escaped}\\s*=\\s*(.+)$`, "m").exec(text);
  return equalsMatch?.[1]?.trim() ?? null;
}

function getPort(restApiInterface: string | null) {
  if (!restApiInterface) {
    return null;
  }

  const match = /:(\d+)$/.exec(restApiInterface);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function namingRuleForNode(
  displayName: string | null,
  redundancyLevel: number | null,
) {
  if (!displayName) {
    return {
      namingRule: null,
      namingPass: null,
    };
  }

  const expectedPattern =
    redundancyLevel !== null && redundancyLevel > 0
      ? /^.+-backup-BoN-\d+$/
      : /^.+-BoN-\d+$/;

  return {
    namingRule:
      redundancyLevel !== null && redundancyLevel > 0
        ? "Expect <name>-backup-BoN-<n>"
        : "Expect <name>-BoN-<n>",
    namingPass: expectedPattern.test(displayName),
  };
}

async function loadLogSignals(logDir: string) {
  const entries = await readdirIfExists(logDir);
  const logFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
    .map((entry) => entry.name)
    .sort();

  const latestLogName = logFiles.at(-1) ?? null;
  const latestLogPath = latestLogName ? path.join(logDir, latestLogName) : null;
  const latestLogStat = latestLogPath ? await statIfExists(latestLogPath) : null;
  const latestLogText = latestLogPath ? await readTextIfExists(latestLogPath) : null;

  let trieSyncEvidence = false;
  let redundancyKeyEvidence = false;

  for (const logName of [...logFiles].reverse()) {
    if (trieSyncEvidence && redundancyKeyEvidence) {
      break;
    }

    const text = await readTextIfExists(path.join(logDir, logName));
    if (!text) {
      continue;
    }

    if (!trieSyncEvidence && text.includes("trie sync in progress")) {
      trieSyncEvidence = true;
    }

    if (
      !redundancyKeyEvidence &&
      text.includes("generated BLS private key for redundancy handler")
    ) {
      redundancyKeyEvidence = true;
    }
  }

  return {
    latestLogPath: displayPath(latestLogPath) ?? latestLogName,
    latestLogTimestamp: latestLogStat?.mtime.toISOString() ?? null,
    logCount: logFiles.length,
    startEvidence: latestLogText?.includes("starting node") ?? false,
    trieSyncEvidence,
    redundancyKeyEvidence,
  };
}

export async function loadNodeRuntime(
  nodePath: string,
  nodeKey: string,
): Promise<ControlRoomNodeRuntime | null> {
  const prefsPath = path.join(nodePath, "config", "prefs.toml");
  const sessionInfoPath = path.join(nodePath, "stats", "session.info");
  const logDir = path.join(nodePath, "logs");
  const [prefsText, sessionText, logSignals] = await Promise.all([
    readTextIfExists(prefsPath),
    readTextIfExists(sessionInfoPath),
    loadLogSignals(logDir),
  ]);

  if (!prefsText && !sessionText && logSignals.logCount === 0) {
    return null;
  }

  const displayName =
    readTomlString(prefsText ?? "", "NodeDisplayName") ??
    readSessionValue(sessionText ?? "", "display-name");
  const redundancyLevel = readTomlNumber(prefsText ?? "", "RedundancyLevel");
  const sessionRedundancyLevel = (() => {
    const value = readSessionValue(sessionText ?? "", "redundancy-level");
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  })();
  const restApiInterface = readSessionValue(sessionText ?? "", "rest-api-interface");
  const localPort = getPort(restApiInterface);
  const localApi =
    localPort !== null ? await loadLocalNodeApiStatus(localPort) : null;
  const naming = namingRuleForNode(
    displayName,
    redundancyLevel ?? sessionRedundancyLevel,
  );

  return {
    nodeKey,
    displayName,
    redundancyLevel,
    sessionRedundancyLevel,
    shardId: readSessionValue(sessionText ?? "", "ShardId"),
    restApiInterface,
    appVersion: readSessionValue(sessionText ?? "", "AppVersion"),
    latestLogPath: logSignals.latestLogPath,
    latestLogTimestamp: pickLatestTimestamp(logSignals.latestLogTimestamp),
    logCount: logSignals.logCount,
    startEvidence: logSignals.startEvidence,
    trieSyncEvidence: logSignals.trieSyncEvidence,
    redundancyKeyEvidence: logSignals.redundancyKeyEvidence,
    namingRule: naming.namingRule,
    namingPass: naming.namingPass,
    localApi,
  };
}

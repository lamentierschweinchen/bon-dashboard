import { promises as fs } from "node:fs";
import path from "node:path";

const defaultWorkspaceRoot = path.resolve(process.cwd(), "..");

export const workspaceRoot = path.resolve(
  process.env.BON_WORKSPACE_ROOT || defaultWorkspaceRoot,
);

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

export function workspacePath(...segments: string[]) {
  return path.join(workspaceRoot, ...segments);
}

export function workspaceDisplayPath(...segments: string[]) {
  return toPosixPath(path.join(...segments));
}

export function displayPath(filePath: string | null | undefined) {
  if (!filePath) {
    return null;
  }

  const resolved = path.resolve(filePath);
  const relative = path.relative(workspaceRoot, resolved);

  if (
    relative &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  ) {
    return toPosixPath(relative);
  }

  return path.basename(resolved);
}

export async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  const text = await readTextIfExists(filePath);

  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}

export async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function statIfExists(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readdirIfExists(rootPath: string) {
  try {
    return await fs.readdir(rootPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function sortByFreshness<
  T extends { updatedAt?: string | null; createdAt?: string | null },
>(values: T[]) {
  return [...values].sort((left, right) => {
    const leftValue = left.updatedAt ?? left.createdAt ?? "";
    const rightValue = right.updatedAt ?? right.createdAt ?? "";
    return rightValue.localeCompare(leftValue);
  });
}

export function pickLatestTimestamp(
  ...values: Array<string | null | undefined>
) {
  return (
    [...values]
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ?? null
  );
}

export async function fetchJsonIfAvailable(
  url: string,
  timeoutMs = 1_200,
): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

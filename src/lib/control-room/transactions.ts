import type { ControlRoomTxArtifact } from "./types";
import { displayPath, readJsonIfExists } from "./workspace";

type TxArtifactJson = {
  emittedTransaction?: {
    nonce?: number;
    value?: string;
    receiver?: string;
    sender?: string;
    gasLimit?: number;
  };
  emittedTransactionData?: string;
  emittedTransactionHash?: string;
};

function parseAtomicToDisplay(
  value: string | null | undefined,
  decimals = 18,
): string | null {
  if (!value) {
    return null;
  }

  try {
    const atomic = BigInt(value);
    const base = BigInt(10) ** BigInt(decimals);
    const whole = atomic / base;
    const fraction = atomic % base;

    if (fraction === BigInt(0)) {
      return whole.toString();
    }

    const padded = fraction.toString().padStart(decimals, "0");
    return `${whole.toString()}.${padded.replace(/0+$/, "")}`;
  } catch {
    return null;
  }
}

export function parseHexAtomicToDisplay(
  value: string | null | undefined,
  decimals = 18,
) {
  if (!value) {
    return null;
  }

  try {
    return parseAtomicToDisplay(BigInt(`0x${value}`).toString(), decimals);
  } catch {
    return null;
  }
}

export function parseTxMethod(rawData: string | null | undefined) {
  if (!rawData) {
    return {
      method: null,
      arguments: [] as string[],
    };
  }

  const [method, ...argumentsList] = rawData.split("@");

  return {
    method: method || null,
    arguments: argumentsList.filter(Boolean),
  };
}

export async function loadTxArtifact(
  key: string,
  label: string,
  filePath: string,
): Promise<ControlRoomTxArtifact> {
  const payload = await readJsonIfExists<TxArtifactJson>(filePath);

  if (!payload) {
    return {
      key,
      label,
      filePath: displayPath(filePath) ?? filePath,
      present: false,
      txHash: null,
      sender: null,
      receiver: null,
      nonce: null,
      gasLimit: null,
      method: null,
      arguments: [],
      rawData: null,
      valueAtomic: null,
      valueEgld: null,
    };
  }

  const rawData = payload.emittedTransactionData ?? null;
  const parsed = parseTxMethod(rawData);

  return {
    key,
    label,
    filePath: displayPath(filePath) ?? filePath,
    present: true,
    txHash: payload.emittedTransactionHash ?? null,
    sender: payload.emittedTransaction?.sender ?? null,
    receiver: payload.emittedTransaction?.receiver ?? null,
    nonce: payload.emittedTransaction?.nonce ?? null,
    gasLimit: payload.emittedTransaction?.gasLimit ?? null,
    method: parsed.method,
    arguments: parsed.arguments,
    rawData,
    valueAtomic: payload.emittedTransaction?.value ?? null,
    valueEgld: parseAtomicToDisplay(payload.emittedTransaction?.value ?? null),
  };
}

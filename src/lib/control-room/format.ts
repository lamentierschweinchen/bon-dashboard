const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(value: number | null) {
  return value === null ? "—" : numberFormatter.format(value);
}

export function formatIso(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function shortAddress(value: string | null, start = 10, end = 6) {
  if (!value) {
    return "—";
  }

  if (value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

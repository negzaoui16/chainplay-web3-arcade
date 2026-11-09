/**
 * ChainPlay - Data Formatters & Unit Converters
 *
 * Provides safe string, address, currency, and time formatting.
 * Zero `any` types, strict null handling.
 */

import { formatEther as viemFormatEther, parseEther as viemParseEther } from "viem";

/**
 * Truncates an EVM hex address with an ellipsis for compact UI display.
 * Example: "0x1234567890abcdef1234567890abcdef12345678" -> "0x1234...5678"
 */
export function formatAddress(
  addr?: string | null,
  prefixLen: number = 6,
  suffixLen: number = 4
): string {
  if (!addr || typeof addr !== "string") {
    return "";
  }

  const clean = addr.trim();
  if (clean.length <= prefixLen + suffixLen + 2) {
    return clean;
  }

  return `${clean.slice(0, prefixLen)}...${clean.slice(-suffixLen)}`;
}

/**
 * Formats a wei BigInt value into a human-readable Ether string with optional decimal trimming.
 * Trailing zeroes after decimal are cleanly stripped.
 * Examples:
 *   50000000000000000n -> "0.05"
 *   1000000000000000000n -> "1"
 *   0n -> "0"
 */
export function formatEther(
  wei?: bigint | null,
  maxDecimals: number = 4
): string {
  if (wei === null || wei === undefined) {
    return "0";
  }

  try {
    const rawEth = viemFormatEther(wei);
    const [intPart, decPart] = rawEth.split(".");

    if (!decPart) {
      return intPart ?? "0";
    }

    const trimmedDec = decPart.slice(0, maxDecimals).replace(/0+$/, "");
    if (!trimmedDec) {
      return intPart ?? "0";
    }

    return `${intPart}.${trimmedDec}`;
  } catch {
    return "0";
  }
}

/**
 * Safely parses a decimal Ether string into wei BigInt.
 * Sanitizes comma separators and empty inputs.
 */
export function parseEther(amount: string): bigint {
  if (!amount || typeof amount !== "string") {
    return 0n;
  }

  const sanitized = amount.trim().replace(",", ".");
  if (!sanitized || sanitized === "." || isNaN(Number(sanitized))) {
    return 0n;
  }

  try {
    return viemParseEther(sanitized);
  } catch {
    return 0n;
  }
}

/**
 * Formats countdown seconds into "MM:SS" representation.
 * Clamps negative values to "00:00".
 * Examples:
 *   60 -> "01:00"
 *   9  -> "00:09"
 *   125 -> "02:05"
 *   -5 -> "00:00"
 */
export function formatCountdown(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) {
    return "00:00";
  }

  const totalSecs = Math.floor(seconds);
  const minutes = Math.floor(totalSecs / 60);
  const remainingSecs = totalSecs % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(remainingSecs).padStart(2, "0");

  return `${mm}:${ss}`;
}

/**
 * Formats an epoch timestamp (milliseconds or seconds) into a localized readable date-time string.
 * Example: 1730725200000 -> "Nov 4, 13:00"
 */
export function formatTimestamp(
  ts: number,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!ts || isNaN(ts) || ts <= 0) {
    return "--";
  }

  // If timestamp is in seconds (< 100 billion), convert to milliseconds
  const ms = ts < 100_000_000_000 ? ts * 1000 : ts;
  const date = new Date(ms);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  };

  return date.toLocaleDateString(undefined, defaultOptions);
}

/**
 * Formats a wager amount with symbol.
 * Example: 60000000000000000000n -> "60 CPT"
 */
export function formatWager(
  wei?: bigint | null,
  symbol: string = "CPT"
): string {
  return `${formatEther(wei)} ${symbol}`;
}

/**
 * Formats basis points (BPS) into percentage string.
 * Example: 250 -> "2.5%"
 */
export function formatPercent(bps: number): string {
  const pct = (bps / 100).toFixed(1).replace(/\.0$/, "");
  return `${pct}%`;
}

/**
 * General purpose number formatter with thousand separators.
 */
export function formatNumber(value: number, maxDecimals: number = 2): string {
  if (isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

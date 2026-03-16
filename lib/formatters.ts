/**
 * Format large numbers: 1234 → "1.23K", 1234567 → "1.23M"
 */
export function formatNumber(n: number): string {
  if (n < 1_000) return Math.floor(n).toString();
  if (n < 1_000_000) return (n / 1_000).toFixed(2).replace(/\.?0+$/, "") + "K";
  if (n < 1_000_000_000)
    return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "B";
}

/**
 * Format a duration in ms to a human-readable string
 * e.g. 3723000 → "1h 2min 3s"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

/**
 * Format gold amount with coin icon
 */
export function formatGold(gold: number): string {
  return `${formatNumber(gold)} 🪙`;
}

/**
 * Format XP progress: "1,234 / 5,678 XP"
 */
export function formatXp(current: number, required: number): string {
  return `${formatNumber(current)} / ${formatNumber(required)} XP`;
}

/**
 * Turning raw numbers into the labels people see.
 */

/** 76 → "$70–80k". Salaries are always shown as bands, never exact. */
export function salaryBand(thousands) {
  const low = Math.floor(thousands / 10) * 10;
  return `$${low}–${low + 10}k`;
}

/** 0 → "Before grad", 1 → "1 month", 7 → "7 months". */
export function monthsLabel(months) {
  if (months === 0) return "Before grad";
  const m = Math.round(months);
  return m === 1 ? "1 month" : `${m} months`;
}

/** Short form for stat tiles: 0 → "Before grad", 5 → "5 mo". */
export function monthsShort(months) {
  if (months === null || months === undefined) return "–";
  return months === 0 ? "Before grad" : `${Math.round(months)} mo`;
}

/** Speed bucket used for colour: good ≤ 4 months, mid ≤ 8, slow above. */
export function speed(months) {
  if (months <= 4) return "good";
  if (months <= 8) return "mid";
  return "slow";
}

export function speedColor(months) {
  return `var(--${speed(months)})`;
}

export function timeAgo(days) {
  if (days < 1) return "today";
  if (days < 30) return `${days} days ago`;
  if (days < 60) return "1 month ago";
  return `${Math.floor(days / 30)} months ago`;
}

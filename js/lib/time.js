/** "Submitted 5 minutes ago"-style times. */

const UNITS = [
  ["year", 365 * 24 * 60],
  ["month", 30 * 24 * 60],
  ["week", 7 * 24 * 60],
  ["day", 24 * 60],
  ["hour", 60],
  ["minute", 1],
];

/** 1715400000000 → "just now" / "5 minutes ago" / "2 days ago" / "1 year ago". "" if unknown. */
export function timeAgo(ms, now = Date.now()) {
  const t = Number(ms);
  if (!t) return "";
  const minutes = Math.max(0, Math.floor((now - t) / 60_000));
  if (minutes < 1) return "just now";
  for (const [unit, size] of UNITS) {
    const n = Math.floor(minutes / size);
    if (n >= 1) return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
}

/** Keep every [data-submitted] label under `root` up to date (once a minute). */
export function keepTimesFresh(root) {
  const update = () => root.querySelectorAll("[data-submitted]").forEach((el) => {
    const ago = timeAgo(el.dataset.submitted);
    if (ago) el.textContent = `Submitted ${ago}`;
  });
  setInterval(update, 60_000);
}

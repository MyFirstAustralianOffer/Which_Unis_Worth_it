/**
 * Result card: one grad's outcome. Returns an HTML string.
 *   compact: true → fewer details (used in the home-page hero)
 */
import { esc } from "../lib/dom.js";
import { salaryBand, monthsLabel, speed, timeAgo } from "../lib/format.js";

export function resultCard(r, { compact = false } = {}) {
  const badges = [
    r.verified ? `<span class="tick" title="Verified grad">✓</span>` : "",
    r.isMine ? `<span class="pill you">You</span>` : "",
    compact ? "" : `<span class="pill">${esc(r.level)}</span>`,
  ].join(" ");

  const meta = compact
    ? [`🏛 ${esc(r.uni)}`, `🎓 ${r.year}`, `💵 ${salaryBand(r.salary)}`]
    : [
        `🏛 ${esc(r.uni)}`,
        `🎓 Class of ${r.year}`,
        `💵 ${salaryBand(r.salary)}`,
        `🧭 ${esc(r.route)}`,
        `🌏 ${esc(r.type)}`,
        `🕒 ${r.isMine ? "just now" : timeAgo(r.daysAgo)}`,
      ];

  return `
    <article class="rcard">
      <div class="t">${esc(r.course)} ${badges}</div>
      <div class="right">
        <div class="months ${speed(r.months)}">${monthsLabel(r.months)}</div>
        <div class="sub">to first job in field</div>
      </div>
      <div class="meta">${meta.map((m) => `<span>${m}</span>`).join("")}</div>
    </article>`;
}

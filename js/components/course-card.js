/**
 * Course card: median time-to-job and typical salary for one course.
 * Links to the database pre-filtered to that course.
 */
import { esc } from "../lib/dom.js";
import { salaryBand, speedColor } from "../lib/format.js";

const SCALE_MONTHS = 14; // a full bar = 14 months

export function courseCard(s) {
  const width = Math.max(6, Math.min(100, (s.medianMonths / SCALE_MONTHS) * 100));
  const color = speedColor(s.medianMonths);
  return `
    <a class="ccard" href="#/database?q=${encodeURIComponent(s.course)}">
      <div class="row">
        <h3>${esc(s.course)}</h3>
        <span class="pill">${s.count} demo results</span>
      </div>
      <div class="row">
        <div>
          <div class="big" style="color:${color}">${Math.round(s.medianMonths)}<span> mo</span></div>
          <small>median to first job</small>
        </div>
        <div style="text-align:right">
          <b style="font-size:18px">${salaryBand(s.medianSalary)}</b><br><small>typical start</small>
        </div>
      </div>
      <div class="bar"><i style="width:${width}%;background:${color}"></i></div>
    </a>`;
}

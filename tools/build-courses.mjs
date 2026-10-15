#!/usr/bin/env node
/**
 * Builds data/courses.json, the list of real Australian university course
 * titles used for the form's suggestions.
 *
 *   node tools/build-courses.mjs path/to/return-on-uni-courses.txt
 *
 * Input: the export made from the CRICOS register (data.gov.au):
 *   line 1:  #META {"source": "...", "levels": [...], "unis": [...]}
 *   then one course per line:  Course title|level indexes|university indexes
 *   e.g.     Master of Data Science|1|16,30
 *
 * Output: data/courses.json
 *   { source, built, levels: [...], unis: [...], courses: [[title, "levels", [uni indexes]], ...] }
 *   (kept compact: GitHub Pages gzips it to roughly 90 KB)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node tools/build-courses.mjs path/to/return-on-uni-courses.txt");
  process.exit(1);
}

const lines = readFileSync(input, "utf8").split(/\r?\n/).filter(Boolean);
const metaLine = lines.shift();
if (!metaLine.startsWith("#META ")) throw new Error("First line must start with #META");
const meta = JSON.parse(metaLine.slice(6));

const seen = new Set();
const courses = [];
for (const line of lines) {
  const [title, levels, unis] = line.split("|");
  const name = title.replace(/\s+/g, " ").trim();
  if (!name || seen.has(name.toLowerCase())) continue;
  seen.add(name.toLowerCase());
  courses.push([name, levels.split(",").join(""), unis.split(",").map(Number)]);
}
courses.sort((a, b) => a[0].localeCompare(b[0]));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "data"), { recursive: true });
const out = { source: meta.source, built: new Date().toISOString().slice(0, 10), levels: meta.levels, unis: meta.unis, courses };
writeFileSync(join(root, "data/courses.json"), JSON.stringify(out));

const byLevel = meta.levels.map((l, i) => `${l} ${courses.filter((c) => c[1].includes(String(i))).length}`);
console.log(`Wrote data/courses.json: ${courses.length} courses across ${meta.unis.length} universities (${byLevel.join(", ")})`);

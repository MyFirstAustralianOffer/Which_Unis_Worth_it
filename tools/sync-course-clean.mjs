#!/usr/bin/env node
/**
 * Copies the course-cleaning rules from apps-script/Code.gs into
 * js/lib/course-clean.js, so the website's "Did you mean…?" hints and the
 * Google script always use exactly the same rules.
 *
 *   node tools/sync-course-clean.mjs
 *
 * Edit the rules in Code.gs (between the >>> and <<< markers), then run this.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gs = readFileSync(join(root, "apps-script/Code.gs"), "utf8");
const block = gs.match(/\/\/ >>> COURSE-CLEAN START\n([\s\S]*?)\/\/ <<< COURSE-CLEAN END/);
if (!block) throw new Error("COURSE-CLEAN markers not found in apps-script/Code.gs");

const out = `/**
 * Course-name cleaning rules, shared with the Google script.
 *
 * GENERATED from apps-script/Code.gs by tools/sync-course-clean.mjs.
 * Don't edit here: edit Code.gs, then run  node tools/sync-course-clean.mjs
 */
/* eslint-disable no-var */
${block[1]}
export { COURSES, COURSE_ALIASES, tidyCourseText, stripCourseLevel, titleCaseCourse, courseEditDistance, closestCourse, cleanCourse };
`;
writeFileSync(join(root, "js/lib/course-clean.js"), out);
console.log("Wrote js/lib/course-clean.js");

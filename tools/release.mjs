#!/usr/bin/env node
/**
 * Version-stamps every CSS, JS and data file so browsers always load the
 * latest copy after a change (no more clearing the cache).
 *
 *   node tools/release.mjs
 *
 * Run it before committing. It adds ?v=<fingerprint> to:
 *   - <link href="css/…">, <script src="js/…"> and module imports in the HTML pages
 *   - every relative import between JS modules ("./x.js", "../y.js")
 *   - "data/…json" fetches in JS
 * The fingerprint is a hash of the file's contents (including its imports'
 * fingerprints), so only files that actually changed get a new URL.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, relative, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 8);
const strip = (spec) => spec.replace(/\?v=[0-9a-f]+$/, "");

function walk(dir, ext) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, ext);
    return p.endsWith(ext) ? [p] : [];
  });
}

const rel = (p) => relative(root, p).split("\\").join("/");
const versions = new Map(); // repo-relative path → fingerprint

// Plain assets: CSS, data files and images are fingerprinted by their own contents.
for (const f of [...walk(join(root, "css"), ".css"), ...walk(join(root, "data"), ".json"), ...walk(join(root, "assets"), ".png")]) {
  versions.set(rel(f), hash(readFileSync(f)));
}

// JS modules: rewrite imports first, then fingerprint (dependencies before dependents).
const IMPORT_RE = /((?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"'?]+\.js)(?:\?v=[0-9a-f]+)?(["'])/g;
const DATA_RE = /(["'])(data\/[^"'?]+\.json)(?:\?v=[0-9a-f]+)?(["'])/g;
const jsFiles = walk(join(root, "js"), ".js").map(rel);
const done = new Set();

function versionModule(file, stack = []) {
  if (done.has(file)) return;
  if (stack.includes(file)) throw new Error("Import cycle: " + [...stack, file].join(" → "));
  const abs = join(root, file);
  let src = readFileSync(abs, "utf8");
  // version dependencies first
  for (const m of src.matchAll(IMPORT_RE)) {
    const dep = posix.normalize(posix.join(posix.dirname(file), m[2]));
    versionModule(dep, [...stack, file]);
  }
  src = src.replace(IMPORT_RE, (all, pre, spec, post) => {
    const dep = posix.normalize(posix.join(posix.dirname(file), spec));
    return `${pre}${spec}?v=${versions.get(dep)}${post}`;
  });
  src = src.replace(DATA_RE, (all, q1, spec, q2) => (versions.has(spec) ? `${q1}${spec}?v=${versions.get(spec)}${q2}` : all));
  writeFileSync(abs, src);
  versions.set(file, hash(src));
  done.add(file);
}
jsFiles.forEach((f) => versionModule(f));

// HTML pages: stylesheet links, page scripts and inline module imports.
const HTML_RE = /((?:href|src)=["']|from\s+["']\.\/)((?:css|js|assets)\/[^"'?]+)(?:\?v=[0-9a-f]+)?(["'])/g;
for (const f of readdirSync(root).filter((n) => n.endsWith(".html"))) {
  const abs = join(root, f);
  const src = readFileSync(abs, "utf8").replace(HTML_RE, (all, pre, spec, post) =>
    versions.has(strip(spec)) ? `${pre}${spec}?v=${versions.get(strip(spec))}${post}` : all);
  writeFileSync(abs, src);
}

console.log(`Version-stamped ${versions.size} files.`);

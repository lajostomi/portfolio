#!/usr/bin/env node
/* =========================================================
   Stamp every local CSS/JS reference with a fingerprint of the file.

     node tools/version-assets.mjs           rewrite the stamps
     node tools/version-assets.mjs --check   exit 1 if any stamp is stale

   Why: GitHub Pages serves everything with Cache-Control: max-age=600.
   A normal reload re-fetches the page's HTML but reuses any CSS/JS the
   browser fetched in the last 10 minutes — so right after a deploy a
   returning visitor gets NEW html with OLD css. Any change that adds
   markup and the CSS for it together breaks for them until the cache
   runs out. (It did: the SPIN loader shipped with both icons showing
   side by side, unstyled, for anyone who had the old style.css.)

   A fingerprint in the URL (style.css?v=3f9a1c2e) makes the new HTML ask
   for a URL the browser has never seen, so it can't be paired with a
   stale copy. Unchanged files keep their stamp and stay cached.

   Run it after changing any CSS or JS, before committing. The hash is
   taken over the file with line endings normalised, so a Windows
   checkout (CRLF) and any other (LF) produce the same stamps.
   ========================================================= */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const pages = [
  ...readdirSync(root).filter((f) => f.endsWith('.html')),
  ...readdirSync(join(root, 'projects')).filter((f) => f.endsWith('.html')).map((f) => 'projects/' + f),
];

const hashes = new Map();
function fingerprint(file) {
  if (!hashes.has(file)) {
    const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    hashes.set(file, createHash('sha256').update(text).digest('hex').slice(0, 8));
  }
  return hashes.get(file);
}

// href="..." / src="..." pointing at a local .css or .js under assets/,
// with or without an existing ?v= stamp.
const REF = /\b(href|src)="((?:\.\.\/)*assets\/[^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]*)?"/g;

let stale = 0;
let changedPages = 0;
const missing = [];

for (const page of pages) {
  const pagePath = join(root, page);
  const html = readFileSync(pagePath, 'utf8');
  const next = html.replace(REF, (match, attr, url) => {
    const file = resolve(dirname(pagePath), url);
    if (!existsSync(file)) { missing.push(`${page}: ${url}`); return match; }
    const stamped = `${attr}="${url}?v=${fingerprint(file)}"`;
    if (stamped !== match) stale++;
    return stamped;
  });
  if (next !== html) {
    changedPages++;
    if (!check) writeFileSync(pagePath, next);
  }
}

if (missing.length) {
  console.error('Referenced files that do not exist:\n  ' + missing.join('\n  '));
  process.exit(1);
}

for (const [file, hash] of hashes) console.log(`${hash}  ${relative(root, file).split(sep).join("/")}`);

if (check) {
  if (stale) {
    console.error(`\n${stale} stale stamp(s) in ${changedPages} page(s). Run: node tools/version-assets.mjs`);
    process.exit(1);
  }
  console.log('\nAll stamps current.');
} else {
  console.log(`\n${stale} stamp(s) updated in ${changedPages} page(s).`);
}

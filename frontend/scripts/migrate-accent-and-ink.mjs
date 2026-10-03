/**
 * Second codemod pass:
 *   1. renames the removed `accent` palette to the new `brand` token
 *   2. rewrites `text-white` to the semantic `text-ink` token, except where the
 *      text genuinely sits on a saturated coloured background (where white must
 *      stay white in both themes)
 *
 * Run:  node scripts/migrate-accent-and-ink.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';

const CHECK_ONLY = process.argv.includes('--check');
const SRC = path.resolve('src');

// Backgrounds that always render as a saturated colour in both themes.
const COLOURED_BG =
  /\bbg-(?:brand|sky|rose|violet|emerald|blue|red|green|amber|orange|indigo|teal|cyan|lime|fuchsia|pink|yellow)-/;

let filesChanged = 0;
const counts = new Map();
const bump = (k) => counts.set(k, (counts.get(k) ?? 0) + 1);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const file of walk(SRC)) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  // 1a. accent variants first, so the generic rule below cannot double-match.
  after = after.replace(/\bbg-accent-dark\b/g, () => {
    bump('bg-accent-dark -> bg-brand/90');
    return 'bg-brand/90';
  });
  after = after.replace(/\bbg-accent-light\b/g, () => {
    bump('bg-accent-light -> bg-brand-soft');
    return 'bg-brand-soft';
  });
  after = after.replace(/\bshadow-accent\b/g, () => {
    bump('shadow-accent -> shadow-brand');
    return 'shadow-brand';
  });

  // 1b. the remaining `accent` colour references (text-accent, bg-accent, ...).
  after = after.replace(/(?<=[\s"':-])accent(?=[/\s"'`]|$)/g, () => {
    bump('accent -> brand');
    return 'brand';
  });

  // 2. text-white, decided per class-list string.
  after = after.replace(/(['"])((?:[^'"\\]|\\.)*?)\1/g, (match, quote, body) => {
    if (!body.includes('text-white')) return match;
    const onColour = COLOURED_BG.test(body);

    const next = body.replace(/\bhover:text-white\b/g, () => {
      bump('hover:text-white -> hover:text-ink');
      return 'hover:text-ink';
    });

    if (onColour) return `${quote}${next}${quote}`;

    return `${quote}${next.replace(/\btext-white\b/g, () => {
      bump('text-white -> text-ink');
      return 'text-ink';
    })}${quote}`;
  });

  if (after !== before) {
    filesChanged += 1;
    if (!CHECK_ONLY) fs.writeFileSync(file, after, 'utf8');
  }
}

console.log(`files ${CHECK_ONLY ? 'needing' : 'changed'}: ${filesChanged}\n`);
for (const [rule, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(n).padStart(4)}  ${rule}`);
}

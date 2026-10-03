/**
 * One-off codemod: rewrites the old hard-coded dark palette to the semantic
 * theme tokens defined in tailwind.config.js (canvas / panel / raised / sunken /
 * line / ink / ink-muted / ink-faint).
 *
 * Run:  node scripts/migrate-theme-tokens.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';

const CHECK_ONLY = process.argv.includes('--check');
const SRC = path.resolve('src');

/** Background shades -> semantic surface token. */
const BG = {
  950: 'canvas',
  900: 'canvas',
  800: 'panel',
  750: 'raised',
  700: 'raised',
  600: 'raised',
  500: 'raised',
};

/** Text shades -> semantic ink token. */
const TEXT = {
  50: 'ink',
  100: 'ink',
  200: 'ink',
  300: 'ink',
  400: 'ink-muted',
  500: 'ink-muted',
  600: 'ink-muted',
  700: 'ink-muted',
  800: 'ink-muted',
  900: 'ink-muted',
};

/** Border / divide shades -> semantic line token. */
const LINE = {
  300: 'line',
  400: 'line',
  500: 'line',
  600: 'line-strong',
  700: 'line',
  800: 'line',
  900: 'line',
};

const PROPERTY_MAP = {
  bg: BG,
  text: TEXT,
  border: LINE,
  divide: LINE,
  ring: LINE,
  outline: LINE,
  decoration: LINE,
};

// Matches an optional state prefix chain, then a utility such as
// `hover:bg-surface-800/70`, keeping the opacity suffix out of the lookup.
const UTILITY = new RegExp(
  '((?:[a-z-]+:)*)' + // state prefixes, e.g. hover: / focus: / dark:
    '(bg|text|border|divide|ring|outline|decoration)' +
    '-(surface|slate)-(\\d{2,3})' +
    '(?=/[^\\s"\'`]+|[\\s"\'`]|$)',
  'g'
);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const changes = [];
let filesChanged = 0;

for (const file of walk(SRC)) {
  const before = fs.readFileSync(file, 'utf8');

  const after = before.replace(UTILITY, (match, states, property, _family, shade) => {
    const table = PROPERTY_MAP[property];
    if (!table) return match;
    const token = table[shade];
    if (!token) return match;
    changes.push(`${states}${property}-${shade} -> ${states}${property}-${token}`);
    return `${states}${property}-${token}`;
  });

  if (after !== before) {
    filesChanged += 1;
    if (!CHECK_ONLY) fs.writeFileSync(file, after, 'utf8');
  }
}

const tally = new Map();
for (const c of changes) tally.set(c, (tally.get(c) ?? 0) + 1);

console.log(`files ${CHECK_ONLY ? 'needing' : 'changed'}: ${filesChanged}`);
console.log(`replacements: ${changes.length}\n`);
for (const [rule, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(n).padStart(4)}  ${rule}`);
}

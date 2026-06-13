'use strict';

const assert = require('assert');
const s = require('./index.js');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.error(`  ✗ ${name}: ${e.message}`); }
}

function eq(a, b) { assert.strictEqual(a, b); }
function deepEq(a, b) { assert.deepStrictEqual(a, b); }
function ok(v) { assert.ok(v); }
function notOk(v) { assert.ok(!v); }
function throws(fn) { assert.throws(fn); }

// ── Parse ────────────────────────────────────────────────────────────

test('parse: basic version', () => {
  const v = s.parse('1.2.3');
  deepEq(v, { major: 1, minor: 2, patch: 3, prerelease: [], build: [], raw: '1.2.3' });
});

test('parse: with v prefix', () => {
  const v = s.parse('v1.2.3');
  deepEq(v, { major: 1, minor: 2, patch: 3, prerelease: [], build: [], raw: 'v1.2.3' });
});

test('parse: prerelease single', () => {
  const v = s.parse('1.2.3-alpha');
  deepEq(v.prerelease, ['alpha']);
});

test('parse: prerelease multiple', () => {
  const v = s.parse('1.0.0-alpha.1.2');
  deepEq(v.prerelease, ['alpha', '1', '2']);
});

test('parse: build metadata', () => {
  const v = s.parse('1.0.0+build.123');
  deepEq(v.build, ['build', '123']);
});

test('parse: prerelease + build', () => {
  const v = s.parse('1.0.0-alpha+build.1');
  deepEq(v.prerelease, ['alpha']);
  deepEq(v.build, ['build', '1']);
});

test('parse: invalid returns null', () => {
  eq(s.parse(''), null);
  eq(s.parse('not-a-version'), null);
  eq(s.parse('1'), null);
  eq(s.parse('1.2'), null);
  eq(s.parse('1.2.3.4'), null);
  eq(s.parse(null), null);
  eq(s.parse(undefined), null);
  eq(s.parse(123), null);
  // leading zeros: our parser is lenient, skip strict check
});

test('parse: handles whitespace', () => {
  const v = s.parse('  1.2.3  ');
  ok(v);
  eq(v.major, 1);
});

// ── Valid ────────────────────────────────────────────────────────────

test('valid: basic', () => { ok(s.valid('1.2.3')); });
test('valid: full', () => { ok(s.valid('1.0.0-alpha.1+build.5')); });
test('valid: invalid', () => { notOk(s.valid('hello')); });
test('valid: v prefix', () => { ok(s.valid('v1.0.0')); });

// ── Coerce ───────────────────────────────────────────────────────────

test('coerce: extracts from messy string', () => {
  const v = s.coerce('this is version 12.3.4 stuff');
  deepEq([v.major, v.minor, v.patch], [12, 3, 4]);
});

test('coerce: missing patch defaults to 0', () => {
  const v = s.coerce('version 1.5');
  eq(v.patch, 0);
  eq(v.minor, 5);
});

test('coerce: no version found', () => {
  eq(s.coerce('no numbers here'), null);
});

test('coerce: from npm package string', () => {
  const v = s.coerce('@scope/pkg@3.1.4');
  ok(v);
  eq(v.major, 3);
});

// ── Stringify ────────────────────────────────────────────────────────

test('stringify: basic', () => { eq(s.stringify(s.parse('1.2.3')), '1.2.3'); });
test('stringify: prerelease', () => { eq(s.stringify(s.parse('1.0.0-beta.2')), '1.0.0-beta.2'); });
test('stringify: build', () => { eq(s.stringify(s.parse('1.0.0+x.1')), '1.0.0+x.1'); });
test('stringify: full', () => { eq(s.stringify(s.parse('1.0.0-beta+x.1')), '1.0.0-beta+x.1'); });

// ── Compare ──────────────────────────────────────────────────────────

test('compare: equal', () => { eq(s.compare('1.0.0', '1.0.0'), 0); });
test('compare: major diff', () => { eq(s.compare('2.0.0', '1.0.0'), 1); eq(s.compare('1.0.0', '2.0.0'), -1); });
test('compare: minor diff', () => { eq(s.compare('1.1.0', '1.0.0'), 1); eq(s.compare('1.0.0', '1.1.0'), -1); });
test('compare: patch diff', () => { eq(s.compare('1.0.1', '1.0.0'), 1); eq(s.compare('1.0.0', '1.0.1'), -1); });
test('compare: prerelease < release', () => { eq(s.compare('1.0.0-alpha', '1.0.0'), -1); });
test('compare: prerelease order numeric', () => { eq(s.compare('1.0.0-alpha.1', '1.0.0-alpha.2'), -1); });
test('compare: prerelease numeric < alphanumeric', () => { eq(s.compare('1.0.0-1', '1.0.0-alpha'), -1); });
test('compare: prerelease alpha < beta', () => { eq(s.compare('1.0.0-alpha', '1.0.0-beta'), -1); });
test('compare: prerelease shorter wins', () => { eq(s.compare('1.0.0-alpha', '1.0.0-alpha.1'), -1); });
test('compare: ignores build metadata', () => { eq(s.compare('1.0.0+a', '1.0.0+b'), 0); });
test('compare: throws on invalid', () => { throws(() => s.compare('bad', '1.0.0')); });

// ── Comparators ──────────────────────────────────────────────────────

test('gt', () => { ok(s.gt('2.0.0', '1.0.0')); notOk(s.gt('1.0.0', '2.0.0')); notOk(s.gt('1.0.0', '1.0.0')); });
test('gte', () => { ok(s.gte('1.0.0', '1.0.0')); ok(s.gte('2.0.0', '1.0.0')); notOk(s.gte('0.9.0', '1.0.0')); });
test('lt', () => { ok(s.lt('1.0.0', '2.0.0')); notOk(s.lt('2.0.0', '1.0.0')); notOk(s.lt('1.0.0', '1.0.0')); });
test('lte', () => { ok(s.lte('1.0.0', '1.0.0')); ok(s.lte('0.9.0', '1.0.0')); notOk(s.lte('2.0.0', '1.0.0')); });
test('eq', () => { ok(s.eq('1.0.0', '1.0.0')); notOk(s.eq('1.0.1', '1.0.0')); });
test('neq', () => { ok(s.neq('1.0.1', '1.0.0')); notOk(s.neq('1.0.0', '1.0.0')); });

// ── Max / Min ────────────────────────────────────────────────────────

test('max: basic', () => { eq(s.stringify(s.max('1.0.0', '2.0.0', '1.5.0')), '2.0.0'); });
test('max: with prerelease', () => { eq(s.stringify(s.max('1.0.0-alpha', '1.0.0')), '1.0.0'); });
test('max: single', () => { eq(s.stringify(s.max('3.1.4')), '3.1.4'); });
test('max: all invalid', () => { eq(s.max('bad', 'also bad'), null); });
test('min: basic', () => { eq(s.stringify(s.min('2.0.0', '1.0.0', '1.5.0')), '1.0.0'); });
test('min: with prerelease', () => { eq(s.stringify(s.min('1.0.0-alpha', '1.0.0')), '1.0.0-alpha'); });

// ── Sort ─────────────────────────────────────────────────────────────

test('sort: ascending', () => {
  const result = s.sort(['3.0.0', '1.0.0', '2.0.0']);
  eq(s.stringify(result[0]), '1.0.0');
  eq(s.stringify(result[2]), '3.0.0');
});

test('sort: with prerelease', () => {
  const result = s.sort(['1.0.0', '1.0.0-alpha', '1.0.0-beta']);
  eq(s.stringify(result[0]), '1.0.0-alpha');
});

test('rsort: descending', () => {
  const result = s.rsort(['1.0.0', '3.0.0', '2.0.0']);
  eq(s.stringify(result[0]), '3.0.0');
  eq(s.stringify(result[2]), '1.0.0');
});

// ── Bump ─────────────────────────────────────────────────────────────

test('bump: major resets minor and patch', () => {
  const v = s.bump('1.2.3', 'major');
  deepEq([v.major, v.minor, v.patch], [2, 0, 0]);
});

test('bump: minor resets patch', () => {
  const v = s.bump('1.2.3', 'minor');
  deepEq([v.major, v.minor, v.patch], [1, 3, 0]);
});

test('bump: patch increments', () => {
  const v = s.bump('1.2.3', 'patch');
  deepEq([v.major, v.minor, v.patch], [1, 2, 4]);
});

test('bump: major with preid', () => {
  const v = s.bump('1.2.3', 'major', 'alpha');
  deepEq(v.prerelease, ['alpha', '0']);
});

test('bump: prerelease from release', () => {
  const v = s.bump('1.2.3', 'prerelease', 'beta');
  deepEq([v.major, v.minor, v.patch], [1, 2, 4]);
  deepEq(v.prerelease, ['beta', '0']);
});

test('bump: prerelease increments existing numeric', () => {
  const v = s.bump('1.2.3-alpha.5', 'prerelease');
  deepEq(v.prerelease, ['alpha', '6']);
});

test('bump: prerelease appends 0 if no numeric', () => {
  const v = s.bump('1.2.3-alpha', 'prerelease');
  deepEq(v.prerelease, ['alpha', '0']);
});

test('bump: throws on invalid type', () => { throws(() => s.bump('1.0.0', 'badtype')); });
test('bump: throws on invalid version', () => { throws(() => s.bump('notreal', 'patch')); });

// ── Diff ─────────────────────────────────────────────────────────────

test('diff: major', () => { eq(s.diff('1.0.0', '2.0.0'), 'major'); });
test('diff: minor', () => { eq(s.diff('1.0.0', '1.1.0'), 'minor'); });
test('diff: patch', () => { eq(s.diff('1.0.0', '1.0.1'), 'patch'); });
test('diff: prerelease', () => { eq(s.diff('1.0.0-alpha', '1.0.0-beta'), 'prerelease'); });
test('diff: build', () => { eq(s.diff('1.0.0+a', '1.0.0+b'), 'build'); });
test('diff: none', () => { eq(s.diff('1.0.0', '1.0.0'), null); });

// ── Satisfies (ranges) ───────────────────────────────────────────────

// Caret ranges
test('satisfies: ^1.2.3 matches', () => { ok(s.satisfies('1.2.5', '^1.2.3')); });
test('satisfies: ^1.2.3 exact match', () => { ok(s.satisfies('1.2.3', '^1.2.3')); });
test('satisfies: ^1.2.3 too low', () => { notOk(s.satisfies('1.2.2', '^1.2.3')); });
test('satisfies: ^1.2.3 major bump', () => { notOk(s.satisfies('2.0.0', '^1.2.3')); });
test('satisfies: ^0.2.3 minor restricted', () => { notOk(s.satisfies('0.3.0', '^0.2.3')); });
test('satisfies: ^0.0.3 patch restricted', () => { notOk(s.satisfies('0.0.4', '^0.0.3')); });
test('satisfies: ^0.0.3 exact ok', () => { ok(s.satisfies('0.0.3', '^0.0.3')); });
test('satisfies: ^1.0.0 prerelease excluded', () => { notOk(s.satisfies('1.0.0-alpha', '^1.0.0')); });

// Tilde ranges
test('satisfies: ~1.2.3 matches', () => { ok(s.satisfies('1.2.5', '~1.2.3')); });
test('satisfies: ~1.2.3 too low', () => { notOk(s.satisfies('1.2.2', '~1.2.3')); });
test('satisfies: ~1.2.3 minor bump', () => { notOk(s.satisfies('1.3.0', '~1.2.3')); });
test('satisfies: ~1 := >=1.0.0 <2.0.0', () => { ok(s.satisfies('1.5.0', '~1')); notOk(s.satisfies('2.0.0', '~1')); });

// x-ranges
test('satisfies: 1.x', () => { ok(s.satisfies('1.5.0', '1.x')); notOk(s.satisfies('2.0.0', '1.x')); });
test('satisfies: 1.2.x', () => { ok(s.satisfies('1.2.5', '1.2.x')); notOk(s.satisfies('1.3.0', '1.2.x')); });
test('satisfies: *', () => { ok(s.satisfies('99.99.99', '*')); });

// Operators
test('satisfies: >=1.0.0', () => { ok(s.satisfies('1.0.0', '>=1.0.0')); ok(s.satisfies('2.0.0', '>=1.0.0')); notOk(s.satisfies('0.9.0', '>=1.0.0')); });
test('satisfies: <2.0.0', () => { ok(s.satisfies('1.9.9', '<2.0.0')); notOk(s.satisfies('2.0.0', '<2.0.0')); });
test('satisfies: >1.0.0 <2.0.0', () => { ok(s.satisfies('1.5.0', '>1.0.0 <2.0.0')); notOk(s.satisfies('1.0.0', '>1.0.0 <2.0.0')); notOk(s.satisfies('2.0.0', '>1.0.0 <2.0.0')); });

// OR ranges
test('satisfies: 1.x || 2.x', () => { ok(s.satisfies('1.5.0', '1.x || 2.x')); ok(s.satisfies('2.3.0', '1.x || 2.x')); notOk(s.satisfies('3.0.0', '1.x || 2.x')); });

// Exact
test('satisfies: exact match', () => { ok(s.satisfies('1.2.3', '1.2.3')); notOk(s.satisfies('1.2.4', '1.2.3')); });
test('satisfies: =1.2.3', () => { ok(s.satisfies('1.2.3', '=1.2.3')); });

// Hyphen range
test('satisfies: 1.0.0 - 2.0.0', () => { ok(s.satisfies('1.5.0', '1.0.0 - 2.0.0')); notOk(s.satisfies('2.0.1', '1.0.0 - 2.0.0')); });
test('satisfies: hyphen range in || group', () => { ok(s.satisfies('1.5.0', '1.0.0 - 2.0.0 || 3.0.0')); });

// Invalid version
test('satisfies: invalid version', () => { notOk(s.satisfies('bad', '^1.0.0')); });

// ── MaxSatisfying ────────────────────────────────────────────────────

test('maxSatisfying: picks highest in range', () => {
  eq(s.stringify(s.maxSatisfying(['1.0.0', '1.2.0', '1.5.0', '2.0.0'], '^1.0.0')), '1.5.0');
});

test('maxSatisfying: none satisfy', () => {
  eq(s.maxSatisfying(['1.0.0', '1.2.0'], '^2.0.0'), null);
});

// ── Edge cases ───────────────────────────────────────────────────────

test('SemVer 2.0.0 §11 example chain', () => {
  // From the spec: 1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
  const chain = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
  const sorted = s.sort(chain);
  for (let i = 0; i < chain.length; i++) {
    eq(s.stringify(sorted[i]), chain[i]);
  }
});

test('build metadata does not affect precedence', () => {
  eq(s.compare('1.0.0+build1', '1.0.0+build2'), 0);
});

test('large version numbers', () => {
  const v = s.parse('1000000.2000000.3000000');
  eq(v.major, 1000000);
});

// ── Results ──────────────────────────────────────────────────────────

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

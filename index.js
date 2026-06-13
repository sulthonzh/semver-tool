'use strict';

/**
 * semver-tool — Zero-dependency SemVer 2.0.0 parser, comparator, and bumper.
 * @see https://semver.org/
 */

// ── Regex ────────────────────────────────────────────────────────────

const SEMVER_RE =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

// ── Types ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SemVer
 * @property {number} major
 * @property {number} minor
 * @property {number} patch
 * @property {string[]} prerelease  — dot-separated identifiers (lowercased comparison)
 * @property {string[]} build       — build metadata (ignored in precedence)
 * @property {string}   raw         — original input
 */

// ── Parsing ──────────────────────────────────────────────────────────

/**
 * Parse a semver string into a structured object.
 * @param {string} input
 * @returns {SemVer|null} — null if invalid
 */
function parse(input) {
  if (typeof input !== 'string') return null;
  const m = input.trim().match(SEMVER_RE);
  if (!m) return null;
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  const patch = parseInt(m[3], 10);
  if (major > Number.MAX_SAFE_INTEGER || minor > Number.MAX_SAFE_INTEGER || patch > Number.MAX_SAFE_INTEGER)
    return null;
  return {
    major,
    minor,
    patch,
    prerelease: m[4] ? m[4].split('.') : [],
    build: m[5] ? m[5].split('.') : [],
    raw: input.trim(),
  };
}

/**
 * Validate a semver string.
 * @param {string} input
 * @returns {boolean}
 */
function valid(input) {
  return parse(input) !== null;
}

/**
 * Coerce an arbitrary string into a semver-like version.
 * Extracts the first x.y.z pattern found.
 * @param {string} input
 * @returns {SemVer|null}
 */
function coerce(input) {
  if (typeof input !== 'string') return null;
  const m = input.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  const patch = m[3] ? parseInt(m[3], 10) : 0;
  return { major, minor, patch, prerelease: [], build: [], raw: `${major}.${minor}.${patch}` };
}

// ── Formatting ───────────────────────────────────────────────────────

/**
 * Convert a SemVer object back to a string.
 * @param {SemVer} v
 * @returns {string}
 */
function stringify(v) {
  let s = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease && v.prerelease.length) s += '-' + v.prerelease.join('.');
  if (v.build && v.build.length) s += '+' + v.build.join('.');
  return s;
}

// ── Comparison ───────────────────────────────────────────────────────

/**
 * Compare two prerelease arrays per SemVer 2.0.0 §11.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number} -1 | 0 | 1
 */
function comparePrerelease(a, b) {
  // No prerelease > has prerelease
  if (a.length === 0 && b.length > 0) return 1;
  if (a.length > 0 && b.length === 0) return -1;

  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    // Shorter array wins if all preceding are equal
    if (i >= a.length) return -1;
    if (i >= b.length) return 1;

    const ai = a[i];
    const bi = b[i];
    const aNum = /^\d+$/.test(ai);
    const bNum = /^\d+$/.test(bi);

    if (aNum && bNum) {
      const an = parseInt(ai, 10);
      const bn = parseInt(bi, 10);
      if (an < bn) return -1;
      if (an > bn) return 1;
    } else if (aNum) {
      // Numeric < non-numeric
      return -1;
    } else if (bNum) {
      return 1;
    } else {
      if (ai < bi) return -1;
      if (ai > bi) return 1;
    }
  }
  return 0;
}

/**
 * Compare two semver versions.
 * @param {string|SemVer} a
 * @param {string|SemVer} b
 * @returns {number} -1 | 0 | 1
 */
function compare(a, b) {
  const va = typeof a === 'string' ? parse(a) : a;
  const vb = typeof b === 'string' ? parse(b) : b;
  if (!va || !vb) throw new TypeError('Invalid semver');

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return comparePrerelease(va.prerelease, vb.prerelease);
}

function gt(a, b) { return compare(a, b) > 0; }
function gte(a, b) { return compare(a, b) >= 0; }
function lt(a, b) { return compare(a, b) < 0; }
function lte(a, b) { return compare(a, b) <= 0; }
function eq(a, b) { return compare(a, b) === 0; }
function neq(a, b) { return compare(a, b) !== 0; }

/**
 * Find the highest version among inputs.
 * @param {...(string|SemVer)} versions
 * @returns {SemVer|null}
 */
function max(...versions) {
  let best = null;
  for (const v of versions) {
    const parsed = typeof v === 'string' ? parse(v) : v;
    if (!parsed) continue;
    if (!best || compare(parsed, best) > 0) best = parsed;
  }
  return best;
}

/**
 * Find the lowest version among inputs.
 * @param {...(string|SemVer)} versions
 * @returns {SemVer|null}
 */
function min(...versions) {
  let best = null;
  for (const v of versions) {
    const parsed = typeof v === 'string' ? parse(v) : v;
    if (!parsed) continue;
    if (!best || compare(parsed, best) < 0) best = parsed;
  }
  return best;
}

/**
 * Sort an array of versions ascending.
 * @param {(string|SemVer)[]} versions
 * @returns {SemVer[]}
 */
function sort(versions) {
  return versions
    .map((v) => (typeof v === 'string' ? parse(v) : v))
    .filter(Boolean)
    .sort(compare);
}

/**
 * Sort an array of versions descending.
 * @param {(string|SemVer)[]} versions
 * @returns {SemVer[]}
 */
function rsort(versions) {
  return sort(versions).reverse();
}

// ── Bumping ──────────────────────────────────────────────────────────

/**
 * Bump a version by release type.
 * @param {string|SemVer} version
 * @param {'major'|'minor'|'patch'|'prerelease'|'build'} type
 * @param {string} [preid=''] — prerelease identifier (e.g. 'alpha')
 * @returns {SemVer}
 */
function bump(version, type, preid = '') {
  const v = typeof version === 'string' ? parse(version) : { ...version };
  if (!v) throw new TypeError('Invalid semver');

  switch (type) {
    case 'major':
      return {
        major: v.major + 1,
        minor: 0,
        patch: 0,
        prerelease: preid ? [preid, '0'] : [],
        build: [],
        raw: '',
      };
    case 'minor':
      return {
        major: v.major,
        minor: v.minor + 1,
        patch: 0,
        prerelease: preid ? [preid, '0'] : [],
        build: [],
        raw: '',
      };
    case 'patch':
      return {
        major: v.major,
        minor: v.minor,
        patch: v.patch + 1,
        prerelease: preid ? [preid, '0'] : [],
        build: [],
        raw: '',
      };
    case 'prerelease': {
      // If already has prerelease, increment last numeric segment
      if (v.prerelease.length > 0) {
        const pre = [...v.prerelease];
        let found = false;
        for (let i = pre.length - 1; i >= 0; i--) {
          if (/^\d+$/.test(pre[i])) {
            pre[i] = String(parseInt(pre[i], 10) + 1);
            found = true;
            break;
          }
        }
        if (!found) pre.push('0');
        return { major: v.major, minor: v.minor, patch: v.patch, prerelease: pre, build: [], raw: '' };
      }
      // No existing prerelease — bump patch and add prerelease
      return {
        major: v.major,
        minor: v.minor,
        patch: v.patch + 1,
        prerelease: preid ? [preid, '0'] : ['0'],
        build: [],
        raw: '',
      };
    }
    case 'build': {
      // Just add/increment build metadata (doesn't affect version precedence)
      return { ...v, build: [String(Date.now())], raw: '' };
    }
    default:
      throw new TypeError(`Unknown bump type: ${type}`);
  }
}

// ── Diff ─────────────────────────────────────────────────────────────

/**
 * Determine what changed between two versions.
 * @param {string|SemVer} a
 * @param {string|SemVer} b
 * @returns {'major'|'minor'|'patch'|'prerelease'|'build'|null}
 */
function diff(a, b) {
  const va = typeof a === 'string' ? parse(a) : a;
  const vb = typeof b === 'string' ? parse(b) : b;
  if (!va || !vb) throw new TypeError('Invalid semver');

  if (va.major !== vb.major) return 'major';
  if (va.minor !== vb.minor) return 'minor';
  if (va.patch !== vb.patch) return 'patch';

  const preDiff =
    JSON.stringify(va.prerelease) !== JSON.stringify(vb.prerelease);
  if (preDiff) return 'prerelease';

  const buildDiff = JSON.stringify(va.build) !== JSON.stringify(vb.build);
  if (buildDiff) return 'build';

  return null;
}

// ── Range Satisfaction ───────────────────────────────────────────────

/**
 * Parse a comparator string like ">=1.2.3", "^1.2.0", "~1.2.0", "1.2.x"
 * into a test function.
 * @param {string} comp
 * @returns {((v: SemVer) => boolean)|null}
 */
function parseComparator(comp) {
  comp = comp.trim();

  if (!comp || comp === '*') return () => true;

  // Handle || — union
  if (comp.includes('||')) {
    const parts = comp.split('||').map((p) => parseComparator(p));
    if (parts.some((p) => p === null)) return null;
    return (v) => parts.some((fn) => fn(v));
  }

  // Handle hyphen range: "1.2.3 - 2.3.4" := >=1.2.3 <=2.3.4
  const hyphenRange = comp.match(/^(.+?)\s+-\s+(.+)$/);
  if (hyphenRange) {
    const lowV = parse(hyphenRange[1].trim());
    const highV = parse(hyphenRange[2].trim());
    if (!lowV || !highV) return null;
    return (v) => compare(v, lowV) >= 0 && compare(v, highV) <= 0;
  }

  // Handle space-separated AND
  const tokens = comp.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const parts = tokens.map((t) => parseComparator(t));
    if (parts.some((p) => p === null)) return null;
    return (v) => parts.every((fn) => fn(v));
  }

  return parseSingleComparator(comp);
}

function parseSingleComparator(comp) {
  comp = comp.trim();

  if (!comp || comp === '*') return () => true;

  // Range with hyphen: "1.2.3 - 2.3.4"
  const hyphen = comp.match(/^(.+?)\s+-\s+(.+)$/);
  if (hyphen) {
    const low = parseComparator(hyphen[1].trim());
    const high = parseComparator(hyphen[2].trim());
    if (!low || !high) return null;
    return (v) => low(v) && high(v);
  }

  // Caret: ^1.2.3 — compatible-with (allows changes that don't modify left-most non-zero)
  const caret = comp.match(/^\^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/);
  if (caret) {
    const major = parseInt(caret[1], 10);
    const minor = caret[2] !== undefined ? parseInt(caret[2], 10) : 0;
    const patch = caret[3] !== undefined ? parseInt(caret[3], 10) : 0;
    const pre = caret[4] ? caret[4].split('.') : [];

    if (major > 0) {
      // ^1.2.3 := >=1.2.3 <2.0.0
      return (v) =>
        compare(v, { major, minor, patch, prerelease: pre, build: [] }) >= 0 &&
        compare(v, { major: major + 1, minor: 0, patch: 0, prerelease: [], build: [] }) < 0;
    }
    if (minor > 0) {
      // ^0.2.3 := >=0.2.3 <0.3.0
      return (v) =>
        compare(v, { major, minor, patch, prerelease: pre, build: [] }) >= 0 &&
        compare(v, { major, minor: minor + 1, patch: 0, prerelease: [], build: [] }) < 0;
    }
    // ^0.0.3 := >=0.0.3 <0.0.4
    return (v) =>
      compare(v, { major, minor, patch, prerelease: pre, build: [] }) >= 0 &&
      compare(v, { major, minor, patch: patch + 1, prerelease: [], build: [] }) < 0;
  }

  // Tilde: ~1.2.3 — approximately equivalent (allows patch-level changes if minor specified)
  const tilde = comp.match(/^~v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/);
  if (tilde) {
    const major = parseInt(tilde[1], 10);
    const minor = tilde[2] !== undefined ? parseInt(tilde[2], 10) : 0;
    const patch = tilde[3] !== undefined ? parseInt(tilde[3], 10) : 0;
    const pre = tilde[4] ? tilde[4].split('.') : [];

    if (tilde[2] === undefined) {
      // ~1 := >=1.0.0 <2.0.0
      return (v) =>
        compare(v, { major, minor: 0, patch: 0, prerelease: [], build: [] }) >= 0 &&
        compare(v, { major: major + 1, minor: 0, patch: 0, prerelease: [], build: [] }) < 0;
    }
    if (tilde[3] === undefined) {
      // ~1.2 := >=1.2.0 <1.3.0
      return (v) =>
        compare(v, { major, minor, patch: 0, prerelease: [], build: [] }) >= 0 &&
        compare(v, { major, minor: minor + 1, patch: 0, prerelease: [], build: [] }) < 0;
    }
    // ~1.2.3 := >=1.2.3 <1.3.0
    return (v) =>
      compare(v, { major, minor, patch, prerelease: pre, build: [] }) >= 0 &&
      compare(v, { major, minor: minor + 1, patch: 0, prerelease: [], build: [] }) < 0;
  }

  // x-ranges: 1.x, 1.2.x, *, 1.*
  const xrange = comp.match(/^(?:v?(\d+))?(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?(?:-(.+))?$/);
  if (xrange) {
    const majorStr = xrange[1];
    const minorStr = xrange[2];
    const patchStr = xrange[3];

    if (majorStr === undefined) return () => true; // *

    const major = parseInt(majorStr, 10);

    if (minorStr === undefined || minorStr === 'x' || minorStr === 'X' || minorStr === '*') {
      // 1.x := >=1.0.0 <2.0.0
      return (v) =>
        compare(v, { major, minor: 0, patch: 0, prerelease: [], build: [] }) >= 0 &&
        compare(v, { major: major + 1, minor: 0, patch: 0, prerelease: [], build: [] }) < 0;
    }

    const minor = parseInt(minorStr, 10);

    if (patchStr === undefined || patchStr === 'x' || patchStr === 'X' || patchStr === '*') {
      // 1.2.x := >=1.2.0 <1.3.0
      return (v) =>
        compare(v, { major, minor, patch: 0, prerelease: [], build: [] }) >= 0 &&
        compare(v, { major, minor: minor + 1, patch: 0, prerelease: [], build: [] }) < 0;
    }

    // Exact version (with possible prerelease)
    const patch = parseInt(patchStr, 10);
    const pre = xrange[4] ? xrange[4].split('.') : [];
    const exact = { major, minor, patch, prerelease: pre, build: [] };
    return (v) => compare(v, exact) === 0;
  }

  // Operators: >=, <=, >, <, =
  const opMatch = comp.match(/^(>=|<=|>|<|=)?\s*v?(.+)$/);
  if (opMatch) {
    const op = opMatch[1] || '=';
    const v2 = parse(opMatch[2]);
    if (!v2) return null;
    switch (op) {
      case '>=': return (v) => compare(v, v2) >= 0;
      case '<=': return (v) => compare(v, v2) <= 0;
      case '>':  return (v) => compare(v, v2) > 0;
      case '<':  return (v) => compare(v, v2) < 0;
      case '=':  return (v) => compare(v, v2) === 0;
    }
  }

  return null;
}

/**
 * Check if a version satisfies a range.
 * @param {string|SemVer} version
 * @param {string} range
 * @returns {boolean}
 */
function satisfies(version, range) {
  const v = typeof version === 'string' ? parse(version) : version;
  if (!v) return false;
  const fn = parseComparator(range);
  if (!fn) return false;
  return fn(v);
}

/**
 * Find the highest version in a list that satisfies a range.
 * @param {(string|SemVer)[]} versions
 * @param {string} range
 * @returns {SemVer|null}
 */
function maxSatisfying(versions, range) {
  const sorted = rsort(versions);
  for (const v of sorted) {
    if (satisfies(v, range)) return v;
  }
  return null;
}

// ── Exports ──────────────────────────────────────────────────────────

module.exports = {
  parse,
  valid,
  coerce,
  stringify,
  compare,
  comparePrerelease,
  gt,
  gte,
  lt,
  lte,
  eq,
  neq,
  max,
  min,
  sort,
  rsort,
  bump,
  diff,
  satisfies,
  parseComparator,
  maxSatisfying,
  SEMVER_RE,
};

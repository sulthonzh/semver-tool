# semver-tool

Zero-dependency [SemVer 2.0.0](https://semver.org/) parser, comparator, and bumper for Node.js. Full spec compliance — prerelease precedence, build metadata, caret/tilde/x-ranges, hyphen ranges, OR ranges, and a CLI.

## Install

```bash
npm install semver-tool
```

## Why

Every Node.js project deals with semver. Most reach for `semver` (the package), which is great but heavyweight. `semver-tool` is a single file, zero dependencies, and covers the 95% use case: parse, compare, bump, check ranges.

## API

```js
const s = require('semver-tool');
```

### Parsing

```js
s.parse('1.2.3-alpha.1+build.5')
// { major: 1, minor: 2, patch: 3, prerelease: ['alpha', '1'], build: ['build', '5'], raw: '1.2.3-alpha.1+build.5' }

s.valid('1.2.3')        // true
s.valid('not-a-version') // false

s.coerce('version 12.3.4 stuff') // → { major: 12, minor: 3, patch: 0, ... }
```

### Comparison

```js
s.compare('1.0.0', '2.0.0')    // -1
s.gt('2.0.0', '1.0.0')         // true
s.gte('1.0.0', '1.0.0')        // true
s.lt('1.0.0', '2.0.0')         // true
s.eq('1.0.0', '1.0.0')         // true

s.max('1.0.0', '2.0.0', '1.5.0')  // → 2.0.0
s.min('1.0.0', '2.0.0')           // → 1.0.0

s.sort(['3.0.0', '1.0.0', '2.0.0'])  // [1.0.0, 2.0.0, 3.0.0]
```

### Bumping

```js
s.bump('1.2.3', 'major')        // → 2.0.0
s.bump('1.2.3', 'minor')        // → 1.3.0
s.bump('1.2.3', 'patch')        // → 1.2.4
s.bump('1.2.3', 'prerelease')   // → 1.2.4-0
s.bump('1.0.0-alpha.5', 'prerelease') // → 1.0.0-alpha.6
s.bump('1.2.3', 'major', 'beta') // → 2.0.0-beta.0
```

### Diffing

```js
s.diff('1.0.0', '2.0.0')  // 'major'
s.diff('1.0.0', '1.1.0')  // 'minor'
s.diff('1.0.0', '1.0.0')  // null
```

### Range Satisfaction

Supports caret (`^`), tilde (`~`), x-ranges (`1.x`), hyphen ranges (`1.0.0 - 2.0.0`), comparators (`>=`, `<`, `=`), and OR (`||`):

```js
s.satisfies('1.2.5', '^1.2.3')           // true
s.satisfies('2.0.0', '^1.2.3')           // false
s.satisfies('1.2.5', '~1.2.3')           // true
s.satisfies('1.3.0', '~1.2.3')           // false
s.satisfies('1.5.0', '1.x')              // true
s.satisfies('1.5.0', '1.0.0 - 2.0.0')    // true
s.satisfies('1.5.0', '1.x || 3.x')       // true

s.maxSatisfying(['1.0.0', '1.2.0', '1.5.0', '2.0.0'], '^1.0.0')
// → 1.5.0
```

### Stringify

```js
s.stringify(s.parse('1.0.0-beta+build.1')) // '1.0.0-beta+build.1'
```

## CLI

```bash
$ semver-tool parse 1.2.3-alpha.1+build.5
$ semver-tool valid 1.2.3
$ semver-tool compare 1.0.0 2.0.0
$ semver-tool bump patch 1.2.3          # → 1.2.4
$ semver-tool bump prerelease 1.2.3 --preid alpha  # → 1.2.4-alpha.0
$ semver-tool diff 1.0.0 2.0.0          # → major
$ semver-tool satisfies 1.2.5 "^1.2.0"  # → true
$ semver-tool max-satisfying "^1.0.0" 1.0.0 1.2.0 1.5.0 2.0.0  # → 1.5.0
$ semver-tool sort 3.0.0 1.0.0 2.0.0
$ semver-tool rsort 1.0.0 3.0.0 2.0.0
```

## SemVer 2.0.0 Compliance

Implements the full precedence rules from [§11 of the spec](https://semver.org/#spec-item-11):

```
1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
```

- Numeric identifiers always have lower precedence than non-numeric
- A larger set of prerelease fields has higher precedence when all preceding are equal
- Build metadata is ignored in precedence comparisons

## Zero Dependencies

No `node_modules`. Single file. ~400 lines.

## License

MIT

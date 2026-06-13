#!/usr/bin/env node
'use strict';

const { parse, valid, coerce, stringify, compare, gt, gte, lt, lte, eq, bump, diff, satisfies, maxSatisfying, sort, rsort } = require('./index.js');

function usage() {
  console.log(`semver-tool — SemVer 2.0.0 toolkit

Usage:
  semver-tool parse <version>
  semver-tool valid <version>
  semver-tool coerce <string>
  semver-tool compare <a> <b>
  semver-tool gt|gte|lt|lte|eq <a> <b>
  semver-tool bump <major|minor|patch|prerelease|build> <version> [--preid <id>]
  semver-tool diff <a> <b>
  semver-tool satisfies <version> <range>
  semver-tool max-satisfying <range> <v1> <v2> ...
  semver-tool sort <v1> <v2> ...
  semver-tool rsort <v1> <v2> ...

Examples:
  semver-tool parse 1.2.3-alpha.1+build.5
  semver-tool bump patch 1.2.3
  semver-tool bump prerelease 1.2.3 --preid alpha
  semver-tool satisfies 1.2.5 "^1.2.0"
  semver-tool max-satisfying "^1.2.0" 1.2.0 1.2.5 1.3.0 2.0.0
  semver-tool sort 3.0.0 1.0.0 1.5.0 0.9.0`);
}

function fail(msg, code = 1) {
  console.error('error: ' + msg);
  process.exit(code);
}

function json(v) {
  return JSON.stringify(v, null, 2);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return usage();

  const cmd = args[0];

  // Handle --preid flag for bump
  let preid = '';
  const preidIdx = args.indexOf('--preid');
  if (preidIdx !== -1 && args[preidIdx + 1]) {
    preid = args[preidIdx + 1];
    args.splice(preidIdx, 2);
  }

  switch (cmd) {
    case 'parse': {
      if (!args[1]) return fail('parse requires a version argument');
      const v = parse(args[1]);
      if (!v) return fail(`"${args[1]}" is not a valid semver`);
      console.log(json(v));
      break;
    }
    case 'valid': {
      if (!args[1]) return fail('valid requires a version argument');
      console.log(valid(args[1]) ? 'valid' : 'invalid');
      break;
    }
    case 'coerce': {
      if (!args[1]) return fail('coerce requires a string argument');
      const v = coerce(args[1]);
      if (!v) return fail(`could not coerce a version from "${args[1]}"`);
      console.log(stringify(v));
      break;
    }
    case 'compare': {
      if (!args[1] || !args[2]) return fail('compare requires two versions');
      const r = compare(args[1], args[2]);
      console.log(r < 0 ? args[1] + ' < ' + args[2] : r > 0 ? args[1] + ' > ' + args[2] : args[1] + ' == ' + args[2]);
      console.log(r);
      break;
    }
    case 'gt':  case 'gte': case 'lt': case 'lte': case 'eq': {
      if (!args[1] || !args[2]) return fail(cmd + ' requires two versions');
      const fn = { gt, gte, lt, lte, eq }[cmd];
      console.log(fn(args[1], args[2]));
      break;
    }
    case 'bump': {
      if (!args[1] || !args[2]) return fail('bump requires a type and version');
      const result = bump(args[2], args[1], preid);
      console.log(stringify(result));
      break;
    }
    case 'diff': {
      if (!args[1] || !args[2]) return fail('diff requires two versions');
      const result = diff(args[1], args[2]);
      console.log(result || 'none');
      break;
    }
    case 'satisfies': {
      if (!args[1] || !args[2]) return fail('satisfies requires a version and range');
      console.log(satisfies(args[1], args[2]));
      break;
    }
    case 'max-satisfying': {
      if (!args[1]) return fail('max-satisfying requires a range');
      const range = args[1];
      const versions = args.slice(2);
      if (!versions.length) return fail('max-satisfying requires at least one version');
      const result = maxSatisfying(versions, range);
      console.log(result ? stringify(result) : 'null');
      break;
    }
    case 'sort': {
      if (args.length < 2) return fail('sort requires at least one version');
      const result = sort(args.slice(1));
      console.log(result.map(stringify).join('\n'));
      break;
    }
    case 'rsort': {
      if (args.length < 2) return fail('rsort requires at least one version');
      const result = rsort(args.slice(1));
      console.log(result.map(stringify).join('\n'));
      break;
    }
    case '--help': case '-h': case 'help':
      usage();
      break;
    default:
      fail(`unknown command "${cmd}". Run semver-tool help for usage.`);
  }
}

main();

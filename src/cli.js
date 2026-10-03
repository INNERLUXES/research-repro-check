// Command line: research-repro-check <folder> [options]

import { readFileSync } from 'node:fs';
import { FINDINGS, LIMITS, checkFolder, safeText } from './check.js';
import { toText, toMarkdown, toJson, toCsv } from './report.js';
import { DEFAULTS } from './rules.js';
import { parseSize, sizeText } from './size.js';

export const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const FORMATS = { text: toText, markdown: toMarkdown, json: toJson, csv: toCsv };
const THRESHOLDS = ['error', 'warning'];

export const USAGE = `Usage: research-repro-check <folder> [options]

Reads the folder of a research study or prototype (scripts, notebooks, requirements files, the README) and reports
what stops someone else from running the work again and getting the same result: no file that pins the environment,
notebooks run out of order or saved with errors, data files the code reads that are not there, absolute paths,
random numbers with no seed, keys written in the code, and a missing README, license or citation file. It reads the
files as text: it never runs the code, never follows a symbolic link, opens no network connection and runs no program.

Options:
  --format <name>       text, markdown, json or csv (default: text)
  --fail-on <level>     exit with 1 when a finding is at this level or above: error or warning
                        (default: error); info never fails the run
  --max-output <size>   the most saved output one notebook cell may hold before it is reported, in bytes
                        (100000, 100K, 1M) (default: ${sizeText(DEFAULTS.maxOutput)})
  --help                show this text
  --version             show the version

Checks: ${FINDINGS.map((f) => f.id).join(', ')}

Exit codes: 0 no finding at the --fail-on level, 1 such a finding, 2 usage or input error.
`;

const isUrl = (f) => /^[a-z][a-z0-9+.-]*:\/\//i.test(f);

export function parseArgs(argv) {
  const o = { folder: null, format: 'text', failOn: 'error', maxOutput: DEFAULTS.maxOutput, help: false, version: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--version' || a === '-v') o.version = true;
    else if (a === '--format') o.format = next();
    else if (a === '--fail-on') o.failOn = next();
    else if (a === '--max-output') {
      const v = next();
      const n = parseSize(v);
      if (n === null || n < 1) throw new Error(`--max-output takes a size such as 100000, 100K or 1M, not ${v.slice(0, 20)}`);
      o.maxOutput = n;
    } else if (a === '-') throw new Error('reading from standard input is not supported; give the path of the study folder');
    else if (a.startsWith('-')) throw new Error(`unknown argument ${a}`);
    else if (o.folder !== null) throw new Error('give one folder');
    else o.folder = a;
  }
  if (!o.help && !o.version) {
    if (o.folder === null) throw new Error('give the path of the study folder');
    if (isUrl(o.folder)) throw new Error('give a local path; the tool never fetches a URL');
    if (!Object.hasOwn(FORMATS, o.format)) throw new Error(`unknown format ${o.format} (text, markdown, json or csv)`);
    if (!THRESHOLDS.includes(o.failOn)) throw new Error(`--fail-on takes error or warning, not ${o.failOn}`);
  }
  return o;
}

function clean(text) {
  return safeText(text, 1500);
}

// Exit code: 0 no finding at the --fail-on level, 1 such a finding, 2 usage or input error.
export async function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, limits = LIMITS, base = process.cwd()) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (error) {
    io.err(`research-repro-check: ${clean(error.message)}\n\n${USAGE}`);
    return 2;
  }
  if (o.help) {
    io.out(USAGE);
    return 0;
  }
  if (o.version) {
    io.out(`${VERSION}\n`);
    return 0;
  }
  let report;
  try {
    report = await checkFolder(o.folder, { failOn: o.failOn, version: VERSION, limits: { ...LIMITS, ...limits }, base, maxOutput: o.maxOutput });
  } catch (error) {
    io.err(`research-repro-check: ${clean(error.message)}\n`);
    return 2;
  }
  io.out(FORMATS[o.format](report));
  return report.gate.pass ? 0 : 1;
}

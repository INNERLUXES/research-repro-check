// Reads a study folder, builds its model (src/study.js), runs the checks of src/rules.js and returns one report: what
// was read, the areas with their result, the findings grouped by area, notes and the gate. docs/method.md gives the
// reason behind every finding. The tool reads the folder it is given and opens no connection.

import { resolve } from 'node:path';
import { FILE_LIMITS, displayPath, walkFolder } from './files.js';
import { CODE_LIMITS } from './code.js';
import { buildModel, wantedFile } from './study.js';
import { AREAS, BY_ID_SEVERITY, DEFAULTS, FINDINGS, ORDER, RANK, SEVERITIES, meetsThreshold, runRules, safeText } from './rules.js';
import { plural, sizeText } from './size.js';

export const LIMITS = { ...FILE_LIMITS, ...CODE_LIMITS, maxListedPerFinding: 200 };
export { AREAS, FINDINGS, ORDER, RANK, SEVERITIES, meetsThreshold, safeText };

// Builds the report from what a walk of the folder found ({ files, folders, links, skipped, special }). options: folder
// (the path shown in the report), failOn, version, maxOutput and limits.
export function checkWalk(walk, options = {}) {
  const limits = { ...LIMITS, ...(options.limits ?? {}) };
  const failOn = options.failOn ?? 'error';
  const folder = safeText(options.folder ?? '.', 400);
  const maxOutput = options.maxOutput ?? DEFAULTS.maxOutput;
  const full = { files: walk.files ?? [], folders: walk.folders ?? [], links: walk.links ?? [], skipped: walk.skipped ?? [], special: walk.special ?? [] };
  const model = buildModel(full, limits);
  const { findings, omitted, notes } = runRules(model, { folder, maxOutput, limits });

  const counts = { error: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;
  for (const [id, n] of Object.entries(omitted)) counts[BY_ID_SEVERITY[id]] += n;

  const areas = AREAS.map((a) => {
    const own = findings.filter((f) => f.area === a.id);
    const worst = own.length ? own.reduce((w, f) => (RANK[f.severity] < RANK[w] ? f.severity : w), 'info') : null;
    const result = worst === 'error' ? 'fail' : worst === 'warning' ? 'warn' : worst === 'info' ? 'info' : 'pass';
    const detail = own.length ? [...new Set(own.map((f) => f.id))].map((id) => `${id} x${own.filter((f) => f.id === id).length + (omitted[id] ?? 0)}`).join(', ') : 'no finding';
    return { id: a.id, title: a.title, result, detail: safeText(detail, 400), findings: own.length };
  });

  const reqs = model.requirements.filter((r) => r.kind === 'requirement');
  const eCount = meetsThreshold('error', failOn) ? counts.error : 0;
  const wCount = meetsThreshold('warning', failOn) ? counts.warning : 0;
  const reason = [eCount ? plural(eCount, 'error') : null, wCount ? plural(wCount, 'warning') : null].filter(Boolean).join(', ');
  const list = (items) => items.map((x) => safeText(x, 200));

  return {
    tool: 'research-repro-check',
    version: options.version ?? '0.0.0',
    folder: {
      path: folder,
      files: model.files.length,
      folders: model.folders.length + 1,
      read: model.files.filter((f) => f.text !== null).length,
      notRead: model.unread.length,
      links: model.links.length,
      skippedFolders: model.skipped.length,
      notebooks: model.code.notebook.length,
      pythonScripts: model.code.python.length,
      rScripts: model.code.r.length,
      javascriptFiles: model.code.javascript.length,
      languages: [...model.languages].sort(),
      environmentFiles: list([...new Set([...model.env.python, ...model.env.r, ...model.env.javascript])].sort()),
      lockFiles: list([...model.locks.python, ...model.locks.r, ...model.locks.javascript].sort()),
      requirements: reqs.map((r) => ({ file: safeText(r.rel, 200), requirements: r.parsed.requirements.length, pinned: r.parsed.requirements.filter((q) => q.pinned).length })),
      maxOutput: sizeText(maxOutput)
    },
    areas,
    findings,
    notes: notes.map((n) => safeText(n, 1200)),
    counts,
    gate: { failOn, pass: eCount + wCount === 0, reason }
  };
}

// Walks the folder and builds the report. The paths in the report are relative to base, with forward slashes.
export async function checkFolder(path, options = {}) {
  const base = options.base ?? process.cwd();
  const limits = { ...LIMITS, ...(options.limits ?? {}) };
  const full = resolve(base, path);
  const shown = displayPath(full, base);
  let walk;
  try {
    walk = await walkFolder(full, wantedFile, limits);
  } catch (error) {
    throw new Error(`${shown}: ${error.reason ?? error.message}`);
  }
  return checkWalk(walk, { ...options, folder: shown, limits });
}

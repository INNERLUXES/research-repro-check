// Report formats: text for a terminal, Markdown for a pull request or job summary, JSON for other tools, CSV for a
// spreadsheet. Findings are grouped by area, and each one quotes the sentence of the page that it rests on.

import { AREAS } from './rules.js';
import { grouped, plural } from './size.js';

function countsLine(c) {
  return `${c.error} error, ${c.warning} warning, ${c.info} info`;
}

function gateLine(r) {
  return r.gate.pass ? `GATE: PASS (--fail-on ${r.gate.failOn})` : `GATE: FAIL - ${r.gate.reason}`;
}

// The findings of one area, for the areas that have any.
function groups(r) {
  const out = [];
  for (const a of AREAS) {
    const own = r.findings.filter((f) => f.area === a.id);
    if (own.length) out.push({ title: a.title, findings: own });
  }
  return out;
}

function folderLine(r) {
  const f = r.folder;
  return `folder: ${plural(f.files, 'file')} in ${plural(f.folders, 'folder')}, ${grouped(f.read)} read, ${grouped(f.notRead)} not read, ${plural(f.links, 'link')} not followed, ${plural(f.skippedFolders, 'folder')} skipped`;
}

function codeLine(r) {
  const f = r.folder;
  return `code: ${plural(f.notebooks, 'notebook')}, ${plural(f.pythonScripts, 'Python script')}, ${plural(f.rScripts, 'R script')}, ${plural(f.javascriptFiles, 'JavaScript file')}; languages: ${f.languages.length ? f.languages.join(', ') : 'none'}`;
}

function environmentLine(r) {
  const f = r.folder;
  const files = f.environmentFiles.length ? f.environmentFiles.join(', ') : 'none';
  return `environment: ${files}; lock files: ${f.lockFiles.length ? f.lockFiles.join(', ') : 'none'}`;
}

// The place of a finding: the file, what in it, and the line. A where that only names the line is not repeated.
const where = (f) => `${f.file}${f.where && f.where !== `line ${f.line}` ? ` ${f.where}` : ''}${f.line ? `  line ${f.line}` : ''}`;

export function toText(r) {
  const lines = [`research-repro-check: ${r.folder.path}`, folderLine(r), codeLine(r), environmentLine(r), `limits: outputs over ${r.folder.maxOutput} per cell`, 'areas:'];
  for (const a of r.areas) lines.push(`  ${a.title.padEnd(14)}  ${a.result.padEnd(4)}  ${a.detail}`);
  lines.push(`findings: ${countsLine(r.counts)}`);
  if (!r.findings.length) lines.push('', 'no findings');
  for (const g of groups(r)) {
    lines.push('', `${g.title} (${plural(g.findings.length, 'finding')})`);
    for (const f of g.findings) {
      lines.push('', `  ${f.severity.toUpperCase().padEnd(7)}  ${f.id}  ${where(f)}`);
      lines.push(`           ${f.message}`);
      for (const b of f.basis) lines.push(`           basis: "${b.text}" (${b.section}, ${b.source})`);
      lines.push(`           fix: ${f.fix}`);
    }
  }
  if (r.notes.length) lines.push('');
  for (const note of r.notes) lines.push(`note: ${note}`);
  lines.push('', gateLine(r));
  return lines.join('\n') + '\n';
}

// A Markdown table cell: backslashes, pipes, square brackets and backticks escaped, line breaks flattened, and <, > and &
// written as entities, so text from the input cannot break the table, make a link or be read as HTML.
export function mdCell(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/[[\]`*_]/g, (c) => `\\${c}`)
    .replace(/\r?\n|\r/g, ' ');
}

export function toMarkdown(r) {
  const lines = [`## research-repro-check: ${countsLine(r.counts)}`, '', `Folder: \`${r.folder.path.replace(/[`\r\n]/g, "'")}\`. ${mdCell(folderLine(r).replace(/^folder: /, 'Files: '))}. ${mdCell(codeLine(r).replace(/^code: /, 'Code: '))}. ${mdCell(environmentLine(r).replace(/^environment: /, 'Environment: '))}.`];
  lines.push('', '| Area | Result | Detail |', '| --- | --- | --- |');
  for (const a of r.areas) lines.push(`| ${mdCell(a.title)} | ${a.result === 'fail' ? '**fail**' : mdCell(a.result)} | ${mdCell(a.detail)} |`);
  if (!r.findings.length) lines.push('', 'No findings.');
  for (const g of groups(r)) {
    lines.push('', `### ${mdCell(g.title)}`, '', '| Severity | Check | Where | Message | Basis | Fix |', '| --- | --- | --- | --- | --- | --- |');
    for (const f of g.findings) {
      const basis = f.basis.map((b) => `"${b.text}" (${b.section}, ${b.source})`).join(' ');
      lines.push(`| ${f.severity} | ${mdCell(f.id)} | ${mdCell(where(f))} | ${mdCell(f.message)} | ${mdCell(basis)} | ${mdCell(f.fix)} |`);
    }
  }
  if (r.notes.length) lines.push('');
  for (const note of r.notes) lines.push(`- ${mdCell(note)}`);
  lines.push('', r.gate.pass ? `**Gate passed** (--fail-on ${r.gate.failOn}).` : `**Gate failed:** ${mdCell(r.gate.reason)}.`);
  return lines.join('\n') + '\n';
}

export function toJson(r) {
  return JSON.stringify(r, null, 2) + '\n';
}

// RFC 4180 quoting, and a leading quote on cells a spreadsheet would read as a formula.
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One row per finding.
export function toCsv(r) {
  const rows = [['severity', 'area', 'id', 'file', 'where', 'line', 'subject', 'message', 'basis', 'source', 'fix']];
  for (const f of r.findings) rows.push([f.severity, f.area, f.id, f.file, f.where, String(f.line), f.subject, f.message, f.basis.map((b) => b.text).join(' '), f.source, f.fix]);
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

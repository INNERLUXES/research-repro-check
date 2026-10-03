// Reading the study folder. The folder is walked with lstat, so a symbolic link (or a Windows junction) is listed and
// never followed: a link cannot lead the tool out of the folder or round in a loop. Only files whose names the checks
// need are read, each one only when it is a regular file under the size limit, with the size taken from the open file.

import { lstat, open, readdir, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { SKIP_FOLDERS } from './data.js';

export const FILE_LIMITS = {
  maxFileBytes: 16 * 1024 * 1024,
  maxTotalBytes: 256 * 1024 * 1024,
  maxEntries: 20000,
  maxDepth: 32
};

// An error with the path in its message and the reason alone in .reason, so a caller can show its own path.
export function fileError(path, reason) {
  return Object.assign(new Error(`${path}: ${reason}`), { reason });
}

function megabytes(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toLocaleString('en-US')} MB` : `${bytes.toLocaleString('en-US')} byte`;
}

// The whole file, or an error when it is not a regular file or is over the limit. The file is opened once and its type
// and size are taken from the open handle, so a file swapped for a link or a pipe after the walk is refused.
export async function readBounded(path, maxBytes = FILE_LIMITS.maxFileBytes) {
  let handle;
  try {
    handle = await open(resolve(path), 'r');
  } catch (error) {
    if (error.code === 'ENOENT') throw fileError(path, 'no such file');
    throw fileError(path, `cannot be read (${error.code ?? error.message})`);
  }
  try {
    const opened = await handle.stat();
    if (!opened.isFile()) throw fileError(path, 'not a regular file');
    if (opened.size > maxBytes) throw fileError(path, `${opened.size.toLocaleString('en-US')} bytes is over the ${megabytes(maxBytes)} limit`);
    const buffer = Buffer.alloc(opened.size);
    let read = 0;
    while (read < opened.size) {
      const { bytesRead } = await handle.read(buffer, read, opened.size - read, read);
      if (bytesRead === 0) break;
      read += bytesRead;
    }
    return buffer.subarray(0, read);
  } finally {
    await handle.close();
  }
}

function toPosix(path) {
  return sep === '/' ? path : path.split(sep).join('/');
}

// A path as shown in a report: relative to the base folder with forward slashes; a path outside it is shown
// absolute, also with forward slashes.
export function displayPath(path, base) {
  const rel = relative(base, path);
  if (rel === '') return '.';
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return toPosix(path);
  return toPosix(rel);
}

// A file holds binary data when its first 8,000 bytes hold a null byte.
export const isBinary = (buffer) => buffer.subarray(0, 8000).includes(0);

// Walks the folder and returns what is in it: files (relative paths with forward slashes and sizes), folders,
// symbolic links that were not followed, folders that were skipped, and entries that are neither files nor folders.
// wanted(rel, size) says which files to read; their text is in .text, or the reason they were not read in .reason. More
// entries, more depth or more bytes than the limits is an error: the folder is refused rather than half read.
export async function walkFolder(root, wanted, limits = FILE_LIMITS) {
  const full = resolve(root);
  let info;
  try {
    info = await stat(full);
  } catch (error) {
    if (error.code === 'ENOENT') throw fileError(root, 'no such folder');
    throw fileError(root, `cannot be read (${error.code ?? error.message})`);
  }
  if (!info.isDirectory()) throw fileError(root, 'not a folder; give the folder of the study');
  const out = { files: [], folders: [], links: [], skipped: [], special: [] };
  let entries = 0;
  let total = 0;
  const pending = [{ dir: full, rel: '', depth: 0 }];
  while (pending.length) {
    const { dir, rel, depth } = pending.pop();
    let names;
    try {
      names = (await readdir(dir)).sort();
    } catch (error) {
      out.special.push({ rel: rel || '.', reason: `folder cannot be read (${error.code ?? error.message})` });
      continue;
    }
    for (const name of names) {
      entries += 1;
      if (entries > limits.maxEntries) throw fileError(root, `holds more than ${limits.maxEntries.toLocaleString('en-US')} files and folders; give the folder of one study`);
      const childRel = rel ? `${rel}/${name}` : name;
      const child = resolve(dir, name);
      let st;
      try {
        st = await lstat(child);
      } catch (error) {
        out.special.push({ rel: childRel, reason: `cannot be read (${error.code ?? error.message})` });
        continue;
      }
      if (st.isSymbolicLink()) out.links.push(childRel);
      else if (st.isDirectory()) {
        if (SKIP_FOLDERS.includes(name)) {
          out.skipped.push(childRel);
          continue;
        }
        if (depth + 1 > limits.maxDepth) throw fileError(root, `has folders nested more than ${limits.maxDepth} deep (${childRel.slice(0, 120)}...)`);
        out.folders.push(childRel);
        pending.push({ dir: child, rel: childRel, depth: depth + 1 });
      } else if (st.isFile()) {
        const file = { rel: childRel, size: st.size, text: null, reason: null };
        if (wanted(childRel, st.size)) {
          if (st.size > limits.maxFileBytes) file.reason = `${st.size.toLocaleString('en-US')} bytes is over the ${megabytes(limits.maxFileBytes)} limit`;
          else if (total + st.size > limits.maxTotalBytes) throw fileError(root, `the files to read hold more than ${megabytes(limits.maxTotalBytes)}`);
          else {
            try {
              const buffer = await readBounded(child, limits.maxFileBytes);
              total += buffer.length;
              if (isBinary(buffer)) file.reason = 'holds binary data';
              else file.text = buffer.toString('utf8');
            } catch (error) {
              file.reason = error.reason ?? error.message;
            }
          }
        }
        out.files.push(file);
      } else out.special.push({ rel: childRel, reason: 'not a regular file or folder' });
    }
  }
  out.files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  out.folders.sort();
  out.links.sort();
  out.skipped.sort();
  return out;
}

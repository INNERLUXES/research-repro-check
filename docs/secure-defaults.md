# Secure defaults

The default run is the safe run. Nothing below needs a flag, and none of it can be switched off.

## How the tool behaves by default

- **Never runs the study.** The tool reads scripts and notebooks as text. It never runs a script, a cell, a `setup.py`, an R file or a shell line in a notebook, never imports a module and never starts a kernel. A study folder can be checked before anyone trusts it.
- **No network.** The tool reads the folder it is given and sends nothing anywhere. It does not check for updates and does not look up packages on an index. An argument that looks like an address is refused. It can run in a locked-down job with no outbound access at all.
- **No commands.** The tool never runs a program: not pip, conda, R, Jupyter, git or a shell. No name or path from the folder is ever put on a command line.
- **No dependencies.** Node 22 or newer and nothing else, so a check does not add a supply chain of its own. There is no `node_modules` to install before it runs.
- **Never follows a link.** Inside the folder, every entry is looked at with `lstat`. A symbolic link or a junction is listed and never followed, so it cannot lead the tool to files outside the folder or round in a loop.
- **Reads only what it needs.** Only the files whose names the checks need are read. Data files, images and archives are listed by name and size and never opened. A path written in the code or in a requirements file is looked up among the names of the folder; it is never opened.
- **Regular files only, bounded.** Each file is opened once, its type and size are taken from the open file, and anything that is not a regular file or is over 16 MB is not read. The number of entries, the depth of folders and the total bytes read are capped, and past a cap the folder is refused.
- **A bounded reader.** Lines are split once; a line of code over 4,096 characters is counted and never matched; every pattern is anchored or bounded, with no nested repetition; the JSON reader caps nesting at 64 levels.
- **Nothing is guessed.** A notebook that cannot be read is a finding, not a pass. A file not read, a link not followed and a folder skipped are named in a note.
- **Secrets stay hidden.** A key or token found in the folder is shown only as its first four characters and its length, in every format, and also when it appears inside an error message of a notebook.
- **Clean output.** Text from the folder has control characters, line separators and direction controls removed and its length capped before it reaches a report or an error message, so a hostile name or path cannot rewrite the terminal or reorder what a reader sees. Markdown cells escape pipes, backslashes, square brackets, backticks, asterisks, underscores, line breaks and `<`, `>` and `&`. CSV cells are quoted as RFC 4180 says, and a cell that a spreadsheet would read as a formula gets a leading `'`.
- **No prototype tricks.** Files, keys and findings are kept in arrays, sets and maps, and the JSON reader stores a key such as `__proto__` as a plain key, so a name is just data.
- **The gate is on.** Without any option, an error makes the run exit with `1`.
- **Writes nothing to disk.** The report goes to the screen. Redirect it to a file or the job summary only when you need to keep it.

## Running it safely on folders you do not know

1. A study folder is data, and the tool treats it as data. Still, run it as a user with read access to the folder and nothing else; it needs no account, no key, no Python, no R and no network.
2. Read the notes and the info findings: they say what was not read and why, so a pass is not taken for more than it is.
3. A report names files and paths of the study, and may name the kind of a key it found. Keep that in mind before you post a report in a public place.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline, with `ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS, with hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |

# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "research-repro-check security", or use private vulnerability reporting on this repository. Please do not open a public issue for a vulnerability.

Include a small made-up folder that shows the problem, what you expected and what happened. Use made-up names, paths and data, and never a real key, token or password, even a revoked one.

## Scope

In scope:

- a folder that makes the tool run any of its code, import a module, start a kernel, or run a program
- a folder that makes the tool open a network connection, follow a symbolic link or a junction, or read a file outside the folder it was given
- a folder that makes the tool hang, take very long, or use unbounded memory, such as very many files, deep folders, a very large file, a very long line, deeply nested notebook JSON, or a path that is not a regular file
- a key, token or password from the folder that appears unmasked in any report or error message
- text from a file name, a cell, an output or a path that breaks a Markdown table, injects a formula into a CSV report, or rewrites the terminal through control or direction characters
- a name such as `__proto__` that changes how objects behave inside the tool
- a notebook or a file that the tool fails to read and passes over without a finding or a note
- a finding that docs/method.md says is reported, for an input the tool accepts, that the report leaves out
- a sentence in src/data.js that differs from the saved page in research/sources

Out of scope: what a static reading cannot show (docs/limits.md lists it), whether a study's results are right, the safety of running a study's code yourself, and how your pipeline stores the reports.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.

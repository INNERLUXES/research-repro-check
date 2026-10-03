# 1. Read the folder, never run the code

## Context

The tool needs to say what stops someone else from running a study again and getting the same result. The surest way to know is to do it: build a fresh environment, run every script and notebook from the top, and compare the outputs. Tools exist for that, and a study should go through it before it is published.

That run is slow and costly, and it is not safe on a folder you do not trust. It needs the right Python or R, the packages, often a GPU and the data, which may be large or held back on purpose. It runs whatever the folder holds, including a `setup.py`, a notebook cell or an R script that writes files or reaches the network. And when it fails, it often fails at the first missing package, long before it reaches the absolute path or the missing data file further down.

Most of the reasons a re-run fails are written in the folder and can be read without running anything. The Turing Way: "In order for research to be reproducible, the computational environment that it was conducted in must be captured in such a way that others can replicate it." Whether a requirements file exists and pins its versions, whether a notebook's saved counts show it was run in order, whether it was saved with an error, whether the data file a script reads is there, whether a path names one person's home folder, whether a seed is set: each of these is in the text of the files.

## Decision

The tool reads the study folder as text and never runs it. It walks the folder without following links, reads only the files whose names the checks need, and looks up every path the code names among the names of the folder instead of opening it. It never runs a script, a cell, pip, conda, R, a kernel or a shell, never imports a module, never fetches anything and never opens a network connection.

Every sentence it quotes comes from a page saved with its address in research/sources: The Turing Way, the packaging specifications PEP 508 and PEP 440, the pip documentation, the notebook format description and the citation file guide. A test compares the code and the documents with the saved text. Where the tool makes its own choice (a severity, a limit, a list of reader calls or random calls), the documents say so.

A thing the tool cannot read is reported, not passed: a notebook that is not valid JSON is a finding, a file over the size limit and a link not followed are named in notes.

## Consequences

The check runs in a second on Linux, macOS or Windows with only Node: no Python, no R, no data, no account and no network, and no folder can make it run code or reach out to a host. It can run on every pull request, on a folder before anyone trusts it, and on a study whose data cannot be shared. It reports every problem it finds at once, not only the first one a run would hit.

The cost is that it cannot prove that a result reproduces. A pinned environment can still fail to install, a seed can be set too late, a notebook can be edited after it was run, and a path held in a variable is not seen. The Turing Way: "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." Only running the analysis shows that. The tool says what it left out, lists its limits in docs/limits.md, and is a step before that run, not a replacement for it.

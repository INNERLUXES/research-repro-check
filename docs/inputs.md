# Inputs

The tool takes the path of one folder: the folder of a study, a prototype or a paper's code. It walks that folder and reads some of its files as text. It never runs a file, never imports a module, never starts a kernel, never runs pip, conda or R, and never reads from standard input. The folder given may itself be a symbolic link, because the person who runs the tool named it; inside it, no link is followed.

## The walk

- Every entry is looked at with `lstat`. A symbolic link (or a Windows junction) is listed by its name and never followed, whether it points to a file, a folder, a device or back to a parent. Its name still counts as a name in the folder, so a path in the code that goes through it is not reported missing; a note lists every link.
- Folders of tools and caches are not entered: `.git`, `.hg`, `.svn`, `node_modules`, `__pycache__`, `.ipynb_checkpoints`, `.venv`, `venv`, `.tox`, `.nox`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`, `.Rproj.user` and `.cache`. A note names the ones it met.
- An entry that is neither a file, a folder nor a link (a pipe, a socket, a device) is listed in a note and never opened.
- At most 20,000 files and folders and folders nested at most 32 deep. Past either limit the folder is refused with exit code `2`, rather than read in part.
- An argument that looks like an address (`https://...`) is refused. Nothing is downloaded.

## The files that are read

Only files whose names the checks need are read, each one opened once, its type and size taken from the open file:

| File | What the tool takes from it |
| --- | --- |
| `*.py` | string literals with their lines, the code with strings and comments blanked, and keys or tokens |
| `*.R`, `*.r`, `*.Rmd` | the same, for R |
| `*.ipynb` | the cells, the execution counts, the outputs, and the code of each code cell read as a script in the kernel's language |
| `requirements*.txt`, `requirements*.in`, and small `.txt` and `.in` files that one of them includes | every line, as pip reads it |
| `pyproject.toml` | the `dependencies` of `[project]` and the keys of `[tool.poetry.dependencies]` |
| `environment.yml`, `environment.yaml` | the `dependencies` list and its `pip` list |
| `Pipfile` | the number of entries in `[packages]` and `[dev-packages]` |
| `package.json` (at the top) | the number of `dependencies` and `devDependencies` |
| `CITATION.cff` (at the top) | the top-level keys and the number of authors |
| README files anywhere, and data documents (`DATA.md`, `data_availability.txt` and the like) | their text, to see whether a missing data file is described |

Every other file (data, images, lock files, the license, JavaScript files) is only listed by name and size. Its name is enough for the checks: whether a data file is there, whether a lock file exists, whether there is a license.

- A file to read over 16 MB is not read and is named in a note; a notebook over the limit is reported by `notebook-unreadable`. All files read together may hold at most 256 MB, or the folder is refused.
- A file whose first 8,000 bytes hold a null byte is binary and is not read.
- Text is read as UTF-8. LF, CRLF and a lone CR all end a line, so a folder written on Windows and one written on Linux give the same report.
- A line of code longer than 4,096 characters is not scanned, and a note counts such lines. A file with more than 1,000,000 lines is not scanned.

## Requirements files

The pip documentation describes the file: "Requirements files serve as a list of items to be installed by pip, when using pip install." and "Each line of the requirements file indicates something to be installed, or arguments to pip install." The reader follows its line rules:

- "A line that begins with # is treated as a comment and ignored." Text after white space and `#` is a comment too.
- "A line ending in an unescaped \ is treated as a line continuation and the newline following it is effectively ignored."
- `-r` and `--requirement` include another requirements file, and `-c` and `--constraint` a constraints file: "If you wish, you can refer to other requirements files, like this:". An included file inside the study folder is read too. One outside the folder (`../shared.txt`) or missing from it is named in a note and not read; an absolute one is also reported by `absolute-path`.
- `-e` and `--editable` lines, local paths and URLs are listed and not read as requirements. Other options (`--index-url`, `--hash` after a requirement) are skipped.
- Every other line is a dependency specifier. The specification: "A dependency specification always specifies a distribution name." and "The version installed can be controlled using version limits, or giving the URL to a specific artifact to install." The reader takes the name, the extras in square brackets, the version clauses (`~=`, `==`, `!=`, `<=`, `>=`, `<`, `>`, `===`), a URL after `@`, and the marker after `;`: "Environment markers allow a dependency specification to provide a rule that describes when the dependency should be used." A line that does not read as a specifier is not counted as a requirement.

Names are compared as package indexes compare them: lower case, with runs of `-`, `_` and `.` as one `-`.

## Notebooks

A notebook is JSON in nbformat 4. The format description: "At the highest level, a Jupyter notebook is a dictionary with a few keys:" Code cells "contain source code in the language of the document's associated kernel, and a list of outputs associated with executing that code." The reader takes:

- the cells in order, each with the line where it starts in the file, so findings point at it
- the source of each cell, as one string or a list of strings
- the `execution_count` of each code cell, a whole number or null
- the outputs of each code cell: the text of `stream` outputs, the `text/plain` data of `execute_result` and `display_data` outputs, the name, value and traceback of `error` outputs (colour codes removed), and the size of each output
- the kernel language, from `kernelspec.language`, `language_info.name` or a kernel name such as `python3` or `ir`; Python when the metadata does not say

The reader caps nesting at 64 levels and the cells at 10,000. A key named `__proto__` is stored as a plain key.

## What the code scan sees

A script or a code cell is read as text. The scan splits it into lines, finds the string literals (with Python prefixes such as `r`, `b` and `f`, and skipping the text of triple-quoted strings), removes comments after `#`, and keeps a copy of each line with the inside of every string blanked. The checks run their patterns on these copies, so a word inside a string or a comment does not count as code, and a path inside a comment does not count as a path. The scan does not follow imports, variables or function calls.

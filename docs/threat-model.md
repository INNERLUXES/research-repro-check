# Threat model

## What the tool touches

- It walks the folder named on the command line and reads the files whose names the checks need. Nothing outside the folder is opened.
- Inside the folder it follows no symbolic link and no junction. The folder named on the command line may itself be a link, because the person who runs the tool named it; it must lead to a folder.
- It does not open a path written in the code, a notebook or a requirements file: not a data file, not an included requirements file outside the folder, not a `file://` URL. A path is text that is looked up among the names the walk found.
- It writes only to the screen (standard output and standard error).
- It opens no network connection and runs no program: not the study's code, not a kernel, not pip, conda, R or a shell.

## What the input may hold

A study folder often comes from someone else: a paper's code, a student's project, a pull request to a lab's repository, an archive downloaded to be reviewed. The tool treats each folder as possibly hostile. It can hold code meant to run when imported or installed (`setup.py`, a notebook cell, an R script that writes files). It can hold symbolic links that point outside it, at a device, or back at a parent folder in a loop. It can hold millions of files, folders nested thousands deep, a single file of gigabytes, a line of many megabytes, a notebook whose JSON nests a hundred thousand levels, or a binary file with a `.py` name. A file name, a cell, an error message or a path in the code can hold control and direction characters, start with `=` so that a spreadsheet runs it, hold markup that a Markdown table would render, or be `__proto__`. A line can be crafted to make a careless pattern run for a very long time. A notebook can hold a real key in its saved output.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| The study's code runs while it is checked, and does harm | Nothing is run, imported or installed; code is read as text. A test writes code that would make a file and exit, and checks that no file appears |
| A symbolic link leads the tool to files outside the folder, such as a home folder | Every entry is looked at with `lstat`; a link is listed by name and never followed. A test links to a folder outside with a script in it, and checks that it is not read |
| A link loop, or a link to a parent, makes the walk run for ever | Links are not followed, so there is no loop. The walk keeps its own list of folders and needs no recursion |
| Folders nested thousands deep exhaust the stack or the time | The walk is a loop with a list, not recursion, and a folder nested more than 32 deep refuses the folder with exit code `2` |
| Millions of files exhaust memory or time | More than 20,000 files and folders refuses the folder with exit code `2` |
| A huge file, or many large files, exhaust memory | Only files with the names the checks need are read; one over 16 MB is not read and is named; all files read may hold at most 256 MB. Data files are never opened |
| A pipe or a device in the folder makes the tool hang | The type is looked at with `lstat` before a file is opened, and again on the open file; anything that is not a regular file is listed and never read |
| A binary file with a code name is read as code | A null byte in the first 8,000 bytes marks a file as binary; it is not read and is named in a note |
| A notebook nests JSON so deep that a parser overflows its stack | The JSON reader caps nesting at 64 levels and reports the notebook as `notebook-unreadable` |
| A very long line or a crafted near miss makes a pattern run for a very long time | A line of code over 4,096 characters is counted and never matched; patterns are anchored or have bounded repeats, with no nested repetition; looking back for a call stops after 300 characters. Tests run long near misses and check the time |
| A notebook that cannot be read passes quietly | It is `notebook-unreadable`, a warning, with the reason |
| A real key in the folder is copied into a report, a log or a job summary | A key or token is shown only as its first four characters and its length, in code findings, output findings and error messages alike |
| Thousands of findings of one kind make the report huge | A check lists its first 200 findings in a fixed order, counts the rest in the totals and the gate, and says so in a note |
| A name such as `__proto__` or `constructor` changes how objects behave | Files and keys are kept in arrays, sets and maps; the JSON reader defines keys as plain own properties; a test checks that no prototype changes |
| A name, a path or an error message rewrites the terminal through escape sequences, or reorders text with direction characters | Control characters (C0 and C1), line and paragraph separators, the byte order mark and Unicode direction controls are replaced by a space before any text reaches a report or an error message, and the length is capped |
| A name breaks the Markdown table in the job summary, makes a link, or hides text as an HTML tag | Pipes, backslashes, square brackets, backticks, asterisks, underscores, line breaks, `<`, `>` and `&` are escaped in every table cell |
| A CSV report runs a formula when opened in a spreadsheet | Cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return get a leading `'`; every cell is quoted as RFC 4180 says |
| The argument names a URL, so the tool becomes a fetcher | Arguments that look like addresses are refused; reading from standard input is refused |

## Out of scope

Whether the study's results are right, and whether they reproduce when the code is run: the tool does not run it ([limits.md](limits.md)). The safety of running the study's code yourself. The correctness of the pages the tool quotes.

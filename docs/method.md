# Method

The tool reads one study folder as text, builds a model of it, and runs the checks below. Every check says what it reports, why it has the severity it has, what it can see and what it cannot, and the sentence of a saved page that it rests on. The pages are saved in [research/sources](../research/sources), and a test compares every quoted sentence with the saved text. Where the tool makes a choice that the pages do not state (a severity, a default limit, a list of names), the text says so.

The question behind every check is the one The Turing Way puts: "At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used." Each check looks for one thing in the folder that stops that from happening. Nothing is run: not the code, not a notebook, not pip, not R. A finding names files, cells, lines and paths, and shows a key or token only masked.

## What is read

[inputs.md](inputs.md) lists the files. In short, the tool walks the folder without following links, lists every file, and reads the ones whose names matter: Python and R scripts, notebooks, requirements files, `pyproject.toml`, `environment.yml`, `Pipfile`, `package.json`, `CITATION.cff`, README files and data documents. From them it builds:

- **files and folders**: every name in the folder, so a path in the code can be looked up
- **languages**: Python when there is a `.py` file or a notebook with a Python kernel, R for `.R`, `.r` and `.Rmd` files and R notebooks, JavaScript for `.js`, `.mjs`, `.cjs` and `.ts` files, a `package.json` at the top, or a JavaScript notebook
- **environment files and lock files** of each language, by name
- **requirements**: every line of every requirements file, read as pip reads it, with the files they include
- **notebooks**: the cells, their execution counts and their outputs
- **code**: the string literals of every script and code cell with their lines, and the code with strings and comments blanked out

## Folder

### `summary` (info)

What the tool read: the number of files and folders, how many were read, the notebooks and their code cells, the scripts, the languages, the dependencies of each file that lists them, the relative data paths the code reads, and the lines that draw random numbers or set a seed. It is always there, so a report says what it rests on, and it never fails a run.

### `no-readme` (warning)

There is no README (any case, with or without an ending such as `.md`, `.rst` or `.txt`) at the top of the folder. The Turing Way: "For research to be reproducible, researchers must publish and distribute the entire contained analysis, not just its results." and "If the project environment is not captured and the researchers need to return to their project after months or years (as is common in research), they will be unable to do so confidently." A README in a sub-folder does not count, because a reader starts at the top. The tool does not judge what the README says; it only looks for it. It is a warning: the code may run without it, but nobody knows how.

### `no-license` (warning)

There is no `LICENSE`, `LICENCE` or `COPYING` file (any case, with an ending or not) at the top of the folder. Without one, others may read the code but have no permission to run, change or share it, which blocks the publishing that the sentence above asks for. The tool does not judge which license it is.

### `citation-invalid` (warning)

`CITATION.cff` is there but is not valid by the schema guide: a required key is missing, a required value is empty, `authors` lists nobody, or `cff-version` is not a version such as `1.2.0`. It is also reported when the file is named in another case, such as `citation.cff`: the guide says valid files "must be named CITATION.cff (note the capitalization);". The guide marks `authors`, `cff-version`, `message` and `title` as required, and gives "A minimal example of a valid CITATION.cff file, that contains only the required keys, could look like this:". It describes `cff-version` as "The Citation File Format schema version that the CITATION.cff file adheres to for providing the citation metadata." The reader takes top-level keys and counts the items of `authors`; it is not a full YAML parser and does not check the types of the other keys against the schema.

### `no-citation` (info)

There is no `CITATION.cff` at the top of the folder. It is info, because many studies are cited through a paper; but a citation file is how code hosting sites and archives show how to cite the code itself.

## Environment

### `no-environment-spec` (error)

The folder holds code in a language and no file that says which packages it needs. The Turing Way: "In order for research to be reproducible, the computational environment that it was conducted in must be captured in such a way that others can replicate it." and "There is no guarantee that the analysis will be able to run or generate the same results if the analysis is dependent on any of the considerations listed above." One finding per language:

- **Python**: no `requirements*.txt` or `requirements*.in` (or a file such a file includes), `pyproject.toml`, `setup.py`, `setup.cfg`, `environment.yml` or `environment.yaml`, `Pipfile`, or a lock file of Poetry, uv, PDM, pylock or conda-lock.
- **R**: no `renv.lock` or `DESCRIPTION`.
- **JavaScript**: no `package.json` and no lock file of npm, yarn, pnpm or bun. A `package.json` without a lock file is `no-lock-file` instead.

The files are looked for anywhere in the folder. It is an error because without such a file nobody can build the environment, so the check fails a run by default. A notebook with another kernel (Julia, for example) is checked for its order and outputs; no environment file is looked for, and a note says so.

### `unpinned-dependency` (warning)

A requirements file has requirements that are not pinned to one version, and the folder has no Python lock file. The specification of version clauses: "When multiple candidate versions match a version specifier, the preferred version SHOULD be the latest version as determined by the consistent ordering defined by the standard Version scheme." and "The strict version comparison operator is intended primarily for use when defining dependencies for repeatable deployments of applications while using a shared distribution index." So a requirement is pinned when it has a clause with `===`, or with `==` and no trailing `.*`: "By default, the version matching operator is based on a strict equality comparison: the specified version must be exactly the same as the requested version." A range (`>=`, `~=`, `<`, `!=`), a prefix match (`== 2.1.*`) or a bare name is not pinned.

One finding per requirements file, at the line of the first loose requirement, names each one with its clause. A requirement pinned in a constraints file that a requirements file names with `-c` counts as pinned. A direct reference counts as pinned when it names a built file (`.whl`, `.zip`, `.tar.gz`) or a commit hash of a version control system; a branch or no reference at all is not pinned. A reference to a local file (`file://`) is reported by `absolute-path` instead. Lines with options, editable projects and local paths are not requirements by name and are not counted.

The same check reads the `dependencies` of `environment.yml`: a conda entry pins with `=` or `==` and a version (`numpy=1.26.4`), and an entry in its `pip` list pins as a requirement does. The entry `pip` itself is left out. A `conda-lock.yml` or another Python lock file makes it pass.

It is a warning: the code still installs, but on another day it gets other versions.

### `no-lock-file` (warning)

A `pyproject.toml`, `Pipfile` or `package.json` lists dependencies, and the folder has no lock file for it. These files usually hold ranges, which is right for a package but leaves the versions of a study open; the lock file is what records them. The quotations are the sentence on strict comparison for repeatable deployments, above, and from The Turing Way: "This allows researchers to reproduce one another's computational environments quickly."

- `pyproject.toml`: the `dependencies` array of `[project]`, or the keys of `[tool.poetry.dependencies]` other than `python`. It passes with `poetry.lock`, `uv.lock`, `pdm.lock`, `pylock.toml`, `conda-lock.yml`, `requirements.lock`, or a requirements file whose every requirement is pinned.
- `Pipfile`: the entries of `[packages]` and `[dev-packages]`. It passes with `Pipfile.lock`.
- `package.json` at the top of the folder: the entries of `dependencies` and `devDependencies`. It passes with `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock` or `bun.lockb`.

A file with no dependencies needs no lock file. A `package.json` that is not JSON is named in a note.

## Notebooks

### `notebook-out-of-order` (warning)

The saved execution counts of a notebook show that its code cells were not run once from top to bottom in a fresh kernel. The format description: "They also have an execution_count, which must be an integer or null." A notebook run with Restart and Run All has the counts 1, 2, 3 and so on, in cell order, with no gap. The check leaves out Markdown cells and code cells with no code, and reports:

- a first run cell whose count is not 1: runs happened before it that are not in the notebook
- a count that is not higher than the one before: the cell was run after a later cell
- a jump of more than one: cells were run in between that are not there now, or were run again
- a code cell that was not run (count null) between cells that were
- a count that is neither a whole number nor null

One finding per notebook, at the first cell with a problem, lists up to four problems and the saved counts in cell order. The Turing Way: "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." A notebook run out of order may hold outputs that the steps in it, run in order, do not make. A notebook never run at all (all counts null) is not reported. A notebook that was cleaned of its counts by a tool looks the same as one never run, and passes.

### `notebook-outputs-with-errors` (warning)

A code cell has a saved output of type `error`. The format description: "Failed execution may show an error:" and "These correspond to messages produced as a result of executing the cell." One finding per notebook lists the cells with the error name and value, with any key in them masked. The run that made the saved outputs did not finish cleanly, so the cells after the error may rest on a state the code does not make. An error printed to a stream (a traceback written with `print`) is not an error output and is not seen.

### `notebook-unreadable` (warning)

A `.ipynb` file that is not JSON, is JSON but not an object, is not nbformat 4 (nbformat 3 notebooks hold worksheets, not cells), has no `cells` list, has more than 10,000 cells, nests values more than 64 deep, or is over the size limit and was not read. The format description: "The official Jupyter Notebook format is defined with this JSON schema, which is used by Jupyter tools to validate notebooks." and "At the highest level, a Jupyter notebook is a dictionary with a few keys:". It is a warning, because its order, outputs and code were not checked; a notebook the tool cannot read must not pass quietly. The tool does not validate a notebook against the full schema.

### `notebook-large-outputs` (info)

A code cell holds saved outputs with more characters of text than `--max-output` (100 KB by default), counted over every string in its outputs, images in base64 included. The format description: "A code cell can have a variety of outputs (stream data or rich mime-type output)." Large outputs make the notebook slow to open and hard to compare between versions, and often hold data that belongs in a file. It is info: it does not stop anyone from running the work. The limit is the tool's own.

## Data and paths

### `missing-data-file` (warning)

The code reads a relative path that is not in the folder, is not written by the code itself, and is not named in a README or data document. The Turing Way: "Together with all other components of a research project, data identified in precise versions is part of the research outcome."

A string counts as a path read by the code when it is the first argument, or the keyword argument for the file, of a call that reads a file: in Python `read_csv`, `read_table`, `read_excel`, `read_parquet`, `read_json`, `read_feather`, `read_hdf`, `read_pickle`, `read_stata`, `load`, `loadtxt`, `genfromtxt`, `fromfile`, `open` (not with mode `w`, `a` or `x`), `imread`, `open_dataset` and others, matched on the last part of a dotted name (`pd.read_csv`, `np.load`); in R `read.csv`, `read.table`, `read.delim`, `readRDS`, `load`, `fread`, `read_csv`, `read_rds`, `read_excel`, `readLines`, `source` and others. The string must have a folder part or a file ending of data (`.csv`, `.parquet`, `.npy`, `.rds` and more), and is not a URL, a pattern with `*` or `?`, or a format string with `{`, `}` or `%`. The lists are the tool's own (`src/data.js`).

The path is looked up from the folder of the script and from the top of the study, since code is run from either; if it is found under one, it passes. A path that a call writes (`to_csv`, `savefig`, `np.save`, `open` with `w`, `write.csv`, `saveRDS` and others) anywhere in the folder is taken as made by the code. A path whose text or file name appears in a README or a data document (a file named like `DATA.md` or `data_availability.txt`) is taken as described, and is named in a note instead: sensitive data may be held back on purpose, and The Turing Way says so: "The Turing Way recognises that some research will use sensitive data that cannot be shared and this handbook will provide guides on how your research can be reproducible without all parts necessarily being open." A path that climbs out of the folder (`../../x.csv`) is always reported.

The tool does not follow variables: `path = "data/x.csv"` then `read_csv(path)` is not seen, and neither is a path built with `os.path.join` or an f-string.

### `absolute-path` (warning)

A string in a script, a code cell or a requirements file is a path that only exists on one computer or for one user: a Windows drive (`C:\...`, `d:/...`), a Windows network share (`\\server\share\...`), a home folder (`/home/<name>/...`, `/Users/<name>/...`, `~/...`), `/root/`, `/mnt/`, `/media/` or `/Volumes/`, or a `file://` URL to one of these. The Turing Way: "In essence, mobility of compute means being able to contain the entire software stack, from data files up through the library stack, and reliably move it from system to system." and "Any research that is limited to where it can be deployed is instantly limited in the extent that it can be reproduced." One finding per file and path. Other absolute paths (`/data/`, `/opt/`) are left alone, because containers often use them on purpose.

## Randomness

### `no-seed` (warning)

The code draws random numbers and no seed is set anywhere in the folder; or the code makes a random generator with no seed, which a global seed does not reach. The Turing Way: "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." and "Worse, some bugs may remain undetected, potentially impacting the results."

The patterns run on the code with strings and comments blanked out:

- **Python draws**: `random.random`, `random.shuffle`, `random.choice` and the other functions of the `random` module; `np.random.<function>` other than `seed` and the generator classes; `torch.rand`, `torch.randn`, `torch.randint` and others; `tf.random.<function>`; and calls that take `random_state` when they are given none: `train_test_split`, `RandomForestClassifier`, `KMeans`, `TSNE`, `.sample` of pandas and others.
- **R draws**: `sample`, `runif`, `rnorm`, `rbinom`, `slice_sample`, `kmeans`, `randomForest` and others.
- **Seeds**: `random.seed(...)`, `np.random.seed(...)`, `default_rng(<seed>)`, `RandomState(<seed>)`, `torch.manual_seed`, `tf.random.set_seed`, `set_seed`, `seed_everything`, `PYTHONHASHSEED`, `set.seed` in R, and `random_state=` with a value on one of the calls above.
- **Generators with no seed**: `default_rng()`, `RandomState()` and `random.Random()` with nothing between the brackets.

This check is best effort, and [limits.md](limits.md) says what it misses: it cannot tell whether a seed is set before the draw it is meant for, or whether a draw changes a result.

## Secrets

### `secrets-in-notebook` (error)

A key, token or password is written in a script, a code cell or a saved output of a notebook: an AWS access key id, a GitHub token, a Slack token, a Google API key, a private key block, or an assignment such as `api_key = '...'`, `token: '...'` or `password = '...'` with a value of 12 or more characters that is not a placeholder (`<...>`, `${...}`, `xxx`, `your_...`, `example`) or the name of a variable in capitals. The pip documentation gives the safer way: "You can now store sensitive data (tokens, keys, etc.) in environment variables and only specify the variable name for your requirements, letting pip lookup the value at runtime." The value is never shown: a finding gives the first four characters and the length. It is an error, because anyone who gets the folder gets the key, and a key in a repository stays in its history after the file changes. One finding per file, line, kind and place (code or output).

The name of the check says notebook because that is where keys most often hide (in an output printed while testing), but scripts are read the same way.

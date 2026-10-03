# Limits

## Static reading only

The tool reads the files of a study as text. It never runs the code, never starts a kernel and never installs a package, so it **cannot prove that a result reproduces**. A clean report means that none of the checks below found anything; it does not mean that the scripts run, that the notebook gives the same numbers, or that the paper's figures come back. The only proof is to run the work again on another machine, from a fresh environment, and compare the results. The tool finds the common reasons that run fails, early and cheaply, and says where they are. [decisions/0001-read-the-folder-never-run-the-code.md](decisions/0001-read-the-folder-never-run-the-code.md) says why it reads and does not run.

## What the checks cannot see

- **Imports without a requirement.** The tool does not compare the packages the code imports with the packages a requirements file lists. A package imported and never listed is not seen.
- **Versions that do not work.** A pinned version that does not install on today's Python, or that has been removed from the index, is not seen. Nothing is fetched.
- **The system around the code.** The operating system, the hardware, compilers, CUDA, system libraries and the version of Python or R itself are part of the environment too. The Turing Way: "This includes features of hardware (such as the numbers of cores in any CPUs) and features of software (such as the operating system, programming languages, supporting packages, other pieces of installed software, along with their versions and configurations)." The tool sees only the files that name packages. A `Dockerfile`, a container image or a Nix file is not read.
- **Data that changed.** A data file that is in the folder passes, whatever its version. The Turing Way: "If a dataset that is the basis for computing a scientific result changes without version control, reproducibility can be threatened: results may become invalid, or scripts that are based on file names that change between versions can break." Checksums and data versions are not checked.
- **Paths the scan cannot follow.** A path held in a variable, built with `os.path.join`, `Path(...) / "x.csv"`, `file.path()` or an f-string, read from a settings file or passed on the command line is not seen. Only a string written directly in a call that reads a file is looked up. A file that the code downloads with a call not in the list of writers looks missing.
- **Data described in words.** A missing file passes when its path or file name appears in a README or data document; the tool does not judge whether the text really says where to get it.
- **Seeds, best effort.** The seed check knows the common calls of Python's `random`, NumPy, PyTorch, TensorFlow, scikit-learn, pandas and base R. It does not know other libraries, does not see a seed set in a module the code imports, cannot tell whether a seed is set before the draw it is meant for, and cannot tell whether a draw changes a result. One seed anywhere in the folder satisfies it, even if it is in another script. Code that is random for other reasons (threads, GPU kernels, the order of a set or a dictionary, the clock) is not seen.
- **Notebooks that were cleaned.** A notebook saved with its counts and outputs removed passes the order and error checks. A notebook whose counts look right can still have been edited after it was run.
- **Errors that are not outputs.** Only outputs of type `error` count; a traceback printed to a stream, or a warning, does not.
- **Keys of other shapes.** The secret check knows a few shapes of keys and tokens and assignments to names such as `api_key`, `token` and `password`. A key held in a name it does not know, encoded, or split across lines is not seen. A string that looks like a key but is not one is reported.
- **Other languages.** Julia, MATLAB, Stata, SAS, C, C++ and Fortran code are not read. Notebooks with such kernels are checked for their order and outputs only. JavaScript is checked only for its environment files.
- **TOML and YAML.** `pyproject.toml`, `environment.yml`, `Pipfile` and `CITATION.cff` are read line by line for the keys the checks need, not by full parsers. Unusual layouts (inline tables, flow style, anchors) may be missed. `CITATION.cff` is checked for its required keys, not against the whole schema.
- **R environments.** A `DESCRIPTION` file counts as an environment file for R even without versions; `renv.lock` is not compared with it.
- **Licenses.** The tool looks for a license file; it does not judge the license, or whether the data has terms of its own.

## Size and counts

- A folder with more than 20,000 files and folders, or with folders nested more than 32 deep, is refused with exit code `2`.
- A file to read over 16 MB is not read; together the files read may hold at most 256 MB, or the folder is refused.
- A file with a null byte in its first 8,000 bytes is binary and is not read.
- A line of code longer than 4,096 characters is not scanned; a file of more than 1,000,000 lines is not scanned.
- A notebook may have at most 10,000 cells and nest its JSON at most 64 deep.
- A check that finds more than 200 things lists the first 200 in a fixed order, counts the rest in the totals and the gate, and says so in a note.
- Text from the folder shown in a report is cut to a fixed length: 60 to 200 characters for a name or a path, 1,500 for a message and 600 for a fix.

Every limit is reported, as a finding, a note or a refusal with exit code `2`, so a cut is never silent.

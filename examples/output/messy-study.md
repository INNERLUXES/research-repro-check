## research-repro-check: 1 error, 8 warning, 2 info

Folder: `examples/messy-study`. Files: 4 files in 2 folders, 3 read, 0 not read, 0 links not followed, 0 folders skipped. Code: 1 notebook, 1 Python script, 0 R scripts, 0 JavaScript files; languages: Python. Environment: requirements.txt; lock files: none.

| Area | Result | Detail |
| --- | --- | --- |
| Folder | warn | summary x1, no-readme x1, no-license x1, no-citation x1 |
| Environment | warn | unpinned-dependency x1 |
| Notebooks | warn | notebook-out-of-order x1, notebook-outputs-with-errors x1 |
| Data and paths | warn | missing-data-file x1, absolute-path x1 |
| Randomness | warn | no-seed x1 |
| Secrets | **fail** | secrets-in-notebook x1 |

### Folder

| Severity | Check | Where | Message | Basis | Fix |
| --- | --- | --- | --- | --- | --- |
| info | summary | examples/messy-study folder | Read 3 of 4 files in 2 folders: 1 notebook (4 code cells), 1 Python script, 0 R scripts. Languages: Python. Dependencies: requirements.txt 4 requirements (0 pinned). The code reads 2 relative data paths; random numbers are drawn on 2 lines and a seed is set on 0 lines. | "At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/) | Nothing to fix; this is what the tool read. A clean report means none of the checks found anything, not that the result reproduces. |
| warning | no-readme | examples/messy-study folder | The folder has no README at its top level, so a reader does not learn what the study is, how to set up its environment, where the data comes from, or in what order to run the code. | "For research to be reproducible, researchers must publish and distribute the entire contained analysis, not just its results." (Science, https://book.the-turing-way.org/reproducible-research/renv/) "If the project environment is not captured and the researchers need to return to their project after months or years (as is common in research), they will be unable to do so confidently." (Researchers, https://book.the-turing-way.org/reproducible-research/renv/) | Add a README.md that says what the study does, how to install the environment, where to get the data, and which scripts or notebooks to run in which order. |
| warning | no-license | examples/messy-study folder | The folder has no LICENSE, LICENCE or COPYING file at its top level. Without one, others may read the code but have no permission to run, change or share it. | "For research to be reproducible, researchers must publish and distribute the entire contained analysis, not just its results." (Science, https://book.the-turing-way.org/reproducible-research/renv/) | Add a LICENSE file with the license you choose for the code, and say in the README which terms cover the data. |
| info | no-citation | examples/messy-study folder | The folder has no CITATION.cff, so there is no file that tells others how to cite the work. | "A minimal example of a valid CITATION.cff file, that contains only the required keys, could look like this:" (Minimal example, https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md) | Add a CITATION.cff with at least cff-version, message, title and authors. Code hosting sites and archives read it and show the citation. |

### Environment

| Severity | Check | Where | Message | Basis | Fix |
| --- | --- | --- | --- | --- | --- |
| warning | unpinned-dependency | examples/messy-study/requirements.txt 4 requirements  line 1 | 4 of 4 requirements in requirements.txt are not pinned to one version: pandas (no version), numpy (&gt;=1.21), matplotlib (no version) and scikit-learn (~=1.3). pip installs the newest version that matches each one, so the same file gives other versions on another day, and there is no lock file that records the versions you used. | "When multiple candidate versions match a version specifier, the preferred version SHOULD be the latest version as determined by the consistent ordering defined by the standard Version scheme." (Version specifiers, https://packaging.python.org/en/latest/specifications/version-specifiers/) "The strict version comparison operator is intended primarily for use when defining dependencies for repeatable deployments of applications while using a shared distribution index." (Version matching, https://packaging.python.org/en/latest/specifications/version-specifiers/) | Pin each requirement to the version you ran the study with (pandas==2.1.4), for example from pip freeze in that environment, or commit a lock file (poetry.lock, uv.lock or Pipfile.lock) next to the ranges. |

### Notebooks

| Severity | Check | Where | Message | Basis | Fix |
| --- | --- | --- | --- | --- | --- |
| warning | notebook-out-of-order | examples/messy-study/analysis.ipynb cell 2  line 12 | The code cells were not run once from top to bottom: the first run cell (cell 2) has execution count 3, so 2 runs are not in the saved notebook; cell 3 has execution count 1, after cell 2 with 3; cell 4 was not run, but cells before and after it were; the execution count jumps from 1 (cell 3) to 7 (cell 5). The saved execution counts in cell order are 3, 1, none, 7. Someone who runs the notebook from the top does not repeat what was run, so the outputs may not come back. | "They also have an execution\_count, which must be an integer or null." (Code cells, https://nbformat.readthedocs.io/en/latest/format\_description.html) "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/) | Restart the kernel and run all cells from the top (Restart Kernel and Run All Cells), check that the results are the same, and save the notebook again. |
| warning | notebook-outputs-with-errors | examples/messy-study/analysis.ipynb cell 5  line 63 | 1 cell of the notebook has a saved error: cell 5 (KeyError: 'wage'). The run that made the saved outputs did not finish cleanly, so later cells may rest on a state the code does not make. | "Failed execution may show an error:" (error, https://nbformat.readthedocs.io/en/latest/format\_description.html) "These correspond to messages produced as a result of executing the cell." (Code cell outputs, https://nbformat.readthedocs.io/en/latest/format\_description.html) | Fix the cell or remove it, then restart the kernel, run all cells and save. If the error is the point of the cell, say so in a Markdown cell above it. |

### Data and paths

| Severity | Check | Where | Message | Basis | Fix |
| --- | --- | --- | --- | --- | --- |
| warning | missing-data-file | examples/messy-study/clean\_data.py data/raw/responses\_v2.csv  line 7 | pd.read\_csv("data/raw/responses\_v2.csv") at line 7 reads data/raw/responses\_v2.csv, which is not in the folder and is not named in a README or data document. | "At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/) "Together with all other components of a research project, data identified in precise versions is part of the research outcome." (Importance of Version Controlling Data, https://book.the-turing-way.org/reproducible-research/vcs/vcs-data/) | Add the file to the folder, or say in the README where to get it (an address, and a version or checksum), or add a script that downloads it. |
| warning | absolute-path | examples/messy-study/clean\_data.py  line 5 | "/home/mira/projects/survey/codebook.xlsx" is a path in the home folder of one user. On another computer, or for another user, the path does not exist, so the code stops there. | "In essence, mobility of compute means being able to contain the entire software stack, from data files up through the library stack, and reliably move it from system to system." (Science, https://book.the-turing-way.org/reproducible-research/renv/) "Any research that is limited to where it can be deployed is instantly limited in the extent that it can be reproduced." (Science, https://book.the-turing-way.org/reproducible-research/renv/) | Use a path relative to the folder of the study (data/codebook.xlsx), built from the place of the script (Path(\_\_file\_\_).parent in Python, here::here() in R), or read the folder from a setting. |

### Randomness

| Severity | Check | Where | Message | Basis | Fix |
| --- | --- | --- | --- | --- | --- |
| warning | no-seed | examples/messy-study/analysis.ipynb cell 3  line 45 | The code draws random numbers (analysis.ipynb cell 3: noise = np.random.normal(0, 1, len(df)) and clean\_data.py line 12: random.shuffle(ids)) and no seed is set anywhere in the folder. Each run gives other numbers, so results that rest on them change from run to run. | "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." (Table of Definitions for Reproducibility, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/) "Worse, some bugs may remain undetected, potentially impacting the results." (Collaborators, https://book.the-turing-way.org/reproducible-research/renv/) | Set a seed once at the top of each script or notebook: random.seed(42), np.random.seed(42) or rng = np.random.default\_rng(42), torch.manual\_seed(42), or set.seed(42) in R. Pass random\_state to scikit-learn calls. |

### Secrets

| Severity | Check | Where | Message | Basis | Fix |
| --- | --- | --- | --- | --- | --- |
| error | secrets-in-notebook | examples/messy-study/analysis.ipynb cell 5  line 76 | A key, token or password is written in the code: demo... (23 characters). Anyone who gets the folder gets the key, and it stays in the history of the repository after it is deleted. | "You can now store sensitive data (tokens, keys, etc.) in environment variables and only specify the variable name for your requirements, letting pip lookup the value at runtime." (Using environment variables, https://pip.pypa.io/en/stable/reference/requirements-file-format/) "The Turing Way recognises that some research will use sensitive data that cannot be shared and this handbook will provide guides on how your research can be reproducible without all parts necessarily being open." (Reproducible But Not Open, https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/) | Revoke the key now. Read it from an environment variable or a file that is not shared, clear the outputs that show it, and remove it from the history of the repository. |

**Gate failed:** 1 error, 8 warnings.

# Rules and sources

Every sentence that the tool quotes comes from a page that is saved in [research/sources](../research/sources), with its address on the first line. `src/data.js` holds them, and `test/data.test.js` compares each one with the saved text. Nothing was added from memory. Change a sentence only after saving the new page text and updating this file.

## The saved pages

| File | Address | What it is used for |
| --- | --- | --- |
| `turing-definitions.txt` | https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/ | what reproducible research and a reproducible result are, and research that is reproducible but not open |
| `turing-environments.txt` | https://book.the-turing-way.org/reproducible-research/renv/ | why the computational environment must be captured, and why an analysis must move from system to system |
| `turing-package-management.txt` | https://book.the-turing-way.org/reproducible-research/renv/renv-package/ | what package managers do, and environment files that let others rebuild an environment |
| `turing-data-versioning.txt` | https://book.the-turing-way.org/reproducible-research/vcs/vcs-data/ | why the data a result rests on is part of the research outcome |
| `pep508-dependency-specifiers.txt` | https://packaging.python.org/en/latest/specifications/dependency-specifiers/ | the parts of a dependency specifier: name, extras, version clauses, URL and marker |
| `pep440-version-specifiers.txt` | https://packaging.python.org/en/latest/specifications/version-specifiers/ | the version clauses, what == and === mean, and that the newest matching version is preferred |
| `pip-requirements-file-format.txt` | https://pip.pypa.io/en/stable/reference/requirements-file-format/ | the lines of a requirements file: comments, continuations, options and includes |
| `nbformat-format-description.txt` | https://nbformat.readthedocs.io/en/latest/format_description.html | the notebook file, code cells, execution_count and the error output |
| `cff-schema-guide.txt` | https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md | the required keys of CITATION.cff |

The pages are saved as the text of the page, from the heading of each kept section to its end, with the navigation, figures, references and footers left out. Sentences that name a year were left out of the saved text, so that no saved file holds a date. From The Turing Way the definitions, the summary and background of the chapter on reproducible environments, the parts of the package management page on package managers and on exporting environments, and the first two sections of the page on version control for data are kept. From the packaging specifications the introduction, the concepts, the grammar, names, extras and environment markers of PEP 508, and the version specifiers, version matching and examples of PEP 440 are kept. The pip page and the notebook format page are kept from their start to the end of the parts listed above. The citation file guide is kept as text: its general structure, the minimal example and the entries for authors, cff-version, message and title, with the Markdown marks removed. Typographic quotes and dashes are written as plain ASCII.

The pages say what the files mean, not how a tool should judge a study. The severities, the limits and the lists of file names, readers, writers and random calls are the tool's own; docs/method.md says so where each is used.

## The sentences that the findings quote

Each sentence is on its saved page word for word. A key used by "docs" is quoted in the documents and in no finding.

| Key | Used by | Sentence | Page and section |
| --- | --- | --- | --- |
| `reproducibleDefinition` | `summary`, `missing-data-file` | "At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used." | `turing-definitions.txt`, Table of Definitions for Reproducibility |
| `reproducibleResult` | `notebook-out-of-order`, `no-seed` | "A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer." | `turing-definitions.txt`, Table of Definitions for Reproducibility |
| `notOpen` | `secrets-in-notebook` | "The Turing Way recognises that some research will use sensitive data that cannot be shared and this handbook will provide guides on how your research can be reproducible without all parts necessarily being open." | `turing-definitions.txt`, Reproducible But Not Open |
| `noGuarantee` | `no-environment-spec` | "There is no guarantee that the analysis will be able to run or generate the same results if the analysis is dependent on any of the considerations listed above." | `turing-environments.txt`, Summary |
| `captureEnvironment` | `no-environment-spec` | "In order for research to be reproducible, the computational environment that it was conducted in must be captured in such a way that others can replicate it." | `turing-environments.txt`, Summary |
| `environmentIncludes` | docs | "This includes features of hardware (such as the numbers of cores in any CPUs) and features of software (such as the operating system, programming languages, supporting packages, other pieces of installed software, along with their versions and configurations)." | `turing-environments.txt`, What is a Computational Environment? |
| `returnLater` | `no-readme` | "If the project environment is not captured and the researchers need to return to their project after months or years (as is common in research), they will be unable to do so confidently." | `turing-environments.txt`, Researchers |
| `bugsUndetected` | `no-seed` | "Worse, some bugs may remain undetected, potentially impacting the results." | `turing-environments.txt`, Collaborators |
| `publishWhole` | `no-readme`, `no-license` | "For research to be reproducible, researchers must publish and distribute the entire contained analysis, not just its results." | `turing-environments.txt`, Science |
| `mobility` | `absolute-path` | "In essence, mobility of compute means being able to contain the entire software stack, from data files up through the library stack, and reliably move it from system to system." | `turing-environments.txt`, Science |
| `limitedDeploy` | `absolute-path` | "Any research that is limited to where it can be deployed is instantly limited in the extent that it can be reproduced." | `turing-environments.txt`, Science |
| `packageManagers` | docs | "Package managers install and keep track of the different software packages (and their versions) that you use within an environment." | `turing-package-management.txt`, Package Management Systems |
| `exportYaml` | docs | "Conda environments can be exported easily to human-readable files in the YAML format." | `turing-package-management.txt`, Exporting and Reproducing Computational Environments |
| `reproduceQuickly` | `no-lock-file` | "This allows researchers to reproduce one another's computational environments quickly." | `turing-package-management.txt`, Exporting and Reproducing Computational Environments |
| `dataRarelyInvariant` | docs | "The reality is that data is only rarely invariant." | `turing-data-versioning.txt`, Importance of Version Controlling Data |
| `dataChanges` | docs | "If a dataset that is the basis for computing a scientific result changes without version control, reproducibility can be threatened: results may become invalid, or scripts that are based on file names that change between versions can break." | `turing-data-versioning.txt`, Importance of Version Controlling Data |
| `dataPartOfOutcome` | `missing-data-file` | "Together with all other components of a research project, data identified in precise versions is part of the research outcome." | `turing-data-versioning.txt`, Importance of Version Controlling Data |
| `depNamesDistribution` | docs | "A dependency specification always specifies a distribution name." | `pep508-dependency-specifiers.txt`, Concepts |
| `versionLimits` | docs | "The version installed can be controlled using version limits, or giving the URL to a specific artifact to install." | `pep508-dependency-specifiers.txt`, Concepts |
| `markers` | docs | "Environment markers allow a dependency specification to provide a rule that describes when the dependency should be used." | `pep508-dependency-specifiers.txt`, Environment Markers |
| `specifierClauses` | docs | "A version specifier consists of a series of version clauses, separated by commas." | `pep440-version-specifiers.txt`, Version specifiers |
| `preferredLatest` | `unpinned-dependency` | "When multiple candidate versions match a version specifier, the preferred version SHOULD be the latest version as determined by the consistent ordering defined by the standard Version scheme." | `pep440-version-specifiers.txt`, Version specifiers |
| `strictEquality` | docs | "By default, the version matching operator is based on a strict equality comparison: the specified version must be exactly the same as the requested version." | `pep440-version-specifiers.txt`, Version matching |
| `repeatable` | `unpinned-dependency`, `no-lock-file` | "The strict version comparison operator is intended primarily for use when defining dependencies for repeatable deployments of applications while using a shared distribution index." | `pep440-version-specifiers.txt`, Version matching |
| `requirementsList` | docs | "Requirements files serve as a list of items to be installed by pip, when using pip install." | `pip-requirements-file-format.txt`, Requirements File Format |
| `eachLine` | docs | "Each line of the requirements file indicates something to be installed, or arguments to pip install." | `pip-requirements-file-format.txt`, Structure |
| `continuation` | docs | "A line ending in an unescaped \ is treated as a line continuation and the newline following it is effectively ignored." | `pip-requirements-file-format.txt`, Line continuations |
| `comments` | docs | "A line that begins with # is treated as a comment and ignored." | `pip-requirements-file-format.txt`, Comments |
| `referOther` | docs | "If you wish, you can refer to other requirements files, like this:" | `pip-requirements-file-format.txt`, Referring to other requirements files |
| `envSecrets` | `secrets-in-notebook` | "You can now store sensitive data (tokens, keys, etc.) in environment variables and only specify the variable name for your requirements, letting pip lookup the value at runtime." | `pip-requirements-file-format.txt`, Using environment variables |
| `officialFormat` | `notebook-unreadable` | "The official Jupyter Notebook format is defined with this JSON schema, which is used by Jupyter tools to validate notebooks." | `nbformat-format-description.txt`, The Notebook file format |
| `topLevel` | `notebook-unreadable` | "At the highest level, a Jupyter notebook is a dictionary with a few keys:" | `nbformat-format-description.txt`, Top-level structure |
| `codeCells` | docs | "They contain source code in the language of the document's associated kernel, and a list of outputs associated with executing that code." | `nbformat-format-description.txt`, Code cells |
| `executionCount` | `notebook-out-of-order` | "They also have an execution_count, which must be an integer or null." | `nbformat-format-description.txt`, Code cells |
| `outputKinds` | `notebook-large-outputs` | "A code cell can have a variety of outputs (stream data or rich mime-type output)." | `nbformat-format-description.txt`, Code cell outputs |
| `outputsCorrespond` | `notebook-outputs-with-errors`, `notebook-large-outputs` | "These correspond to messages produced as a result of executing the cell." | `nbformat-format-description.txt`, Code cell outputs |
| `failedExecution` | `notebook-outputs-with-errors` | "Failed execution may show an error:" | `nbformat-format-description.txt`, error |
| `cffMinimal` | `citation-invalid`, `no-citation` | "A minimal example of a valid CITATION.cff file, that contains only the required keys, could look like this:" | `cff-schema-guide.txt`, Minimal example |
| `cffVersion` | `citation-invalid` | "The Citation File Format schema version that the CITATION.cff file adheres to for providing the citation metadata." | `cff-schema-guide.txt`, cff-version |
| `cffMessage` | docs | "A message to the human reader of the CITATION.cff file to let them know what to do with the citation metadata." | `cff-schema-guide.txt`, message |
| `cffAuthors` | docs | "The authors of a software or dataset." | `cff-schema-guide.txt`, authors |
| `cffTitle` | docs | "The name of the software or dataset." | `cff-schema-guide.txt`, title |

## The findings

| Id | Severity | Area | Sentences | Where the rule is written |
| --- | --- | --- | --- | --- |
| `summary` | info | Folder | `reproducibleDefinition` | [method.md](method.md#summary-info) |
| `no-environment-spec` | error | Environment | `captureEnvironment`, `noGuarantee` | [method.md](method.md#no-environment-spec-error) |
| `secrets-in-notebook` | error | Secrets | `envSecrets`, `notOpen` | [method.md](method.md#secrets-in-notebook-error) |
| `unpinned-dependency` | warning | Environment | `preferredLatest`, `repeatable` | [method.md](method.md#unpinned-dependency-warning) |
| `no-lock-file` | warning | Environment | `repeatable`, `reproduceQuickly` | [method.md](method.md#no-lock-file-warning) |
| `notebook-out-of-order` | warning | Notebooks | `executionCount`, `reproducibleResult` | [method.md](method.md#notebook-out-of-order-warning) |
| `notebook-outputs-with-errors` | warning | Notebooks | `failedExecution`, `outputsCorrespond` | [method.md](method.md#notebook-outputs-with-errors-warning) |
| `notebook-unreadable` | warning | Notebooks | `officialFormat`, `topLevel` | [method.md](method.md#notebook-unreadable-warning) |
| `missing-data-file` | warning | Data and paths | `reproducibleDefinition`, `dataPartOfOutcome` | [method.md](method.md#missing-data-file-warning) |
| `absolute-path` | warning | Data and paths | `mobility`, `limitedDeploy` | [method.md](method.md#absolute-path-warning) |
| `no-seed` | warning | Randomness | `reproducibleResult`, `bugsUndetected` | [method.md](method.md#no-seed-warning) |
| `no-readme` | warning | Folder | `publishWhole`, `returnLater` | [method.md](method.md#no-readme-warning) |
| `no-license` | warning | Folder | `publishWhole` | [method.md](method.md#no-license-warning) |
| `citation-invalid` | warning | Folder | `cffMinimal`, `cffVersion` | [method.md](method.md#citation-invalid-warning) |
| `notebook-large-outputs` | info | Notebooks | `outputKinds`, `outputsCorrespond` | [method.md](method.md#notebook-large-outputs-info) |
| `no-citation` | info | Folder | `cffMinimal` | [method.md](method.md#no-citation-info) |

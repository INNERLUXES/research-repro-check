// The names, lists and sentences the checks rest on. Each sentence comes from a page that is saved, with its address on
// the first line, in research/sources, and test/data.test.js compares this file with the saved text. Change a sentence
// here only after saving the new page text and updating docs/rules-and-sources.md. The checks in src/ use these
// constants and never write a quoted sentence of their own.

export const SOURCES = [
  { id: 'turing-definitions', file: 'turing-definitions.txt', url: 'https://book.the-turing-way.org/reproducible-research/overview/overview-definitions/', label: 'The Turing Way, Definitions' },
  { id: 'turing-environments', file: 'turing-environments.txt', url: 'https://book.the-turing-way.org/reproducible-research/renv/', label: 'The Turing Way, Reproducible Environments' },
  { id: 'turing-packages', file: 'turing-package-management.txt', url: 'https://book.the-turing-way.org/reproducible-research/renv/renv-package/', label: 'The Turing Way, Package Management Systems' },
  { id: 'turing-data', file: 'turing-data-versioning.txt', url: 'https://book.the-turing-way.org/reproducible-research/vcs/vcs-data/', label: 'The Turing Way, Version Control for Data' },
  { id: 'pep508', file: 'pep508-dependency-specifiers.txt', url: 'https://packaging.python.org/en/latest/specifications/dependency-specifiers/', label: 'Python Packaging User Guide, Dependency specifiers (PEP 508)' },
  { id: 'pep440', file: 'pep440-version-specifiers.txt', url: 'https://packaging.python.org/en/latest/specifications/version-specifiers/', label: 'Python Packaging User Guide, Version specifiers (PEP 440)' },
  { id: 'pip-requirements', file: 'pip-requirements-file-format.txt', url: 'https://pip.pypa.io/en/stable/reference/requirements-file-format/', label: 'pip documentation, Requirements File Format' },
  { id: 'nbformat', file: 'nbformat-format-description.txt', url: 'https://nbformat.readthedocs.io/en/latest/format_description.html', label: 'nbformat documentation, The Notebook file format' },
  { id: 'cff', file: 'cff-schema-guide.txt', url: 'https://github.com/citation-file-format/citation-file-format/blob/main/schema-guide.md', label: 'Guide to Citation File Format schema version 1.2.0' }
];

export const source = (id) => SOURCES.find((s) => s.id === id);

// Sentences quoted in the findings and the documents. Every text is on its saved page word for word
// (test/data.test.js compares them), and holds no year.
export const FACTS = {
  reproducibleDefinition: { source: 'turing-definitions', section: 'Table of Definitions for Reproducibility', text: 'At The Turing Way, we define reproducible research as work that can be independently recreated from the same data and the same code that the original team used.' },
  reproducibleResult: { source: 'turing-definitions', section: 'Table of Definitions for Reproducibility', text: 'A result is reproducible when the same analysis steps performed on the same dataset consistently produces the same answer.' },
  notOpen: { source: 'turing-definitions', section: 'Reproducible But Not Open', text: 'The Turing Way recognises that some research will use sensitive data that cannot be shared and this handbook will provide guides on how your research can be reproducible without all parts necessarily being open.' },
  noGuarantee: { source: 'turing-environments', section: 'Summary', text: 'There is no guarantee that the analysis will be able to run or generate the same results if the analysis is dependent on any of the considerations listed above.' },
  captureEnvironment: { source: 'turing-environments', section: 'Summary', text: 'In order for research to be reproducible, the computational environment that it was conducted in must be captured in such a way that others can replicate it.' },
  environmentIncludes: { source: 'turing-environments', section: 'What is a Computational Environment?', text: 'This includes features of hardware (such as the numbers of cores in any CPUs) and features of software (such as the operating system, programming languages, supporting packages, other pieces of installed software, along with their versions and configurations).' },
  returnLater: { source: 'turing-environments', section: 'Researchers', text: 'If the project environment is not captured and the researchers need to return to their project after months or years (as is common in research), they will be unable to do so confidently.' },
  bugsUndetected: { source: 'turing-environments', section: 'Collaborators', text: 'Worse, some bugs may remain undetected, potentially impacting the results.' },
  publishWhole: { source: 'turing-environments', section: 'Science', text: 'For research to be reproducible, researchers must publish and distribute the entire contained analysis, not just its results.' },
  mobility: { source: 'turing-environments', section: 'Science', text: 'In essence, mobility of compute means being able to contain the entire software stack, from data files up through the library stack, and reliably move it from system to system.' },
  limitedDeploy: { source: 'turing-environments', section: 'Science', text: 'Any research that is limited to where it can be deployed is instantly limited in the extent that it can be reproduced.' },
  packageManagers: { source: 'turing-packages', section: 'Package Management Systems', text: 'Package managers install and keep track of the different software packages (and their versions) that you use within an environment.' },
  exportYaml: { source: 'turing-packages', section: 'Exporting and Reproducing Computational Environments', text: 'Conda environments can be exported easily to human-readable files in the YAML format.' },
  reproduceQuickly: { source: 'turing-packages', section: 'Exporting and Reproducing Computational Environments', text: "This allows researchers to reproduce one another's computational environments quickly." },
  dataRarelyInvariant: { source: 'turing-data', section: 'Importance of Version Controlling Data', text: 'The reality is that data is only rarely invariant.' },
  dataChanges: { source: 'turing-data', section: 'Importance of Version Controlling Data', text: 'If a dataset that is the basis for computing a scientific result changes without version control, reproducibility can be threatened: results may become invalid, or scripts that are based on file names that change between versions can break.' },
  dataPartOfOutcome: { source: 'turing-data', section: 'Importance of Version Controlling Data', text: 'Together with all other components of a research project, data identified in precise versions is part of the research outcome.' },
  depNamesDistribution: { source: 'pep508', section: 'Concepts', text: 'A dependency specification always specifies a distribution name.' },
  versionLimits: { source: 'pep508', section: 'Concepts', text: 'The version installed can be controlled using version limits, or giving the URL to a specific artifact to install.' },
  markers: { source: 'pep508', section: 'Environment Markers', text: 'Environment markers allow a dependency specification to provide a rule that describes when the dependency should be used.' },
  specifierClauses: { source: 'pep440', section: 'Version specifiers', text: 'A version specifier consists of a series of version clauses, separated by commas.' },
  preferredLatest: { source: 'pep440', section: 'Version specifiers', text: 'When multiple candidate versions match a version specifier, the preferred version SHOULD be the latest version as determined by the consistent ordering defined by the standard Version scheme.' },
  strictEquality: { source: 'pep440', section: 'Version matching', text: 'By default, the version matching operator is based on a strict equality comparison: the specified version must be exactly the same as the requested version.' },
  repeatable: { source: 'pep440', section: 'Version matching', text: 'The strict version comparison operator is intended primarily for use when defining dependencies for repeatable deployments of applications while using a shared distribution index.' },
  requirementsList: { source: 'pip-requirements', section: 'Requirements File Format', text: 'Requirements files serve as a list of items to be installed by pip, when using pip install.' },
  eachLine: { source: 'pip-requirements', section: 'Structure', text: 'Each line of the requirements file indicates something to be installed, or arguments to pip install.' },
  continuation: { source: 'pip-requirements', section: 'Line continuations', text: 'A line ending in an unescaped \\ is treated as a line continuation and the newline following it is effectively ignored.' },
  comments: { source: 'pip-requirements', section: 'Comments', text: 'A line that begins with # is treated as a comment and ignored.' },
  referOther: { source: 'pip-requirements', section: 'Referring to other requirements files', text: 'If you wish, you can refer to other requirements files, like this:' },
  envSecrets: { source: 'pip-requirements', section: 'Using environment variables', text: 'You can now store sensitive data (tokens, keys, etc.) in environment variables and only specify the variable name for your requirements, letting pip lookup the value at runtime.' },
  officialFormat: { source: 'nbformat', section: 'The Notebook file format', text: 'The official Jupyter Notebook format is defined with this JSON schema, which is used by Jupyter tools to validate notebooks.' },
  topLevel: { source: 'nbformat', section: 'Top-level structure', text: 'At the highest level, a Jupyter notebook is a dictionary with a few keys:' },
  codeCells: { source: 'nbformat', section: 'Code cells', text: "They contain source code in the language of the document's associated kernel, and a list of outputs associated with executing that code." },
  executionCount: { source: 'nbformat', section: 'Code cells', text: 'They also have an execution_count, which must be an integer or null.' },
  outputKinds: { source: 'nbformat', section: 'Code cell outputs', text: 'A code cell can have a variety of outputs (stream data or rich mime-type output).' },
  outputsCorrespond: { source: 'nbformat', section: 'Code cell outputs', text: 'These correspond to messages produced as a result of executing the cell.' },
  failedExecution: { source: 'nbformat', section: 'error', text: 'Failed execution may show an error:' },
  cffMinimal: { source: 'cff', section: 'Minimal example', text: 'A minimal example of a valid CITATION.cff file, that contains only the required keys, could look like this:' },
  cffVersion: { source: 'cff', section: 'cff-version', text: 'The Citation File Format schema version that the CITATION.cff file adheres to for providing the citation metadata.' },
  cffMessage: { source: 'cff', section: 'message', text: 'A message to the human reader of the CITATION.cff file to let them know what to do with the citation metadata.' },
  cffAuthors: { source: 'cff', section: 'authors', text: 'The authors of a software or dataset.' },
  cffTitle: { source: 'cff', section: 'title', text: 'The name of the software or dataset.' }
};

// The page of a quoted sentence.
export const factPage = (key) => source(FACTS[key].source).url;

// The keys a CITATION.cff file must hold, as the schema guide marks them "required: true".
export const CFF_REQUIRED = ['authors', 'cff-version', 'message', 'title'];

// Folders that hold tools, caches or copies of packages, not the study. They are not entered; a note names them.
export const SKIP_FOLDERS = ['.git', '.hg', '.svn', 'node_modules', '__pycache__', '.ipynb_checkpoints', '.venv', 'venv', '.tox', '.nox', '.mypy_cache', '.pytest_cache', '.ruff_cache', '.Rproj.user', '.cache'];

// What each kind of file is, by its name. The lists are the tool's own.
export const CODE = {
  python: ['.py'],
  r: ['.r', '.rmd'],
  notebook: ['.ipynb'],
  javascript: ['.js', '.mjs', '.cjs', '.ts']
};

// Files that say how to build the environment of each language, by base name (compared without case). A name that
// starts with "requirements" and ends in .txt or .in is a requirements file too.
export const ENV_FILES = {
  python: ['pyproject.toml', 'setup.py', 'setup.cfg', 'environment.yml', 'environment.yaml', 'pipfile', 'pipfile.lock', 'poetry.lock', 'uv.lock', 'pdm.lock', 'pylock.toml', 'conda-lock.yml', 'conda-lock.yaml'],
  r: ['renv.lock', 'description'],
  javascript: ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb']
};

// Lock files: they hold the exact version of every package, so a range in a manifest does not matter.
export const LOCK_FILES = {
  python: ['poetry.lock', 'pipfile.lock', 'uv.lock', 'pdm.lock', 'pylock.toml', 'conda-lock.yml', 'conda-lock.yaml', 'requirements.lock'],
  javascript: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb'],
  r: ['renv.lock']
};

export const isRequirementsName = (base) => /^requirements[A-Za-z0-9._-]{0,80}\.(?:txt|in)$/i.test(base);
export const isReadmeName = (base) => /^readme(?:\.[A-Za-z0-9]{1,8})?$/i.test(base);
export const isLicenseName = (base) => /^(?:licen[sc]e|copying)(?:[._-][A-Za-z0-9._-]{1,40})?$/i.test(base);
// Documents that may describe the data: a README anywhere, and files named like DATA, DATA_AVAILABILITY or data.md.
export const isDataDocName = (base) => isReadmeName(base) || /^data(?:[_-][A-Za-z0-9_-]{1,40})?\.(?:md|txt|rst)$/i.test(base);

// File name endings that mark a string as a path to data, when it has no folder part. The list is the tool's own.
export const DATA_EXTENSIONS = ['csv', 'tsv', 'txt', 'json', 'jsonl', 'parquet', 'feather', 'arrow', 'xlsx', 'xls', 'h5', 'hdf5', 'h5ad', 'npy', 'npz', 'pkl', 'pickle', 'joblib', 'rds', 'rda', 'rdata', 'mat', 'nc', 'zarr', 'sav', 'dta', 'sas7bdat', 'sqlite', 'db', 'gz', 'zip', 'bz2', 'xz', 'tar', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'fits', 'xml', 'yaml', 'yml', 'dat', 'bin', 'pt', 'pth', 'ckpt', 'onnx', 'fasta', 'fa', 'fastq', 'bam', 'vcf', 'bed', 'gtf', 'nii', 'shp', 'geojson', 'gpkg', 'r', 'py'];

// Calls that read a file named by their first argument. Python names are matched on the last part of a dotted name
// (pd.read_csv, np.load); R names are matched whole. The lists are the tool's own.
export const READERS = {
  python: ['read_csv', 'read_table', 'read_fwf', 'read_excel', 'read_parquet', 'read_feather', 'read_json', 'read_hdf', 'read_pickle', 'read_stata', 'read_sas', 'read_spss', 'read_orc', 'read_xml', 'read_file', 'load', 'loadtxt', 'genfromtxt', 'fromfile', 'open', 'imread', 'open_dataset', 'load_workbook', 'read_text', 'read_bytes'],
  r: ['read.csv', 'read.csv2', 'read.table', 'read.delim', 'readRDS', 'load', 'fread', 'read_csv', 'read_tsv', 'read_delim', 'read_rds', 'read_excel', 'read_xlsx', 'readLines', 'source', 'read_parquet', 'read_feather']
};

// Calls that write a file. A path named in one of them is made by the code, so it is not missing.
export const WRITERS = ['to_csv', 'to_parquet', 'to_excel', 'to_json', 'to_pickle', 'to_feather', 'to_hdf', 'to_stata', 'to_netcdf', 'savefig', 'save', 'savez', 'savez_compressed', 'savetxt', 'dump', 'imwrite', 'write_text', 'write_bytes', 'mkdir', 'makedirs', 'write.csv', 'write.table', 'saveRDS', 'write_csv', 'write_rds', 'ggsave', 'writeLines', 'fwrite', 'download', 'urlretrieve', 'download.file'];

// Patterns of code that draws random numbers, and of code that seeds the generator. The checks run them on the code with
// strings and comments blanked out. Calls that take a random_state argument count as random only without one. The lists
// are the tool's own; docs/method.md and docs/limits.md say what they can and cannot see.
export const RANDOM = {
  python: [
    /\brandom\.(?:random|randint|randrange|choice|choices|shuffle|sample|uniform|gauss|normalvariate|betavariate|expovariate|triangular|getrandbits)\s{0,4}\(/,
    /\b(?:np|numpy)\.random\.(?!seed\b|default_rng\b|RandomState\b|Generator\b|SeedSequence\b|PCG64\b|MT19937\b)[A-Za-z_]{1,40}\s{0,4}\(/,
    /\btorch\.(?:rand|randn|randint|randperm|rand_like|randn_like|randint_like|bernoulli|multinomial|normal|poisson)\s{0,4}\(/,
    /\btf\.random\.(?!set_seed\b)[a-z_]{1,40}\s{0,4}\(/
  ],
  r: [/(?:^|[^A-Za-z0-9_.])(?:sample|runif|rnorm|rbinom|rpois|rexp|rgamma|rbeta|rmultinom|sample_n|sample_frac|slice_sample|createDataPartition|kmeans|randomForest)\s{0,4}\(/],
  // Calls that are random unless they are given random_state.
  stateful: ['train_test_split', 'ShuffleSplit', 'StratifiedShuffleSplit', 'RandomForestClassifier', 'RandomForestRegressor', 'ExtraTreesClassifier', 'ExtraTreesRegressor', 'GradientBoostingClassifier', 'GradientBoostingRegressor', 'KMeans', 'MiniBatchKMeans', 'TSNE', 'MLPClassifier', 'MLPRegressor', 'SGDClassifier', 'IsolationForest', 'permutation_importance', 'make_classification', 'make_regression', 'make_blobs', 'sample'],
  // A generator made without a seed: random even when a global seed is set.
  unseededGenerator: /\b(?:default_rng|RandomState|random\.Random)\s{0,4}\(\s{0,4}\)/
};

export const SEEDS = {
  python: [
    /\b(?:random|np\.random|numpy\.random)\.seed\s{0,4}\(\s{0,4}[^)\s]/,
    /\b(?:default_rng|RandomState|random\.Random)\s{0,4}\(\s{0,4}[^)\s]/,
    /\btorch\.(?:cuda\.)?manual_seed(?:_all)?\s{0,4}\(/,
    /\btf\.random\.set_seed\s{0,4}\(/,
    /\b(?:set_random_seed|seed_everything|set_seed)\s{0,4}\(/,
    /\bPYTHONHASHSEED\b/
  ],
  r: [/\bset\.seed\s{0,4}\(/]
};

// Patterns of keys and tokens. Each is built from pieces, so that this file does not hold a string that looks like a
// credential. Values found are always shown masked.
const join = (...parts) => parts.join('');
export const SECRET_PATTERNS = [
  { id: 'aws-access-key', name: 'an AWS access key id', pattern: new RegExp(join('\\b(?:AK', 'IA|AS', 'IA)[0-9A-Z]{16}\\b')) },
  { id: 'github-token', name: 'a GitHub token', pattern: new RegExp(join('\\b(?:gh', 'p|gh', 'o|gh', 's|gh', 'u|gh', 'r)_[A-Za-z0-9]{30,80}\\b|\\bgithub', '_pat_[A-Za-z0-9_]{20,120}')) },
  { id: 'slack-token', name: 'a Slack token', pattern: new RegExp(join('\\bxo', 'x[abprs]-[A-Za-z0-9-]{10,120}')) },
  { id: 'google-api-key', name: 'a Google API key', pattern: new RegExp(join('\\bAI', 'za[0-9A-Za-z_-]{35}\\b')) },
  { id: 'private-key', name: 'a private key block', pattern: new RegExp(join('-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRI', 'VATE KEY-----')) },
  { id: 'assigned-secret', name: 'a key, token or password', pattern: new RegExp(join('\\b(?:api[_-]?key|apikey|secret(?:[_-]?key)?|access[_-]?token|auth[_-]?token|token|pass', 'word|passwd)\\b[\'"]?\\s{0,5}[:=]\\s{0,5}[\'"]([^\'"\\s]{12,200})[\'"]'), 'i') }
];

// Values of the assigned-secret pattern that are placeholders, not secrets, and values that are the name of an
// environment variable (all capitals), not its value.
export const SECRET_PLACEHOLDER = /^(?:x{3,}|\*{3,}|<[^>]{0,80}>|\$\{[^}]{0,80}\}|your[_-]|example|changeme|placeholder|dummy|redacted|none$|null$)/i;
export const ENV_NAME = /^[A-Z][A-Z0-9_]{2,80}$/;

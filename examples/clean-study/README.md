# Survey study

A small made-up study of survey answers by region.

## Environment

Python 3.11 with the packages in requirements.txt:

    python -m venv .venv
    pip install -r requirements.txt

## Data

- data/survey_results.csv: the cleaned answers, one row per person.
- data/codebook.csv: the text of each question.
- data/raw/responses_v2.csv: the raw answers. They hold personal data and are not shared; ask the study team for access.

## Steps

1. python clean_data.py (needs the raw answers)
2. Run analysis.ipynb from the top.

import random

import pandas as pd

CODEBOOK = "/home/mira/projects/survey/codebook.xlsx"

rows = pd.read_csv("data/raw/responses_v2.csv")
codes = pd.read_excel(CODEBOOK)
rows = rows.merge(codes, on="question")

ids = list(rows["id"])
random.shuffle(ids)
rows["order"] = ids
rows.to_csv("data/survey_results.csv", index=False)

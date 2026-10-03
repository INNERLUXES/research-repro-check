import random
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
random.seed(7)

rows = pd.read_csv("data/raw/responses_v2.csv")
codes = pd.read_csv("data/codebook.csv")
rows = rows.merge(codes, on="question")

ids = list(rows["id"])
random.shuffle(ids)
rows["order"] = ids
rows.to_csv("data/survey_results.csv", index=False)

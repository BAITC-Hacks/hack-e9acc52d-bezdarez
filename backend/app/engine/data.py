import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
INDICATORS = json.loads((DATA_DIR / "rules.json").read_text(encoding="utf-8"))["indicators"]
DISTRICTS = json.loads((DATA_DIR / "districts.json").read_text(encoding="utf-8"))
MEASURES = json.loads((DATA_DIR / "initiatives.json").read_text(encoding="utf-8"))
RULES = json.loads((DATA_DIR / "rules.json").read_text(encoding="utf-8"))
WEIGHTS = {x["id"]: x["weight"] for x in INDICATORS}
DISTRICT_BY_ID = {x["id"]: x for x in DISTRICTS}
MEASURE_BY_ID = {x["id"]: x for x in MEASURES}

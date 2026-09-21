---
Title: "Adding Timestamps to Filenames"
Date: "2026-07-04_15_31"
Tags:
  - Software Development
Split_From_Line: 70
Category: "Software Development"
---
## Adding a Compact Timestamp to the Filename

A short, file‑friendly timestamp can be generated with `datetime.now().strftime`.

```python
from datetime import datetime

timestamp = datetime.now().strftime("%Y%m%d")          # e.g., "20260616"
# Or a more precise version:
# timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
```
You can embed the timestamp directly in the manifest filename:

```python
MANIFEST_PATH = BACKUP_ROOT / f"{TARGET_FOLDER}_{timestamp}_manifest.json"
```
---

## Full Example Script (Pathlib‑Based)

Below is a complete, self‑contained script that:

1. Validates the presence of a required argument (`TRASH`, `REVIEW`, or `KEEP`).
2. Constructs backup and manifest paths using `pathlib`.
3. Ensures necessary directories exist.

```python
#!/usr/bin/env python3
import sys
import json
import hashlib
import shutil
from collections import Counter
from datetime import datetime
from pathlib import Path

# --- Exit if no folder argument ---
if len(sys.argv) < 2:
    sys.exit("Provide either TRASH, REVIEW or KEEP as argument.")

# Save the first user argument to a variable
TARGET_FOLDER = sys.argv[1]
print(f"Will be organizing {TARGET_FOLDER}")

# --- Configuration ---
HOME = Path.home()
BACKUP_ROOT = HOME / "Backups" / "AI_Triage" / TARGET_FOLDER
DUPLICATE_DIR = BACKUP_ROOT / "duplicates"

# Optional: add a timestamp to the manifest filename
timestamp = datetime.now().strftime("%Y%m%d")
MANIFEST_PATH = BACKUP_ROOT / f"{TARGET_FOLDER}_{timestamp}_manifest.json"

# Ensure the backup root and its parent directories exist
MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

# Example whitelist (adjust as needed)
WHITELIST_FOLDERS = [BACKUP_ROOT]

# The rest of your script (e.g., file processing, hashing, JSON writing) would follow here.
```
### Key Points

* **Argument handling** – Use `sys.argv` with a length check and `sys.exit` for clear error reporting.
* **Path construction** – Prefer `pathlib.Path` with the `/` operator and f‑strings for readability.
* **Directory creation** – `Path.mkdir(parents=True, exist_ok=True)` guarantees the target path exists without raising errors.
* **Timestamping** – `datetime.now().strftime` provides concise, filesystem‑safe strings for filenames.

With these patterns, your script remains clean, portable, and ready for integration into larger automation workflows.

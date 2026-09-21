---
Title: "Please provide argv syntax to save first argument to variable in shell-invoked python script (e.g. with #!/usr/bin/env python3 at top)"
Date: "2026-06-17_01_32"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
## Capturing Command‑Line Arguments in a Python Script

When a Python script is invoked from the shell (e.g., with `#!/usr/bin/env python3` at the top), the arguments passed on the command line are available via `sys.argv`.
`sys.argv[0]` is the script name; user‑provided arguments start at index 1.

```python
#!/usr/bin/env python3
import sys

# Ensure an argument was supplied
if len(sys.argv) < 2:
    sys.exit("Error: Please provide at least one argument.")

# Store the first user argument
first_argument = sys.argv[1]

print(f"The first argument is: {first_argument}")
```
### Making the Script Executable

```bash
chmod +x my_script.py      # Mark the file as executable
./my_script.py hello       # Run it with an argument
```
**Output**

```
The first argument is: hello
```
The early length check avoids an `IndexError` and lets the script exit with status 1, which is useful for automation pipelines.

---

## Building a Manifest Path with `pathlib`

Assume a folder name is supplied as the first argument and stored in `TARGET_FOLDER`.
We want a manifest file named `<folder>_manifest.json` inside a backup root directory.

```python
from pathlib import Path

# Example values (in practice TARGET_FOLDER comes from sys.argv)
TARGET_FOLDER = "my_data"

# Base backup directory (adjust as needed)
BACKUP_ROOT = Path("/path/to/backups")

# Correct manifest path construction
MANIFEST_PATH = BACKUP_ROOT / f"{TARGET_FOLDER}_manifest.json"
```
### Why This Works

* The `/` operator is overloaded by `pathlib.Path` to join paths using the appropriate separator for the operating system.
* The f‑string evaluates to a single string (`"my_data_manifest.json"`), which `Path` then appends cleanly.

If you need the parent directory to exist before writing the manifest, create it in one line:

```python
MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
```
---

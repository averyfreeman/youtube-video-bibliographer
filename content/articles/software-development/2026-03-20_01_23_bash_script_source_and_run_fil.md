---
Title: "bash script source and run file"
Date: "2026-03-20_01_23"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
## Executing vs. Sourcing Bash Scripts

When working with Bash scripts you have two distinct options:

| Action | What Happens | Typical Use |
|--------|--------------|-------------|
| **Execute** | The script runs in a new subshell (child process). When the script exits, the subshell terminates and any changes to the environment are lost. | Running a self‑contained program that should not affect the current shell. |
| **Source** | The script’s commands are evaluated in the current shell session. Variables, aliases, functions, and directory changes remain after the script finishes. | Importing configuration, defining functions, or setting environment variables for later use. |

### How to Source a Script

```bash
source filename.sh
# or the shorthand
. filename.sh
```

* **Key behavior:** Any modifications—`cd` to a new directory, `VAR=1`, `alias ll='ls -l'`—persist in the active terminal.  
* **Permissions:** The file only needs read permission; it does **not** have to be executable.

### How to Execute a Script

1. Make the script executable (if it isn’t already):

   ```bash
   chmod +x script.sh
   ```

2. Run it:

   ```bash
   ./script.sh
   # or
   bash script.sh
   ```

* **Key behavior:** The script runs in isolation. It cannot alter the parent shell’s variables, working directory, or other state.  

---

## Variable Lifespan: Read‑only Variables

Read‑only variables (`readonly VAR=value`) behave differently depending on how the script is invoked.

### When They Do **Not** Survive (Standard Execution)

*Running the script normally (`./script.sh` or `bash script.sh`)* launches a new subshell.  
All variables—including read‑only ones—are discarded when that subshell exits.  
**Result:** The parent shell remains unchanged.

### When They **Do** Survive (Sourcing)

*Source the script (`source script.sh` or `. script.sh`)* executes its commands in the current shell.  
The read‑only variable remains defined for the lifetime of that terminal session.  

Because Bash forbids unsetting read‑only variables, the only way to remove them after sourcing is to close and restart the shell.

---

### Quick Comparison

| Aspect | Executed (`./script.sh`) | Sourced (`source script.sh`) |
|--------|--------------------------|------------------------------|
| Process | New subshell (child) | Current shell |
| Environment changes | Lost on exit | Persist |
| Need for executable flag | Yes (`chmod +x`) | No |
| Read‑only variable persistence | None (cleared with subshell) | Remains until shell exit |

---

## Summary

- **Execute** a script when you want complete isolation from the current shell.  
- **Source** a script when you need its definitions (variables, functions, aliases) to stay available.  
- Read‑only variables survive only in the sourced case; they cannot be unset and will persist until the shell session ends.

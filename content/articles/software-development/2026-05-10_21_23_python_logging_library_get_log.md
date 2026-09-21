---
Title: "python logging library get log level"
Date: "2026-05-10_21_23"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
---
title: Working with Python’s Logging Levels and Verbosity Flags  
author: Expert Technical Writer  
date: 2026-07-04  
---

## Overview

When building command‑line tools it’s common to expose a `-v/‑‑verbosity` flag that maps a small integer range (e.g., `0–3`) to the standard logging levels (`ERROR`, `WARNING`, `INFO`, `DEBUG`). This guide explains:

1. How to retrieve a logger’s effective level.  
2. How to translate a verbosity count into the correct logging constant.  
3. Why the flag (`logging.DEBUG`) and its numeric value (`10`) are the same object.  
4. How to return both the numeric value and its human‑readable name.  

All code snippets are ready to copy into your project.

---

## 1. Getting a Logger’s Effective Level

A logger may inherit its level from an ancestor in the logging hierarchy. Use `logger.getEffectiveLevel()` to obtain the *actual* integer level that will be applied.

```python
import logging

logger = logging.getLogger(__name__)

# Numeric level (e.g., 20)
numeric_level = logger.getEffectiveLevel()

# Human‑readable name (e.g., 'INFO')
level_name = logging.getLevelName(numeric_level)

print(f"Level: {level_name} ({numeric_level})")
```

### When to Use `logger.isEnabledFor()`

If you only need to know whether a particular severity is active, call:

```python
if logger.isEnabledFor(logging.DEBUG):
    # Debug‑level work here
    ...
```

---

## 2. Mapping Verbosity Flags to Logging Levels

### The Core Mapping Function

```python
import logging

def get_loglevel(verbosity: int) -> int:
    """
    Convert a 0‑3 verbosity count to a standard logging level.
    """
    levels = {
        0: logging.ERROR,   # 40
        1: logging.WARNING, # 30
        2: logging.INFO,    # 20
        3: logging.DEBUG,   # 10
    }
    # Default to DEBUG for out‑of‑range values
    return levels.get(verbosity, logging.DEBUG)
```

### Using the Mapping

```python
# Assume args.verbosity comes from argparse, click, etc.
level = get_loglevel(args.verbosity)
logging.basicConfig(level=level)   # Effectively sets level to 10 for verbosity 3
```

### Why `logging.DEBUG` Is Not `3`

`logging.DEBUG` is a constant whose value **is** the integer `10`. The name is merely a convenient alias. Therefore:

```python
assert logging.DEBUG == 10
```

If you see a logger level of `3`, the mapping function was bypassed—most likely the raw verbosity count was passed directly to `setLevel()`.

### Common Pitfalls

| Symptom | Likely Cause |
|---------|--------------|
| Logger shows level `3` | Directly calling `logger.setLevel(args.verbosity)` instead of `logger.setLevel(get_loglevel(args.verbosity))`. |
| Verbosity flag ignored | An argument‑parsing library overwrote the variable or you used the wrong variable name. |

**Fix:** Ensure the `setLevel` call always receives the mapped integer:

```python
logger.setLevel(get_loglevel(args.verbosity))
```

---

## 3. Returning Both Numeric and Named Levels

Sometimes you need the numeric constant for `setLevel()` **and** a friendly name for UI output. Return a small dictionary (or tuple) that contains both.

```python
import logging

def get_loglevel_info(verbosity: int) -> dict:
    """
    Return a mapping with numeric level and its string name.
    Raises ValueError for unsupported verbosity values.
    """
    levels = {
        0: logging.ERROR,   # 40
        1: logging.WARNING, # 30
        2: logging.INFO,    # 20
        3: logging.DEBUG,   # 10
    }

    if verbosity not in levels:
        raise ValueError(f"Invalid verbosity: {verbosity}")

    numeric = levels[verbosity]
    name = logging.getLevelName(numeric)

    return {"numeric": numeric, "name": name}
```

**Example usage**

```python
info = get_loglevel_info(3)
print(f"Flag used: {info['name']}, Numeric value: {info['numeric']}")
# Output: Flag used: DEBUG, Numeric value: 10
```

You can now feed `info["numeric"]` to `logger.setLevel()` and display `info["name"]` in help messages or logs.

---

## 4. Quick Reference: Standard Logging Levels

| Constant | Numeric Value | Description |
|----------|---------------|-------------|
| `logging.NOTSET` | `0` | No explicit level (inherits). |
| `logging.DEBUG`  | `10` | Detailed diagnostic output. |
| `logging.INFO`   | `20` | General informational messages. |
| `logging.WARNING`| `30` | Indications of potential problems. |
| `logging.ERROR`  | `40` | Errors that prevent normal operation. |
| `logging.CRITICAL`| `50`| Severe errors causing program termination. |

> **Note:** Since Python 3.2, `setLevel()` also accepts the string names (`"DEBUG"`, `"INFO"`, …). If you prefer strings in your mapping, replace the integer constants accordingly; the logger will handle them transparently.

---

## 5. Verifying the Mapping Works

Run the following self‑contained script to confirm that `verbosity → level` conversion behaves as expected:

```python
import logging

def get_loglevel(verbosity: int) -> int:
    levels = {
        0: logging.ERROR,
        1: logging.WARNING,
        2: logging.INFO,
        3: logging.DEBUG,
    }
    return levels[verbosity]

for v in range(4):
    lvl = get_loglevel(v)
    print(f"Verbosity {v} → level {lvl} ({logging.getLevelName(lvl)})")
```

Expected output:

```
Verbosity 0 → level 40 (ERROR)
Verbosity 1 → level 30 (WARNING)
Verbosity 2 → level 20 (INFO)
Verbosity 3 → level 10 (DEBUG)
```

If you ever see a level other than `10` for verbosity `3`, double‑check that the mapping function is actually being called.

---

## 6. Summary Checklist

- **Retrieve effective level:** `logger.getEffectiveLevel()`.  
- **Map CLI verbosity to logging constants** using a dictionary (`0→ERROR`, `1→WARNING`, `2→INFO`, `3→DEBUG`).  
- **Always pass the mapped integer** to `logger.setLevel()`.  
- **Remember:** `logging.DEBUG` **is** the integer `10`.  
- **Return both numeric and name** with a helper like `get_loglevel_info()`.  
- **Validate** with a small test script to avoid accidental direct passes of the raw count.

With these patterns in place, your command‑line tools will handle logging levels predictably, and users will see clear, meaningful output regardless of the verbosity flag they choose.

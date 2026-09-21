---
Title: "Comparing heywtf and llm for Terminal-Based AI Interactions"
Date: "2026-07-04_11_33"
Tags:
  - AI
Split_From_Line: 34
Category: "AI"
---
### Core Philosophy and Use Cases

* **heywtf**: A terminal-centric conversational tool for interactive, terminal-native assistance and vibe-coding your shell. Best for asking quick questions, generating local shell configs, and making aliases on the fly.
* **llm**: A powerful, UNIX-style utility tool for automation workflows. Best for piping text data, generating and storing vector embeddings, interacting with API endpoints, and keeping local logs of AI inputs and outputs.

### Key Feature Comparison

| Feature | heywtf | llm |
| --- | --- | --- |
| Primary Interface | Conversational chat interface | Pure CLI commands |
| Extensibility & Plugins | Static ecosystem | Massive plugin ecosystem |
| Data & Logging | Lightweight session management | SQLite backend with automatic logging |
| Data Pipelines (Piping) | Structured around typing questions | Deeply integrated into standard input/output |

Configuring llm to Interface with Apfel
--------------------------------------

To connect llm to a local Apfel server running an OpenAI-compatible or Ollama-compatible endpoint on port 11434, follow these steps:

### Step 1: Interface llm with Apfel on Port 11434

Install the Ollama helper plugin and specify the address:
```bash
llm install llm-ollama
export OLLAMA_HOST="http://localhost:11434"
```
Alternatively, add Apfel as an extra OpenAI-compatible provider:
```bash
llm openai add apfel --url "http://localhost:11434/v1" --key "not-needed"
```
### Step 2: Grant File-Level Access

Create a Python snippet with basic read/write capabilities:
```python
def read_file(path: str) -> str:
    with open(path, 'r') as f:
        return f.read()

def write_file(path: str, content: str) -> str:
    with open(path, 'w') as f:
        f.write(content)
        return f"Successfully wrote to {path}"
```
### Step 3: Enforce a Mandatory 'Planning Stage'

Create a reusable template called `plan-gate`:
```bash
llm templates set plan-gate <<EOF
system:
  You are an advanced terminal agent. You operate exclusively in a two-stage process for task-oriented requests.
  ...
EOF
```
### Step 4: Combine Everything into a Bash Wrapper

Save the following wrapper as `apfel-agent`:
```bash
#!/bin/bash
# Define file-level access tools inline
TOOLS="..."

# Default behavior: Enable the mandatory planning stage template
TEMPLATE_ARG="-t plan-gate"

# Check for a bypass flag (e.g., --no-plan or -np)
for arg in "$@"; do
    if [ "$arg" == "--no-plan" ] || [ "$arg" == "-np" ]; then
        TEMPLATE_ARG=""
        break
    fi
done

# Run the llm command with file access tools enabled
llm --functions "$TOOLS" $TEMPLATE_ARG "${PROMPT_ARGS[@]}"
```
Usage Example
-------------

### Normal Flow (with Planning Stage)

1. Initiate a task-oriented prompt: `apfel-agent "Fix typos in my config.json file"`
2. Output from LLM: `[Planning Stage]: I see you want to modify config.json. I will read it, locate the errors, and rewrite it. Plan complete. Reply with "EXECUTE" to proceed.`
3. Use the `-c` (continue conversation) flag to send the execution keyword: `llm -c "EXECUTE"`

### Bypassing the Planning Stage via CLI Flag

Use the custom bypass flag: `apfel-agent "--no-plan" "Read the contents of config.json"`

Is llm's SQLite DB Vectorized?
-----------------------------

No, llm's default SQLite database is not natively vectorized. However, you can pair it with `sqlite-vec` to perform lightning-fast cosine similarity searches.

### How to Query Your llm DB with True Vector Search

1. Install the tools: `sqlite-utils install sqlite-utils-sqlite-vec`
2. Query your raw llm logs via SQL:
```bash
LLM_DB="$(llm path embeddings)"
sqlite-utils "$LLM_DB" "SELECT ... FROM embeddings ORDER BY distance ASC LIMIT 5"
```
The Difference in Vector Implementations
--------------------------------------

You have two primary extension paths to choose from depending on your workload:

* **`sqlite-vec` (The Modern Standard)**: Written entirely in standard C with no outside runtime dependencies.
* **`sqlite-vss` (The Legacy Approach)**: An older vector extension built on top of the Facebook AI Similarity Search (FAISS) C++ library.

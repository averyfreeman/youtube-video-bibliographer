---
Title: "how to include shellcheck as a library with bash script"
Date: "2026-03-19_17_18"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
```markdown
Your prompt:
how to include shellcheck as a library with bash script

ShellCheck is a standalone binary tool written in Haskell, so it cannot be "included" or "sourced" as a native Bash library. Instead, you integrate it into your Bash scripts by invoking the shellcheck command programmatically.

Here is how you can use ShellCheck within a Bash script:

1. Basic Programmatic Execution

You can run ShellCheck inside a script and use its exit status to determine if a script passes linting.

- Command: shellcheck <script_name>
- Logic: An exit code of 0 means no issues were found; anything else indicates warnings or errors.

```bash
# Example: Using ShellCheck to lint a specific file within a script
file_to_check="myscript.sh"

if shellcheck "$file_to_check"; then
    echo "Check passed!"
else
    echo "ShellCheck found issues in $file_to_check"
    exit 1
fi
```

2. Handling Library Files (Sourcing)

If your script "includes" other Bash files (libraries) using the source command, ShellCheck requires a directive to follow those files or handle them correctly:

- Follow sourced files: Use the -x flag to allow ShellCheck to follow source statements.
- Source directive: Add a comment above your source line to tell ShellCheck where the library file is located.

```bash
# shellcheck source=./lib/my-functions.sh
```

3. Machine-Readable Integration

For more advanced "library-like" behavior where you need to parse ShellCheck's output, use its structured output formats:

- JSON: shellcheck -f json script.sh (Best for parsing with jq)
- Checkstyle: shellcheck -f checkstyle script.sh (Standard for CI/CD systems)
- GCC: shellcheck -f gcc script.sh (Common format for editors)

4. Continuous Integration (CI) Use

ShellCheck is frequently used as a "quality gate" in automated workflows rather than a runtime library.

- GitHub Actions: Often pre-installed and can be run as a step in your .github/workflows.
- CircleCI: Can be added via the https://circleci.com/developer/orbs/orb/circleci/shellcheck ShellCheck Orb.

Would you like a sample Bash function that automatically finds and lints all .sh files in a directory using ShellCheck?
```
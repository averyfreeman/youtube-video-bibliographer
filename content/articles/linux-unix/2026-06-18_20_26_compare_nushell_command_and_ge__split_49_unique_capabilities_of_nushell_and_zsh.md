---
Title: "Unique Capabilities of Nushell and Zsh"
Date: "2026-07-04_11_39"
Tags:
  - Linux and Unix
Split_From_Line: 49
Category: "Linux and Unix"
---
### Unique Capabilities: Only Nushell Can Do
The following tasks rely entirely on Nushell's built-in structured data engine and cannot be natively achieved in Zsh without downloading third-party languages or binaries.

#### 1. Native Cross-Platform Schema Conversion
To convert a configuration file from YAML to JSON directly in the pipeline without external tools:
```markdown
open config.yaml | to json | save config.json
```
#### 2. Math Operations on Native File Sizes
To perform live, type-safe math on file metrics inside the shell loop without manual unit conversions:
```markdown
ls | where size > 1mb | insert double_size { |row| $row.size * 2 }
```
#### 3. Structured System Tracking
To query live OS infrastructure (RAM usage, CPU cores, battery health) as a queryable database table:
```markdown
sys | get mem | insert free_percentage { |row| ($row.free / $row.total) * 100 }
```
### Unique Capabilities: Only Zsh Can Do
The following capabilities rely on Zsh's strict POSIX roots, low-level OS integrations, and legacy parsing paradigms that break Nushell's structured design.

#### 1. Native POSIX Script Sourcing
To directly execute and source millions of existing legacy bash/sh scripts without rewriting them:
```markdown
source./legacy_setup_script.sh
```
#### 2. Advanced Filename Glob Qualifiers
To filter directory listings using native, highly specific file-type meta-characters (e.g., listing only broken symbolic links):
```markdown
ls -l *(-@)
```
#### 3. Word-Splitting Text Expansion
To treat unquoted environment variable strings as multi-argument command inputs natively:
```markdown
FLAGS="-l -a -h"
ls $FLAGS
```
Note that Nushell will throw a strict type error here because it refuses to split strings into command arguments implicitly.

For further customization, I can provide guidance on writing a custom Nushell plugin or configuring Zsh's advanced completion system for your favorite tool.

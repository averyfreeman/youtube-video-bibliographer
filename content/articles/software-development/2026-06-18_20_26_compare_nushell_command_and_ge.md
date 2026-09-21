---
Title: "compare nushell command and general usage completeness to zsh in tables. elect each shell a winner for each comparison in another column, and choose an overall winner at the end"
Date: "2026-06-18_20_26"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
## Compare Nushell Command and General Usage Completeness to Zsh in Tables
Nushell brings a modern, data-centric approach to the command line, whereas Zsh provides a traditional, POSIX-compatible environment with a massive ecosystem. Nushell excels in structural consistency and pipeline data processing, while Zsh dominates in legacy compatibility and interactive ecosystem depth.

### Interactive Command & Workflow
The following examples illustrate the differences in command usage between Nushell and Zsh.

#### 1. Environment Variable Sorting
To sort environment variables by name, the following commands can be used:
* Nushell: `$env | transpose name value | sort-by name`
* Zsh: `env | sort`

#### 2. Fetch and Format an API Response
To get data from a public API and display it as a clean table:
* Nushell: `http get https://api.github.com/users/nushell/repos | select name stargazers_count`
* Zsh: `curl -s https://api.github.com/users/nushell/repos | jq '.[] | {name:.name, stars:.stargazers_count}'`

#### 3. Find and Kill a Process
To locate a running process named "node" and terminate it:
* Nushell: `ps | where name == node | each { |it| kill $it.pid }`
* Zsh: `pkill node`

#### 4. Calculate Total Directory Size
To sum up the sizes of all files in the current folder:
* Nushell: `ls | math sum size`
* Zsh: `du -sh.`

#### 5. Bulk Rename Files
To append a `.bak` extension to all `.txt` files in a directory:
* Nushell: `ls *.txt | each { |file| mv $file.name ($file.name + ".bak") }`
* Zsh: `autoload -Uz zmv; zmv '(*).txt' '$1.txt.bak'`

#### 6. Read a CSV File and Sort Rows
To open a user directory data file and sort it by the `age` column:
* Nushell: `open users.csv | sort-by age`
* Zsh: `sort -t',' -k2 -n users.csv`

#### 7. Check Disk Space Usage
To view remaining storage space across system partitions:
* Nushell: `sys | get disks`
* Zsh: `df -h`

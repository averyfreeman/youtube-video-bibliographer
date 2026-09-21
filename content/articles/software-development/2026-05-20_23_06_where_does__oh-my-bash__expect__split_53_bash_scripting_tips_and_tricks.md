---
Title: "Bash Scripting Tips and Tricks"
Date: "2026-07-04_15_08"
Tags:
  - Software Development
Split_From_Line: 53
Category: "Software Development"
---
## Dynamically Exporting Variables
To dynamically export variables from an array, you can use a loop:
```bash
declare -a VARS=(
    "ICONS=$HOME/.local/share/icons"
    "THEMES=$HOME/.local/share/themes"
    "BAT_PAGER=less -RF --mouse --redraw-on-quit"
    "PAGER=bat --plain --lanuage=java --paging=auto"
    "BAT_THEME=Dracula"
    "GIT_PAGER=$PAGER"
    "GH_PAGER=$PAGER"
    "MANPAGER=$PAGER"
    "MANWIDTH=80"
)

if [[ "${#VARS[@]}" -gt 0 ]]; then
    for ((i=0; i<${#VARS[@]}; i++)); do
        eval "export ${VARS[$i]}"
    done
    unset VARS
fi
```
This loop exports each variable in the `VARS` array.

## Using `seq` to Generate a Sequence of Numbers
`seq` is a standalone tool for generating sequences of numbers. You can use it to loop through an array:
```bash
START=0
END=10
INC=2
for LEN in $(seq "${START}" "${INC}" "${END}"); do
    NEXT=$(echo "${LEN} + ${INC}" | bc -l)
    echo "current: ${LEN} and next is ${NEXT}"
done
```
This generates a sequence of numbers from `START` to `END` with an increment of `INC`.

# Calculating Start and End Index Bounds
To begin, we need to calculate the start and end index bounds for our array. This can be achieved with the following commands:
```bash
START=0
END=$(( ${#VARS[@]} - 1 )) # Array length minus 1 gives us the final index
```
We then check if the array is not empty before proceeding:
```bash
if [[ "${#VARS[@]}" -gt 0 ]]; then
    # Use seq to generate a list of indexes from 0 to END
    for i in $(seq "${START}" "${END}"); do
        eval "export ${VARS[$i]}"
    done
    unset VARS START END
fi
```
This code snippet is used to iterate over the array and export each variable.

## A Helpful Tip for "bc" Math Examples
When performing mathematical operations, it's essential to note that Bash can handle simple whole-number (integer) math directly in memory without launching an external process. For standard integer loops, you can skip "bc" entirely and use native arithmetic expansion.

## Handling Safety Checks for Empty Arrays
To handle safety checks for empty arrays, we can modify our script to check if the array is empty before attempting to access its elements.

## Understanding Bash Array Indexing
In Bash, when working with arrays, it's crucial to understand the correct syntax for accessing array elements. The syntax `${!VARS[$i]}` is incorrect for two reasons:
1. The exclamation mark "!" is used for indirect variable expansion or to get array keys, but its syntax requires wrapping the entire variable name, not placing it inside the bracket index.
2. Because "VARS" is a standard indexed array (`declare -a`), its keys are already just the raw numbers (`0, 1, 2...`), which you already have stored directly inside your "$i" loop variable.

## Correct Syntax for Accessing Array Elements
To read the actual string value stored at index "$i", you use the standard array syntax without an exclamation mark:
```bash
"${VARS[$i]}"
```
To get all the keys/indexes of an array, you place the exclamation mark at the very beginning of the array name token:
```bash
"${!VARS[@]}"
```
## Why the Proposed Syntax Breaks
If you write `${!VARS[$i]}`, Bash interprets this as a nested, indirect variable expansion request. It takes the text inside `VARS[$i]`, looks for a completely different, standalone environment variable by that name, and tries to print its contents instead.

## Using a While Loop Instead of Seq
Converting the `seq` sequence into a `while` loop is a fantastic option. It completely eliminates the need to run the external `seq` binary, which means your script runs entirely inside native shell memory.

Here's how you can structure it:
```bash
START=0
END=$(( ${#VARS[@]} - 1 ))

if [[ "${#VARS[@]}" -gt 0 ]]; then
    idx=$START
    while (( idx <= END )); do
        eval "export ${VARS[$idx]}"
        (( idx++ )) # Increment our counter by 1
    done
    unset VARS START END idx
fi
```
## Analyzing the Environment Configuration
After setting up the environment configuration, it's essential to analyze the resulting environment variables to ensure they are correctly set.

## Setting Custom Folders with xdg-user-dir
To set custom folders using `xdg-user-dir`, you need to register them inside the configuration file `~/.config/user-dirs.dirs`. However, for non-standard paths like ICONS, THEMES, LIB, and VAR, you should set the official environment variables directly.

## Fixing the Mistake and Setting Up Custom Directories
To fix the mistake and set up custom directories, you should focus on the local configuration file and environment variables rather than the `xdg-user-dir` command itself for those non-standard paths.

1. Fix the mistake by checking `~/.config/user-dirs.dirs` for any lines containing the word "help" and deleting those lines.
2. Set up custom directories by setting the official environment variables directly:
```bash
XDG_DATA_HOME="$HOME/.local/share"
XDG_CONFIG_HOME="$HOME/.config"
XDG_CACHE_HOME="$HOME/.cache"
XDG_STATE_HOME="$HOME/.local/state"
```
You can create a dedicated script (e.g., `~/.config/xdg_setup.sh`) and source it from your shell profile to make these variables available without cluttering `.bash_profile`.

---
Title: "Obtaining Current Length of Bash Array"
Date: "2026-07-04_14_54"
Tags:
  - Software Development
Split_From_Line: 127
Category: "Software Development"
---
# Index: 2 contains cherry
```
Obtaining Current Length of Bash Array
=====================================

To obtain the current length (the total number of elements) of a Bash array, the syntax is `${#array_name[@]}` (or `${#array_name[*]}`).

```bash
# Declare and populate a sample array
my_array=("apple" "banana" "cherry")

# Print the length (Output: 3)
echo "${#my_array[@]}"
```
Testing for Array
==================

Testing for an array's length is not quite the same as testing a normal variable because you cannot mix a string test flag like `-z` directly with an integer comparison like `-eq 0`.

```bash
# Correct syntax for array length comparison
if (( ${#my_array[@]} == 0 )); then
    echo "Array is empty."
fi
```
Capturing Exit Codes in Automated Conditional Statements
=====================================================

To capture and handle exit codes in an automated conditional statement, the most important rule in Bash is to read the `$?` variable immediately after the command you want to test.

```bash
# Run your command
ls /some/restricted/directory

# IMMEDIATELY save the exit code
exit_status=$?

# Evaluate the saved code
case $exit_status in
    0)
        echo "Directory listed successfully."
        ;;
    1)
        echo "Minor problems or file not found."
        ;;
    2)
        echo "Serious trouble (e.g., syntax or usage error)."
        ;;
    126)
        echo "Permission denied! You cannot view this folder."
        ;;
    *)
        echo "An unknown error occurred with code: $exit_status"
        ;;
esac
```
Integrating CRC32 File Transfer Confirmation
=========================================

Here is the complete script with CRC32 file transfer confirmation:

```bash
#!/usr/bin/env bash
set -e

# --- 1. SET HARD DEFAULTS ---
_USER="$(basename "$HOME")"
_BASENAME="$(basename "$PWD")"
_WINDRV="c"
_PARENT="Videos"

# --- 2. LOAD CONFIG FILE ---
CONFIG_FILE="filemover.ini"

if [[ -f "$CONFIG_FILE" ]]; then
    echo "Loading config from $CONFIG_FILE..."
    eval "$(sed 's/\r$//' "$CONFIG_FILE" | grep -v '^#' | grep '=')"
fi

# --- 3. APPLY OVERRIDES OR DEFAULTS ---
USER="${USER:-$_USER}"
BASENAME="${BASENAME:-$_BASENAME}"
WINDRV="${WINDRV:-$_WINDRV}"
PARENT="${PARENT:-$_PARENT}"
FILETYPE="${FILETYPE:-mp4}"

WIN_HOME="/mnt/${WINDRV}/Users/${USER}"
TARGET="${WIN_HOME}/${PARENT}/${BASENAME}"

# --- 4. VERIFICATION ---
function confirm_paths() {
    printf "Please confirm settings:\n"
    printf "  Target Path: %s\n" "$TARGET"
    printf "  File Filter: %s\n" "$FILETYPE"
    read -rp "Press ENTER to proceed, or CTRL-C to abort and edit $CONFIG_FILE. "
}

function make_target_if_necessary() {
    if! [[ -d "$TARGET" ]]; then
        echo "Creating target directory: $TARGET"
        mkdir -pv "$TARGET"
    fi
}

function start_watcher() {
    make_target_if_necessary
    echo "Watching for $FILETYPE files..."

    inotifywait -m -q -e close_write --format "%f". | while read -r FILE; do
        if [[ "$FILE" == *"$FILETYPE"* || "$FILETYPE" == "*" ]]; then
            if [[ "$FILE" == "$CONFIG_FILE" ]]; then
                continue
            fi

            echo "Detected: $FILE. Verifying..."

            SOURCE_CRC=$(cksum "$FILE" | awk '{print $1}')
            cp "$FILE" "$TARGET/"

            if [[ -f "$TARGET/$FILE" ]]; then
                TARGET_CRC=$(cksum "$TARGET/$FILE" | awk '{print $1}')

                if [[ "$SOURCE_CRC" == "$TARGET_CRC" ]]; then
                    echo "Verified. Cleaning up source."
                    rm "$FILE"
                fi
            fi
        fi
    done
}

confirm_paths
start_watcher

# --- 5. THE WATCHER ---
The watcher function is designed to monitor a specified directory for files matching a certain criteria, such as file type, and then perform actions on those files, like moving them to a target directory and verifying their integrity.

## Key Components
- **inotifywait**: A command-line tool that watches for changes to files in a directory. It is used here to monitor the current directory (`.`) for close write events (`-e close_write`), which indicate that a file has been modified or created.
- **File Pattern Matching**: The script checks if the detected file matches the specified file type (`$FILETYPE`). If `$FILETYPE` is set to `*`, it matches all files.
- **Verification and Moving**: For each matching file, the script calculates the CRC (Cyclic Redundancy Check) of both the source and target files after copying. If the CRCs match, it removes the source file and sends a Windows notification.

## Code Snippet
```bash
function start_watcher() {
    echo "Watching for ${FILETYPE} files..."

    inotifywait -m -q -e close_write --format "%f". | while read -r FILE; do
        if [[ "$FILE" == *."$FILETYPE" ]] || [[ "$FILETYPE" == "*" ]]; then
            # Skip the config file itself if FILETYPE is '*'
            [[ "$FILE" == "$CONFIG_FILE" ]] && continue

            echo "Detected: $FILE. Verifying..."

            SOURCE_CRC=$(cksum "$FILE" | awk '{print $1}')
            cp "$FILE" "$TARGET/"

            if [[ -f "$TARGET/$FILE" ]]; then
                TARGET_CRC=$(cksum "$TARGET/$FILE" | awk '{print $1}')

                if [[ "$SOURCE_CRC" == "$TARGET_CRC" ]]; then
                    echo "Verified. Cleaning up source."
                    rm "$FILE"
                    # Send Windows notification
                    powershell.exe -NoProfile -Command "
                        [reflection.assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
                        $t = New-Object System.Windows.Forms.NotifyIcon;
                        $t.Icon = [System.Drawing.SystemIcons]::Information;
                        $t.Visible = $True;
                        $t.ShowBalloonTip(3000, 'WSL Move Complete', 'Moved $FILE to Windows $PARENT/$BASENAME', 1);
                    " 2>/dev/null
                fi
            fi
        fi
    done
}
```
## Explanation
1. **Initialization**: The function starts by echoing a message indicating that it is watching for files of type `$FILETYPE`.
2. **Event Monitoring**: `inotifywait` is used to monitor the current directory for close write events. For each event, it reads the file name and checks if it matches the specified file type.
3. **Verification and Action**: If a file matches, the script calculates the CRC of the source file, copies the file to the target directory, calculates the CRC of the target file, and compares the two CRCs. If they match, the script removes the source file and sends a notification.

## Advice
- Ensure that the target directory exists before running the watcher to avoid errors.
- Adjust the file type (`$FILETYPE`) and target directory (`$TARGET`) according to your needs.
- Consider adding error handling for cases like permission issues or CRC mismatches.

# Ensuring the Target Directory Exists
To begin, it's essential to ensure that the target directory exists before proceeding with the script. This can be achieved by running the command `mkdir -p "$TARGET"`.

The main script utilizes `inotifywait` to monitor the directory for file system events. The command is as follows:
```bash
inotifywait -m -q -e close_write --format "%f". | while read -r DETECTED_FILE; do
    # Pattern match (unquoted asterisk)
    if [[ "$FILETYPE" == "*" ]] || [[ "$DETECTED_FILE" == *."$FILETYPE" ]]; then
        # Exclude the script/config/log files
        [[ "$DETECTED_FILE" == "$CONFIG_FILE" || "$DETECTED_FILE" == "$(basename "$0")" ]] && continue

        verify_and_move "$DETECTED_FILE"
    fi
done
```
## Simplifying the Pattern Matching Logic
To simplify the pattern matching logic, it's possible to pre-calculate a pattern variable during the setup phase. This approach moves the logic out of the high-frequency loop, improving efficiency.

### Setup Phase
During the setup phase, the pattern variable can be calculated as follows:
```bash
if [[ "$FILETYPE" == "*" ]]; then
    MATCH_PATTERN="*"
else
    MATCH_PATTERN="*.$FILETYPE"
fi
```
### Loop Phase
Inside the loop, the pattern matching can be performed using the pre-calculated `MATCH_PATTERN` variable:
```bash
inotifywait -m -q -e close_write --format "%f". | while read -r DETECTED_FILE; do
    # No more 'OR' check; just one clean pattern match
    # Note: NO quotes around $MATCH_PATTERN to allow globbing
    if [[ "$DETECTED_FILE" == $MATCH_PATTERN ]]; then
        verify_and_move "$DETECTED_FILE"
    fi
done
```
## Analysis
This approach offers several benefits, including:

*   **Performance**: By moving the logic to the setup phase, the script performs one less string comparison every time a file is touched, resulting in improved efficiency in busy directories.
*   **Reliability**: This method correctly handles the "All Files" case (including those without extensions) while keeping the "Specific Extension" case strict.

## Handling User Input in the.ini File
To make the script more robust, it's essential to handle cases where users accidentally include the dot in their.ini file (e.g., `FILETYPE=.mp4` vs `FILETYPE=mp4`). This can be achieved using string manipulation:
```bash
# Strip leading dot if the user included it
FILETYPE="${FILETYPE#.}"
```
This line should be placed right after the `eval` call to ensure the script becomes more user-proof.

## Troubleshooting inotifywait Issues
When using `inotifywait`, there are several potential issues to consider:

### 1. The MATCH_PATTERN Assignment
If the pattern is assigned as `MATCH_PATTERN="*.$FILETYPE"`, the variable may literally contain the asterisk character. When using `[[ "$DETECTED_FILE" == $MATCH_PATTERN ]]`, Bash handles it correctly unless the variable was exported or handled as a literal string in a way that escaped the glob.

**The Fix**: Use a more explicit pattern match syntax to force the shell to evaluate the wildcard:
```bash
if [[ "$DETECTED_FILE" == *."$FILETYPE" ]]; then
```
### 2. The inotify Event Type (close_write)
In WSL2, the way Windows "talks" to the Linux file system (DrvFS) can be quirky. If a file is moved into the folder, `close_write` might not fire. If a file is downloaded via a browser, it might fire `moved_to` instead of `close_write`.

**The Fix**: Listen for both `close_write` and `moved_to`:
```bash
inotifywait -m -q -e close_write,moved_to --format "%f". | while read -r DETECTED_FILE; do
```
### 3. The FILETYPE Hidden Characters
If the.ini file has a trailing space or a hidden carriage return (e.g., `mp4\r`), the pattern becomes `*.mp4\r`. A file named `video.mp4` will never match `*.mp4\r`.

**The Fix**: Sanitize the `FILETYPE` variable immediately after loading the.ini:
```bash
# Remove carriage returns and any leading dots
FILETYPE=$(echo "${FILETYPE:-mp4}" | tr -d '\r' | sed 's/^\.//')
```
## Recommended "Bulletproof" Loop
To ensure the script is robust, consider using the following syntax:
```bash
# Ensure we catch moves from Windows and finished writes
inotifywait -m -q -e close_write,moved_to --format "%f". | while read -r DETECTED_FILE; do

    # Debug: Uncomment the next line to see every event in your console
    # echo "Event detected for: $DETECTED_FILE"

    # Pattern match: No quotes around the glob part
    if [[ "$FILETYPE" == "*" ]] || [[ "$DETECTED_FILE" == *."$FILETYPE" ]]; then

        # Filter out the script and config
        [[ "$DETECTED_FILE" == "$CONFIG_FILE" ]] && continue
        [[ "$DETECTED_FILE" == "$(basename "$0")" ]] && continue

        send_notification "Found $DETECTED_FILE" "Moving..."
        verify_and_move "$DETECTED_FILE"
    fi
done
```
It's also crucial to verify that the folder being watched is a native Linux path (e.g., `/home/user/watch`) rather than a Windows folder (e.g., `/mnt/c/downloads`). `inotifywait` often fails to trigger on `/mnt/c/` paths because Windows doesn't always send the interrupt signals Linux expects.

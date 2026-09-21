---
Title: "google workspace cli drive files list folders only"
Date: "2026-06-20_01_19"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
Listing Google Drive Folders with the Google Workspace CLI
===========================================================

To list only folders using the official Google Workspace CLI (`gws`), you need to pass a Drive API search query targeting the specific Google Drive folder MIME type.

### Basic Folder Listing

Run the following command in your terminal:
```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }'
```
This will list all folders in your Google Drive.

### Hiding Trashed Folders

To filter out deleted folders, add `and trashed = false` to your query:
```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder and trashed = false" }'
```
### Formatting Output as a Table

To make the output readable in your terminal layout:
```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }' --format table
```
### Extracting Only Folder Names

Use `jq` to isolate the folder names from the output stream:
```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }' --page-all | jq -r '.files[].name'
```
Using Nushell to Manipulate and Format Data
------------------------------------------

`gws` can output structured data like JSON, which Nushell can parse and turn into interactive tables. To take full advantage of Nushell's table rendering and pipeline power, instruct `gws` to output raw JSON and pipe the stream directly into Nushell's `from json` parser:
```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }' | from json | get files
```
Once Nushell recognizes the `gws` data as a structured table, you can perform powerful operations directly on your terminal layout.

### Sorting Folders Alphabetically

```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }' | from json | get files | sort-by name
```
### Filtering Out Specific Names

```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }' | from json | get files | where name!= "Archive"
```
### Isolating Specific Columns

```bash
gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }' | from json | get files | select id name
```
Debugging Nushell Interface with Shell Command's JSON Output
---------------------------------------------------------

When running `gws drive files list` in Nushell, the output may not be captured as expected. This is due to the `Using keyring backend: keyring` message being printed to standard output, corrupting the JSON payload.

### Step 1: Locating the Saboteur

The `Using keyring backend: keyring` message is the culprit. To fix this, strip out the comment using Nushell's pipeline commands:
```bash
gws drive files list | lines | skip 1 | join "\n" | from json
```
### Step 2: Debugging the `--params` JSON Rejection

When passing strings to external programs in Nushell, the shell may mangle JSON parameters. To bypass this, use Nushell's raw string syntax (`r#''#`):
```bash
gws drive files list --params r#'{ "q": "mimeType = 'application/vnd.google-apps.folder'" }'# | lines | skip 1 | join "\n" | from json
```
### Step 3: Combining the Fixes

Combine the raw string parameter with the comment-stripping pipeline:
```bash
gws drive files list --params r#'{ "q": "mimeType = 'application/vnd.google-apps.folder'" }'# | lines | skip 1 | join "\n" | from json
```
Stripping the Keyring Message
-----------------------------

The `Using keyring backend: keyring` message is routed to standard output instead of standard error. To strip this message, use Nushell's pipeline commands:
```bash
gws drive files list | lines | drop nth 0 | join "\n" | from json
```
Alternatively, in Zsh or Bash, use `sed` to slice out the first line:
```bash
gws drive files list | sed 1d | jq.
```
Saving the Command as a Custom Nushell Command
---------------------------------------------

To avoid typing long, messy strings every time, save the command as a custom Nushell command in your configuration file:
```nu
def gdrive-folders [] {
    gws drive files list --params '{ "q": "mimeType = application/vnd.google-apps.folder" }' 
    | from json 
    | get files
}
```
Then, typing `gdrive-folders` will instantly give you a fully interactive, native Nushell table that you can sort and filter with zero hassle.

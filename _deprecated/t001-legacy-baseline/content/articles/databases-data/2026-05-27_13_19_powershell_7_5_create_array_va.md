---
Title: "powershell 7.5 create array variable out of all files with same extension in directory"
Date: "2026-05-27_13_19"
Tags:
  - Databases and Data
Category: "Databases and Data"
Source_Products:
  - AI_Mode
  - Search
---
Working with PowerShell and Mellanox Hardware
==============================================

### Introduction to Object Arrays in PowerShell

In PowerShell, when working with collections of items, such as files, it's essential to understand how to create and manipulate arrays. An object array, specifically `System.Object[]`, is a common data type used to store various objects, including files. This guide will walk you through creating an array of files with a specific extension, iterating over them, and performing actions like rendering JSON files using `yq`.

### Creating an Array of Files

To create an array variable containing all files with a specific extension in a directory, use the `Get-ChildItem` cmdlet. The fastest method to filter files is by using the `-Filter` parameter, which processes the search at the filesystem level.

```powershell
$myFiles = Get-ChildItem -Path "C:\Your\Directory" -Filter "*.log" -File
```
This command assigns all `.log` files in the specified directory to the `$myFiles` variable. The `-File` parameter ensures that only files are returned, excluding subdirectories.

### Gathering Multiple File Types

If you need to gather multiple file types into a single array, use the `-Include` parameter:

```powershell
$dataFiles = Get-ChildItem -Path "C:\Your\Directory\*" -Include "*.csv", "*.json" -File
```
Note that using `-Include` requires appending an asterisk `*` to the end of your path.

### Accessing File Properties

By default, these commands store complete file objects, granting access to properties like `Length` or `CreationTime`. To grab just the file names as a simple string array, wrap the command in parentheses and append `.Name`:

```powershell
$logFileNames = (Get-ChildItem -Path "C:\Your\Directory" -Filter "*.log" -File).Name
```
### Understanding Object Arrays

In PowerShell 7.5, the correct term for this datatype is an Object Array (`System.Object[]`). PowerShell automatically creates an array of objects to allow different data types within the same array. Once created, the size of an object array cannot be changed; adding or removing items creates an entirely new array in memory.

You can check the exact datatype of your variable by running:

```powershell
$variable_name.GetType().FullName
```
### Working with JSON Files

To iterate through an array of JSON files and render each file with `yq`, follow these steps:

1. Gather all JSON files into an array object:
   ```powershell
$jsonFiles = Get-ChildItem -Path "C:\Your\Directory" -Filter "*.json" -File
```

2. Iterate through the array and render each file with `yq`:
   ```powershell
foreach ($file in $jsonFiles) {
    yq -P $file.FullName
}
```
Using `$file.FullName` ensures `yq` can find the file, even if your console is not currently open inside that specific directory.

### Nested Commands and Pipelining

You can nest these commands into a single line in PowerShell using the pipeline (`|`) or subexpression operators (`$()`). For example, to pass files directly into `ForEach-Object` (aliased as `%`), which is the most natural PowerShell equivalent to a nested loop:

```powershell
Get-ChildItem -Path "C:\Your\Directory" -Filter "*.json" -File | ForEach-Object { yq -P $_.FullName }
```
Alternatively, if you prefer the syntax that mirrors Bash's `$(cmd)` nesting, use `$()` in PowerShell:

```powershell
foreach ($f in $(Get-ChildItem -Filter "*.json" -File)) { yq -P $f.FullName }
```
For quick typing, an ultra-short one-liner can be used:

```powershell
gci -fi *.json -File | % { yq -P $_.FullName }
```

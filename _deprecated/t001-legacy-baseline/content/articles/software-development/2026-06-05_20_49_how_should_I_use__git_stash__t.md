---
Title: "how should I use \"git stash\" to save changes to .oh-my-bash folder?"
Date: "2026-06-05_20_49"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
Upgrading Oh-My-Bash with Local Modifications
=============================================

When you have uncommitted changes in your `~/.oh-my-bash` folder, you can use `git stash` to temporarily save them without committing. This allows you to pull the latest updates from the Oh-My-Bash repository without conflicts.

Saving Local Changes with Git Stash
------------------------------------

To save your local changes, navigate to your `~/.oh-my-bash` folder and run the following commands:

```bash
cd ~/.oh-my-bash
git stash push -m "Saving my Oh-My-Bash edits"
git stash list
```

You can then retrieve your saved changes using either `git stash apply` or `git stash pop`.

Resolving Merge Conflicts
-------------------------

If you encounter a merge conflict when applying your stashed changes, you can resolve it by manually editing the conflicting files or by using Git's built-in conflict resolution tools.

Standard Upgrade Workflow
-------------------------

To upgrade Oh-My-Bash without overwriting your local modifications, follow these steps:

1. Save your local changes using `git stash push`.
2. Pull the latest updates from the Oh-My-Bash repository using `git pull origin master`.
3. Apply your saved changes using `git stash pop`.

Cleaning Up Nested Folders
---------------------------

If you accidentally create a nested `.oh-my-bash` folder, you can delete it using the following command:

```bash
rm -rf ~/.oh-my-bash/.oh-my-bash
```

Moving Tweaks to the Custom Folder
-----------------------------------

To keep your local modifications separate from the Oh-My-Bash repository, you can move them to the `custom` folder. This allows you to upgrade Oh-My-Bash without worrying about overwriting your changes.

1. Create a new file in the `custom` folder, e.g., `~/.oh-my-bash/custom/my-tweaks.sh`.
2. Copy your modifications to the new file.
3. Restore the original files using `git restore`.

Reviewing Changes with Git Diff
-------------------------------

To review your changes file by file, use the `git diff` command with the specific file path:

```bash
git diff custom/completions/example.completion.sh
git diff lib/misc.sh
git diff lib/shopt.sh
```

Clobbering Accidentally Saved Files
------------------------------------

To discard changes in a file, use the `git restore` command:

```bash
git restore lib/misc.sh
```

Structuring Custom Scripts
---------------------------

When creating custom scripts, make sure to use the correct syntax and formatting. For example, if you want to override a specific setting, you can add the following lines to your custom script:

```bash
set +o noclobber
unset PROMPT_DIRTRIM
```

Restoring All Files at Once
---------------------------

To restore all files in the current directory and subfolders, use the following command:

```bash
git restore.
```

This will clobber all local edits, reverting them back to the clean repository defaults.

Final Check
------------

After restoring your files, run `git status` to confirm that your workspace is clean and ready for future upgrades.

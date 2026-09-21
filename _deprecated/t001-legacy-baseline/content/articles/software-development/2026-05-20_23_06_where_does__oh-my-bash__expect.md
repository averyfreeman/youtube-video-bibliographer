---
Title: "where does \"oh-my-bash\" expect starship?"
Date: "2026-05-20_23_06"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
# Integrating Starship with Oh-My-Bash
Oh-My-Bash does not have a default built-in configuration for Starship. To use Starship with Oh-My-Bash, you need to integrate it manually by modifying your `~/.bashrc` file.

## Setting Up Starship

1. **Disable OMB Themes**: In your `~/.bashrc`, set the theme to an empty string to avoid conflicts: `OSH_THEME=""`.
2. **Initialize Starship**: Add the following line to the very bottom of your `~/.bashrc`: `eval "$(starship init bash)"`.

## Key Considerations

1. **Theming Conflict**: If you leave an active Oh-My-Bash theme enabled while also running Starship, you may experience "double prompts" or visual glitches.
2. **Execution Order**: Starship should be initialized after the Oh-My-Bash sourcing script to ensure it has the final say on the `$PS1` variable.
3. **Compatibility**: Users on platforms like Warp have noted that custom prompts like Starship and OMB can occasionally conflict with specific terminal features.

## Expected Location of Starship
Oh-My-Bash expects the `starship` executable to be available in your system's `$PATH` environment variable. It does not look for it in a specific hardcoded folder.

## Fixing the "Starship Not Found" Error
If you encounter the error `[oh-my-bash] starship not found, please install it from https://github.com/starship/starship`, it means the binary is missing or Oh-My-Bash is loading before the directory containing Starship is added to your path.

### Installing Starship System-Wide
To install Starship system-wide, run the official installer: `curl -sS https://starship.rs/install.sh | sh`.

### Fixing the Execution Order in `~/.bashrc`
If you already installed Starship locally, your `~/.bashrc` is likely evaluating Oh-My-Bash before it knows where Starship lives. Open your `~/.bashrc` and ensure your custom path exports are placed above the Oh-My-Bash startup script:
```bash
export PATH="$HOME/.local/bin:$PATH"
source "$OSH/oh-my-bash.sh"
```
Once you save the file, restart your terminal or run `source ~/.bashrc` to clear the error.

## Using Mise to Install Starship
If you installed Starship using Mise, you may need to create a symlink from the Mise installation directory to a location in your `$PATH`, such as `$HOME/bin`.

## Checking if a Bash Function is Loaded
To test if a function is loaded, you can use `declare -f` (or `typeset -f`):
```bash
if declare -f varmunge >/dev/null 2>&1; then
    echo "The varmunge function is loaded!"
else
    echo "Not loaded."
fi
```
This checks if the function `varmunge` is defined without printing its code to the screen.

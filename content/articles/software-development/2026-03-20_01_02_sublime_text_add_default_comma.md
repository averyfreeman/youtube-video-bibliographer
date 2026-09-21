---
Title: "sublime text add default.commands script windows"
Date: "2026-03-20_01_02"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
Adding Custom Scripts to Sublime Text's Command Palette
=====================================================

To extend the functionality of Sublime Text on Windows, you can create custom scripts and add them to the Command Palette. This allows you to trigger these scripts or built-in actions using the `Ctrl+Shift+P` shortcut.

### Creating a Custom Command File

To add a script to the Command Palette, you need to create a `.sublime-commands` file in your User package. This prevents your custom commands from being overwritten during updates.

1. Open Sublime Text and navigate to `Preferences` > `Browse Packages...`.
2. Open the `User` folder.
3. Create a new file named `Default.sublime-commands` (or any name ending in `.sublime-commands`) inside the `User` folder.

### Defining a Custom Command

Paste the following JSON structure into the file, replacing the placeholders with your script's details:

```json
[
    {
        "caption": "My Custom Script",
        "command": "exec",
        "args": {
            "shell_cmd": "python &C:/Path/To/Your/script.py",
        }
    }
]
```

*   `caption`: The text you will search for in the Command Palette.
*   `command`: Use `exec` to run external programs or scripts.
*   `args`:
    *   `shell_cmd`: The full command to run your script in the Windows shell.
    *   `working_dir`: (Optional) The directory where the script should execute.

Save the file and press `Ctrl+Shift+P` to open the Command Palette. Type your custom script's caption and press `Enter` to run it.

### Logging Commands

To find the exact name of a built-in Sublime command, open the console (`Ctrl+``) and run `sublime.log_commands(True)`. Perform the action, and the command name will appear in the console.

### Environment Variables

Ensure your interpreter (like Python) is added to your Windows System Path so you can call it directly by name.

Binding Scripts to Keyboard Shortcuts
------------------------------------

You can also bind your custom script to a specific keyboard shortcut.

### Toggling Between Two Commands

To toggle between two commands, you can define two separate key bindings for the same keys but use a context to distinguish between them. The editor will check the context list for each binding and only execute the one where all conditions are true.

#### Option 1: Using Built-in Settings

If your commands depend on a simple setting (like word wrap or line numbers), you can use the built-in `toggle_setting` command.

1.  Go to `Preferences` > `Key Bindings`.
2.  Add the following to your User file:

```json
{
    "keys": ["ctrl+alt+w"],
    "command": "toggle_setting",
    "args": {
        "setting": "word_wrap"
    }
}
```

#### Option 2: Using Context for Custom Commands

To swap between two entirely different commands, you must bind them to a state that Sublime can track, such as whether a certain panel is open or a setting is active.

Example: Toggling between two commands based on a setting

```json
[
    {
        "keys": ["ctrl+f12"],
        "command": "command_one",
        "context": [{ "key": "setting.my_toggle_state", "operator": "equal", "operand": true }]
    },
    {
        "keys": ["ctrl+f12"],
        "command": "command_two",
        "context": [{ "key": "setting.my_toggle_state", "operator": "not_equal", "operand": true }]
    }
]
```

Note: You would need a third command or a plugin to flip the value of `my_toggle_state`.

#### Option 3: Creating a Python Toggle Script

For full control, create a small Python plugin that handles the logic itself.

1.  Go to `Tools` > `Developer` > `New Plugin...`.
2.  Paste the following code:

```python
import sublime, sublime_plugin

class MyToggleCommand(sublime_plugin.TextCommand):
    def run(self, edit):
        is_active = self.view.settings().get("my_custom_toggle", False)
        
        if is_active:
            self.view.run_command("command_one")
        else:
            self.view.run_command("command_two")
            
        self.view.settings().set("my_custom_toggle", not is_active)
```

Save it as `my_toggle.py` in your User folder. Bind it in your Key Bindings:

```json
{
    "keys": ["ctrl+shift+t"],
    "command": "my_toggle"
}
```

Working with Paths in Sublime Text
---------------------------------

When working with paths in Sublime Text, it's essential to understand the rules for slashes.

### Forward Slashes (/)

Forward slashes do not need to be escaped in Sublime Text configuration files. You can use them directly in strings, such as in file paths or regex patterns.

### Backslashes (\)

Backslashes must be escaped in JSON. A literal backslash must be written as a double backslash (`\\`).

### Important Exception: Double Escaping

If you are writing a command that passes a string to another process (like a `shell_cmd` in a build system or a snippet), you may need double escaping (four backslashes `\\\\` for one literal backslash). This is because the string is parsed twice: first by the JSON loader and then by Sublime Text or the underlying shell.

### Recommendation for Windows Paths

To avoid "backslash hell," you can use forward slashes for file paths even on Windows (e.g., `"C:/Users/Name/Documents"`). Sublime Text and most modern Windows APIs handle forward slashes correctly, eliminating the need for escaping entirely.

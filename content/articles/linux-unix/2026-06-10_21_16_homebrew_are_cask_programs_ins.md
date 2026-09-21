---
Title: "homebrew are cask programs installed for all users"
Date: "2026-06-10_21_16"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
Understanding Homebrew Cask Installations
=====================================

By default, Homebrew Cask installs programs to an individual user's `~/Applications` directory, making them directly available only to the user who ran the install command. However, it is possible to manually access or configure these programs to be available system-wide.

### How Cask Installations Work

When running `brew install --cask <app>`, Homebrew downloads the application, extracts it, and places it in a hidden Cask directory (usually `/usr/local/Caskroom/` or `/opt/homebrew/Caskroom/`). After extraction, Homebrew creates a symbolic link (symlink) to the application, allowing the system to find it. By default, this symlink is created in the personal `Applications` folder (`~/Applications`), making the application inaccessible to other user accounts on the Mac.

### Making Cask Apps Available to All Users

To share Cask-installed programs with other user accounts, there are two main options:

*   Move the Application: Manually drag and drop the `.app` file from `~/Applications` to the system-wide `/Applications` folder. This gives all users on the Mac access to the program, though an admin password may be required.
*   Change the Global Cask Directory: Instruct Homebrew to link casks to the system-wide `/Applications` directory globally by setting an environment variable in the shell profile (e.g., `~/.zshrc`):

    ```bash
export HOMEBREW_CASK_OPTS="--appdir=/Applications"
```

After making this change, running `brew install --cask` will automatically place the app in the global directory for all users to access.

Troubleshooting Homebrew Cask Installations
--------------------------------------

On an Apple Silicon Mac using the `/opt/homebrew` prefix, Homebrew Casks are installed directly into the global `/Applications` folder by default. This means that applications installed by one user are accessible to every user account on the machine.

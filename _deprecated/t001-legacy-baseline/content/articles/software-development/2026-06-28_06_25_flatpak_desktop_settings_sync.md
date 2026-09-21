---
Title: "flatpak desktop settings sync"
Date: "2026-06-28_06_25"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
Syncing Desktop Settings with Flatpak
=====================================

To sync desktop settings, such as GTK/Qt themes, icons, and app configurations, across Flatpak applications and different machines, I recommend using [Save Desktop](https://flathub.org/en/apps/io.github.vikdevelop.SaveDesktop). This tool backs up preferences and syncs them automatically to cloud storage or local networks. For app-specific data, I suggest utilizing [FlatSync](https://github.com/Ian-Marcel/FlatSync) to synchronize Flatpak installations and configurations between devices.

### Syncing Desktop Themes and Settings

For Flatpak applications to adopt the system theme and font settings, the sandbox needs access to the host's configuration. Here are the steps to achieve this:

*   **Use Flatpak Extensions**: Ensure the desktop environment's themes are installed as Flatpak extensions (available through Flathub).
*   **Adjust Permissions**: If using custom themes that aren't Flatpak extensions, use [Flatseal](https://flathub.org/en/apps/com.github.tchx84.Flatseal) to allow apps to read the host's theme directories (e.g., `~/.themes` or `~/.local/share/flatpak/overrides`).
*   **Automated Syncing**: With [Save Desktop](https://flathub.org/en/apps/io.github.vikdevelop.SaveDesktop), go to the Sync tab to set the target directory (e.g., Nextcloud, Google Drive, or a Git repository) to keep configurations mirrored.

### Syncing Flatpak Applications (FlatSync)

To keep the exact same set of Flatpak apps and their internal configs on a secondary machine:

1.  Install **FlatSync** from Flathub on both machines.
2.  Generate a Device ID from the application's interface.
3.  Link devices so that app installs and uninstalls are propagated automatically, with the option to set a systemd timer for background syncing.

Alternative Solutions
--------------------

While Save Desktop and FlatSync are popular options, they may not be the only solutions available. If you're looking for alternatives, consider the following:

### Alternative Flatpak Solutions

*   [Save Desktop](https://flathub.org/en/apps/io.github.vikdevelop.SaveDesktop): A distinct, lightweight tool built to back up and sync desktop configurations (themes, icons, wallpapers, Flatpak settings).
*   [Kup Backup System](https://flathub.org/en/apps/org.kde.kup): A backup system that works perfectly fine under GNOME to selectively target configuration folders for scheduled network syncing.

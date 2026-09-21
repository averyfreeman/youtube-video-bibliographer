---
Title: "chrome download linux"
Date: "2026-06-08_23_03"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
# Installing Google Chrome on Linux
To download and install Google Chrome on Linux, you can obtain the official Linux installer directly from Google Chrome. Choose either the 64-bit.deb package for distributions like Ubuntu, Debian, and Linux Mint, or the 64-bit.rpm package for Fedora, CentOS, and openSUSE.

## Installation Commands
Follow these terminal commands for your specific Linux distribution:

### For Debian, Ubuntu, and Linux Mint
To install Google Chrome, navigate to the directory containing the downloaded package and run the installation command:
```bash
cd ~/Downloads
sudo apt install./google-chrome-stable_current_amd64.deb
```

### For Fedora, CentOS, and RHEL
Similarly, for these distributions, use the following commands:
```bash
cd ~/Downloads
sudo dnf localinstall./google-chrome-stable_current_x86_64.rpm
```

The installation process automatically adds Google's official repository, ensuring your browser stays up to date with your system's regular updates.

# Preventing Snap Packages from Installing
If you prefer to avoid Snap packages, such as those for Chromium, you can create APT preferences files to block these installations.

## Blocking Specific Snap-Packaged Apps
To block specific applications like Chromium while allowing others to install normally, create a file with the following configuration:

1. Open your terminal and run the command to create and edit the preference file:
```bash
sudo nano /etc/apt/preferences.d/block-snaps
```

2. Paste the following configuration into the file:
```markdown
Package: chromium-browser*
Pin: release *
Pin-Priority: -1

Package: chromium-codecs*
Pin: release *
Pin-Priority: -1
```

3. Save and exit the editor (Press Ctrl+O, Enter, then Ctrl+X).

## Blocking All Ubuntu-to-Snap Transitions
For a blanket ban on any Debian package that Ubuntu uses as a hidden trigger to install a Snap package, follow these steps:

1. Open a new preference file:
```bash
sudo nano /etc/apt/preferences.d/nosnap
```

2. Paste the configuration to give Ubuntu's snap-transition packages a negative priority:
```markdown
Package: *snapd*
Pin: release *
Pin-Priority: -1
```
Note that this completely prevents `snapd` from installing via APT.

## Applying the Changes
After saving your files, refresh your system package lists to activate the new rules:
```bash
sudo apt update
```
This ensures that your system adheres to the preferences you've set regarding Snap packages.

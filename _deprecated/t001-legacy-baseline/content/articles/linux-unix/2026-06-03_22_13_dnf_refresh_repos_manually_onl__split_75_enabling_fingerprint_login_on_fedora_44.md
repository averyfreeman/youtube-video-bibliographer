---
Title: "Enabling Fingerprint Login on Fedora 44"
Date: "2026-07-04_16_35"
Tags:
  - Linux and Unix
Split_From_Line: 75
Category: "Linux and Unix"
---
# Enabling Fingerprint Login on Fedora 44
To get the fingerprint option to show up in the Fedora 44 GNOME settings panel, GNOME requires three things: the `fprintd` packages installed, the daemon running, and the Pluggable Authentication Module (PAM) configuration enabled via `authselect`.

## Installing and Starting the Daemon
First, ensure the system fingerprint components are fully installed and active on your system:
```bash
sudo dnf install fprintd fprintd-pam
sudo systemctl enable --now fprintd.service
```
## Activating the Feature in System Authentication
Fedora uses a tool called `authselect` to safely manage login mechanisms. GNOME Settings checks this configuration before showing the toggle. Enable the fingerprint profile hook by running:
```bash
sudo authselect enable-feature with-fingerprint
```
## Accessing the Option in GNOME
Once the commands above are run, completely close and reopen your GNOME Settings app:
1. Navigate to Settings -> System -> Users.
2. Click on your user account.
3. You will now see Fingerprint Login listed next to Disabled or Enabled. Click it to enroll your fingers.

## Troubleshooting: Still Not Showing Up?
If you did the steps above and the setting is still missing, GNOME cannot see your hardware.
* Check Driver Support: Run `lsusb` in the terminal to find your fingerprint sensor hardware ID (e.g., `27c6:609c`). Check it against the libfprint Supported Devices List to verify if it has open-source support.
* Proprietary Hardware (Goodix / Broadcom): Laptops like certain Dell, HP, or Lenovo models use proprietary sensors. If your device ID isn't natively supported, you may need a community-driven driver wrapper via Fedora Copr, such as `libfprint-tod-goodix` or `libfprint-tod-broadcom`.
* Dual-Boot Conflict: If you dual-boot Windows on the same machine, Windows often locks the hardware-level cryptographic storage on the sensor. If `fprintd-enroll` fails with a `Device claimed by another process` error, you must boot into Windows and clear/disable Windows Hello fingerprints first.

# Understanding `authselect` and SSSD
The message you are seeing when running `authselect enable-feature with-fingerprint` is not an error, but a boilerplate warning. SSSD (System Security Services Daemon) and `authselect` are related because `authselect` manages your system's authentication profiles, and its default active profile relies on SSSD.

## Connection Between `authselect` and SSSD
1. What `authselect` is doing: `authselect` does not manage hardware; it builds your system's PAM (Pluggable Authentication Modules) files. When you pass the command `enable-feature with-fingerprint`, you are instructing `authselect` to rewrite your PAM configuration to inject `pam_fprintd.so` into the authentication pipeline.
2. The SSSD Profile dependency: By default, Fedora historical configurations utilize an authentication blueprint called the `sssd` profile. SSSD is a background daemon (`sssd.service`) designed to manage local user caching and remote identity mapping (like Active Directory, LDAP, or FreeIPA).
3. The Fedora 44 Catch: You might be on the "Local" profile: Starting with recent Fedora releases, the operating system introduced a dedicated `local` profile for standalone laptops and desktops that do not connect to enterprise domain controllers.

## Resolving the Warning
To verify your configuration and resolve the warning, handle it based on your current setup:
* Step A: Check your active profile
```bash
authselect current
```
* Step B: Apply changes directly to your current layout: If your system outputs `Profile ID: local`, `authselect` might ignore changes passed blindly. You should re-select your active profile while explicitly appending the fingerprint feature to it:
```bash
# If your profile is "local"
sudo authselect select local with-fingerprint --force

# If your profile is "sssd"
sudo authselect select sssd with-fingerprint --force
```
Running the explicit `select` command bypassing `enable-feature` forces `authselect` to regenerate clean, error-free PAM configuration files tailored directly to your system's state.

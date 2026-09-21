---
Title: "dnf refresh repos manually only"
Date: "2026-06-03_22_13"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
# Disabling Automatic Background Updates in DNF
To force DNF to refresh repositories manually only and disable all automatic background updates, you need to change the configuration setting `metadata_expire` in `dnf.conf` and disable the `dnf-makecache` systemd timer.

## Configuring DNF
Open the DNF configuration file in your preferred text editor:
```bash
sudo nano /etc/dnf/dnf.conf
```
Under the `[main]` section, add or edit the following line to set the metadata expiration to never:
```bash
metadata_expire=-1
```
Note: In older DNF versions, this setting might be `metadata_expire=never`.

## Disabling Automatic Refreshes
DNF runs a systemd timer in the background to automatically cache repositories. Disable it to completely prevent automatic refreshes:
```bash
sudo systemctl disable --now dnf-makecache.timer
```
Now, DNF will only check for updates when you explicitly tell it to.

## Manual Updates
To force a manual check and update your system, use the `--refresh` flag:
```bash
sudo dnf upgrade --refresh
```
To manually refresh your repository cache without installing anything, run:
```bash
sudo dnf clean expire-cache & sudo dnf makecache
```
# Understanding DNF Speed Differences
The fundamental speed difference between APT (Debian/Ubuntu) and DNFv4 (RHEL/Fedora) comes down to architectural differences:
* APT separates updating the package index (`apt update`) from installing software (`apt install`).
* DNFv4 concurrently attempts to download new metadata while you try to run commands (like `dnf install` or `dnf search`) if it thinks your local cache is stale.

# Bridging the Gap: Getting Debian Speed with DNF
If you are sticking with the default DNFv4 on RHEL 10, your manual metadata strategy (`metadata_expire=-1` and disabling `dnf-makecache.timer`) will completely fix the slowness. It forces DNFv4 to operate exactly like APT—relying entirely on your local cache until you explicitly tell it to update.

## Using DNF5 on RHEL 10
If you want to use the faster, rewritten-in-C++ DNF5 on RHEL 10, you can install it using the following steps:

### Installing DNF5
```bash
sudo dnf install dnf5
```
DNF5 lives inside the Extra Packages for Enterprise Linux 10 (EPEL 10) repository. To enable the EPEL repository on your machine and get DNF5, you can pull the release package directly from the Fedora Project EPEL repository by running:
```bash
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-10.noarch.rpm
```
Once that repository file is registered, refresh your system's cache and install the tool:
```bash
sudo dnf makecache
sudo dnf install dnf5
```
### Configuring DNF5 for Manual-Only Index
Open its specific config file:
```bash
sudo nano /etc/dnf/dnf5.conf
```
Add the following line to stop it from automatically updating the index during standard commands:
```bash
cacheonly=metadata
```
## Your New Debian-Style Workflow
Instead of `apt update`, run `sudo dnf5 makecache`.
Instead of `apt install`, run `sudo dnf5 install <package>`.

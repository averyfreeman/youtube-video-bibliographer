---
Title: "leap micro zypper keys expired"
Date: "2026-06-22_09_17"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
Updating Leap Micro: A Step-by-Step Guide
==============================================

As Leap Micro is an immutable operating system, updates and GPG key changes must be applied using the transactional update tool. This guide will walk you through the process of updating your Leap Micro system and troubleshooting common issues.

### Unlocking the System State and Fetching Updated GPG Keys

To unlock the system state and fetch the updated GPG keys, run the following command in a transactional-update environment:
```bash
sudo transactional-update run zypper --gpg-auto-import-keys refresh
```
This command forces a repository refresh and imports the updated GPG keys.

### Applying Updates

To apply the updates to the next boot, run:
```bash
sudo transactional-update dup
```
This command updates the system with the latest packages.

### Rebooting into the Updated Snapshot

Reboot your system into the updated snapshot:
```bash
sudo reboot
```
If you encounter error messages during this process, check the exact repositories you are using (e.g., standard Leap Micro or third-party repos) and troubleshoot further.

### Working within a Transactional-Update Shell

If you are already inside a transactional-update shell, you are working directly within a read-write snapshot. In this case, you do not need to prepend commands with `transactional-update`. Run the following commands in your current shell:
```bash
zypper --gpg-auto-import-keys refresh
zypper dup
exit
sudo reboot
```
### Troubleshooting Key Errors

If `zypper` still throws a key error after this, check the exact error text or which repository is failing. A common issue is an expired key, such as the openSUSE Project Signing Key.

### Expired Keys

The openSUSE Project Signing Key (29b700a4) officially expired on June 19, 2026. Even though `zypper` refreshes repository metadata, the fundamental validation system (RPM) is rejecting the package itself because it was built and signed using the now-expired key.

To solve this, you have two clean ways to proceed:

#### Option 1: Force Zypper to Temporarily Ignore the GPG Signature

This tells `zypper` and the underlying RPM database to skip signature validation strictly for this upgrade process:
```bash
zypper --no-gpg-checks dup --allow-unsigned-rpm
```
#### Option 2: Delete the Old Key

If you prefer a clean key swap, you can explicitly remove the expired key from the localized snapshot's RPM database:
```bash
rpm -q gpg-pubkey --qf '%{NAME}-%{VERSION}-%{RELEASE}\t%{SUMMARY}\n' | grep 29b700a4
rpm -e gpg-pubkey-29b700a4-62b07e22
zypper --gpg-auto-import-keys dup
```
After completing either Option 1 or Option 2, exit the transactional-update shell and reboot:
```bash
exit
sudo reboot
```
### Using Podman Compose

Leap Micro intentionally keeps its core system pattern extremely minimal, excluding `podman-compose` from the default container runtime pattern. To add Compose capabilities, you can install the official Docker Compose binary.

#### Installing the Official Docker Compose Binary

Download the latest stable standalone Compose binary into your persistent bin path:
```bash
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
```
Apply execution permissions to the binary:
```bash
sudo chmod +x /usr/local/bin/docker-compose
```
Now, Podman will seamlessly pick up that binary plugin automatically. You can use native execution styles:
```bash
podman compose up -d
```
or explicitly target the binary:
```bash
docker-compose up -d
```
Note: If you run rootless containers, ensure your local user environment variable has access to `/usr/local/bin` in your `$PATH`.

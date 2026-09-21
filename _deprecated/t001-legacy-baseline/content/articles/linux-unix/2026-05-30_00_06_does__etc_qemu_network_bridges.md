---
Title: "does /etc/qemu/network/bridges.conf need to be persisted to disk (by rebooting) in Leap Micro 6.2?"
Date: "2026-05-30_00_06"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
Configuring QEMU Bridge ACLs and Managing Software Patterns in openSUSE Leap Micro 6.2
====================================================================================

### Introduction to Leap Micro 6.2 Filesystem

openSUSE Leap Micro 6.2 features a read-only root filesystem, similar to MicroOS. This design ensures stability but requires a different approach to editing configuration files. Any file changes must be written to the underlying persistent overlay using the transactional update system.

### Configuring QEMU Bridge ACLs

To configure QEMU bridge ACLs, you cannot simply edit `/etc/qemu/network/bridges.conf` directly. Instead, apply the configuration by running the following command to open a read-write snapshot, write your allowed bridges to the file, and commit the changes:
```bash
sudo transactional-update run sh -c 'echo "allow br0" > /etc/qemu/network/bridges.conf'
```
Then, reboot the system to apply and solidify the new snapshot containing your persisted ACL configuration.

### Understanding the /etc Directory

In openSUSE Leap Micro 6.2, the `/etc` directory functions differently than the rest of the immutable root file system. While the core operating system is locked as read-only, `/etc` is designed to be writable at runtime, allowing you to change system settings, manage users, and adjust network configurations. This is achieved using OverlayFS, a union filesystem that overlays two distinct layers to present `/etc`:

* Lower Layer (Read-Only): The static `/etc` structure provided by the Btrfs root snapshot of the current operating system version.
* Upper Layer (Read-Write): A dedicated, persistent directory on disk located under `/var/lib/overlayfs/`.

When you read a file in `/etc`, you see the unified view. When you write or modify a file, the changes are stored entirely in the upper layer on the persistent storage path.

### Modifying Configuration Files

To modify configuration files in Leap Micro 6.2:

* Edit `/etc` directly for standard configuration changes. You can use `vim`, `nano`, or system commands directly on live configuration files. Changes take effect immediately without a reboot.
* Do not use `transactional-update` to modify `/etc`. Running `transactional-update run` or shell to modify `/etc` can lead to changes being masked and ignored.

### Step-by-Step Configuration for QEMU Bridge ACLs

To configure QEMU bridge ACLs:

1. **Open the File Directly**: Open the file using your preferred text editor (e.g., `vi` or `nano`) with root privileges:
```bash
sudo vi /etc/qemu/bridge.conf
```
If the `/etc/qemu` directory does not exist, create it first using `sudo mkdir -p /etc/qemu`.
2. **Add Your Bridge ACLs**: Add the specific rules allowing QEMU helper binaries to access your bridge interfaces. Use exactly one directive per line:
	* To allow a specific bridge: `allow br0`
	* To allow all bridges: `allow all`
	* To explicitly deny a bridge: `deny br1`
3. **Set the Correct Permissions**: Ensure the `qemu-bridge-helper` binary has strict ownership and permissions on the file:
```bash
sudo chown root:root /etc/qemu/bridge.conf
sudo chmod 0644 /etc/qemu/bridge.conf
```
The changes are written to the persistent OverlayFS upper layer and are active immediately. You can test that your virtual machines can now bind to the bridge by starting your QEMU/KVM instance or testing it via `virsh`/`libvirt`.

### Managing Software Patterns with Zypper

To manage software patterns in Leap Micro 6.2, use the `zypper` command. Since Leap Micro utilizes a read-only filesystem, you do not need root/sudo privileges to list or query patterns, but you will need `transactional-update` to install one.

#### Listing Software Patterns

To list software patterns, use the following commands:

1. **List All Available Patterns**:
```bash
zypper search -t pattern
```
2. **List Only Installed Patterns**:
```bash
zypper search -i -t pattern
```
3. **Search for a Specific Pattern**:
```bash
zypper search -t pattern microos
```
4. **View Details and Contents of a Pattern**:
```bash
zypper info -t pattern kvm_host
```
#### Installing Software Patterns

To install a software pattern, use the following command:
```bash
sudo transactional-update pkg install -t pattern kvm_host
sudo reboot
```
Remember to reboot the machine after installing a pattern.

#### Getting Information about a Pattern

To get detailed information about a software pattern, use the following command:
```bash
zypper info -t pattern <pattern_name>
```
You can also use the shorthand alias `if` instead of `info`:
```bash
zypper if -t pattern kvm_host

---
Title: "alpine linux bind mounts in diskless mode"
Date: "2026-06-28_03_44"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
Configuring Alpine Linux in Diskless Mode with Persistent Bind Mounts
====================================================================

Alpine Linux's diskless mode loads the entire operating system into RAM at boot, making changes to the root filesystem ephemeral unless explicitly mapped to persistent storage. To make local changes persistent or access drive storage, utilize bind mounts mapping volatile RAM directories to a physical disk partition.

### Step 1: Mount the Persistent Drive

First, identify your physical storage device (e.g., `/dev/sdb1` or a data partition) and mount it to the `/media` folder:
```bash
mkdir -p /media/sdb1
mount /dev/sdb1 /media/sdb1
```
### Step 2: Add Bind Mount to `/etc/fstab`

Use the bind flag in your `/etc/fstab` to mirror a RAM directory onto the persistent partition. For example, to bind `/var/lib/docker` (often used for container storage) to a folder on your drive:
```markdown
/media/sdb1/docker_data /var/lib/docker none bind,rw 0 0
```
### Step 3: Apply the Mount

Mount all filesystems and ensure the directory is created:
```bash
mkdir -p /media/sdb1/docker_data
mount -a
```
### Step 4: Persist the Configuration (Alpine Local Backup)

Because the OS boots fresh into RAM, the changes made to `/etc/fstab` must be saved so they apply on the next reboot. Use the Alpine Local Backup tool (`lbu`):
```bash
lbu include /etc/fstab
lbu commit
```
Choosing Directories for Bind Mounts
------------------------------------

When selecting directories for bind mounts, consider the following:

*   `/etc`: Do not bind-mount. Instead, rely on Alpine's built-in tool: run `lbu commit` to save configuration changes to your persistent media (`.apkovl`) file.
*   `/var/log`: Do not bind-mount directly. Configure your log daemon to log directly to a file on `/media/sdb1/logs`, or use a dedicated logging container/remote syslog.
*   `/var/lib/samba` and `/home`: Excellent for bind mounts because the Samba service (samba or smbd) and user login shells start much later in the boot process.

Understanding `/etc/fstab` Options
-------------------------------

The two numbers at the end of an `fstab` line represent the dump field and the fsck (File System Check) pass number field.

*   First Number (Dump): Controls backup scheduling via the legacy dump utility. 0 disables this, which is standard for almost all modern systems.
*   Second Number (Fsck Pass): Dictates the order in which the system checks the filesystem for errors at boot.
    *   1: Reserved exclusively for the root filesystem (`/`).
    *   2: Used for other physical drive partitions (like `/dev/sdb1`) so they get checked sequentially after root.
    *   0: Disables filesystem checking entirely.

For all bind mounts, you must strictly use `0 0`.

Example `/etc/fstab` Configuration
---------------------------------

To achieve your goal safely without breaking the diskless boot flow, structure your `fstab` like this:
```markdown
# 1. First, mount the physical drive partition (Fsck pass 2 is safe here)
UUID=your-drive-uuid   /media/sdb1      ext4    noatime,defaults   0 2

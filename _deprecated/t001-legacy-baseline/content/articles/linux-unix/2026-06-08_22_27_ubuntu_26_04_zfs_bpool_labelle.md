---
Title: "ubuntu 26.04 zfs bpool labelled \"rpool\""
Date: "2026-06-08_22_27"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
# Managing ZFS Pools on Ubuntu
## Introduction to ZFS Pools
In Ubuntu, the ZFS root and boot pools are strictly managed by the system and have strict naming conventions. The default layout consists of two separate pools: `bpool` and `rpool`. `bpool` is an unencrypted pool used strictly for holding the `/boot` filesystem and GRUB modules, while `rpool` is a separate, larger pool that contains the root (`/`), `/home`, and all other system datasets.

## Renaming a Colliding Pool
If you have an existing pool that you accidentally named `rpool` (or a leftover from a previous installation) and need to rename it to something else, you must do so by exporting and importing the pool. To rename a colliding pool:

1. Boot into a live Ubuntu USB environment.
2. Find your pool's current name using `zpool import`.
3. Export it and re-import it with a new name using:
   - `sudo zpool export <old_rpool_name>`
   - `sudo zpool import <old_rpool_name> <new_rpool_name>`

## Fixing GRUB or Boot Issues
If you have an existing install and your system is dropping you into the initramfs shell, you can manually import the pools to update your bootloader:

1. Boot into a Live ISO.
2. Import both pools to `/mnt` to inspect them:
   - `sudo zpool import -f rpool -R /mnt`
   - `sudo zpool import -f bpool -R /mnt`
3. If necessary, you can chroot into your `/mnt` environment to reinstall GRUB and regenerate your initramfs so the system mounts the pools persistently on the next restart.

## Renaming a Mislabelled Boot Pool
To safely rename your mislabeled boot pool from `rpool` to `bpool` without colliding with your actual root pool, you must import the partition by its ID and explicitly specify the new name. Run the following commands from an Ubuntu Live USB:

1. Clear Cached ZFS Topologies:
   - `sudo zpool import -d /dev/nvme0n1p2`
2. Force Import and Rename the Pool:
   - `sudo zpool import -f -d /dev/nvme0n1p2 rpool bpool`
3. Verify and Clean Up:
   - `zpool status bpool`
   - `sudo zpool export bpool`

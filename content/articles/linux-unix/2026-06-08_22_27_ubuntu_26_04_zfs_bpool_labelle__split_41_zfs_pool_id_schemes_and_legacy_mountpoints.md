---
Title: "ZFS Pool ID Schemes and Legacy Mountpoints"
Date: "2026-07-04_15_37"
Tags:
  - Linux and Unix
Split_From_Line: 41
Category: "Linux and Unix"
---
## Using Different ID Schemes for Pools
Using different ID schemes for your pools (e.g., `nvme-eui.*` vs `nvme-PM991a.*`) will not cause functional problems, but it can make manual troubleshooting annoying. ZFS writes the pool configuration directly to the disk headers (vdev labels), and the OS will always find and import the pools regardless of which path style was used during creation.

### Why the Installer Did This
The Ubuntu installer scans `/dev/disk/by-id/` and grabs the first unique identifier it encounters for a given partition. Sometimes, different logic layers or timing issues during installation cause it to pick the EUI format for one partition and the Model/Serial format for another.

### Potential Minor Issues
Using different ID schemes may cause minor issues, such as:
* Scannability: When running `zpool status`, one pool will look like a generic string of hexadecimal characters, while the other shows the actual brand of your SSD.
* Scripting: If you write custom backup or health-check scripts that parse `zpool status` and expect a uniform naming convention, they might fail or require extra logic.

### How to Make Them Uniform (Optional)
If the visual mismatch bothers you, you can easily force ZFS to use the human-readable `nvme-PM991a` format for both pools. Run these commands from a Live USB (or during an initramfs recovery shell):

1. Export both pools:
   - `sudo zpool export bpool`
   - `sudo zpool export rpool`
2. Re-import pointing specifically to the human-readable ID directory:
   - `sudo zpool import -d /dev/disk/by-id/ bpool`
   - `sudo zpool import -d /dev/disk/by-id/ rpool`
3. Export them cleanly again:
   - `sudo zpool export bpool`
   - `sudo zpool export rpool`

## Important ZFS Behaviors to Keep in Mind
While the mixed drive IDs won't hurt anything, running a casual system upgrade can. If you ever run `zpool upgrade`, never upgrade `bpool`. GRUB contains a very rigid, hardcoded ZFS reader. If you upgrade `bpool`'s feature flags to match a newer OpenZFS version, GRUB will instantly lose the ability to read the boot directory, and your system will become unbootable. Upgrading `rpool` is perfectly safe.

Additionally, do not panic if you run `zpool status` a few months from now and notice that the `nvme-eui` path has randomly changed to an `nvme-PM991a` path (or vice-versa). On Linux, the systemd ZFS import services scan `/dev/disk/by-id/` at boot. Whichever path symlink settles first in the file system during a kernel initialization is the one ZFS will display. It is completely aesthetic and safe.

## Configuring Legacy Mountpoints
You can configure your ZFS datasets to use legacy mountpoints, but you should only do this for specific data directories, not for your core root system datasets. If you set the root dataset (e.g., `rpool/ROOT/ubuntu_...`) or essential system paths to legacy, Ubuntu's boot generator will fail, and the system will drop to an initramfs prompt on the next reboot.

### How ZFS Mounts Work on Ubuntu
ZFS manages mounts automatically via the `mountpoint` property. The OS reads the pool topology at boot and mounts datasets sequentially based on their hierarchy. Alternatively, you can use legacy mountpoints, where ZFS hands control completely over to the OS, and the datasets behave like standard ext4 or XFS partitions.

### Step-by-Step: Converting a Dataset to Legacy
To convert a specific non-boot dataset to legacy control:

1. Set the Property to Legacy:
   - `sudo zfs set mountpoint=legacy rpool/DATA/my_dataset`
2. Get the Dataset Information:
   - `zfs list`
3. Update `/etc/fstab`:
   - `sudo nano /etc/fstab`
   - Add a line at the bottom of the file using the dataset name instead of a UUID or disk path: `rpool/DATA/my_dataset  /mnt/my_mountpoint  zfs  defaults  0  0`
4. Test the Mount:
   - `sudo umount /mnt/my_mountpoint`
   - `sudo mount -a`

### Which Datasets Should You Avoid Changing?
Do not change the `mountpoint` property for any dataset under:
* `bpool/BOOT/...` (Breaks GRUB/kernel loading)
* `rpool/ROOT/...` (Breaks the initramfs pivot to the OS)
* Core system paths managed by Ubuntu's `zsys` or `systemd-generators` (like `/var/lib`, `/var/log`, or `/usr`)

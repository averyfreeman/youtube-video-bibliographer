---
Title: "Configuring Samba Active Directory Domain Controller on Alpine Linux"
Date: "2026-07-04_14_09"
Tags:
  - Linux and Unix
Split_From_Line: 70
Category: "Linux and Unix"
---
# 2. Next, bind-mount the subdirectories (Always use 0 0)
/media/sdb1/samba      /var/lib/samba   none    bind,rw            0 0
/media/sdb1/home       /home            none    bind,rw            0 0
```
Configuring Samba Active Directory Domain Controller
---------------------------------------------------

For an Active Directory Domain Controller (AD DC), Samba runs in a unified architecture. You should not run the traditional individual `smbd`, `nmbd`, and `winbindd` daemons separately.

Instead, the main `samba` process acts as a master supervisor that spawns its own integrated versions of these services.

To configure `/etc/conf.d/samba` for an AD DC:

*   Comment out the default split daemons list.
*   Uncomment the unified entry.

Your file should look like this:
```markdown
# daemon_list="smbd nmbd winbindd"  <-- Comment this out
daemon_list="samba"                 <-- Uncomment this
```
Alpine Local Backup (LBU) Configuration
--------------------------------------

To configure LBU to target a non-boot partition, update `/etc/lbu/lbu.conf`:
```markdown
LBU_MEDIA=mmcblk0p2
```
Alternatively, you can pass an explicit boot parameter by appending `apkovl=mmcblk0p2` to the `cmdline.txt` file on the FAT32 partition.

APK Package Caching
-------------------

While your configurations (`.apkovl`) will load seamlessly from the ext4 partition, your downloaded system packages (`.apk`) files require extra care.

If you install extra software using `apk add`, Alpine caches those package binaries so it can reinstall them into RAM on the next boot.

To ensure the ext4 kernel feature module is explicitly loaded during the initramfs generation phase, check `/etc/mkinitfs/mkinitfs.conf` to ensure ext4 is included in the features array:
```markdown
features="ata base ide scsi usb virtio ext4 nvme"
```
If you have to add it, run `mkinitfs` to rebuild the boot images on your FAT32 partition.

Troubleshooting
---------------

If you encounter issues with editing `/media/mmcblk0p1/cmdline.txt` while the system is in read-only mode, you can temporarily remount the partition as read-write:
```bash
mount -o remount,rw /media/mmcblk0p1
```
After making changes, remount it as read-only to protect the boot sector:
```bash
mount -o remount,ro /media/mmcblk0p1
```
If you experience errors with `mount` commands, try using `umount` and `mount` with explicit options:
```bash
umount -f /media/mmcblk0p1
mount -t vfat -o rw,noatime /dev/mmcblk0p1 /media/mmcblk0p1
```
Conclusion
----------

Configuring Alpine Linux in diskless mode with persistent bind mounts requires careful planning and execution. By following these steps and understanding the underlying mechanisms, you can create a robust and efficient system that meets your needs.

Remember to double-check your configurations, especially when working with bootloaders and filesystems. If you encounter issues, don't hesitate to seek help or try alternative approaches.

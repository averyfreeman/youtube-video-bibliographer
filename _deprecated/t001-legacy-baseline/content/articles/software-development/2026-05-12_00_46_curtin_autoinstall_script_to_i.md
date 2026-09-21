---
Title: "curtin autoinstall script to install ubuntu 24.04 on zfs but with bigger bpool"
Date: "2026-05-12_00_46"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
# Installing Ubuntu 24.04 on ZFS with a Custom bpool Size
To install Ubuntu 24.04 on ZFS with a custom bpool size, it is necessary to explicitly define the storage configuration in the `autoinstall.yaml` file using curtin's detailed storage config format. This is because the simple layout shorthand `{name: zfs}` defaults to a hardcoded 2GB partition, which may not meet specific requirements.

## Customizing the bpool Size
In the example provided, the bpool partition is manually set to 4GB. However, this size value can be adjusted to fit individual needs.

### Storage Configuration Example
The following `autoinstall.yaml` configuration demonstrates how to set up a custom bpool size:
```yaml
autoinstall:
  version: 1
  storage:
    config:
      - id: disk0, type: disk, ptable: gpt, path: /dev/sda, wipe: superblock
      - id: part-esp, type: partition, device: disk0, size: 512M, flag: boot
      - id: part-bpool, type: partition, device: disk0, size: 4G # Customized size
      - id: part-rpool, type: partition, device: disk0, size: -1 # Remaining space
      - id: bpool, type: zpool, pool: bpool, vdevs: [part-bpool], mountpoint: /boot
      - id: rpool, type: zpool, pool: rpool, vdevs: [part-rpool], mountpoint: /
      - id: bpool/boot, type: zfs, pool: bpool, volume: boot
      - id: rpool/root, type: zfs, pool: rpool, volume: root
```
## Additional Resources
For specific, verified partition examples that align with Ubuntu's ZFS best practices, refer to the detailed configuration at [GitHub - ubuntu/zsys-install](https://github.com/ubuntu/zsys-install/blob/master/curtin-zfs.yaml). This resource provides a comprehensive guide to configuring ZFS partitions for Ubuntu installations.

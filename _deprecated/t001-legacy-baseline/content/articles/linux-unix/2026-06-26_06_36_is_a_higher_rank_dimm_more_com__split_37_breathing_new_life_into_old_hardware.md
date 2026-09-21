---
Title: "Breathing New Life into Old Hardware"
Date: "2026-07-04_12_45"
Tags:
  - Linux and Unix
Split_From_Line: 37
Category: "Linux and Unix"
---
### Project Showcase: Recycling Old Hardware

Recycling old hardware can be a great way to breathe new life into outdated components. For example, setting up a custom gateway with Ubuntu 22.04 on a low-power Celeron SoC can provide enterprise-level firewall, routing, and traffic management capabilities.

### Power Efficiency and Optimization

To optimize power efficiency, consider using a DC-DC ATX power supply and a high-quality 12V 10A external brick. This setup can help reduce conversion losses and improve overall efficiency. Additionally, using enterprise-grade storage like the Intel S3500 SSD can provide reliable performance and power loss protection.

### Linux Tweaks for Networking

To optimize the Ubuntu networking stack, consider disabling unused features and adjusting ring buffers using `ethtool`. This can help prevent dropped packets and reduce latency.

### Firewalld Configuration and Persistence

To ensure firewalld persistence on Ubuntu, purge ufw and enable firewalld explicitly. This will prevent service conflicts during system updates.

### Additional Network Services

Consider running additional network services like a local DHCP server or a network-wide ad blocker like Pi-hole. These services can enhance the functionality and security of the gateway.

### Storage and Directory Server Configuration

When transitioning the J3455 system to a storage and directory server, consider the hardware and software resource demands. Running a Samba AD DC on Ubuntu 22.04 requires minimal CPU overhead, and the 4GB Crucial DDR3L stick will be sufficient. Optimize Samba's configuration file to maximize file transfer efficiency, and consider using a high-capacity drive like the HGST Ultrastar 7K8000.

### Filesystem Optimization

When formatting the 8TB HGST drive, consider using a filesystem like ext4, XFS, or BTRFS/ZFS. Optimize the mount options to improve write performance for backup images. Enable asynchronous I/O and server-side copying to enhance file transfer efficiency.

By following these guidelines and considering the specific requirements of the ASRock J3455-ITX/B motherboard, you can ensure a stable and efficient system configuration for your needs. Whether you're building a gateway, storage server, or directory server, optimizing your setup will help you get the most out of your hardware.

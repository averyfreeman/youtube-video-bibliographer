---
Title: "how to install zerotier on leap micro 6.2 with podman"
Date: "2026-06-01_19_55"
Tags:
  - DevOps and Cloud
Category: "DevOps and Cloud"
Source_Products:
  - AI_Mode
  - Search
---
### Deploying ZeroTier with Podman on openSUSE Leap Micro
openSUSE Leap Micro is an immutable operating system, which means its root partition is read-only. However, the `/var` directory is mounted as a writable, persistent subvolume, allowing for container state, application configurations, and data to survive reboots and transactional OS upgrades.

#### Validating the `/var/lib/zerotier-one` Path
The `/var/lib/zerotier-one` path is a valid and standard location for storing ZeroTier configuration and data. This directory is excluded from the system's Btrfs snapshots, ensuring that containerized applications can maintain their state across system updates and reboots.

#### Understanding the `:Z` Flag
The `:Z` flag is required when running Podman on systems that use SELinux, such as openSUSE Leap Micro. This flag automatically configures the correct SELinux context for the directory, allowing the containerized ZeroTier process to read and write to the host's directory without being blocked by security policies.

### Fixing the "Access Denied" Manifest Error
The "Access Denied" error typically occurs when the image name is incorrect or when trying to fetch a non-existent tag. The official ZeroTier container image on Docker Hub is named `zerotier/zerotier-one`, and it does not publish a `latest` tag. To resolve this issue, specify an exact, valid version tag, such as `1.14.0`, when running the deployment command.

#### The Solution
Use the following command to deploy ZeroTier with a valid version tag:
```bash
sudo podman run -d \
  --name zerotier \
  --restart always \
  --network host \
  --device /dev/net/tun \
  --cap-add NET_ADMIN \
  --cap-add SYS_ADMIN \
  -v /var/lib/zerotier-one:/var/lib/zerotier-one:Z \
  docker.io/zerotier/zerotier-one:1.14.0
```
To find available version tags, use the following command:
```bash
podman search docker.io/zerotier/zerotier-one --list-tags
```

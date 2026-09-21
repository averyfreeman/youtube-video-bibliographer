---
Title: "getting this issue when trying to install microk8s on \"Ubuntu Core 24\": ```bash sudo snap install --channel 1.35-strict/edge microk8s error: cannot perform the following tasks: - Setup snap \"microk8s\" (8896) security profiles for auto-connections (cannot setup profiles for snap \"microk8s\": cannot load apparmor profiles: exit status 1 apparmor_parser output: Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. Multiple definitions for hat systemd_run in profile (null) exist,bailing out. ) ```"
Date: "2026-05-10_00_34"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
# Installing MicroK8s on Ubuntu Core 24: Challenges and Alternatives
When attempting to install MicroK8s on Ubuntu Core 24 using the command `sudo snap install --channel 1.35-strict/edge microk8s`, you may encounter an error message indicating that the installation cannot proceed due to issues with setting up AppArmor profiles. The error message specifically mentions "Multiple definitions for hat systemd_run in profile (null) exist," which suggests a conflict with the AppArmor configuration.

## Understanding Ubuntu Core's Security Model
Ubuntu Core is designed with security and stability in mind, particularly for IoT and embedded devices. It features a read-only root filesystem, transactional updates, and strict confinement using AppArmor and Seccomp for all applications. This approach treats the OS more like firmware than a flexible workstation, which can make it feel restrictive for certain use cases.

## Restrictions in Ubuntu Core
The strict confinement model in Ubuntu Core means that snaps cannot access the host system or other snaps without explicit interface connections. This is why MicroK8s, which requires deep system access, struggles to install on Ubuntu Core. Additionally, Ubuntu Core does not support `apt` for package management, and the immutable core prevents manual edits to most configuration files in `/etc` or `/usr`.

## Finding a Less Restrictive Alternative
For x86_64 hardware, if you're looking for the power of Ubuntu without the restrictions of Core, consider using Ubuntu Server instead. Ubuntu Server 24.04 LTS offers a standard, flexible version of the operating system that supports "Classic" snaps, has a writable filesystem, and includes `apt` for package management. You can download Ubuntu Server 24.04 LTS (x86_64) from [https://ubuntu.com/download/server](https://ubuntu.com/download/server).

## Staying with Ubuntu Core
If you must continue using Ubuntu Core, getting MicroK8s working will likely require building a custom Ubuntu Core image. This image would need to include specific kernel modules or gadget snap configurations to allow the level of nesting required by Kubernetes. Given that your cgroups output shows memory is enabled, this is a good starting point. However, customizing the image to meet MicroK8s' requirements can be complex.

## Migrating to Ubuntu Server
If you decide to migrate to Ubuntu Server for more flexibility, you may need to transfer your Netplan configuration. Assistance with this process can be provided to ensure a smooth transition of your network settings to the new Ubuntu Server installation.

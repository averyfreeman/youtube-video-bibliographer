---
Title: "are any opensuse aarch64 images compatible with ampere A1?"
Date: "2026-06-02_19_37"
Tags:
  - DevOps and Cloud
Category: "DevOps and Cloud"
Source_Products:
  - AI_Mode
  - Search
---
# openSUSE AArch64 Images on Ampere A1
openSUSE AArch64 images are compatible with the Ampere A1, specifically the Ampere Altra processors used in Oracle Cloud. The Ampere A1 features a standard UEFI boot environment, which natively supports generic AArch64 builds of openSUSE.

## Utilizing openSUSE EFI/Cloud Images
To use openSUSE EFI/Cloud images, follow these paths:

* openSUSE Tumbleweed: The openSUSE Tumbleweed ARM Port provides UEFI-compatible generic images, available in the openSUSE Tumbleweed Appliances Directory.
* openSUSE Leap: For a fixed-release enterprise-grade environment, use generic EFI images located in the openSUSE Leap Appliances Directory.

## Deploying on Oracle Cloud Infrastructure (OCI)
To deploy on OCI:

1. Download the image: Select and download the raw or qcow2 AArch64 JeOS (Just enough OS) or generic image from the openSUSE mirrors.
2. Import as Custom Image: In the OCI Console, navigate to Compute > Custom Images and click Import Image.
3. Configure Settings: Choose the image file from your Object Storage bucket, set the operating system to Linux, and ensure the launch mode is set to Native Mode (UEFI Boot).
4. Deploy: Once the custom image is active, create a new Compute instance using the VM.Standard.A1.Flex shape and select your newly imported openSUSE image as the source.

## Compatibility with OCI ISCSI Boot Volume
The standard generic openSUSE aarch64 appliance images will not work directly with Oracle Cloud Infrastructure (OCI) iSCSI boot volumes out of the box.

### Technical Limitation
Generic openSUSE cloud and appliance images are built assuming standard paravirtualized or direct local disks. OCI's iSCSI boot volume infrastructure requires:

* iSCSI Initiator Modules: The kernel must load the network storage drivers (ib_iser, iscsi_tcp) inside the initial RAM disk (initrd).
* Early Networking: The OS must establish network connectivity via DHCP before the root filesystem mounts so it can reach the iSCSI targets (169.254.0.2:3260).

### Making openSUSE Work with OCI iSCSI
To get an openSUSE image to successfully boot over iSCSI on the Ampere A1 infrastructure:

1. Modify the image using dracut to inject the necessary network and iSCSI modules into the initrd:
   * Add Dracut Modules: Create or edit a configuration file inside `/etc/dracut.conf.d/` (e.g., `oci-iscsi.conf`) and include the network and iSCSI modules.
   * Regenerate the Initramfs: Run `dracut --force` to rebuild the boot images with the new parameters.
2. Configure the Network Daemon: Ensure wicked or NetworkManager is configured to not tear down the primary network interface during the late boot phase, as dropping the network connection will instantly crash the iSCSI root volume connection.

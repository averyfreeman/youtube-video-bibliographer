---
Title: "does disabling sata controller ln bios of dell 7390 laptop disable pcie m2?"
Date: "2026-06-24_12_30"
Tags:
  - Hardware and Devices
Category: "Hardware and Devices"
Source_Products:
  - AI_Mode
  - Search
---
Disabling the SATA Controller on a Dell Latitude 7390: Understanding the Impact on PCIe M.2 SSDs
=====================================================================================================

As a user of the Dell Latitude 7390 laptop, you may be wondering what happens when you disable the SATA controller in the BIOS. Specifically, will this action affect the functionality of your PCIe M.2 SSD? The answer lies in understanding how the SATA controller and PCIe bus operate independently of each other.

### Independent Storage Interfaces

In the Dell Latitude 7390's BIOS, the SATA controller and PCIe NVMe interface are controlled by separate settings:

* **SATA Operation**: This setting controls the SATA bus and only affects standard 2.5-inch SATA drives and SATA-based M.2 drives. Disabling this setting will not impact the functionality of your PCIe M.2 drive.
* **Drives (M.2 PCIe SSD)**: This setting controls the PCIe NVMe interface and must be enabled for your PCIe M.2 drive to operate normally.

### Troubleshooting and Configuration

If you're experiencing issues with your system, it's essential to identify the specific problem you're trying to solve. Consider the following:

* What type of M.2 drive do you have: NVMe/PCIe or SATA?
* What are your goals for adjusting the BIOS settings?

To adjust the settings correctly, you need to understand the architecture of the motherboard and how the BIOS handles storage paths.

### Distinct Hardware Paths

The motherboard has two distinct hardware paths:

1. **The SATA Controller Path**: This controls legacy SATA protocols and only affects SATA-based M.2 drives.
2. **The PCIe Bus Path**: This handles NVMe protocols and is used by PCIe NVMe M.2 drives, allowing them to bypass the SATA controller.

According to the Dell Latitude 7390 Owner's Manual, the BIOS maps these controls to two independent options under System Configuration:

* **SATA Operation**: Disabling this turns off the chip that communicates via the SATA protocol.
* **Drives**: This menu includes checkboxes for individual interfaces, including M.2 PCIe SSD-0. Unchecking this box shuts off the PCIe lanes to your M.2 slot.

### Switching Storage Modes

If you need to switch the storage mode from RAID On to AHCI (or Disabled) while keeping your current operating system, exercise caution. Dell routes storage through the Intel Rapid Storage Technology (IRST) controller by default (RAID On). Changing this controller without preparation can cause Windows to lose its storage driver mapping, resulting in a BSOD (Blue Screen of Death) INACCESSIBLE_BOOT_DEVICE error on the next boot.

To switch storage modes safely, you can use the Safe Mode command prompt steps to change the controller without breaking your Windows installation.

### Technical Reality

On the Latitude 7390, disabling the SATA Operation might disable your M.2 NVMe drive, depending on how the BIOS routes the storage paths. To avoid issues, it's recommended to set the SATA Operation to AHCI instead of Disabled, especially if you're trying to stop using the Intel RST/RAID driver for Linux compatibility or native NVMe drivers.

### Replacing the CMOS Battery

The Latitude 7390 has a standard CR2032 CMOS coin-cell battery, but it's located on the underside of the motherboard, making it difficult to access. To replace it, you'll need to:

1. Loosen the 8 captive screws on the bottom cover.
2. Pry off the cover, starting near the hinges.
3. Locate the battery cable (multicolored wires) connecting the battery to the motherboard.
4. Pull the connector straight out by the plastic tab (do not pull the wires) to cut power before touching anything else.

Note that the Latitude 7390 does not have a "Disable Battery for Service" or "Service Mode" switch in the BIOS, so you must physically disconnect the battery to replace it.

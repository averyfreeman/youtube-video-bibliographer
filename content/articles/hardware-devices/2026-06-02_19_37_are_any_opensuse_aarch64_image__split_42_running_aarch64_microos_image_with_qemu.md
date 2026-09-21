---
Title: "Running AArch64 MicroOS Image with QEMU"
Date: "2026-07-04_15_48"
Tags:
  - Hardware and Devices
Split_From_Line: 42
Category: "Hardware and Devices"
---
## Running AArch64 MicroOS Image with QEMU
To boot an AArch64 MicroOS image using `qemu-system-aarch64` connected to a libvirt bridge with VGA and serial output:

1. Preparation: Install UEFI Firmware
   * AArch64 virtual machines require UEFI firmware to boot standard qcow2 cloud images.
2. QEMU Command:
   ```bash
qemu-system-aarch64 \
  -cpu max \
  -smp 4 \
  -m 4G \
  -M virt,highmem=on \
  -drive if=pflash,format=raw,readonly=on,file=./AAVMF_CODE.fd \
  -drive if=pflash,format=raw,file=./AAVMF_VARS.fd \
  -device virtio-blk-pci,drive=hd0 \
  -drive if=none,id=hd0,file=./microos-arm64_test.qcow2,format=qcow2 \
  -device virtio-net-pci,netdev=net0 \
  -netdev bridge,id=net0,br=virbr0 \
  -device virtio-gpu-pci \
  -device virtio-keyboard-pci \
  -device virtio-tablet-pci \
  -serial mon:stdio \
  -display gtk
   ```
   This command sets up a virtual machine with the specified CPU, memory, and UEFI firmware, and connects it to a libvirt bridge for networking.

## System Core Configuration
The QEMU command includes the following system core configurations:
* `-cpu max`: Emulates the highest capability AArch64 core features supported by the host.
* `-smp 4 -m 4G`: Allocates 4 CPU cores and 4GB of RAM.
* `-M virt,highmem=on`: Selects the generic AArch64 "Virtual Machine" board platform.

## Storage and UEFI Firmware
The command includes the following storage and UEFI firmware configurations:
* `-drive if=pflash...`: Loads the two separate flash drives required for UEFI.
* `-device virtio-blk-pci...`: Binds the qcow2 file to a high-performance VirtIO PCI block controller.

## Networking via libvirt NAT Bridge
The command includes the following networking configuration:
* `-netdev bridge,id=net0,br=virbr0`: Spawns a persistent kernel TAP interface on the host, attaches it directly to the libvirt bridge, and bypasses automated initialization scripts.
* `-device virtio-net-pci...`: Exposes a standard virtualized PCI network card to the guest OS.

## Display, Inputs, and Serial Fallback
The command includes the following display, inputs, and serial fallback configurations:
* `-device virtio-gpu-pci`: Presents a virtualized graphical processing unit to give a functioning VGA screen buffer.
* `-device virtio-keyboard-pci` and `-device virtio-tablet-pci`: Map mouse and keyboard event buses directly over PCI.
* `-serial mon:stdio`: Multiplexes the primary system console output and the QEMU monitor directly onto the terminal.

## GRUB Configuration for Serial Console
To ensure the GRUB boot menu is fully visible and interactive over both the OCI Serial Console and a graphical display:
* Modify the `/etc/default/grub` file to include `GRUB_TERMINAL="serial console"` and `GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"`.

## Configuring Wheel Group and Sudo
By default, openSUSE generic and cloud images do not use the wheel or sudo groups. To configure the wheel group:
* Method 1: Use Cloud-Init to define the wheel group and assign it to a default user.
* Method 2: Manually inject the wheel workflow into the base OS.
* Method 3: Install the `system-group-wheel` meta-package.

## Dracut Modules and Kernel Drivers
To ensure the initrd contains the necessary network and iSCSI drivers:
* Include the `network`, `network-manager`, and `iscsi` dracut modules.
* Force-load the `iscsi_tcp`, `libiscsi`, `libiscsi_tcp`, and `scsi_transport_iscsi` kernel drivers.

## Persistent Policy Configuration
The `persistent_policy="by-uuid"` configuration is excellent for OCI, as it ensures the machine boots correctly even if the block device names change.

## Using `rd.break` for Debugging
The `rd.break` flag can be used dynamically to pause the boot cycle and debug issues. However, it should not be hardcoded into the dracut configuration file.

## Final Compilation and Deployment
Once the dracut modules, storage drivers, network backends, and GRUB serial layouts are fully locked in, compile the image using `sudo transactional-update run dracut --force --regenerate-all`. The resulting `microos-arm64_test.qcow2` file is ready for deployment on OCI.

# 5. Exit and reboot to apply the snapshot changes cleanly
To ensure a clean application of the snapshot changes, exit the current session and reboot the system using the following commands:
```bash
exit
sudo reboot
```
Once the system boots back up, dracut will locate the open-iscsi binaries, embed them alongside the network modules, and build an image prepared for OCI NATIVE mode storage.

## Overcoming Shape Compatibility Restrictions
When uploading a custom image to OCI, you may encounter shape compatibility restrictions. These restrictions are not due to a failure of the OS image, but rather an artificial gatekeeper restriction enforced by OCI's API. By default, when you upload a raw.qcow2 image from an external source, OCI assigns a cautious default metadata schema that assumes the image lacks the virtualization drivers to operate safely in NATIVE mode or on Arm architectures.

To bypass these restrictions and unlock NATIVE mode for your custom image, you can override its default properties using the OCI Console. This tells the hypervisor orchestrator that your image is fully compatible with Arm architectures and iSCSI transport arrays.

### Part 1: Overriding OCI's Shape & Native Restrictions
To override the default properties, follow these steps:

1. **Navigate to Custom Images**: Go to the OCI Console, navigate to Compute > Custom Images, and select your uploaded openSUSE image.
2. **Edit Image Capabilities**: Inside the image details page, locate and click on Edit Image Capabilities.
3. **Configure the Firmware & Launch Schemas**: Update the settings as follows:
	* **Boot Volume Type**: Change from Paravirtualized to Native or Both.
	* **Firmware**: Explicitly select UEFI_64 (Uncheck BIOS).
	* **Launch Mode**: Select NATIVE.
	* **Network Type**: Select VFIO or Native (This ensures SR-IOV performance on the Ampere Altra NICs).
4. **Define Shape Compatibility**: In the separate Supported Shapes section on the same image screen, click Add Compatible Shapes. Expand the list, navigate to the Ampere category, and explicitly check VM.Standard.A1.Flex.

## Understanding the.oci File Extension
The.oci file extension plays a specific role in Custom Image deployments. An.oci file is an uncompressed TAR archive package formatted specifically for Oracle's Object Storage import engine. It wraps your image file with a predefined metadata manifest, allowing you to skip manual web console steps and embed configuration directly into the archive.

### Inside a.oci File Package
A.oci file package contains:

* `image.qcow2` (or `image.raw`): The actual operating system disk file.
* `manifest.json`: A tiny descriptor file that tells the OCI importer exactly what capabilities to apply to the image on arrival.

### Building an.oci Package Manually
While it is possible to construct an.oci file from your current QEMU build folder, this approach is undocumented, risky, and not recommended. Instead, you can achieve the same result by creating a JSON configuration file for the OCI CLI.

## Using the OCI CLI to Import and Configure the Image
To import and configure your image using the OCI CLI, follow these steps:

1. **Upload Your Image**: Upload your microos-arm64_test.qcow2 to your OCI Object Storage bucket as a standard file.
2. **Create the Manifest (Import Configuration)**: Create a file named image_import.json on your computer, specifying the launch mode and other configurations.
3. **Run the Import Command**: Use the OCI CLI to import the image, specifying the launch mode and other configurations.

However, due to the structural constraints in Oracle's backend, importing a third-party QCOW2 image directly into NATIVE mode is not possible. Instead, use the "Import as PV, then Mutate" strategy:

### The "Import as PV, then Mutate" Strategy
1. **Fire a Clean, Simple CLI Import**: Import the.qcow2 file without passing any complex JSON configurations or launch flags.
2. **The UI Capability Override**: Once the import state switches to AVAILABLE, override the hardware definitions via the Console UI.
3. **Launching the Instance**: Launch the instance using the updated image and VM.Standard.A1.Flex shape.

By following these steps, you can successfully import and configure your custom image, overcoming shape compatibility restrictions and achieving native SR-IOV network interfaces and iSCSI boot volumes.

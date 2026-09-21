---
Title: "oracle oci ampere A1 os images list"
Date: "2026-05-31_20_02"
Tags:
  - DevOps and Cloud
Category: "DevOps and Cloud"
Source_Products:
  - AI_Mode
  - Search
---
# Oracle Cloud Infrastructure (OCI) Ampere A1 OS Images
OCI Ampere A1 (and A2) shapes support native ARM architecture (`aarch64`). The officially supported platform images for Ampere shapes include [Canonical Ubuntu](https://ubuntu.com/blog/tag/oracle) and various [Oracle Linux distributions](https://www.oracle.com/cloud/compute/os/).

## Officially Supported Platform Images
The following are the officially supported platform images for Ampere shapes:
* **Oracle Linux Cloud Developer** (Highly recommended for development: pre-installed with Java, Node.js, Python, PHP, GCC, and OCI SDKs)
* **Oracle Linux** (Standard/Gen2)
* **Ubuntu** (e.g., 24.04, 22.04, 20.04 LTS)
* **AlmaLinux** (e.g., AlmaLinux 9, supported directly on OCI)

## How to Find & List OS Images
To find and list OS images, ensure any image you select contains `aarch64` in its name. You can do this using the OCI Web Console or the OCI CLI.

### Using the OCI Web Console
1. Navigate to the **Compute** section and click **Instances**.
2. Click **Create Instance**.
3. Under **Image and shape**, click **Edit**.
4. Click **Change image**.
5. Filter by the specific OS (e.g., Oracle Linux or Ubuntu) and verify the image is labeled for **AARCH64** platform architecture.

### Using the OCI CLI
You can list available images in your compartment using the OCI CLI. Filter the results specifically for the `aarch64` architecture by running the following command:
```bash
oci compute image list \
  --compartment-id <your-compartment-ocid> \
  --shape VM.Standard.A1.Flex \
  --operating-system "Oracle Linux"
```
Replace `Oracle Linux` with `Canonical Ubuntu` to list Ubuntu platform images instead.

For further details on deploying instances, see the [Oracle Arm Compute Documentation](https://docs.oracle.com/en-us/iaas/Content/Compute/References/arm.htm).

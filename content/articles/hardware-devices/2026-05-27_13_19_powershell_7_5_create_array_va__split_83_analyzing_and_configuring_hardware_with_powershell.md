---
Title: "Analyzing and Configuring Hardware with PowerShell"
Date: "2026-07-04_14_26"
Tags:
  - Hardware and Devices
Split_From_Line: 83
Category: "Hardware and Devices"
---
### Analyzing Hardware Configuration Files

When analyzing configuration files for hardware like the Nvidia/Mellanox Quantum-4 (NVLink 6 Switch) ASIC, you can extract vital architectural details. For instance, to scan all files in a directory and print out a clean list of every ASIC name and its port count, you can use a one-liner pipeline combined with `yq`'s object queries:

```powershell
Get-ChildItem -Path "C:\Program Files\Mellanox\WinMFT\Device_info\json\" -Filter "*.json" -File | ForEach-Object {
    yq -P '.[] | [.general_info.device_external_name,.general_info.ports_num] | join(": ")' $_.FullName
}
```
### Modifying Driver Parameters via CLI

To modify driver parameters for network cards like the Mellanox ConnectX-4 LX, you can use PowerShell cmdlets. For example, to turn on RDMA (Network Direct), enable Jumbo Packets, or maximize RSS queues, use the following commands:

```powershell
Set-NetAdapterAdvancedProperty -Name "*Mellanox*" -DisplayName "Network Direct (RDMA)" -DisplayValue "Enabled"
Set-NetAdapterAdvancedProperty -Name "*Mellanox*" -DisplayName "Jumbo Packet" -DisplayValue "9014"
Set-NetAdapterAdvancedProperty -Name "*Mellanox*" -DisplayName "Maximum Number of RSS Processors" -DisplayValue "16"
```
Note that running these `Set-` commands will briefly reset the network interface.

### Enabling 25Gbps RDMA Capability

To enable 25Gbps RDMA on your ConnectX-4 LX card, follow these steps:

1. Identify your card's PCI device ID using `mst status`.
2. Verify the current link configuration and speed properties using `mlxconfig`.
3. Set the physical port to Ethernet mode and enable RoCE using `mlxconfig`.
4. Configure the physical link speed to 25Gbps using `mlxconfig`.
5. Reboot the system using `Restart-Computer`.
6. Unlock RDMA in the Windows driver using `Set-NetAdapterAdvancedProperty`.
7. Verify the 25Gbps RDMA capability using `Get-NetAdapterRdma`.

By following these steps and commands, you can effectively work with object arrays, analyze hardware configuration files, modify driver parameters, and enable 25Gbps RDMA capability on your Mellanox ConnectX-4 LX card.

---
Title: "what would registry key to forward IP traffic: \"HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\" - value be if dword32 were decimal?"
Date: "2026-03-22_02_22"
Tags:
  - Hardware and Devices
Category: "Hardware and Devices"
Source_Products:
  - AI_Mode
  - Search
---
# Bridging ZeroTier Traffic with a Windows 11 Machine
To bridge ZeroTier traffic from one network to another, such as from `192.168.0.0/24` to `192.168.1.0/24`, using a Windows 11 machine, you need to configure IP Forwarding and set up Managed Routes in ZeroTier.

## Enabling IP Forwarding
The first step is to enable IP forwarding on your Windows 11 machine. This is done by modifying the registry value **IPEnableRouter** under the key **HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters**. Set the **IPEnableRouter** (DWORD) value to:

* **1** (Decimal) to enable IP forwarding.
* **0** (Decimal) to disable IP forwarding (default).

To verify IP forwarding, open PowerShell as Administrator and run:
```powershell
Get-NetIPInterface | Select-Object InterfaceAlias, AddressFamily, Forwarding
```
Ensure "Forwarding" is set to Enabled for both your LAN and ZeroTier adapters.

After modifying the registry, restart your computer to apply the changes.

## Configuring ZeroTier Central (Managed Routes)
To configure Managed Routes in ZeroTier:

1. Log in to [https://my.zerotier.com/](https://my.zerotier.com/).
2. Go to Settings > Advanced > Managed Routes.
3. Add a new route:
	* Destination: `192.168.1.0/24` (Your LAN)
	* Via: `[Windows_PC_ZeroTier_IP]` (e.g., `192.168.0.5`)
4. In the Members section, click the wrench icon next to your Windows PC and check Allow Bridging.

## Fixing the Return Path on Your LAN
A common issue is that your LAN devices won't know how to reply to the ZeroTier network. You have two options:

### Option A: Add a Static Route to Your Physical Router
Add a static route to your physical router (the one at `192.168.1.1`):
* Network: `192.168.0.0/24`
* Gateway/Next Hop: `[Windows_PC_LAN_IP]` (e.g., `192.168.1.10`)

### Option B: Add a Static Route on Each LAN Device
On each specific LAN device you need to access, add a static route via command line.

## Windows Firewall Adjustment
Windows often blocks incoming traffic from a different subnet by default. To allow traffic from the `192.168.0.0/24` range:

1. Ensure the Windows Firewall on your bridging machine is set to allow traffic from the ZeroTier subnet.
2. You may need to create a custom "Inbound Rule" for all ports/protocols where the Remote IP is your ZeroTier subnet.

## Verifying Windows Firewall Configuration
To confirm if Windows Firewall is allowing traffic from your ZeroTier subnet (`192.168.0.0/24`) via PowerShell:

1. Check for rules targeting the subnet:
```powershell
Get-NetFirewallRule -Direction Inbound -Enabled True | 
  Get-NetFirewallAddressFilter | 
  Where-Object { $_.RemoteAddress -eq "192.168.0.0/24" } | 
  Select-Object -ExpandProperty ParentCustomConfigname | 
  Get-NetFirewallRule | 
  Select-Object DisplayName, Action, Profile
```
If this returns nothing, no rule specifically targets that subnet.

2. Verify ICMP (Ping) specifically:
```powershell
Get-NetFirewallRule -DisplayName "*ICMP Echo Request*" | 
  Select-Object DisplayName, Enabled, Profile, Action
```
Ensure the Action says Allow and the Profile matches your ZeroTier adapter's classification.

3. Create a quick "Bridge Fix" rule if needed:
```powershell
New-NetFirewallRule -DisplayName "Allow ZeroTier Bridge Subnet" -Direction Inbound -LocalAddress Any -RemoteAddress 192.168.0.0/24 -Action Allow -Description "Allows all inbound traffic from ZeroTier subnet for bridging."
```
Additionally, check and change the network profile of your ZeroTier adapter to Private if needed:
```powershell
Get-NetConnectionProfile -InterfaceAlias "ZeroTier*"
Set-NetConnectionProfile -InterfaceAlias "ZeroTier*" -NetworkCategory Private

---
Title: "unifi controller 7.2.97 - is \"wireless uplink\" in legacy interface called \"wireless meshing\" in the new one?"
Date: "2026-04-16_01_07"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
# Understanding Wireless Uplink and Wireless Meshing in UniFi Controller 7.2.97

In UniFi Network version 7.2.97, the terminology and settings for wireless connections between Access Points (APs) have undergone changes. Specifically, "Wireless Uplink" in the legacy interface has been renamed to "Wireless Meshing" in the new interface. This article will guide you through the new settings and help clarify the differences between the legacy and new interfaces.

## Global Setting (New Interface)

To enable or disable the ability for your entire network to use wireless connections between APs, navigate to `Settings > WiFi > Wireless Meshing`. Ensure the toggle is ON if you want APs to be able to connect to each other wirelessly.

## Individual AP Settings (New Interface)

You can also control meshing behavior for specific devices:

* Go to `UniFi Devices` and select your Access Point.
* In the side panel, go to `Settings > Meshing`.
* `Mesh Connect (Downlink)`: Allows this AP to connect to another AP wirelessly (this replaces the old "Wireless Uplink" setting for the specific device).
* `Mesh Parent (Uplink)`: Allows other wireless APs to connect to this AP.

## Key Differences to Keep in Mind

* **Renaming**: The term "Mesh" now refers to the software feature of wirelessly connecting any modern UniFi AP to another, not just specific "Mesh" hardware models.
* **Uplink Connectivity Monitor**: In older versions, this was a critical global setting under `Settings > Site`. In newer versions, it is largely integrated into the Wireless Meshing toggle.
* **Performance**: Every hop in a wireless mesh/uplink reduces the available bandwidth for connected clients by approximately 50%.

## Understanding Setting Discrepancies Between Legacy and New Interfaces

If you've noticed that "Wireless Uplink" was enabled when you reverted to the legacy interface, but "Wireless Meshing" is disabled in the new interface, there are several reasons for this discrepancy:

1. **The Global vs. Site Split**:
	* New Interface: "Wireless Meshing" is a single global toggle (found in `Settings > WiFi` or `Settings > System > Advanced`). If this is OFF, it disables the capability for the entire site, regardless of individual AP settings.
	* Legacy Interface: The setting was often tied to the "Uplink Connectivity Monitor" (under `Settings > Site`). Because the legacy interface lacks the specific logic of the "New Interface" global mesh toggle, it may still show "Wireless Uplink" as enabled if the connectivity monitor was active, even if the new interface's global mesh switch was toggled off.
2. **SSID Count Limits**: Enabling Wireless Meshing automatically limits your APs to 4 SSIDs (down from 8). If you have more than 4 SSIDs configured, the new interface will often force the "Wireless Meshing" toggle to OFF to prevent a configuration error.
3. **Individual AP Overrides**: It is possible for "Wireless Meshing" to be disabled globally but still active on a specific device if that device was manually configured before the global switch was flipped. Check the AP directly in the new interface by going to `UniFi Devices > [Select AP] > Settings > Meshing`. If "Manual" is selected, the device might follow its own rules rather than the global toggle.

## Summary of Key Features

The following table summarizes the key features and differences between the legacy and new interfaces:

| Feature | Legacy Interface | New Interface (7.2.97) |
| --- | --- | --- |
| **Name** | Wireless Uplink / Connectivity Monitor | Wireless Meshing |
| **Location** | Settings > Site | Settings > WiFi (Global) |
| **Requirement** | Connectivity Monitor must be ON | Global Meshing must be ON |
| **SSID Limit** | Often ignored in UI | Strictly limited to 4 SSIDs |

By understanding these changes and differences, you can effectively manage your wireless network using the UniFi Controller 7.2.97. Remember to check your SSID count and individual AP settings to ensure seamless wireless meshing across your network.

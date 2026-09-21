---
Title: "make sure windows computers never go to sleep registry"
Date: "2026-03-19_21_19"
Tags:
  - Hardware and Devices
Category: "Hardware and Devices"
Source_Products:
  - AI_Mode
  - Search
---
# Ensuring Windows Computers Never Go to Sleep Using the Registry
To prevent a Windows computer from going to sleep using the Registry, it's necessary to modify a hidden "unattended sleep" setting that can override standard power options.

## Unhiding "System Unattended Sleep Timeout"
Windows has a hidden timeout that puts the PC to sleep after 2 minutes if it wakes up without user interaction, such as after a Windows Update. To change this:

1. Press `Win + R`, type `regedit`, and hit Enter to open the Registry Editor.
2. Navigate to `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\238C9FA8-0AAD-41ED-83F4-97BE242C8F20\7bc4a2f9-d8fc-4469-b07b-33eb785aaca0`.
3. On the right, double-click `Attributes` and change its value from `1` to `2`.
4. Open the Control Panel, go to `Hardware and Sound` > `Power Options` > `Change plan settings` > `Change advanced power settings`.
5. Expand `Sleep` > `System unattended sleep timeout` and set it to `0`, which means "Never".

## Disabling Hibernation
Hibernation can sometimes cause the system to power down even if sleep is disabled. To disable hibernation:

1. In the Registry Editor, go to `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Power`.
2. Find `HibernateEnabled`, double-click it, and change the value to `0`.

## Quick Alternative: Command Prompt
For a faster method that achieves the same result without manually editing the registry, run the following commands in an Administrator Command Prompt:
```markdown
Disable AC (Plugged in) Sleep: powercfg -change -standby-timeout-ac 0
Disable DC (On Battery) Sleep: powercfg -change -standby-timeout-dc 0
Turn off Hibernation: powercfg -h off
```

## Registry Key Summary
The following table summarizes the registry keys and values needed to prevent a Windows computer from going to sleep:

| Setting | Registry Path | Value Name | Target Value |
| --- | --- | --- | --- |
| **Unhide Unattended Timeout** | `...\Control\Power\PowerSettings\...\7bc4a2f9...` | `Attributes` | `2` |
| **Disable Hibernation** | `...\Control\Power` | `HibernateEnabled` | `0` |
| **Away Mode (Optional)** | `...\Control\Session Manager\Power` | `AwayModeEnabled` | `0` |

For those interested in applying these settings to multiple computers at once, it is possible to use Group Policy. However, this topic is not covered in this guide.

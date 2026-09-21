---
Title: "windows 11 Enterprise LTSC IoT registry prevent onedrive from offering to backup files"
Date: "2026-04-11_18_22"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
Preventing OneDrive from Offering to Back Up Files on Windows 11 Enterprise LTSC IoT
================================================================================

To prevent OneDrive from prompting users to back up files or sync known folders on Windows 11 Enterprise LTSC IoT, specific registry keys can be applied. The approach depends on whether you want to block backup prompts specifically or completely disable OneDrive integration on an embedded/IoT device.

### Option 1: Block OneDrive Folder Backup Prompts (KFM Opt-in)

To stop OneDrive from asking users to protect or back up their desktop and documents folders, you can disable the "Manage Backup" prompts. Open an elevated Command Prompt by pressing `Win + R`, typing `cmd`, and pressing `Ctrl + Shift + Enter`. Then, run the following command:

```bash
reg add HKLM\SOFTWARE\Policies\Microsoft\OneDrive /v KFMBlockOptIn /t REG_DWORD /d 1 /f
```
### Option 2: Remove the "Start Backup" Banner in File Explorer

If you are seeing the persistent "Start back up" prompt or button inside File Explorer's address bar or menu, you can remove it by deleting its class factory key. Because Windows automatically recreates this key upon reboot, you must deny the system permission to write to it:

1. Open the Registry Editor by pressing `Win + R`, typing `regedit`, and hitting Enter.
2. Navigate to the following path:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\StorageProvider\OneDrive
   ```
3. Locate the string or key named "StorageProviderKnownFolderSyncInfoSourceFactory" and delete it.
4. To prevent it from coming back:
   * Right-click the parent "OneDrive" key folder in the left pane and select Permissions.
   * Click Advanced.
   * Click Add to create a new permission entry.
   * Click "Select a principal", type Everyone, and set the Type to Deny.
   * Click Show advanced permissions and check the box for Set Value.
   * Click OK and Apply.

### Option 3: Disable All OneDrive Desktop Notifications

To prevent all popups and toast prompts initiated by the OneDrive client:

1. Open the Registry Editor (`regedit`).
2. Navigate to:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\Microsoft.SkyDrive.Desktop
   ```
3. If the key does not exist, right-click Settings, choose New > Key, and name it Microsoft.SkyDrive.Desktop.
4. Inside that key, right-click an empty space in the right pane, select New > DWORD (32-bit) Value, and name it Enabled.
5. Ensure its value is set to 0.

### Option 4: Completely Disable OneDrive (Recommended for Dedicated IoT Devices)

Because Windows 11 Enterprise LTSC IoT is often used for fixed-purpose devices (kiosks, digital signage, dedicated workstations), running OneDrive in the background is usually unnecessary and consumes resources. You can turn off the entire OneDrive infrastructure using the official group policy registry key:

1. Open an elevated Command Prompt.
2. Execute the following command to completely prevent the usage of OneDrive:
   ```bash
   reg add HKLM\SOFTWARE\Policies\Microsoft\Windows\OneDrive /v DisableFileSyncNGSC /t REG_DWORD /d 1 /f
   ```

Note: For the changes to fully take effect, restart your computer or restart the `explorer.exe` process via the Task Manager.

Understanding Registry Paths
-----------------------------

When working with the Windows Registry, it's essential to understand the difference between various paths, particularly `HKCU\Software\Microsoft\Windows\CurrentVersion` and `HKLM\CurrentControlSet\Control`.

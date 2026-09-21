---
Title: "mft_cleanup.exe Mellanox Connectx-4LX"
Date: "2026-05-27_13_12"
Tags:
  - Windows
Category: "Windows"
Source_Products:
  - AI_Mode
  - Search
---
---
Tracking the Origin of an.exe File in Windows 11
=====================================================

To determine the origin of an.exe file in Windows 11, you can use various built-in and third-party tools. This guide will walk you through several methods to track down an executable's origin using both the Command Line Interface (CLI) and Graphical User Interface (GUI).

### Method 1: The Quickest CLI Check (For WinGet & Store Apps)

If the application was installed via WinGet or the Microsoft Store, you can trace it by finding its execution alias or checking its install path.

1. Open PowerShell and type: `Get-Command <filename.exe> | Format-List Source, CommandType, Version`
2. Look for the `Source` path. If it points to `...\AppData\Local\Microsoft\WindowsApps\`, it is likely a Microsoft Store or MSIX package.

### Method 2: Check File Properties & Digital Signatures (GUI)

An executable's metadata often reveals the installer or framework used to build it.

1. Right-click the `.exe` file and select **Properties**.
2. Go to the **Details** tab.
3. Look at the **Original filename**, **Product name**, and **Copyright**.
4. Go to the **Digital Signatures** tab.
	* If the signer is `Microsoft Windows Hardware Compatibility` or a specific vendor (e.g., `Mellanox Technologies`), it points to an official driver payload or enterprise installer.

### Method 3: Reverse-Lookup via WinGet (CLI)

If you suspect WinGet managed the installation, you can query your system's WinGet manifest database.

1. Open PowerShell and list your installed applications, then filter for the application name: `winget list --query "AppName"`
2. Look for the `Id` column. An ID format like `Nvidia.MFT` or `Microsoft.PowerToys` confirms it was pulled from the WinGet repository.

### Method 4: Trace the Installation Path (GUI & CLI)

The physical directory where the `.exe` lives is one of the strongest indicators of its origin.

| File Path / Location | Likely Origin |
| --- | --- |
| `C:\Program Files\WindowsApps\...` | MSIX / Microsoft Store Package (Strictly managed) |
| `C:\Users\<User>\AppData\Local\Programs\...` | User-level installer (Often deployed via WinGet, Scoop, or an unprivileged `.exe` installer) |
| `C:\Program Files\...` or `C:\Program Files (x86)\...` | System-wide MSI or Advanced Installer script (Classic desktop apps) |
| `C:\Windows\System32\...` | Native Windows Component or injected hardware driver installer |

### Method 5: Use NirSoft AppCrashView or Uninstall Registry (Advanced CLI)

If the `.exe` is registered as an installed application, you can query the Windows registry to find out exactly what `.msi` or setup script put it there.

1. Run this PowerShell command to search the system uninstall registry for a matching location: `Get-ChildItem HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ | Get-ItemProperty | Where-Object {$_.InstallLocation -ne $null} | Select-Object DisplayName, InstallLocation`
2. Look through the output to match the folder path of your target `.exe` to the parent software package name.

Troubleshooting Device Manager Issues
--------------------------------------

If you're having trouble finding a device in Device Manager, follow these steps:
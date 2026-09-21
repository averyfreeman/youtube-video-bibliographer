---
Title: "can powershell 7.6 be installed in machine scope?"
Date: "2026-04-14_19_13"
Tags:
  - Windows
Category: "Windows"
Source_Products:
  - AI_Mode
  - Search
---
Installing PowerShell 7.6 in Machine Scope
=====================================

PowerShell 7.6 can be installed in the machine scope, making it available for every user on the system. The standard MSI installer for PowerShell 7 is designed for a machine-wide installation.

### Machine Scope Installation Methods

There are several methods to install PowerShell 7.6 in the machine scope:

#### MSI Installer (Recommended)

* Default Path: `C:\Program Files\PowerShell\7`
* Admin Rights: The installer must be run with Administrator permissions to complete a machine-scope installation.
* Download: The latest stable `PowerShell-7.6.0-win-x64.msi` can be downloaded from the official GitHub releases.

#### Winget

Winget can be used for a machine-wide install by running the following command in an elevated prompt:
```powershell
winget install --id Microsoft.PowerShell --source winget --scope machine
```
However, this method may encounter errors if the system configuration does not support the installation of the package.

#### Microsoft Update

If enabled during the MSI installation (via the `ENABLE_MU=1` parameter), PowerShell 7.6 can be kept up to date across the entire machine through standard Windows Updates.

### Scope Differences

The installation type, path, and access differ between machine scope and user scope:

| Installation Type | Installation Path | Access |
| --- | --- | --- |
| Machine Scope (MSI/Winget) | `C:\Program Files\PowerShell\` | All users |
| User Scope (ZIP/Store) | `$HOME\AppData\Local\Microsoft\PowerShell` | Current user only |

Resolving Winget Installation Errors
---------------------------------

If the Winget installation encounters an error, there are several workarounds:

1. **Force the MSI Version**: Winget can be forced to use the MSI installer by adding the `--installer-type msi` flag:
```powershell
winget install --id Microsoft.PowerShell --source winget --scope machine --installer-type msi
```
2. **Update WinGet Client**: The WinGet client can be updated by running the following command:
```powershell
Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe
```
Then, restart the terminal and try the install command again.
3. **Direct MSI Download (Most Reliable)**: The most foolproof method is to bypass Winget and run the MSI directly. This guarantees a machine-wide install in `C:\Program Files\PowerShell\7`.

Package Management Collisions
---------------------------

When installing PowerShell 7.6 using `--scope machine`, package management collisions may occur due to the differences between user-scoped and machine-scoped installations.

### Key Package Management Collisions

* **Installer Type Mismatch**: Winget may try to apply a machine scope to an MSIX (Store) package, which is restricted to user scope.
* **Duplicate "pwsh" Entries**: If a user previously installed PowerShell via the Microsoft Store and then installs it via `--scope machine`, two distinct installations of the same version may exist.
* **Module Path Fragmentation**: PowerShell 7 modules are stored in different locations based on the install scope.
* **Update Tracking Conflicts**: Winget may struggle to identify which instance to update.

### Recommendation

To avoid these collisions, uninstall any Microsoft Store or user-scoped versions of PowerShell before performing the machine-wide installation. Always specify the installer type to ensure consistency:
```powershell
winget install --id Microsoft.PowerShell --scope machine --installer-type msi
```
Coexistence with Windows PowerShell 5.1
--------------------------------------

Installing PowerShell 7.6 in the machine scope alongside Windows PowerShell 5.1 creates a side-by-side environment where both versions operate independently.

### Distinct Module Paths

PowerShell 7.6 and Windows PowerShell 5.1 use distinct directories to store modules and packages:

* PowerShell 7.6 (AllUsers): Modules are stored in `$Env:ProgramFiles\PowerShell\Modules`.
* Windows PowerShell 5.1 (AllUsers): Modules are stored in `$Env:ProgramFiles\WindowsPowerShell\Modules`.

### Tooling Differences

Install-Module and Install-Package perform different tasks. Install-Module is specific to PowerShell modules, while Install-Package can handle any NuGet-based package.

### Script: Gather Interface Indexes and Reset to Private

The following script gathers `InterfaceIndex` values for active network profiles and sets them to **Private**:
```powershell
$profiles = Get-NetConnectionProfile

foreach ($profile in $profiles) {
    if ($profile.NetworkCategory -ne 'DomainAuthenticated') {
        Set-NetConnectionProfile -InterfaceIndex $profile.InterfaceIndex -NetworkCategory Private
    }
}
```
This script can be scheduled to run at startup to prevent laptops from reverting to a Public profile.

Task Scheduler Setup
-------------------

To automate this fix on Windows 11 machines:

1. Save the script as a `.ps1` file.
2. In Task Scheduler, create a new task that runs with highest privileges.
3. Set the trigger to At startup.
4. Set the action to start a program: `powershell.exe`.
5. Add arguments: `-ExecutionPolicy Bypass -File "C:\Path\To\Your\Script.ps1"`.

---
Title: "Customizing Windows 11 File Explorer with Shortcuts and Scripts"
Date: "2026-07-04_13_10"
Tags:
  - Windows
Split_From_Line: 47
Category: "Windows"
---
### Creating a Custom Shortcut for Recent Items

To create a custom shortcut that opens the Recent Items folder directly:

1. Right-click on an empty space on your Desktop or in any folder.
2. Select New > Shortcut.
3. In the box for the location of the item, paste the exact command: `explorer.exe shell:Recent`.
4. Click Next, name the shortcut Recent Items, and click Finish.

To ensure the window consistently resembles a clean details ledger of descending dates:

1. Double-click your newly created Recent Items shortcut to open it.
2. At the top of File Explorer, click the View dropdown and select Details.
3. Click the Date modified column header so that the arrow points down (sorting by the most recent files first).
4. Click the three dots (...) in the File Explorer top ribbon and select Options.
5. Go to the View tab in the window that pops up.
6. Click the Apply to Folders button at the very top, then click Yes to confirm.

### Using AutoHotkey to Redirect Win + E

To redirect the Win + E shortcut to open the Recent Items folder instead of the Home page:

1. Create a plain text file anywhere and name it `OpenRecent.ahk`.
2. Right-click the file, select Edit, and paste the following script:
```autohotkey
#Requires AutoHotkey v2.0

; Intercept Win + E and open physical Recent Items instead of Home
#e::
{
    Run(explorer.exe shell:Recent)
}
```
3. Save the file and double-click it to run.

### Adding the Script to Startup

To add the script to the Startup folder and run it automatically on boot:

```powershell
# 1. Create the directory for the AutoHotkey script
$ScriptDir = "${USERPROFILE}\Documents\Scripts\Autohotkey"
if (!(Test-Path -Path $ScriptDir)) {
    New-Item -ItemType Directory -Path $ScriptDir -Force | Out-Null
}

# 2. Define the path for the.ahk file
$AhkFile = "${ScriptDir}\OpenRecentItems.ahk"

# 3. Create the AutoHotkey script content
$AhkContent = @"
#Requires AutoHotkey v2.0

; Intercept Win + E and open physical Recent Items instead of Home
#e::
{
    Run(explorer.exe shell:Recent)
}
"@

# 4. Echo the content into the.ahk file
Set-Content -Path $AhkFile -Value $AhkContent -Encoding utf8

# 5. Create the startup shortcut to run the script on boot
$WshShell = New-Object -ComObject WScript.Shell
$StartupPath = "${USERPROFILE}\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\OpenRecentItems.lnk"
$Shortcut = $WshShell.CreateShortcut($StartupPath)

# Point to the Chocolatey-installed AutoHotkey executable
$Shortcut.TargetPath = "${env:ChocolateyInstall}\bin\AutoHotkey.exe"
$Shortcut.Arguments = "${AhkFile}"
$Shortcut.WorkingDirectory = $ScriptDir

# 6. Apply the stock Windows File Explorer icon to the shortcut
$Shortcut.IconLocation = "explorer.exe, 0"

$Shortcut.Save()

Write-Host "Success! AutoHotkey script created and added to Startup with the Explorer icon." -ForegroundColor Green
```
By following these steps, you can customize your Windows 11 File Explorer to focus on recent items, similar to the Gnome (Nautilus) file manager.

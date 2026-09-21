---
Title: "Windows 11 Regedit Collapse \"Quick Access\" when opening explorer, but expand \"Recent\""
Date: "2026-04-11_19_51"
Tags:
  - Windows
Category: "Windows"
Source_Products:
  - AI_Mode
  - Search
---
Customizing Windows 11 File Explorer to Focus on Recent Items
===========================================================

Windows 11's File Explorer has a default layout that may not suit everyone's needs. This guide will walk you through the process of customizing File Explorer to focus on recent items, similar to the Gnome (Nautilus) file manager.

### Understanding the Limitations

Windows 11 does not have native registry keys to dictate which specific sections are expanded or collapsed by default. Instead, File Explorer remembers the manual state of your sections based on how you last left them.

### Option 1: The Native Memory Method

To achieve your desired layout without using third-party modifications, you can use the built-in memory of File Explorer:

1. Open File Explorer.
2. Click the small arrow next to Quick Access to collapse it.
3. Click the small arrow next to Recent to expand it (if it is collapsed).
4. Close File Explorer.
5. When you reopen File Explorer, it should retain the collapsed Quick Access state and the expanded Recent state.

### Option 2: Remove Quick Access Entirely (Registry Method)

If you want to remove the Quick Access section from the Home page altogether, you can use the registry:

1. Press Win + R, type regedit, and press Enter.
2. Navigate to `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer`.
3. Right-click on the Explorer key, select New > DWORD (32-bit) Value.
4. Name the new value HubMode.
5. Double-click HubMode and change the value from 0 to 1.
6. Restart your PC or restart the Windows Explorer process in Task Manager to apply the changes.

### Option 3: Clean up Quick Access

If you prefer not to use registry hacks but want to minimize the space Quick Access occupies when it does expand:

1. Open File Explorer and click the three dots (...) in the top menu.
2. Select Options.
3. Under the General tab in the Privacy section, uncheck Show frequently used folders.
4. Click Clear to wipe the history, and click Apply.

---
Title: "Understanding Windows Registry Paths"
Date: "2026-07-04_12_55"
Tags:
  - Hardware and Devices
Split_From_Line: 68
Category: "Hardware and Devices"
---
### HKCU (\Software\Microsoft\Windows\CurrentVersion)

This path stores settings specific to the currently logged-in user, including desktop environment preferences, application settings, and personalized Windows features.

*   **Scope:** User-specific, affecting only the account of the person currently logged into the machine.
*   **Permissions:** Low, allowing standard users (non-administrators) to read and write to this path.
*   **Common Uses:**
    *   Storing user-specific startup programs (`...\CurrentVersion\Run`).
    *   File Explorer display preferences and folder views.
    *   Desktop backgrounds, themes, and notification preferences.
    *   Application-specific user configurations (e.g., OneDrive or Edge browser settings for that user).

### HKLM (\System\CurrentControlSet\Control)

Note that this path is usually located under `HKLM\SYSTEM`, not directly under `HKLM`.

*   **Scope:** System-wide, dictating how the core Windows operating system functions for every user and hardware component on the machine.
*   **Permissions:** High, requiring explicit administrative privileges (Run as Administrator) to modify.
*   **Common Uses:**
    *   Boot Configuration: Instructions on how Windows starts up and loads system files.
    *   Service & Driver Management: Dictating how system drivers and background services start or behave.
    *   Session Manager: Handling environment variables, memory management, and crash dumps.
    *   Hardware & Network Control: Managing computer hostnames, network provider priorities, and connected USB/PnP device behaviors.

### Summary Comparison

| Feature | HKCU (\Software\Microsoft\Windows\CurrentVersion) | HKLM (\System\CurrentControlSet\Control) |
| :--- | :--- | :--- |
| Target | The active user profile | The core Windows OS and hardware |
| Impact | Isolated to one user | Affects all users and the machine |
| Privileges Needed | Standard User (usually) | Administrator |
| Criticality | Safe for personalization | High (Incorrect edits can cause blue screens) |
| Typical Data | App preferences, UI tweaks, user paths | Boot settings, driver behaviors, system timeout limits |

By understanding the differences between these registry paths and applying the necessary configurations, you can effectively manage OneDrive's behavior on Windows 11 Enterprise LTSC IoT devices and ensure a secure, personalized experience for your users.

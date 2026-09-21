---
Title: "where does winget install openssl-win64"
Date: "2026-04-22_23_05"
Tags:
  - Windows
Category: "Windows"
Source_Products:
  - AI_Mode
  - Search
---
## Locating the OpenSSL‑Win64 Installation When Using winget

When OpenSSL‑Win64 is installed via **winget**, the default location depends on the specific package you chose. The two most common packages are:

| Package | Typical Install Path |
|---------|----------------------|
| `ShiningLight.OpenSSL` | `C:\OpenSSL-Win64` |
| FireDaemon’s OpenSSL 3 | `C:\Program Files\FireDaemon OpenSSL 3` |

If you installed the ShiningLight package (the default when you run `winget install ShiningLight.OpenSSL`), the files are placed directly under the root of the **C:** drive:

```
C:\OpenSSL-Win64
```

### Typical Folder Layout

```
C:\OpenSSL-Win64
│   └─ bin
│       ├─ openssl.exe
│       └─ openssl.cfg
```

* **Executables** – `openssl.exe` resides in `C:\OpenSSL-Win64\bin`.
* **Configuration** – `openssl.cfg` is also located in the same `bin` directory.

### Verifying the Installation Path

You can confirm the exact location of the `openssl` binary with either of the following commands:

```powershell
# PowerShell or Command Prompt
where openssl
```

If the command returns a path, that is the directory currently being used by your system.

To view the installation details reported by winget:

```powershell
winget list --details ShiningLight.OpenSSL
```

Look for the **Installed Location** field in the output; it will show the exact folder used for that package.

### Adding OpenSSL to the System PATH

After a winget installation, the `bin` directory is not automatically added to the system **PATH**. Adding it allows you to run `openssl` from any command prompt without specifying the full path.

#### Steps (Windows 10/11)

1. Open **Settings** → **System** → **About** → **Advanced system settings**.  
   *(Or press `Win + Pause/Break`, then click *Advanced system settings*.)*
2. In the **System Properties** dialog, click **Environment Variables…**.
3. Under **System variables**, locate and select **Path**, then click **Edit…**.
4. Click **New** and enter the full path to the `bin` folder, e.g.:

   ```
   C:\OpenSSL-Win64\bin
   ```

5. Click **OK** on all dialogs to apply the changes.
6. Open a new Command Prompt or PowerShell window and verify:

   ```powershell
   openssl version
   ```

   The command should now display the installed OpenSSL version.

### Alternative Install Locations

If you used a different winget package or manually changed the destination during setup, the installation may reside in one of these common locations:

- `C:\Program Files\OpenSSL-Win64`
- `C:\Program Files\FireDaemon OpenSSL 3`
- `C:\OpenSSL-Win32` (for 32‑bit builds)

Use the `where openssl` command to locate the binary regardless of where it was installed.

### Quick Checklist

- [ ] Run `where openssl` to see the current binary path.  
- [ ] Run `winget list --details <package-id>` to view the recorded install location.  
- [ ] Add the appropriate `bin` directory to the system **PATH** if it is not already present.  
- [ ] Verify the setup with `openssl version`.

Following these steps ensures that OpenSSL‑Win64 is correctly located and globally accessible on your Windows machine.

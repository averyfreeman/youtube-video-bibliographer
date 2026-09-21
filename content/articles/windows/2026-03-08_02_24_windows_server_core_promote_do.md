---
Title: "windows server core promote domain controller"
Date: "2026-03-08_02_24"
Tags:
  - Windows
Category: "Windows"
Source_Products:
  - AI_Mode
  - Search
---
Promoting a Windows Server Core Machine to a Domain Controller
===========================================================

Promoting a Windows Server Core machine to a Domain Controller (DC) is primarily done using PowerShell, as there is no local graphical user interface. The process involves preparing the server, installing the Active Directory Domain Services (AD DS) role, and then running the promotion command.

### Preparation

Before starting, ensure your server has a static IP address and a meaningful hostname using the Sconfig utility. To do this, follow these steps:

1. Type `sconfig` in the command prompt.
2. Select Option 2 to change the Computer Name.
3. Select Option 8 to configure Network Settings, including setting a static IP and DNS.

### Installing AD DS Role

To install the necessary binaries for Active Directory, open PowerShell by typing `powershell`. Then, run the following command:
```powershell
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools
```

### Promoting the Server

Choose the command that matches your deployment scenario. Each command will prompt you for a Safe Mode Administrator Password (DSRM password).

#### Scenario A: Add a DC to an Existing Domain

To add a secondary DC for redundancy, use the following command:
```powershell
Install-ADDSDomainController -DomainName "yourdomain.com" -Credential (Get-Credential)
```

#### Scenario B: Create a New Forest (First DC)

To set up a brand-new domain environment, use the following command:
```powershell
Install-ADDSForest -DomainName "yourdomain.com"
```

### Post-Promotion Tasks

After promoting the server, the following tasks will occur:

* **Automatic Reboot**: The server will automatically restart to complete the configuration.
* **Verification**: After logging back in, verify the health of the DC using `dcdiag` or by checking the status in Sconfig.
* **Remote Management**: You can now manage this Core DC from a workstation or a GUI server using Remote Server Administration Tools (RSAT). Alternatively, you can manage the entire process remotely using Windows Admin Center or Server Manager from another machine by adding the Server Core host to your server pool.

By following these steps, you can successfully promote a Windows Server Core machine to a Domain Controller, either as the first DC in a new forest or as an additional DC in an existing domain.

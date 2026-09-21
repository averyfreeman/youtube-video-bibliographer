---
Title: "opensuse ignition.ign file example"
Date: "2026-05-29_21_48"
Tags:
  - DevOps and Cloud
Category: "DevOps and Cloud"
Source_Products:
  - AI_Mode
  - Search
---
# Introduction to openSUSE Ignition Configuration
The openSUSE Ignition configuration file, typically named `config.ign`, is used to set up various system settings, such as the root password, authorized SSH keys, hostname, and systemd services, on the first boot of an openSUSE system. This article will guide you through creating and using an Ignition configuration file, as well as exploring additional tools and techniques for customizing your openSUSE deployment.

## Example Ignition Configuration File
An example `config.ign` file in JSON format might look like this:
```json
{
  "ignition": {
    "version": "3.3.0"
  },
  "passwd": {
    "users": [
      {
        "name": "root",
        "passwordHash": "$6$rounds=4096$saltstring$UeHk6kX0B9S...",
        "sshAuthorizedKeys": [
          "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCv..."
        ]
      }
    ]
  },
  "storage": {
    "files": [
      {
        "path": "/etc/hostname",
        "mode": 420,
        "overwrite": true,
        "contents": {
          "inline": "microos-node-01\n"
        }
      }
    ]
  },
  "systemd": {
    "units": [
      {
        "name": "sshd.service",
        "enabled": true
      }
    ]
  }
}
```
This configuration sets the root password, adds an authorized SSH key, modifies the system hostname, and enables the SSH service.

## Configuration Breakdown
- `ignition.version`: Specifies the Ignition version, which should be 3.3.0 or lower for openSUSE MicroOS and SLE Micro systems.
- `passwordHash`: Contains the encrypted root password, which can be generated using `openssl passwd -6`.
- `sshAuthorizedKeys`: Inserts your public key for secure SSH access.
- `storage.files`: A standard way to write configurations, such as network properties or hostnames. The file permissions value 420 represents the decimal equivalent of octal file mode 0644.
- `systemd.units`: Force-enables essential system daemons like the SSH server during the initial boot phase.

## Directory Deployment Structure
To apply the `config.ign` file correctly, place it on a configuration storage medium (e.g., a USB drive or ISO image) with the volume label `ignition`. The expected layout is:
```bash
<root directory of device>
└── ignition/
    └── config.ign
```

## Useful Tooling
- **Transpiling Configs**: Write cleaner configs in YAML format and use the Butane Transpiler to safely generate the `.ign` file.
- **Validating Syntax**: Verify your JSON configuration syntax by downloading and running the CoreOS Ignition Validate container image tool:
  ```bash
  podman run --rm -i quay.io/coreos/ignition-validate:release - <config.ign>
  ```
- **Alternative Tool**: For complex post-boot system tasks on openSUSE systems, consider exploring the native Combustion Wiki Portal script engine.

## Filesystem Syntax Examples
Ignition uses the `storage` block to manage files, directories, and links. All file contents must use URL encoding or base64 format if they are not plain inline text.

1. **Creating a Directory**: Creates a specific directory path with fixed owner permissions.
   ```json
   {
     "storage": {
       "directories": [
         {
           "path": "/etc/custom-config",
           "mode": 493,
           "user": { "name": "root" },
           "group": { "name": "root" }
         }
       ]
     }
   }
   ```
2. **Writing a File (Base64 Encoded)**: Ideal for writing binary files or text data with special characters.
   ```json
   {
     "storage": {
       "files": [
         {
           "path": "/usr/local/bin/myscript",
           "mode": 493,
           "overwrite": true,
           "contents": {
             "source": "data:text/plain;base64,IyEvYmluL2Jhc2gKZWNobyAiSGVsbG8iCg=="
           }
         }
       ]
     }
   }
   ```
3. **Creating a Symbolic Link**: Points a target path to an existing file location on the system.
   ```json
   {
     "storage": {
       "links": [
         {
           "path": "/etc/localtime",
           "target": "../usr/share/zoneinfo/America/New_York",
           "hard": false
         }
       ]
     }
   }
   ```

## Default Subvolumes in Leap Micro 6.2
The system uses Btrfs by default, with the root filesystem being read-only and backed by snapshots. Specific directories are created as separate subvolumes to make them writable and exclude them from system rollbacks. These include:
- `/var`: Contains variable data (logs, databases, container images).
- `/root`: The home directory for the root user.
- `/usr/local`: For locally installed binaries and scripts.
- `/srv`: Data for services (web, ftp, etc.).
- `/opt`: Optional software packages.
- `/boot/grub2/x86_64-efi`: Bootloader configuration (architecture-dependent path; excludes boot files from rollbacks to prevent boot loops).
- `/.snapshots`: Stores the system snapshots themselves.

Note that `/etc` is not a separate subvolume; it stays on the root filesystem so that configuration changes are tracked in system snapshots.

## Creating an ISO from a Directory
To create an ISO image from a directory on Fedora 44, you can use the `xorriso` package. First, install `xorriso`:
```bash
sudo dnf install -y xorriso
```
Then, generate the ISO image:
```bash
xorrisofs -o config-media.iso -R -J./fuel-ignition/
```
This command packages your directory structure into a data ISO.

## Creating a Configuration ISO for openSUSE
To automate the deployment of an openSUSE system, you can create a configuration ISO (config drive) that contains your Ignition and Combustion configurations. The directory structure should match the expected layout:
```bash
fuel-ignition/
├── combustion/
│   └── script
└── ignition/
    └── config.ign
```
Create the configuration ISO using `xorriso`:
```bash
xorrisofs -J -R -V ignition -o config.iso./fuel-ignition
```
The `-V ignition` option specifies the volume label, which tells the openSUSE installer to look inside this drive for config files.

## Using the Configuration ISO
When booting your VM, attach two CD-ROM/storage devices:
1. **Primary**: The official `openSUSE-Leap-Micro-6.2.iso` (the installer).
2. **Secondary**: Your new `config.iso`.

The system will boot from the Primary ISO, detect the Secondary ISO by its label, and automatically apply your Ignition and Combustion rules.

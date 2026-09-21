---
Title: "cloud-init script oracle linux 10 on oci add user with ed25519 public key"
Date: "2026-06-03_00_08"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
# Cloud‑Init Recipes for Oracle Linux, Ubuntu, and RHEL‑Alikes

## Adding a Single User with an Ed25519 Key on Oracle Linux 10 (OCI)

When provisioning an Oracle Linux 10 instance on Oracle Cloud Infrastructure, place a **#cloud-config** script in **Instance Details → Show Advanced Options → User Data**. The YAML below creates a user named `sysadmin`, grants password‑less sudo, and installs the supplied Ed25519 public key.

```yaml
#cloud-config
users:
  - name: sysadmin
    gecos: System Administrator
    primary_group: sysadmin
    groups: wheel
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI[your-public-key-string-here] user@host
```
### Key Considerations

* **YAML spacing** – Use two spaces per indent; any misalignment will cause cloud‑init to fail.
* **Key format** – The Ed25519 key must be a single line beginning with `ssh-ed25519`.
* **Sudo rights** – Adding the user to the `wheel` group and setting `sudo` as shown provides password‑less sudo.
* **OS support** – Oracle Linux 10 includes native Ed25519 support; cloud‑init handles it automatically.
* **Validation** – After boot, run `sudo cloud-init status --wait` to confirm successful execution.

---

## Creating Two Users on Ubuntu 24.04 with Packages and Service Configuration

The following cloud‑config creates a `root` user and a regular user `avery`. It installs `arch-install-scripts` and `openssh-server`, ensures SSH is enabled, disables `netfilter-persistent`, and forces `PermitRootLogin yes` in the SSH daemon configuration. No comments are included inside the code block, as requested.

```yaml
#cloud-config
users:
  - name: root
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI_ROOT_KEY_HERE_ root@host
  - name: avery
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI_AVERY_KEY_HERE_ avery@host

packages:
  - arch-install-scripts
  - openssh-server

runcmd:
  - sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
  - systemctl restart ssh
  - systemctl enable ssh
  - systemctl disable netfilter-persistent
  - systemctl stop netfilter-persistent
```
---

## Extending the Ubuntu Config: Disable SELinux, Switch Firewalld, and Update GRUB

The next version builds on the previous example. It disables SELinux by appending `selinux=0` to the GRUB kernel command line, regenerates the GRUB configuration, and replaces the `netfilter-persistent` service with `firewalld`.

```yaml
#cloud-config
users:
  - name: root
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI_ROOT_KEY_HERE_ root@host
  - name: avery
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI_AVERY_KEY_HERE_ avery@host

packages:
  - arch-install-scripts
  - openssh-server

runcmd:
  - sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
  - systemctl restart ssh
  - systemctl enable ssh
  - systemctl disable firewalld
  - systemctl stop firewalld
  - sed -i '/^GRUB_CMDLINE_LINUX=/s/"$/ selinux=0"/' /etc/default/grub
  - grub2-mkconfig -o /etc/grub2-efi.cfg
```
---

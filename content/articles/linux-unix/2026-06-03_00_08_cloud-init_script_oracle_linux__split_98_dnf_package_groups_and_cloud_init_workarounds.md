---
Title: "DNF Package Groups and Cloud-Init Workarounds"
Date: "2026-07-04_16_25"
Tags:
  - Linux and Unix
Split_From_Line: 98
Category: "Linux and Unix"
---
## Installing DNF Package Groups on RHEL‑Alikes

### Why `@group-name` Does Not Work in the `packages:` Block

The `packages:` stanza in cloud‑init maps directly to a list of **individual** package names. Cloud‑init invokes the package manager via Python’s `subprocess` module and validates each entry against a strict character set (alphanumeric, dashes, underscores, periods). The `@` symbol is filtered out, causing the entry to be rejected or ignored. Consequently, DNF group syntax such as `@headless-management` cannot be used there.

### Recommended Workaround

Run the group installation inside a `runcmd:` block, which executes arbitrary shell commands after the package manager step.

```yaml
#cloud-config
runcmd:
  - dnf group install -y "Headless Management"
```
If you prefer the short group ID form:

```yaml
#cloud-config
runcmd:
  - dnf group install -y headless-management
```
---

## Adding a Final Stamp to Record Cloud‑Init Completion

Cloud‑init automatically writes a stamp file when it finishes its last stage:

* **Path:** `/var/lib/cloud/instance/boot-finished`
* **Content example:**
  ```
  Wed, 03 Jun 2026 20:24:15 +0000 - up 12.34 seconds
  ```

### Custom Final Message (Optional)

You can override the default message with the `cc_final_message` key:

```yaml
#cloud-config
cc_final_message: "Cloud‑init v. %s finished at %s. Datasource %s. Up %s seconds"
```
### Querying the Status from the Shell

```bash
cloud-init status --long
```
Typical output:

```
status: done
time: Wed, 03 Jun 2026 20:24:15 +0000
detail: datasource name: DataSourceNoCloud
```
---

## Summary

* **Oracle Linux 10 (OCI):** Use a simple `users:` block with an Ed25519 key.
* **Ubuntu 24.04:** Create multiple users, install packages, configure SSH, and manage services via `runcmd:`.
* **Extended Ubuntu config:** Add SELinux disabling and GRUB regeneration, replace `netfilter-persistent` with `firewalld`.
* **RHEL‑alikes:** Install DNF groups via `runcmd:` because `packages:` does not accept the `@` prefix.
* **Completion stamp:** Cloud‑init already writes `/var/lib/cloud/instance/boot-finished`; customize with `cc_final_message` if desired.

These snippets can be dropped directly into the **User Data** field of your cloud provider’s instance launch wizard, providing reproducible, automated provisioning across the supported distributions.

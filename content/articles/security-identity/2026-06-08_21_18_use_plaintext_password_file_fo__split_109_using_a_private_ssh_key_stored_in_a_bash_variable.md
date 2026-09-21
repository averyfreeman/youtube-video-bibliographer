---
Title: "Using a Private SSH Key Stored in a Bash Variable"
Date: "2026-07-04_15_20"
Tags:
  - Security and Identity
Split_From_Line: 109
Category: "Security and Identity"
---
# Using a Private SSH Key Stored in a Bash Variable

While a public key cannot be used for authentication, a private key can be loaded from a variable and passed to `ssh` via a *here‑string*. This avoids writing the key to disk.

```bash
#!/usr/bin/env bash

# 1. Store the private key in a variable (preserve line breaks)
PRIVATE_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACDHpXfe0uS2BfK6gC69p4X5bQeJ7f8b9K5d1mPz0X5zQAAAAJgMCgUADgAK
... (rest of key) ...
-----END OPENSSH PRIVATE KEY-----"

REMOTE_USER="username"
REMOTE_HOST="remote.server.com"

# 2. Invoke ssh, feeding the key via stdin
ssh -i /dev/stdin "${REMOTE_USER}@${REMOTE_HOST}" <<< "$PRIVATE_KEY"
```
**Security note:** Anyone who can read the script can also read the private key. For production use, prefer `ssh-agent` or a hardware token.

---

# Making `rsync.net` Feel Like a Persistent Connection

`rsync.net` offers only SSH‑based access, but you can reduce connection latency and keep sessions alive with a few client‑side tweaks.

## 1. SSH Connection Multiplexing

Add the following to `~/.ssh/config`:

```sshconfig
Host *.rsync.net
    ControlMaster auto
    ControlPath ~/.ssh/control-%r@%h:%p
    ControlPersist 1h
```
- **ControlMaster auto** creates a master socket on the first connection.
- **ControlPersist 1h** keeps the socket alive for one hour after the last use, allowing subsequent `rsync`, `scp`, or `ssh` commands to reuse the same TCP connection instantly.

## 2. Mount with `sshfs`

Treat remote storage as a local directory:

```bash
sshfs username@username.rsync.net:/ /mnt/rsyncnet -o auto_cache,reconnect
```
- `-o reconnect` automatically re‑establishes the mount after temporary network interruptions.

## 3. Keepalive Settings

Prevent firewalls/NAT devices from dropping idle connections:

```sshconfig
Host *.rsync.net
    ServerAliveInterval 30
    ServerAliveCountMax 3
```
The client sends a keepalive packet every 30 seconds; after three missed responses the connection is closed.

---

## Supported Protocols on `rsync.net`

| Protocol | Typical Use |
|----------|-------------|
| **SSH** | Core remote command execution |
| **SFTP** | GUI file managers (FileZilla, WinSCP) |
| **SCP** | Simple file copies |
| **WebDAV over SSL** | Optional legacy mapping (requires request) |

### Common Tools That Work Directly

- `rsync`
- `borg`
- `rclone`
- `restic`
- `git`

These utilities can operate over the SSH or SFTP endpoints without additional configuration.

---

### Next Steps

- **Automation:** Create a `systemd` service to mount the `sshfs` share at boot.
- **Security:** Move any remaining password files into GPG‑encrypted containers or, better, switch entirely to key‑based authentication with `ssh-agent`.
- **Scaling:** Use the multiplexing configuration when scripting bulk operations across many `rsync.net` hosts.

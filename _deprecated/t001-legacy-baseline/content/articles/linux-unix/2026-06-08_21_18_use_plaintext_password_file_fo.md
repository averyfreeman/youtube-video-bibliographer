---
Title: "use plaintext password file for ssh"
Date: "2026-06-08_21_18"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
# Using Plaintext Password Files with SSH (and Safer Alternatives)

> **Warning:** Storing passwords in plaintext is insecure. The methods below are provided for situations where you accept the risk or need a temporary solution. Whenever possible, prefer SSH key‑based authentication.

---

## 1. Preferred Method – `sshpass`

`sshpass` injects a password from a file into the interactive SSH prompt. It is the most straightforward way to automate password‑based logins.

### Install `sshpass`

```bash
# Ubuntu / Debian
sudo apt install sshpass

# RHEL / CentOS / Fedora
sudo dnf install sshpass
```
### Create a password file

```bash
echo "YourActualPasswordHere" > ~/.ssh_password
chmod 600 ~/.ssh_password   # restrict access to the owner only
```
### Connect

```bash
sshpass -f ~/.ssh_password ssh username@remote_host
```
---

## 2. Alternative – Expect Script

If `sshpass` cannot be installed but `expect` is available, an Expect script can automate the password entry.

### Script (`ssh_login.exp`)

```expect
#!/usr/bin/expect -f
set timeout 10
set passfile [open [lindex $argv 0] r]
set password [read $passfile]
close $passfile

spawn ssh [lindex $argv 1]
expect "password:"
send "$password\r"
interact
```
### Usage

```bash
chmod +x ssh_login.exp
./ssh_login.exp ~/.ssh_password username@remote_host
```
---

## 3. Safer Alternative – SSH Key‑Based Authentication

Key pairs eliminate the need for password files and provide passwordless automation.

### Generate a key pair

```bash
ssh-keygen -t ed25519   # press Enter at the prompts for a passwordless key
```
### Install the public key on the remote host

```bash
ssh-copy-id username@remote_host
```
### Connect without a password

```bash
ssh username@remote_host
```
---

# Encrypting a Plaintext Password File (Optional)

If you must keep a password file, encrypt it at rest with GnuPG (GPG) and decrypt on‑the‑fly.

### 1. Symmetric encryption (AES‑256)

```bash
gpg --symmetric --cipher-algo AES256 ~/.ssh_password
# Produces ~/.ssh_password.gpg
```
### 2. Securely delete the original file

```bash
rm ~/.ssh_password
```
### 3. Decrypt and pipe to `sshpass` (no plaintext written to disk)

```bash
gpg --decrypt --quiet ~/.ssh_password.gpg | sshpass ssh username@remote_host
```
---

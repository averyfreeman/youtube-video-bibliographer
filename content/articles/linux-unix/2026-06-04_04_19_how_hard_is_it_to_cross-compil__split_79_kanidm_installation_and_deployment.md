---
Title: "Kanidm Installation and Deployment"
Date: "2026-07-04_16_44"
Tags:
  - Linux and Unix
Split_From_Line: 79
Category: "Linux and Unix"
---
# Kanidm: Required Tools and Prerequisites

Kanidm’s tooling requirements vary with the deployment model. Below is a concise breakdown for the three most common scenarios.

## 1. Standard (Containerised) Deployment – Recommended

| Component | Description |
|-----------|-------------|
| **Container Runtime** | Docker, Podman, or any compatible `containerd` implementation. |
| **TLS Certificates** | `chain.pem` and `key.pem` (e.g., from Let’s Encrypt). Kanidm enforces TLS; plain HTTP/LDAP is unsupported. |
| **Kanidm Image** | Pull the official image from the registry and run it with the required volume mounts for the certificates and configuration. |

> *The Kanidm Administration Guide explicitly recommends containerised deployment to guarantee environment stability.*

## 2. Linux/UNIX System Integration (Client Side)

| Package | Role |
|---------|------|
| `kanidm-unixd` | Local daemon that resolves identities against a Kanidm server. |
| `kanidm-unixd-tasks` | Background daemon for privileged client‑side tasks (e.g., directory renames). |
| PAM & NSS modules | `pam_and_nsswitch` (or equivalent) to expose Kanidm identities as native Linux accounts. |

Install these via your distribution’s package manager (e.g., `apt`, `dnf`, `pacman`).

## 3. Building Kanidm from Source

| Category | Required Tools |
|----------|----------------|
| \*\*Rust Toolchain\*\* | `rustup` (manage compiler versions). |
| \*\*Compilers & Linkers\*\* | `clang`, `lld`, and `make`. The project mandates Clang/LLD over GCC for performance reasons. |
| \*\*System Libraries\*\* | Development headers for the target distribution, typically:
`sqlite3-devel`, `libopenssl-devel`, `pam-devel`, `systemd-devel`, `libudev-devel`, `tpm2-0-tss-devel`. |
| \*\*Optional Acceleration\*\* | `sccache` (caches Rust compilation artifacts). |


### Example Installation on Ubuntu

```bash
# Rust toolchain
curl https://sh.rustup.rs -sSf | sh -s -- -y
source $HOME/.cargo/env

# Compilers & linkers
sudo apt-get install -y clang lld make

# System libraries
sudo apt-get install -y libsqlite3-dev libssl-dev libpam0g-dev \
    libsystemd-dev libudev-dev tpm2-tss-dev

# Optional cache
sudo apt-get install -y sccache
```
After installing the prerequisites, clone the repository and build:

```bash
git clone https://github.com/kanidm/kanidm.git
cd kanidm
cargo build --release
```
---

**Need more help?**
* If you want a concrete installation command for a specific Linux distribution, let me know the distro and version.
* If you’re configuring an OIDC/OAuth2 integration with an external identity provider, I can walk you through the required Kanidm settings.

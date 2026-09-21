---
Title: "MAAS Local Instance RAM Requirements"
Date: "2026-07-04_16_10"
Tags:
  - Databases and Data
Split_From_Line: 157
Category: "Databases and Data"
---
## How much RAM would running a local instance of MAAS require (for a maximum of 15 devices)?

To run a local instance of Canonical MAAS (Metal as a Service) managing a maximum of 15 devices, you will need between 2 GB and 8 GB of RAM, depending entirely on how the instance is deployed.

Because all MAAS server components (Region controller, Rack controller, and the PostgreSQL database) can be installed on a single local host for this scale, resource demands are minimal.

## RAM Requirements Breakdown

*   **2 GB RAM (Bare Minimum / Test Profile)**: Canonical's official minimum requirement for a proof-of-concept installation running all services on a single machine. This will function for 15 idle devices but will feel sluggish during concurrent provisioning tasks.
*   **4 GB to 6 GB RAM (Sweet Spot for 15 Devices)**: This provides enough headroom for the local PostgreSQL database to cache queries efficiently and allows the MAAS Rack controller to comfortably handle image synchronization and network booting (TFTP/HTTP) for your devices.
*   **8 GB RAM (Recommended for Heavy Usage)**: If you plan to deploy or power-cycle all 15 devices simultaneously, or if you plan to run MAAS inside an LXD/Incus container or virtual machine on your OCI Ampere host, allocating 8 GB ensures the system never hits swap space during bulk actions.

## Why the Local Footprint is Small

For 15 nodes, your local machine handles very low transaction volumes. MAAS components break down as follows when co-located:

*   **Ubuntu OS base layer**: ~512 MB.
*   **PostgreSQL Daemon**: ~512 MB to 2 GB (stores node state, network maps, and discovery logs).
*   **Region & Rack Controllers**: ~1 GB to 2 GB combined (handles the API, Web UI, DHCP, and PXE boot processes).

## Are you planning to install MAAS directly onto the host OS, or are you setting it up inside an LXD container/VM on your Ampere instance?

## Your prompt:

How feasible would it be to run MAAS on the compute instance for the zerotier network devices?

## Search's response:

Running MAAS entirely on your OCI Ampere instance to manage local physical devices via ZeroTier is technically possible but highly impractical due to a critical "chicken-and-egg" networking problem.

While the OCI Ampere A1 instance has more than enough power to run the software, the networking logistics of PXE booting over a WAN VPN will likely break your deployment.

## The Verdict: Don't put the entire stack on OCI.

## Feasibility Score:

2/10 (for a "All-in-Cloud" setup) vs. 9/10 (for a "Split" setup).

## The Critical Problem: "Chicken and Egg"

MAAS relies on PXE Boot (Network Boot) to take control of a blank machine.

*   **The Scenario**: You turn on a blank server at your home/office. Its BIOS shouts out, "Who can give me an IP and an OS?" (DHCP/PXE broadcast).
*   **The Blocker**: Your OCI instance is on the internet. Your blank server does not have ZeroTier installed because it has no OS yet. It has no way to "join" the ZeroTier network to hear the response from the MAAS controller in the cloud.
*   **The Bandwidth Issue**: Even if you bridged your local network to ZeroTier using a gateway (like a Raspberry Pi), transferring a 2GB OS image via TFTP over the internet is agonizingly slow and fragile. A single dropped packet often crashes the boot process.

## The Solution: The "Split" Architecture

MAAS is designed to solve exactly this problem by splitting its brain (Region) from its hands (Rack). This uses your OCI resources efficiently while keeping network-heavy tasks local.

*   **1. OCI Ampere Instance: The "Region Controller"**

    *   **Role**: The Brain. It hosts the Database, Web UI, and API.
    *   **Resources**: Your OCI A1 instance (4 OCPU, 24GB RAM) is perfect for this. It handles the logic and state for your 15 devices easily.
    *   **ZeroTier**: Runs here to accept connections from your local site.
*   **2. Local Device: The "Rack Controller"**

Role: The Hands. It handles DHCP, TFTP, and PXE booting.

Hardware: You need a small always-on device locally (e.g., a Raspberry Pi 4, an old laptop, or a small VM on your current PC).

ZeroTier: Runs here to tunnel commands securely back to the OCI Region Controller.

How to Configure This (High Level):

Install MAAS Region on your OCI instance.

Configure it as a "Region Controller" only.

Install ZeroTier and join your network.

Install MAAS Rack on a small local device.

Configure it as a "Rack Controller" only.

Install ZeroTier and join the same network.

Connect Them:

Register the local Rack Controller with the OCI Region Controller using the `maas-rack register` command pointing to the OCI ZeroTier IP.

Deploy:

Your local devices PXE boot from the "Local Rack Controller" (Instant speed over LAN).

The Rack Controller reports status to the "OCI Region Controller" (Visible in your UI globally).

Summary Table:

| Feature                  | All-in-One (Cloud Only) | Split Architecture (Recommended) |
| :----------------------- | :----------------------- | :--------------------------------- |
| PXE Boot                  | Broken (Requires complex local bridging) | Fast (Local LAN speed)               |
| OS Install Speed          | Very Slow (WAN Latency) | Very Fast (Local LAN)               |
| Reliability               | Low (Internet drops kill installs) | High (Local autonomy)               |
| OCI Usage                 | Heavy (DB + Image Hosting) | Efficient (DB + API only)            |
| ZeroTier Role             | Data Plane (Heavy traffic) | Control Plane (Light commands)       |

Recommendation: Use your OCI instance for the "Region Controller" and a cheap local device for the "Rack Controller". This is the standard "Enterprise" way to deploy MAAS across multiple sites.


```markdown
Let's put that on the back-burner. Thanks for the info. I am noticing my lxc image command is resulting in virtual-machines (which I can't use) and desktop variants:

root@instabuntu:/etc/sysctl.d# lxc image list -f yaml
images:ubuntu
architecture=amd64
aliases:
- name: ubuntu/jammy/desktop/amd64
  description: "
- name: ubuntu/22.04/desktop/amd64
  description: "
architecture: x86_64
cached: false
public: true
filename: lxd.tar.xz
fingerprint: ff5ec77a158ab1b956c141a4afa9df7b52b37873a6322bc2f1a31b6727b2188f
size: 1074212584
auto_update: false
type: virtual-machine
created_at: 2026-05-19T10:04:00Z
expires_at: 1970-01-01T00:00:00Z
last_used_at: 0001-01-01T00:00:00Z
uploaded_at: 2026-05-19T10:04:00Z
properties:
  architecture: amd64
  description: Ubuntu jammy (desktop)
  os: Ubuntu
  release: jammy
  serial: "20260519_1004"
  type: disk-kvm.img
  variant: desktop
  profiles: []
  project: "
  release_title: jammy
  aliases:
- name: ubuntu/noble/desktop/amd64
  description: "
- name: ubuntu/24.04/desktop/amd64
  description: "
  architecture: x86_64
  cached: false
  public: true
  filename: lxd.tar.xz
  fingerprint: ecb92b795b790fab0bea995bc6f2dc6ff7fd2f5815dbe88ccd906a266fdc9fc1
  size: 1217148632
  auto_update: false
  type: virtual-machine
  created_at: 2026-05-19T10:04:00Z
  expires_at: 1970-01-01T00:00:00Z
  last_used_at: 0001-01-01T00:00:00Z
  uploaded_at: 2026-05-19T10:04:00Z
  properties:
  architecture: amd64
  description: Ubuntu noble (desktop)
  os: Ubuntu
  release: noble
  requirements.cgroup: v2
  serial: "20260519_1004"
  type: disk-kvm.img
  variant: desktop
  profiles: []
  project: "
  release_title: noble
  aliases:
- name: ubuntu/questing/desktop/amd64
  description: "
- name: ubuntu/25.10/desktop/amd64
  description: "
  architecture: x86_64
  cached: false
  public: true
  filename: lxd.tar.xz
  fingerprint: 851342fa3094f882f31dcc6130222d70abe9afc41cb2afae3ed5d9d12e4bd921
  size: 1425318100
  auto_update: false
  type: virtual-machine
  created_at: 2026-05-19T10:04:00Z
  expires_at: 1970-01-01T00:00:00Z
  last_used_at: 0001-01-01T00:00:00Z
  uploaded_at: 2026-05-19T10:04:00Z
  properties:
  architecture: amd64
  description: Ubuntu questing (desktop)
  os: Ubuntu
  release: questing
  requirements.cgroup: v2
  serial: "20260519_1004"
  type: disk-kvm.img
  variant: desktop
  profiles: []
  project: "
  release_title: questing
  aliases:
- name: ubuntu/resolute/desktop/amd64
  description: "
- name: ubuntu/26.04/desktop/amd64
  description: "
  architecture: x86_64
  cached: false
  public: true
  filename: lxd.tar.xz
  fingerprint: b723be41850463b00772756744cbc50958a416aaba45c823797dd4fe2a54f1cd
  size: 1454801620
  auto_update: false
  type: virtual-machine
  created_at: 2026-05-19T10:04:00Z
  expires_at: 1970-01-01T00:00:00Z
  last_used_at: 0001-01-01T00:00:00Z
  uploaded_at: 2026-05-19T10:04:00Z
  properties:
  architecture: amd64
  description: Ubuntu resolute (desktop)
  os: Ubuntu
  release: resolute
  requirements.cgroup: v2
  serial: "20260519_1004"
  type: disk-kvm.img
  variant: desktop
  profiles: []
  project: "
  release_title: resolute

How can I ensure these are not listed as options? Here's my remote list:

yaml
# lxc remote list -f yaml | yq -P
images:
addr: https://images.lxd.canonical.com
protocol: simplestreams
public: true
local:
addr: unix://
public: false
ubuntu:
addr: https://cloud-images.ubuntu.com/releases/
protocol: simplestreams
public: true
ubuntu-daily:
addr: https://cloud-images.ubuntu.com/daily/
protocol: simplestreams
public: true
ubuntu-minimal:
addr: https://cloud-images.ubuntu.com/minimal/releases/
protocol: simplestreams
public: true
ubuntu-minimal-daily:
addr: https://cloud-images.ubuntu.com/minimal/daily/
protocol: simplestreams
public: true

Search's response:
Got it, no problem keeping MAAS on standby. Since you need to clear the noise and ensure virtual machines and desktop variants are excluded from your image options, the solution comes down to refining your filtering directly at the CLI layer.

Because LXD's simplestreams protocol fetches a pre-built static manifest from Canonical's remote servers, you cannot block the remote server from offering them. However, you can perfectly eliminate them from your output using built-in key-value filter flags or by adjusting your yq processing pipeline.

1. The Built-in LXD CLI

For Minimal Containers Only: Query ubuntu-minimal: instead. It only indexes ultra-lightweight server/container base images.

```
lxc image list ubuntu-minimal: architecture=amd64 type=container
```

For Standard Cloud Containers: Query ubuntu: instead of images: The images: remote (pointing to images.lxd.canonical.com) acts as a massive community kitchen-sink repo that deliberately includes desktop and VM disks. The ubuntu: remote focuses tightly on cloud/server image distributions.

Would you like to see how to alias these filtered commands in your shell profile for a cleaner default workflow, or do you need help generating an automation script using one of these filtered datasets?

---
Title: "using opensuse leap micro as hypervisor"
Date: "2026-05-29_21_29"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
```markdown
Using openSUSE Leap Micro as a hypervisor gives you a highly secure, immutable, and lightweight KVM host. Because it uses a read-only root filesystem and transactional updates, your base OS remains protected, making it an excellent platform for running virtual machines and containers.

Leap Micro is designed as an appliance; rather than a traditional installer, you typically write a self-install image directly to a USB drive or boot it via PXE/ISO.

Download: Grab the latest self-install image for x86_64 from the openSUSE Leap Micro page.
Combustion/Ignition: Because the base system is read-only, you need to configure your initial root password or SSH keys on first boot using Combustion or Ignition. Place a simple config script on a USB labeled combustion, plug it in when you first boot the server, and it will apply your user settings automatically.

Once the system is booted and accessible, you'll need to set up the QEMU/KVM hypervisor and libvirt stack.

Install Hypervisor packages: Since Leap Micro runs on transactional-update, you install virtualization packages by running:
transactional-update pkg in qemu-kvm libvirt libvirt-daemon bridge-utils

Reboot: Apply the packages by restarting the node:
systemctl reboot

To allow your Virtual Machines to communicate with your local network, you need to set up a bridge interface (e.g., br0).

Use wicked or NetworkManager to create a bridge, attaching your physical ethernet interface as a port. For example, editing your network configurations in /etc/sysconfig/network/ to establish a bridge.

Because Leap Micro is an immutable OS, you don't install a desktop environment or heavy UI tools directly onto the host. Instead, you manage your KVM instances remotely:
Cockpit: You can install the Cockpit web interface to manage your VMs from a web browser.
virt-manager: Use the virt-manager desktop application on your local workstation to connect to your Leap Micro hypervisor over SSH and manage VMs graphically.
virsh: For CLI management, use the native virsh tool to define, start, and stop your VMs.

If you also want to run containers on your hypervisor host, it is highly recommended to use the Podman or Docker tools instead of installing runtime services directly on the host OS. You can spin up microservices and management services (like a web portal) cleanly via podman run.

For a visual walkthrough of setting up a QEMU/KVM virtual machine environment on SUSE-based platforms using virt-manager:

does leap micro have lxc?
No, openSUSE Leap Micro does not officially support native LXC (Linux Containers).

SUSE and openSUSE officially deprecated libvirt-lxc container management starting with the Leap 15.4 code stream, which forms the upstream core for Leap Micro.

Instead of traditional LXC, Leap Micro is architected to prioritize two specific container and virtualization standards:

1. Podman (Recommended Container Alternative)
Application Containers: For standard container workloads, Leap Micro provides native, optimized integration with Podman right out of the box.
System Containers (LXC-like): If you need an LXC-like experience where the container behaves like a full system (with its own systemd init process), you can pass the --systemd=always flag to Podman:
podman run -d --systemd=always --name=my-system-container registry.opensuse.org/opensuse/leap:latest

2. KVM / Libvirt (Virtualization)
If absolute OS-level isolation is required, openSUSE leans entirely on QEMU/KVM. You manage these via libvirt (virsh) or through remote interfaces like Cockpit and virt-manager.

3. Community Alternatives (Incus/LXD)
If you absolutely require system container management, you can attempt to install Incus (the community fork of LXD) via the transactional-update package manager. However, because Leap Micro features a highly stripped-down kernel and an immutable root filesystem, some kernel modules or network features required by native LXC/Incus tools may not be loaded by default.

Would you like help setting up a Podman system container to mimic an LXC environment, or would you prefer a KVM virtual machine setup instead?

does podman create any shitty iptables rules by default like docker?
No, Podman does not mess up your host’s firewall or punch public holes in your system by default the way Docker does.
```
Docker is notorious for introducing aggressive, global iptables rules that bypass system firewalls (like UFW or firewalld). It forces all container traffic through a custom chain and opens ports directly to the public internet, even if your local firewall explicitly denies it.

Podman handles networking completely differently depending on how you run it:

1. Rootless Podman (Default) — Zero Host Rules

If you run Podman normally (without sudo), it operates entirely in user space.

No Host Firewall Changes: Rootless Podman does not have root privileges, meaning it cannot modify your host’s iptables or nftables rules.

Network Isolation: It uses slirp4netns or pasta to create an isolated network namespace.

Respects Your Firewall: When you expose a port (e.g., -p 8080:80), Podman simply binds to an unprivileged port on the host network. If your system firewall blocks port 8080, the container is blocked. It cannot secretly bypass your security rules.

2. Rootful Podman (`sudo`) — Isolated and Modern


If you run Podman with sudo, it does need to manipulate firewall rules to route traffic for its bridge networks (`podman0`), but it does so cleanly:


No Daemon Spam: Docker injects permanent global rules into your iptables as soon as the system daemon boots. Podman has no background daemon; it dynamically injects rules only when a container network is actively running and cleans them up entirely when it stops.

Netavark & Nftables: Podman uses Netavark as its modern network backend. Instead of scattering messy iptables entries all over your configuration, Netavark keeps its rules neatly contained within an isolated netavark table namespace.

Firewalld Integration: On distributions that use firewalld (like openSUSE Leap Micro), rootful Podman integrates safely with existing firewalld zones rather than smashing through them.

Summary Comparison

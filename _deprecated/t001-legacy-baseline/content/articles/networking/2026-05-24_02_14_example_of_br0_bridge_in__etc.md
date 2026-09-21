---
Title: "example of br0 bridge in /etc/network/interfaces"
Date: "2026-05-24_02_14"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
```markdown
example of br0 bridge in /etc/network/interfaces

A network bridge (`br0`) allows your physical network interface and virtual machines or containers to share the same physical network. It binds the physical interface (e.g., `eth0`) as a "port" and assigns the host's IP address to the bridge interface itself.


Here is a standard, working example of how to configure `br0` with a static IP and `eth0` as the bridged port in `/etc/network/interfaces`:


# The loopback network interface
auto lo
iface lo inet loopback

# The primary physical network interface (must be set to manual/up without an IP)
auto eth0
iface eth0 inet manual

# The bridge interface
auto br0
iface br0 inet static
        address 192.168.1.100
        netmask 255.255.255.0
        gateway 192.168.1.1
        dns-nameservers 8.8.8.8 1.1.1.1
        bridge_ports eth0
        bridge_stp off
        bridge_fd 0
        bridge_maxwait 0

Key Configuration Directives:

- iface eth0 inet manual: The physical interface shouldn't have its own IP address; it is managed completely by the bridge.
- bridge\_ports eth0: This tells the system to attach `eth0` to the `br0` bridge. You can add multiple ports by separating them with spaces (e.g., `bridge_ports eth0 eth1`).
- bridge\_stp off: Disables the Spanning Tree Protocol, preventing a 15-second delay when the bridge initializes (recommended unless you have complex, looped network switches).
- bridge\_fd 0: Sets the forwarding delay to zero, allowing the bridge to instantly forward packets.


For more details on bridging options and troubleshooting commands like `brctl`, check out the Debian Bridge Network Connections Wiki.


please show example with bridge_stp enabled

Enabling Spanning Tree Protocol (STP) prevents network loops by blocking redundant paths. It is highly recommended if your bridge connects to multiple physical switches or interfaces.

Here is the configuration example with STP enabled:

# The loopback network interface
auto lo
iface lo inet loopback

# The primary physical network interface
auto eth0
iface eth0 inet manual

# The bridge interface with STP enabled
auto br0
iface br0 inet static
        address 192.168.1.100
        netmask 255.255.255.0
        gateway 192.168.1.1
        dns-nameservers 8.8.8.8 1.1.1.1
        bridge_ports eth0
        bridge_stp on
        bridge_fd 15
        bridge_maxwait 20

What Changed?

- bridge_stp on: Activates STP to monitor the network for loops.
- bridge_fd 15: Sets the forwarding delay to 15 seconds. This gives STP enough time to listen and learn the network topology before forwarding traffic. Setting this to 0 while STP is on can accidentally cause temporary loops.
- bridge_maxwait 20: Allows the system up to 20 seconds for the bridge ports to get into a forwarding state before continuing the boot process.

To help tailor this, please let me know:

- Will you be bridging multiple physical interfaces (like eth0 and eth1)?
- Are you assigning a static IP or using DHCP?
- What hypervisor or container tool are you using this for?

is there an rstp option?

No, there is no native bridge_rstp option available for the standard Linux bridge in /etc/network/interfaces. The default Linux kernel bridging code natively supports only traditional, classic 802.1D STP.

If you need Rapid Spanning Tree Protocol (RSTP) for faster convergence times, you have two primary options:

Option 1: Use Open vSwitch (Recommended)

Open vSwitch (OVS) is a feature-rich alternative to the standard Linux bridge that natively supports RSTP. You can configure it directly inside /etc/network/interfaces by installing the OVS package (`sudo apt install openvswitch-switch`) and using the following layout:


# Physical Interface
allow-ovs eth0
iface eth0 inet manual
        ovs_type OVSPort
        ovs_bridge br0

# Open vSwitch Bridge with RSTP enabled
allow-hotplug br0
iface br0 inet static
        address 192.168.1.100
        netmask 255.255.255.0
        gateway 192.168.1.1
        dns-nameservers 8.8.8.8
        ovs_type OVSBridge
        ovs_ports eth0
        ovs_options rstp_enable=true

Option 2: Install user-space mstpd

If you must stick to a standard Linux bridge, you can install a user-space daemon called **`mstpd`** (Multiple Spanning Tree Protocol Daemon). It hooks into the standard Linux bridge to handle RSTP.


Install the daemon: sudo apt install mstpd

Leave your /etc/network/interfaces configured with bridge_stp on. The mstpd service automatically intercepts the bridge configuration and runs RSTP over it instead of regular STP.

Are you managing a production enterprise environment where standard STP convergence delays (30-50 seconds) are causing network dropouts, or are you just looking to speed up your boot/startup times?

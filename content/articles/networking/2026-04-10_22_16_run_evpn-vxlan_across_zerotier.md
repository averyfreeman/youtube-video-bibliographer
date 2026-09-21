---
Title: "run evpn-vxlan across zerotier"
Date: "2026-04-10_22_16"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
---
## 1. EVPN-VXLAN over ZeroTier (The Hybrid Stack)
### Core Competencies:
As a professional SDN technician, I can attest that EVPN-VXLAN over ZeroTier is an advanced, niche architecture. This setup utilizes ZeroTier strictly as a programmatic Layer 3 underlay, with BGP EVPN directing the multi-tenant Layer 2/3 overlay. The core competencies of this hybrid stack include extreme multi-tenancy, a standard-based BGP EVPN control plane, and native multi-homing capability mapped over an auto-punching peer-to-peer (P2P) underlay.

### Technical Methods:
The underlay is established using ZeroTier's cryptographic VL1 layer, which creates P2P UDP tunnels between edge routers across the internet. The control plane is built using BGP with the `l2vpn evpn` address family, established directly between the managed ZeroTier IPs. The data plane utilizes standard VXLAN to encapsulate payload frames, targeting the remote ZeroTier IP as the VTEP destination.

### Attributes Matrix:
The attributes of this setup include high L2 compatibility, very low simplicity/ease of use, high "local feeling," and moderate latency/throughput.

## 2. Comparable Solution A: Direct ZeroTier Bridging
### Core Competencies:
Direct ZeroTier bridging is a decentralized, cloud-managed P2P Layer 2 Ethernet emulation. This solution omits BGP and VXLAN, instead using ZeroTier endpoints authorized via a web controller to bridge physical or virtual network interfaces directly into a global flat L2 segment.

### Technical Methods:
ZeroTier endpoints are instructed to bridge physical or virtual network interfaces directly into a global flat L2 segment. This approach eliminates the need for BGP and VXLAN.

### Attributes Matrix:
The attributes of this setup include high L2 compatibility, high simplicity/ease of use, high "local feeling," high latency/throughput, and very low complexity/ease of implementation and maintenance.

## 3. Comparable Solution B: WireGuard with VXLAN (No EVPN)
### Core Competencies:
WireGuard with VXLAN is a high-speed kernel-level encryption solution for securing static Layer 2 tunnels. This setup uses a full mesh or hub-spoke of Linux kernel WireGuard tunnels to provide a static, secure L3 underlay, with Linux VXLAN interfaces built manually on top of the WireGuard tunnel endpoints to bridge remote subnets.

### Technical Methods:
A full mesh or hub-spoke of Linux kernel WireGuard tunnels provides a static, secure L3 underlay. Linux VXLAN interfaces are then built manually on top of the WireGuard tunnel endpoints to bridge remote subnets.

### Attributes Matrix:
The attributes of this setup include moderate L2 compatibility, moderate simplicity/ease of use, moderate to high "local feeling," very high latency/throughput, and moderate complexity/ease of implementation and maintenance.

## 4. Comparable Solution C: Tailscale Subnet Routers (with App-Connector)
### Core Competencies:
Tailscale Subnet Routers provide seamless, identity-driven L3 mesh networking with heavy NAT traversal capabilities. This solution establishes coordinate-based wire meshes, with a "Subnet Router" node placed in each physical location to advertise its local L3 space.

### Technical Methods:
Tailscale establishes coordinate-based wire meshes, with a "Subnet Router" node placed in each physical location to advertise its local L3 space.

### Attributes Matrix:
The attributes of this setup include no L2 compatibility, highest simplicity/ease of use, moderate "local feeling," high latency/throughput, and very low complexity/ease of implementation and maintenance.

## SDN Technician's Verdict
When choosing a solution, consider the specific requirements of your setup. For example, use Tailscale if you strictly require fast, zero-hassle Layer 3 reachability. Use Direct ZeroTier if you need Layer 2 features quickly without enterprise complexity. Use WireGuard + VXLAN if you demand pure speed and security with Layer 2 stretching. Use EVPN-VXLAN over ZeroTier only if you are operating a multi-tenant service provider edge requiring fine-grained control over millions of isolated L2/L3 VNIs with dynamic routing over untrusted internet transport.

## ZeroTier & Kernel Optimizations: Moving Past User Space
To optimize ZeroTier for heavy-lift carrier-grade workloads like EVPN-VXLAN, it is essential to pivot from standard user-space operations to kernel-optimized networking. ZeroTier typically operates as a user-space daemon that communicates with the kernel via a `tun` or `tap` device, creating a massive CPU overhead due to context switching at high throughput.

## Method A: Forcing Multi-Core RSS (Receive Side Scaling)
By default, a single `tun` queue bound to a single CPU core handles a specific network flow. To optimize this, rebuild your kernel or use `ethtool` combined with ZeroTier's `local.conf` to force multi-queue processing.

## Patched `.config` snippet for High-Throughput SD-WAN
Enable multi-queue tap/tun devices and shift from voluntarily preemptible to low-latency or full RT for BGP stability.

## Debian specific `debian/rules.d/amd64.opts` or equivalent environment overrides
Pass aggressive optimization flags to ensure the networking path is highly optimized for modern x86_64 architectures.

## Method B: Nftables "Flowtable" Hardware & Software Offloading
Instead of rebuilding the whole kernel, use Linux `nftables` flowtables to bypass the heavy Netfilter hook chains once a VXLAN or ZeroTier connection is established.

## Implementation (`/etc/nftables.conf`)
Define the fast-path flowtable bound to physical and ZeroTier interfaces and offload established ZeroTier and VXLAN connections.

## Common Configuration Optimizations & Errors
Beyond kernel compilation, network health when spanning EVPN-VXLAN over ZeroTier is predominantly dictated by MTU math and Peer-to-Peer (P2P) path health.

## Error 1: The "Double Encapsulation" MTU Black Hole
Standard Ethernet MTU is 1500 bytes. When running VXLAN inside ZeroTier, the packet headers swell past 1500 bytes, causing the physical internet routers to drop or severely fragment them, killing throughput.

## The Fix
Clamp the MSS for TCP traffic at the edge or lower the MTU of the overlay.

## Implementation (Applying via iptables/nftables on the VTEP)
Use `iptables` or `nftables` to clamp the MSS and ensure payload + headers do not exceed standard internet MTU.

## Error 2: Falling Back to Planet/Moon Relays (Hairpinning)
If edge routers are behind symmetric NATs or restrictive firewalls, ZeroTier cannot form a direct P2P link and falls back to repeating heavy VXLAN traffic through a public "Planet" server or a custom "Moon," driving latency from 20ms to 200ms+.

## The Fix
Ensure ZeroTier's default port (9993/UDP) is mapping correctly.

## Implementation
On edge firewalls, map external 9993/UDP directly to the VTEP node and check the active path in your CLI.

## Error 3: BGP Flapping due to Linux `rp_filter` (Reverse Path Filtering)
Linux by default discards packets if they arrive on an interface that doesn't match the best reverse route back to the source. Because EVPN dynamically alters L2/L3 paths, strict RPF can kill return BGP packets.

## The Fix
Change the RPF mode from strict to loose on all relevant interfaces.

## Implementation
Edit `/etc/sysctl.conf` and apply the changes.

## Custom ZeroTier Binding via `local.conf`
To stop ZeroTier from binding to every active network interface and force it onto dedicated physical paths, utilize the `local.conf` file.

## Location
The file is located at `/var/lib/zerotier-one/local.conf` (Linux) or `/Library/Application Support/ZeroTier/One/local.conf` (macOS).

## Action
Create or edit this JSON file to define strictly allowed interfaces and custom ports.

## Example `local.conf` for Physical Path Optimization
The example configuration shows how to lock ZeroTier to its default UDP port, disable UPnP/NAT-PMP, prevent ZeroTier from wasting CPU cycles on local virtual bridges or Docker networks, and explicitly block or lower the MTU on specified physical subnets.

## The Role of a Cloudflare A-Record in a ZeroTier Setup
If you have a domain managed by Cloudflare, creating an A-record pointing to a node's ZeroTier Managed IP serves as a private directory, providing convenience, security, and the ability to obtain legitimate Let's Encrypt certificates.

## Should You Use Cloudflare Proxy for ZeroTier Records?
No, you should absolutely disable the Cloudflare Proxy for any A-record pointing directly to a ZeroTier IP, as it will cause routability failure and protocol mismatch.

## The Correct Approach: "DNS Only" Mode
Keep the record as "DNS Only" to allow Cloudflare to act purely as a standard DNS nameserver, returning the private ZeroTier IP to clients on your ZeroTier network.

## Nftables Hardware/Software Flowtable Offloading Solution
The `nftables` flowtable offloading solution is a massive tool for maximizing router performance, bypassing the heavy Netfilter hook chains once a VXLAN or ZeroTier connection is established.

## The Problem: The Linux "Slow Path"
By default, when a Linux machine acts as a router, every single packet must traverse the full Netfilter (firewall) stack, pegging your CPU cores.

## The Solution: `nftables` Flowtable (The Fast Path)
A Flowtable is an optimization that acts like a short-circuit for established connections, bypassing the rest of the Netfilter stack entirely.

## Where it Fits with ZeroTier
Depending on how you use ZeroTier, `nftables` flowtables will either be a miracle or have zero effect.

## Scenario A: ZeroTier as a Routed Gateway (Where it FITS perfectly)
If your node is a router bridging a physical LAN to a ZeroTier network, this is exactly where software flowtables shine.

## Scenario B: The Node is the Endpoint (Where it does NOT fit)
If the applications or users are running directly on the machine where ZeroTier is installed, flowtables will do nothing.

## How to Implement It (Software Offloading)
To deploy a software fast-path in your environment, use a specialized block in your `/etc/nftables.conf` file.

## Hardware Offloading
While `nftables` supports hardware offloading, you cannot use Hardware Offloading with ZeroTier, as it requires a physical NIC with a Silicon ASIC/FPGA.

## UniFi vs. ZeroTier for Your Sites
Whether you should use a native UniFi solution depends entirely on your tolerance for manual setup and the age of your equipment.

## The Problem:
Your USG-3P is over a decade old and was officially declared End of Life (EoL) by Ubiquiti.

## Site Magic is Out:
UniFi has a highly praised, zero-configuration SD-WAN feature called UniFi Site Magic, but it requires modern UniFi OS consoles and does not support the legacy USG-3P.

## The Manual Route:
To connect these sites natively, you must build a manual Site-to-Site IPsec tunnel between the USG and the Cloud Gateway Max.

## Pros and Cons
The manual IPsec setup has pros, such as being built directly into your router hardware, but also has cons, including requiring public IPs and potentially bottlenecking transfer speeds.

## Verdict
If both gateways have accessible public IPs, the native manual UniFi IPsec tunnel is worth trying. If either site is behind a CGNAT or a double NAT, stick with ZeroTier or a similar mesh overlay.

## Easy & Free Solutions to Map Device Networks Across Sites
If you decide not to use native UniFi IPsec or ZeroTier, you have several highly rated, free alternatives to bridge your subnets.

## Tailscale (Highly Recommended)
Tailscale is a free, easy-to-use solution that effortlessly punches through heavy NATs or CGNATs and needs no firewall port forwarding.

## Netbird
Netbird is an open-source, fast mesh VPN built on top of WireGuard, featuring a web UI similar to Tailscale and handling peer-to-peer routing and subnet advertising without enterprise overhead.

## Using Cloudflare (Argo Tunnels) for Full Site Connection
While Cloudflare is phenomenal for exposing individual web services, standard Cloudflare Tunnels are not a suitable or efficient alternative for continuous site-to-site LAN bridging.

## Protocol Limitations
Standard, free Cloudflare Tunnels are strictly designed to proxy HTTP/HTTPS traffic and do not act as a transparent router for your whole network.

## Performance
All traffic pushed through a Cloudflare tunnel is hauled back to the nearest Cloudflare Edge data center before being routed back to your origin, creating massive, unnecessary latency and wasting Cloudflare bandwidth.

## The Cloudflare Alternative
If you want to use the Cloudflare ecosystem for full network connectivity, the correct tool is Cloudflare One / Magic WAN, but it is overwhelmingly complex for a two-site home or small business lab and generally transitions into paid tiers for large-scale use.

## Internet Service Providers
Both of your internet connections are incredibly robust and optimal for site-to-site networking, with public IPs at both locations.

## Cloud Compute Instance
No, you should not use a Cloudflare Tunnel to carry ZeroTier's UDP port 9993 traffic to your compute instance, as it introduces massive computational overhead and breaks the direct peer-to-peer pathing.

## Subjective: Why Tailscale & Netbird over ZeroTier
My pivot to Tailscale and Netbird was an intentional response to your request for an easy + free solution to map device networks across sites without diving back into complex data center operations like EVPN-VXLAN.

## The Ultimate Recommendation for Your Specific Setup
Since you have high-speed symmetrical fiber with public IPs at both locations, you are sitting on the holy grail of self-hosting. Avoid ZeroTier or Tailscale entirely for your primary site-to-site link and use a native UniFi IPsec tunnel or a similar mesh overlay if necessary.

## Instead, Build a Native IPsec Site-to-Site Tunnel
Instead of relying on middleman software, I recommend building a native IPsec site-to-site tunnel directly between your UniFi Cloud Gateway Max and your legacy USG-3P. Since both ONTs hand off a public IP, your gateways can communicate with each other directly without needing intermediate software. This approach keeps traffic local to your gateways, avoiding the consumption of CPU cycles on independent computers or Raspberry Pis in your network.

The only caveat is that the USG-3P has a weaker CPU and will max out around 30 to 50 Mbps over IPsec. If you need to transfer large amounts of data at full 300/300 line speed between sites, consider deploying a dedicated Linux machine running WireGuard or Tailscale at each site to handle the heavy lifting.

### Evaluating the Laptop Server Option
Running WireGuard on the always-on Windows media server at the Ziply/USG-3P site is the best option. This approach creates a resilient, high-speed connection between your sites. With a modern Windows processor handling the cryptographic work, you can easily saturate your full 300/300 Ziply fiber line.

This setup also handles the changing IP issue, as you can configure the Windows machine at the Ziply site as the WireGuard Server. The QF site can then point its WireGuard client to your Cloudflare domain. If Quantum Fiber changes your IP, the client on the QF side will simply ping the Ziply laptop with its new IP, and the tunnel will stay up without needing DDNS on both ends.

### Implementation Steps
To implement this solution, follow these steps:

1. Install WireGuard on the Windows laptop at the Ziply site.
2. Assign the laptop a static local IP on the USG-3P (e.g., 192.168.10.200).
3. On the USG-3P, create a simple port-forwarding rule directing UDP port 51820 to the laptop's local IP.
4. Turn on registry-level IP forwarding on Windows or use a tool like Tailscale/Netbird directly on that laptop to act as a subnet router.

### Quantum Fiber and VLAN 201
When setting up the Cloud Gateway Max (CGM) with Quantum Fiber, it's essential to understand the requirements. In legacy CenturyLink/Quantum Fiber markets, tagging VLAN 201 on the WAN is necessary, and PPPoE authentication is typically required alongside the VLAN tag. However, since your setup uses DHCP with just the VLAN 201 tag applied, you don't need to enter PPPoE credentials.

### Running WireGuard on the USG-3P
While it's possible to install WireGuard directly on the USG-3P, this approach requires manual engineering and won't solve the speed bottleneck. The USG-3P's weak CPU will still limit the speed to around 50 Mbps.

### The Technical Reality of WireGuard on the USG-3P
Running WireGuard on the USG-3P comes with specific operational caveats:

1. **The Persistent Config Headache**: Any manual changes made to the USG-3P via SSH will be wiped out the next time the UniFi Cloud Controller pushes a global update or re-provisions the gateway. To make WireGuard stick, you must dump your CLI commands into a massive, meticulously formatted `config.gateway.json` file on your Cloud Controller.
2. **The CPU Bottleneck Remains**: WireGuard cannot utilize the USG-3P's hardware offloading chip, so all packet encryption falls on the weak CPU. Community benchmarks show that a USG-3P maxes out at roughly 50 to 60 Mbps over a WireGuard tunnel before its CPU hits 100% utilization.

### The Verdict: Laptop vs. USG-3P
Choose the USG-3P if you want an "all-in-one" gateway solution and are okay with your site-to-site link capping out at roughly 50 Mbps. Choose the Windows Laptop Server if you want full, unthrottled use of your 300 Mbps fiber line.

### Implementing the Windows Laptop Server Solution
To implement the Windows Laptop Server solution, follow these phases:

#### Phase 1: Configure the WS4W Server (Windows Laptop)
1. Add a new tunnel and generate server keys.
2. Define the listening attributes, including the listen port (e.g., 51820) and the tunnel subnet (e.g., 10.50.0.1/24).
3. Add a peer (the UCG-Max) and assign a specific tunnel IP.
4. Generate the client configuration and export the `.conf` file.

#### Phase 2: Configure the UCG-Max (The Client)
1. Open the UniFi OS console and navigate to Settings > VPN.
2. Click on the VPN Client tab and click Create New.
3. Select WireGuard as the protocol and upload the `.conf` file exported from the Windows server.
4. Verify the fields map correctly and click Apply / Save.

#### Phase 3: Implement Routing & Traffic Mapping
1. Create a static route on the UCG-Max to direct traffic destined for the 192.168.10.0/24 network into the WireGuard tunnel.
2. Ensure bi-directional visibility on the Windows server by adding a persistent route in the Windows Command Prompt (Admin).

### Critical Health Checks
1. **Firewall Rules**: Create an allow rule allowing your local LAN network to communicate freely with the Remote 192.168.10.0/24 network.
2. **Laptop Sleep States**: Disable Sleep when plugged in and HDD sleep to prevent the tunnel from collapsing during the night.

### Configuring WS4W Fields Properly
When configuring WS4W, fill out the fields as follows:

1. **DNS Servers Field**: Put the IP address of the DNS resolver you want the client to use.
2. **Search Domains Field**: Put the domain name used by your UniFi networks (e.g., `.lan` or `.local`).

By following these steps and considerations, you can establish a reliable and high-speed site-to-site connection between your UniFi Cloud Gateway Max and your legacy USG-3P using WireGuard on a Windows laptop server.
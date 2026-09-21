---
Title: "Subnet Size Considerations and Network Performance"
Date: "2026-07-04_13_13"
Tags:
  - Networking
Split_From_Line: 35
Category: "Networking"
---
### Subnet Size and Network Latency

Increasing the CIDR resolution (making subnets smaller) does not reduce network latency. The performance benefits of smaller subnets come from reducing noise, not reducing speed delays.

#### Latency vs. Broadcast Noise

*   No Speed Difference: Routers process a /28 packet at the same hardware speed as a /24 packet. The routing lookup time is identical.
*   Broadcast Containment: Smaller subnets reduce the total number of devices shouting broadcast traffic (like ARP requests or MDNS discoveries).
*   The Reality: In a small network with under 64 total devices across three subnets, the total broadcast noise is already near zero. Changing from a /24 to a /26 or /28 will provide no measurable difference in latency or ping times.

### Subnet Math Check

When working with subnets, it is essential to keep a close eye on the usable host counts, as the network ID and broadcast address take up two slots:

*   /28 (Management): 14 usable IP addresses (perfect for a few switches and access points).
*   /26 (Clients): 62 usable IP addresses.
*   /25 or /26 (IoT): A /26 gives you 62 usable slots. If you have smart bulbs and switches, they add up faster than you think.

### UniFi "Auto" Defaults and DHCP Settings

When you configure a network in the UniFi Network Controller, the first IP address in the subnet is automatically assigned to the UniFi Gateway itself to serve as the default gateway for that VLAN. This IP address cannot be handed out or assigned as a static DHCP reservation to any other client device.

#### How UniFi "Auto" DHCP Behaves

If you choose "Auto" for the DHCP settings on a newly created /24 subnet, the UniFi Controller applies the following defaults to protect infrastructure IPs:

*   The Router/Gateway IP: Permanently binds to 192.168.10.1.
*   The Auto DHCP Range: Automatically sets the pool from 192.168.10.6 to 192.168.10.254.
*   The Auto Exclusions: It intentionally leaves 192.168.10.2 through 192.168.10.5 completely unassigned.

#### Where to Make Reservations

If you need to assign a fixed, reserved IP address to a specific device (like a switch, server, or access point), you must use an address from the available non-gateway pool:

*   192.168.10.2 through 192.168.10.5: This is the ideal zone for reservable IPs because the "Auto" DHCP pool naturally avoids them.
*   Inside the Auto Pool (.6 to.254): You can also reserve an IP within this range using the UniFi "Fixed IP" feature under the client's configuration tab. The controller's DHCP server is smart enough to remove that specific IP from the dynamic pool so no duplicate IP conflicts occur.

### Protecting Network Infrastructure

UniFi leaves the first four usable IPs (192.168.10.2 through 192.168.10.5) out of the auto DHCP pool to protect network infrastructure. This provides a safe, predictable zone to manually assign Fixed IPs to your UniFi hardware, ensuring they never conflict with everyday client devices like phones or laptops.

### Viewing Auto-Configured Settings

When you leave a network on "Auto," the UniFi Controller hides the manual configuration fields, but you can still view the exact specifications in two main places:

1.  Inside the Network Settings (Read-Only Summary):
    *   Go to Settings > Virtual Networks.
    *   Click on the specific network you created.
    *   Look at the top overview block or scroll down to the IP Management section.
    *   Even when set to "Auto," UniFi will display a read-only text summary showing the Gateway IP (e.g., 192.168.10.1) and the active DHCP Range (e.g., 192.168.10.6 - 192.168.10.254).
2.  The Client Devices Page (Real-World Check):
    *   Click on the Client Devices tab on the left menu.
    *   Click the Display Options filter in the top right.
    *   Ensure the IP Address and Network columns are checked.
    *   Filter by your new VLAN. You will see your connected devices occupying IPs starting strictly from 192.168.10.6 onwards.

### Pro-Tip for Custom Subnets

If you prefer setting your subnets manually, note that if you change your subnet size (e.g., to a /26 or /28), switching DHCP to "Manual" is highly recommended. The "Auto" algorithm will still try to carve out a chunk of your addresses, which can severely starve a smaller /28 network that only has 14 total usable IPs to begin with.

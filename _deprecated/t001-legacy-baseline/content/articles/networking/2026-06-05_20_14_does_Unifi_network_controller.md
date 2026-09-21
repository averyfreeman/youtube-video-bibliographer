---
Title: "does Unifi network controller \"auto scale network\" feature start at a smaller resolution than /24?"
Date: "2026-06-05_20_14"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
Configuring Subnets and DHCP Settings in UniFi Network Application
===========================================================

### Introduction to Auto-Scale Network Feature

The Auto-Scale Network feature in the UniFi Network application starts with a standard /24 subnet, providing 254 host IPs. If the network runs out of available IP addresses, the controller automatically expands the subnet mask to a larger size, such as /23 or /22, to allocate more IP addresses. However, it is not possible to set the Auto-Scale feature to start with a smaller subnet size, such as /25 or /26. To use a smaller subnet, you must manually disable the Auto-Scale Network feature and set the subnet size yourself.

### Configuring Subnets Manually

If you need a smaller subnet, you can manually configure the correct subnet and DHCP settings. To do this, you will need to consider your current network setup, the number of clients you are trying to isolate, and whether you are using UniFi VLANs.

### Inter-VLAN Connectivity and CIDR Sizes

Having different CIDR sizes for different VLAN subnets does not pose an inherent risk to inter-VLAN connectivity in UniFi. Routers can route traffic between networks of different sizes without issues, as long as specific configuration details are managed correctly.

#### Core Routing Behavior

*   Native Layer 3 Routing: The UniFi Gateway automatically knows the route to every subnet it manages, regardless of size.
*   Independent Subnets: A /28 network can communicate with a /25 network in the same way it communicates with another /24 network.

#### Critical Configuration Risks to Avoid

*   IP Address Overlap: Ensure that none of your subnets overlap. For example, if your Clients network is 192.168.1.0/26, your IoT network cannot start inside the same range.
*   Incorrect Gateway IPs: Each VLAN must use the correct gateway IP corresponding to its specific subnet size.
*   Firewall Rule Mistakes: If you create manual firewall rules to block inter-VLAN traffic, you must define your IP groups or CIDR blocks perfectly. A single typo in a /28 or /26 range can break your intended security policy.
*   DHCP Pool Exhaustion: A /28 subnet only provides 14 usable IP addresses. If you connect more devices than the subnet allows, new devices will fail to get an IP address and lose connectivity.

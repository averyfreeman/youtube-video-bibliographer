---
Title: "is unudhcpd suitable for dhcp server for samba-dc on alpine? isc-dhcp-server no longer in repos."
Date: "2026-06-28_04_00"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
Choosing the Right DHCP Server for a Samba Active Directory Domain Controller
==========================================================================

When setting up a Samba Active Directory Domain Controller (AD/DC), it's essential to select a robust DHCP server that supports dynamic DNS updates via TSIG/GSS-TSIG. This ensures that the DHCP server notifies the Samba AD's DNS server whenever an IP address is assigned or renewed, keeping forward and reverse lookup zones synchronized.

Why Unudhcpd is Unsuitable
---------------------------

Unudhcpd is not a suitable choice for a Samba-DC environment. It's a basic, stripped-down server designed to lease only one IP address to a client, lacking support for critical Active Directory network settings and dynamic DNS updates.

Recommended Alternatives
-------------------------

Since isc-dhcp-server has been deprecated by ISC and dropped from modern Alpine repositories, consider the following alternatives:

1. **Kea DHCP**: The official successor to isc-dhcp-server, supporting robust lease tracking, advanced subnetting, and native TSIG dynamic DNS updates for Samba AD.
2. **Dnsmasq**: A lightweight alternative that combines a DHCP server, DNS server, and TFTP server in one binary, natively supporting notifications to Samba's internal DNS or an external BIND9 server.
3. **Running ISC DHCP in a Container**: For those relying on legacy ISC DHCP configurations and TSIG scripts, running a pre-packaged ISC DHCP server container on an Alpine machine is an option.

DNS Backend Considerations
---------------------------

To determine the exact DDNS and TSIG configuration needed, it's essential to know which DNS backend is being used for the Samba-DC. In this case, the internal Samba DNS is being used to save memory.

Feature Compatibility with Samba
-------------------------------

When using Samba's internal DNS, Dnsmasq is the superior choice for feature compatibility. Samba's internal DNS engine is lightweight but lacks TSIG key support, making standard automated Dynamic DNS protocols incompatible.

Overcoming the TSIG Limitation with Dnsmasq
------------------------------------------

Dnsmasq's native `dhcp-script` feature allows it to trigger a local bash script whenever a DHCP lease is handed out, renewed, or expired. By passing lease details to a custom script that runs `samba-tool dns add` or `samba-tool dns delete`, Dnsmasq can directly update the Active Directory database, bypassing the internal DNS engine's lack of TSIG support.

Why Kea DHCP Struggles with Internal DNS
-----------------------------------------

Kea relies on standard RFC 2136 protocol messages via its `kea-dhcp-ddns` sidecar binary to talk to DNS servers. However, its support for Kerberos-based GSS-TSIG security required by Active Directory is only available via a proprietary, paid premium hook (`gss_tsig`). Even with standard TSIG keys, Samba's internal DNS engine will reject them due to its lack of TSIG support.

Recommended Dnsmasq Implementation
------------------------------------

To set up Dnsmasq efficiently on Alpine while preserving memory, follow these steps:

1. Configure Dnsmasq to only act as a DHCP server, ensuring it doesn't listen on DNS port 53 to avoid conflicts with Samba.
2. Deploy a wrapper script inspired by the official Samba Wiki DHCP Guide, which intercepts Dnsmasq's environment variables and updates the AD environment via `samba-tool dns add` or `samba-tool dns delete`.

Example script:
```markdown
samba-tool dns add 127.0.0.1 samdom.example.com "$hostname" A "$ip" -k yes
```
A complete shell script configuration for Dnsmasq's `dhcp-script` handler can be provided to deploy directly onto an Alpine machine.

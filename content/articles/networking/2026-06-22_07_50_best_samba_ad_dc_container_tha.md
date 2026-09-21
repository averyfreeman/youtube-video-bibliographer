---
Title: "best samba ad dc container that uses heimdal and has built-in dns"
Date: "2026-06-22_07_50"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
# Deploying a Samba Active Directory Domain Controller
=====================================================

This guide provides a step-by-step walkthrough of deploying a Samba Active Directory Domain Controller using the `instantlinux/samba-dc` image.

## Key Features of instantlinux/samba-dc
------------------------------------

*   Heimdal KDC: Built directly into the Samba packages to ensure maximum AD compatibility and stability.
*   Built-in DNS: Utilizes the Samba Internal DNS backend (SAMBA_INTERNAL_DNS) which automatically creates the required _msdcs, _tcp, and _udp SRV records.
*   Persistence: All data, Kerberos databases, and DNS zones are mapped to external bind-mounted volumes.

## Recommended Deployment (Docker Compose)
-----------------------------------------

To avoid port collisions with the host's DNS and network, it is highly recommended to run this container in host network mode.

```yml
services:
  samba-dc:
    image: instantlinux/samba-dc:latest
    container_name: samba-dc
    hostname: dc1
    networks:
      - host
    environment:
      - TZ=America/Los_Angeles
      - REALM=YOURDOMAIN.LOCAL
      - DOMAIN=YOURDOMAIN
      - ADMINPASS=YourSecretPassword123!
    volumes:
      - /opt/samba/etc:/etc/samba
      - /opt/samba/var:/var/lib/samba
      - /opt/samba/run:/var/run/samba
    cap_add:
      - SYS_ADMIN
      - NET_ADMIN
    restart: unless-stopped

networks:
  host:
    external: true
```

## Critical Setup Notes
----------------------

*   Host OS DNS: Because AD requires the Domain Controller to act as the primary DNS server for domain-joined machines, you must stop the host's systemd-resolved stub listener on port 53.
*   Static IP: The container should be given a static IP on your LAN, as Active Directory relies heavily on a fixed address for SRV records.

## Active Directory Subdomain Configuration
-----------------------------------------

It is recommended to put your Active Directory in a dedicated subdomain like `ad.sites.net`, shared across both sites.

Using a flat, single domain (`sites.net`) for both your public/internal network equipment and your Active Directory infrastructure creates severe DNS conflicts, administrative headaches, and security risks.

### Advantages of a Subdomain

*   Resolves DNS Authority Conflicts
*   Clean Linux Client Scannability (`/etc/resolv.conf`)
*   Security Boundary and Namespace Isolation

## Architecture Breakdown for Both Sites
--------------------------------------

Because you are using ZeroTier to bridge the sites, the layout remains incredibly simple under a shared `ad.sites.net` subdomain:

| Asset              | Site 1 (192.168.10.0/24) | Site 2 (192.168.20.0/24) | Primary DNS Server     |
| :----------------- | :------------------------- | :------------------------- | :-------------------- |
| Network Gateway   | `gw1.sites.net` (10.1)    | `gw2.sites.net` (20.1)    | External / Router Local |
| Active Directory DC | `dc1.ad.sites.net` (10.10) | `dc2.ad.sites.net` (20.10) | Self (Samba Internal DNS) |
| Domain Members    | `pc101.ad.sites.net`      | `pc201.ad.sites.net`      | Local Site DC IP      |

## DNS Forwarding Configuration
------------------------------

To make this work flawlessly, you configure DNS Forwarding on your Samba Domain Controllers.

When a domain client asks `dc1.ad.sites.net` for the location of `gw1.sites.net`, the Samba container realizes it does not own the parent `sites.net` zone and forwards the request directly to your local gateway (`192.168.10.1`), which resolves it instantly.

## Running the Container with Podman
--------------------------------------

To run the container with Podman, use the following command:

```bash
sudo podman run -d \
  --name samba-dc \
  --hostname dc1 \
  --network host \
  --privileged \
  -e TZ=America/Los_Angeles \
  -e INTERFACES=zt6ntidzpt \
  -e REALM=AD.AVERYFREEMAN.COM \
  -e DOMAIN=AD \
  -e WORKGROUP=AD \
  -e DNS_FORWARDER=192.168.0.1 \
  -e ADMINPASS=YourSecretPassword123! \
  -e SERVER_STRING="Container AD server at condo" \
  -v /var/lib/samba-dc/etc:/etc/samba:Z \
  -v /var/lib/samba-dc/var:/var/lib/samba:Z \
  -v /var/lib/samba-dc/run:/var/run/samba:Z \
  --restart unless-stopped \
  instantlinux/samba-dc:latest
```

## Troubleshooting
----------------

*   If you encounter issues with the `ADMIN_PASSWORD_SECRET` variable, ensure that you have created a native Podman secret using the `podman secret` command.
*   If you experience case mismatch issues in `netlogon.conf`, create a symbolic link to bridge the case gap or modify the configuration file to point to the lowercase directory path.

## Additional Tools and Resources
-------------------------------

*   OpenRSAT: A free, open-source, cross-platform graphical replacement for Microsoft’s legacy Management Consoles (MMC).
*   Zentyal: A fully-featured, built-in Web GUI that allows you to manage users, DNS records, and domain settings straight from a browser tab.

## Conclusion
----------

Deploying a Samba Active Directory Domain Controller using the `instantlinux/samba-dc` image provides a robust and scalable solution for managing your network infrastructure. By following the guidelines outlined in this guide, you can ensure a successful deployment and troubleshoot common issues that may arise.

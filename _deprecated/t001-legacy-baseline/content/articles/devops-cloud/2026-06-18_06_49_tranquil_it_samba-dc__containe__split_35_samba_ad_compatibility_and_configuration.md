---
Title: "Samba AD Compatibility and Configuration"
Date: "2026-07-04_11_04"
Tags:
  - DevOps and Cloud
Split_From_Line: 35
Category: "DevOps and Cloud"
---
### Critical Warning: Windows Server 2025 Compatibility

You generally cannot simply join a Samba DC to a domain operating at the Windows Server 2025 Functional Level. Samba AD currently supports up to the Windows Server 2016 functional level.

To allow Samba DCs to participate, you must keep your Domain and Forest Functional Levels at Windows Server 2016. You can still use Server 2025 as a DC OS, just don't raise the functional level.

### Reputable Container Options (Debian + Heimdal)

There is currently no official "Samba Team" container that meets the specific criteria of using Debian and Heimdal. However, you can build your own image using Tranquil IT's validated Debian packages or use community images like `diegogslomp/samba-ad-dc` or `pitkley/samba-ad-dc`.

### Building Your Own Image

Building your own image gives you total control and uses the most reputable packages (Tranquil IT) on a stable base (Debian 12). Here is an example Dockerfile:

```dockerfile
FROM debian:bookworm-slim

# Install prerequisites and Tranquil IT signing key
RUN apt-get update && apt-get install -y wget gnupg2 lsb-release && \
    wget -qO - https://samba.tranquil.it/samba-pub.key | gpg --dearmor > /usr/share/keyrings/samba-pub.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/samba-pub.gpg] https://samba.tranquil.it/debian/samba-4.19/ bookworm main" > /etc/apt/sources.list.d/samba.list

# Install Samba AD DC packages (Heimdal is embedded/default in these builds)
RUN apt-get update && \
    apt-get install -y samba smbclient krb5-config winbind net-tools iproute2

# Expose necessary AD ports
EXPOSE 53 53/udp 88 88/udp 135 137-138/udp 139 389 389/udp 445 464 464/udp 636 3268 3269

# Ensure /var/lib/samba and /etc/samba are volumes for persistence
VOLUME ["/etc/samba", "/var/lib/samba"]

CMD ["samba", "-i"]
```
You must run this container with `--network host` and `--privileged` (or strictly managed capabilities like `CAP_SYS_ADMIN`) because AD requires low-level network and filesystem attribute access.

### Summary Checklist for Success

To ensure a successful deployment, follow this summary checklist:

*   **Primary DC**: Ensure your Windows Server 2025 DC is using Functional Level 2016.
*   **Networking**: Run the container in `host` network mode.
*   **DNS**: Point the container's `/etc/resolv.conf` to the Windows DC during the join process so it can find the SRV records.
*   **Join Command**: Use `samba-tool domain join yourdomain.local DC -U administrator --realm=YOURDOMAIN.LOCAL` inside the container.

### Downgrading Functional Level

If you need to downgrade the functional level of your domain, you cannot directly downgrade from Functional Level 2025 to 2016. Instead, you must choose between building a brand new domain or using a migration strategy.

### Building a Brand New Domain

If you choose to build a brand new domain, you will need to:

*   Demote your current Server 2025 Active Directory configuration.
*   Re-promote the server as a brand-new forest root, setting the Forest and Domain Functional Levels to Windows Server 2016.
*   Join your Samba DC container to the new domain.

### Migration Strategy

If you choose to use a migration strategy, you will need to:

*   Spin up a temporary Windows Server (2019 or 2022) as a member server in your network.
*   Create a completely new domain forest on that intermediary server, ensuring you choose Functional Level 2016 during setup.
*   Migrate your objects from the old 2025 domain to the new 2016-level domain using the Active Directory Migration Tool (ADMT) or PowerShell.
*   Join your Samba DC container to the new domain.
*   Re-introduce your Server 2025 machine as an additional DC to the new domain.

### Authenticating Non-AD Machines

Non-AD machines can authenticate against your Samba DC using standard protocols such as LDAP, RADIUS, or PAM.

*   **LDAP**: Samba AD runs a full LDAP server on ports 389 and 636. Non-AD machines can use "LDAP Bind" authentication.
*   **RADIUS**: You can spin up a FreeRADIUS container that connects to Samba via LDAP or NTLM, allowing users to log into Wi-Fi using their AD lab credentials.
*   **PAM**: You can configure standalone Linux machines to validate credentials against Samba's LDAP directory using pam_ldap.

### Modern Web Auth: SSO, OAuth 2.0, and SAML

To bridge Samba to the web, you can use a Connector Identity Provider (IdP) that acts as a translator between Samba's LDAP directory and web applications.

*   **SSO**: Single Sign-On is the concept of logging in once to an identity portal and automatically gaining access to all connected apps without typing your password again.
*   **OAuth 2.0 & SAML**: These are the actual technical protocols used to achieve SSO.

You can use tools like Authentik to connect to Samba via LDAPS and sync user accounts, and then use OAuth 2.0 to authenticate web applications.

### Setting Up RADIUS with UniFi

To set up RADIUS with UniFi, you can use either the built-in RADIUS server on your USG-3P or a separate FreeRADIUS container.

*   **Path A: Use UniFi's Built-In RADIUS Server**: Enable the RADIUS server on your USG-3P, create users, and apply the RADIUS profile to your Wi-Fi network.
*   **Path B: Use Active Directory / Samba RADIUS**: Use the USG-3P as a proxy that passes the request to your domain infrastructure, either using Windows NPS or a FreeRADIUS container connected to Samba via LDAP.

When setting up RADIUS, it's essential to understand the Shared Secret, which is a backend handshake password used exclusively between your UniFi Access Points and your RADIUS Server.

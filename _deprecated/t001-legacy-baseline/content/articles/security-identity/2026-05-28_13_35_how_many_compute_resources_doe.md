---
Title: "how many compute resources does an adfs server need for a small network?"
Date: "2026-05-28_13_35"
Tags:
  - Security and Identity
Category: "Security and Identity"
Source_Products:
  - AI_Mode
  - Search
---
# Active Directory Federation Services (AD FS) for Small Networks
For a small network, an AD FS server typically requires modest resources: 2 vCPUs, 4 GB to 8 GB of RAM, and 50 to 100 GB of storage.

## Recommended Compute Specs
* CPU: 2 vCPUs (sufficient for handling typical small-network authentication traffic).
* RAM: 4 GB to 8 GB. (4 GB is the standard baseline; going up to 8 GB provides a healthy buffer if you run third-party AV monitoring/AV agents).
* Disk Space: 50-100 GB for the OS and application files.

## Small Network Deployment Tips
* Internal vs. External: If users only need to authenticate while on the local network (or VPN), you only need internal AD FS servers. If they need single sign-on (SSO) from outside the office, you will also need Web Application Proxy (WAP) servers in your DMZ, which require similar or slightly lower resources (e.g., 1–2 vCPUs and 4 GB RAM).
* High Availability: For reliable uptime, Microsoft recommends deploying at least two AD FS servers in a farm.
* Database: For environments with fewer than 30 federation servers and 100 relying party trusts, you can use the built-in Windows Internal Database (WID) instead of requiring a full SQL server.

# Alternatives to AD FS Web Proxy
Yes, there are several modern alternatives to the Active Directory Federation Services (AD FS) Web Application Proxy (WAP).

## Top Modern Alternatives
* Azure AD Application Proxy (Microsoft Entra ID): Best for Microsoft environments. It requires no inbound firewall ports, handles external authentication via Entra ID, and supports conditional access.
* NGINX Plus: Best for high-performance load balancing and reverse proxying. It supports OpenID Connect (OIDC) and JSON Web Tokens (JWT) for secure authentication handling.
* F5 BIG-IP Access Policy Manager (APM): Best for enterprise-grade security. It provides a robust context-aware access gateway that can completely replace AD FS and WAP functionality.
* Cloudflare Zero Trust / Access: Best for cloud-first infrastructure. It replaces traditional reverse proxies with a secure edge network, authenticating users before they ever reach your network.
* Apache HTTP Server (with mod_auth_openidc): Best for open-source flexibility. It functions as a robust reverse proxy that offloads authentication to modern identity providers.

# What is AD FS?
AD FS (Active Directory Federation Services) is a Microsoft software component that provides Single Sign-On (SSO) for users outside your local network.

## Core Use Cases
* Single Sign-On (SSO): Employees only have to remember one password for both internal desktop logins and external websites.
* Identity Federation: Securely linking your user accounts with external partners, vendors, or SaaS providers so they can access shared resources.
* Centralized Access Control: If an employee leaves the company and you disable their account in your local Active Directory, they instantly lose access to all cloud apps, because AD FS will refuse to issue them a new login ticket.

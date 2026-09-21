---
Title: "Authentik as an Alternative to Active Directory"
Date: "2026-07-04_14_58"
Tags:
  - Security and Identity
Split_From_Line: 39
Category: "Security and Identity"
---
# Can Authentik Replace Active Directory?
No, Authentik cannot completely replace a full Active Directory (AD) installation, but yes, it can replace AD if your network is entirely cloud/web-focused and you do not need Windows desktop management.

## What Authentik Can and Cannot Replace
### What Authentik CANNOT do (Where you still need AD)
* Windows Device Management: Authentik cannot push Group Policies (GPOs) to local computers, push software packages, or manage Windows Updates.
* Native Windows Workstation Logins: You cannot join a Windows 10/11 laptop directly to Authentik to log into the physical Windows desktop.
* Kerberos / NNTLM Authentication: Authentik does not support native Windows network file-sharing protocols (SMB/CIFS) that rely on Kerberos tickets.

### What Authentik CAN do (Where it replaces AD functionality)
* Central User Database: Authentik features its own internal database to create, delete, and group users without needing any external LDAP backend.
* Web Single Sign-On (SSO): It fully replaces AD FS, handling modern web logins via OAuth2, OpenID Connect (OIDC), and SAML.
* Legacy App Compatibility: Through [Authentik LDAP Outposts](https://chrisproject.org/docs/admin/authentik-ldap), Authentik can pretend to be an LDAP server. Legacy applications (like a local NAS or a self-hosted wiki) can query Authentik over LDAP just like they would query Active Directory.

# Comparison Matrix
| Feature | Active Directory | Authentik |
| --- | --- | --- |
| Primary Focus | Local Network & Device Control | Web Application Access & SSO |
| Desktop Logins | Native (Windows Domain Join) | No (Web application logins only) |
| Authentication Protocols | Kerberos, NTLM, LDAP | SAML, OIDC, OAuth2, Proxy |
| LDAP Capabilities | Native LDAP Server | Emulated via [LDAP Outposts](https://chrisproject.org/docs/admin/authentik-ldap) |
| MFA Support | Requires third-party plugins | Native (TOTP, WebAuthn/Passkeys) |

# The Verdict for Your Network
1. **Go with Authentik Only**: If your network consists of Macs, Linux machines, or unmanaged Windows laptops, and your primary goal is securing web-based dashboards, Docker apps, and cloud tools.
2. **Stick with Active Directory (or hybrid)**: If you manage an office environment where you must lock down physical Windows desktops, enforce corporate wallpaper/GPOs, or manage local network file storage shares.

Many environments choose a **hybrid approach**: they keep Active Directory as the main database of users, and connect Authentik to AD as an [LDAP Source](https://docs.goauthentik.io/users-sources/sources/directory-sync/active-directory/). This lets AD handle the desktop management while Authentik handles modern, MFA-protected web logins.

# Replacing Active Directory with Cloud Services or Open-Source Platforms
Yes, they can replace Active Directory if you only need a central list of users and passwords for logging into websites, media servers (Plex/Jellyfin), and tools like Grafana or Nextcloud.

## The "Lite" Option: LLDAP (and similar tools)
Best for: Homelabs, personal servers, and small dev teams.
What it replaces: The "User List" part of AD. It gives you one username/password for all your self-hosted apps (via LDAP).
What it misses: Everything related to Windows devices. You cannot use LLDAP to push a wallpaper to a laptop, disable USB ports, or enforce screen lock times. It creates users, not device policies.

## The "True" Open Source Replacement: Samba 4
Best for: Small businesses or homelabs that need to manage Windows computers for free.
What it replaces: Almost the entire on-premise Active Directory. Samba can actually act as a Domain Controller.
Capabilities: You can join Windows 10/11 Pro computers to a Samba domain. You can even use the standard Microsoft "Remote Server Administration Tools" (RSAT) to manage Group Policies (GPOs) just like a real Windows Server.

## The Linux Replacement: FreeIPA
Best for: Environments that are 90% Linux (servers, desktops) and 10% Windows.
What it replaces: AD for Linux machines. It handles Sudo rules, SSH keys, and automount maps centrally.
Windows Support: It can create a "Trust" with Active Directory, but it does not replace AD for managing Windows clients directly. You cannot push Windows Group Policies from FreeIPA alone.

## The Cloud Replacement: JumpCloud / Microsoft Entra ID
Best for: Modern companies that don't want any servers in the office.
What it replaces: Everything. These services install a small "Agent" on your laptops (Windows, Mac, and Linux).
Capabilities: This agent talks to the cloud to sync passwords and enforce security policies (e.g., encrypt the hard drive, lock screen after 5 mins).

# Choosing the Best Linux Distribution for a Samba Domain Controller
Debian Stable is widely considered the gold standard for a "friction-free" experience.

## Why Debian Stable?
The Samba AD DC requires specific Kerberos libraries (Heimdal) to function correctly as a domain controller. Debian includes these dependencies and packages Samba with AD DC support enabled in its default repositories.

## The RHEL/CentOS/AlmaLinux Issue
Red Hat Enterprise Linux (and its clones) relies on MIT Kerberos, which is historically incompatible with Samba's AD DC role. Because of this conflict, Red Hat removed the AD DC functionality from their official Samba packages years ago.

# Ubuntu's Tools for Active Directory Integration
Canonical is highly invested in the Microsoft Active Directory ecosystem, but with a very specific, strategic focus: they want Ubuntu to be the default choice for Windows-dominated enterprise fleets.

## adsys
adsys is a major selling point for Canonical's commercial enterprise tier (Ubuntu Pro). It acts as a native Group Policy Object (GPO) client, allowing Windows admins to manage Ubuntu machines using standard Windows tools.

## How adsys Works
adsys bridges the gap between Ubuntu and Active Directory by acting as a GPO client. It allows Windows admins to configure policies for Ubuntu machines using the standard Group Policy Management Console (GPMC).

# Joining a Fedora Laptop to a Windows Domain
The domain join log looks perfect. realmd handled everything properly, and the laptop is fully enrolled in the domain.

## Switching to Winbind
Yes, you can configure Fedora and RHEL-ecosystem machines to use Winbind instead of SSSD for identity and authentication using Authselect.

## Step 1: Install the Required Packages
To use Winbind, you must swap out the SSSD client packages for the Samba Winbind and Kerberos modules:
```bash
sudo dnf install samba-winbind samba-winbind-clients krb5-workstation
```
## Step 2: Select the Winbind Profile with Authselect
authselect abstracts away the manual editing of complex PAM and NSS files. You can forcefully switch the entire system profile to winbind and retain your automatic home directory creation feature:
```bash
sudo authselect select winbind with-mkhomedir --force
```
## Step 3: Configure smb.conf for Domain Membership
Unlike SSSD (which acts as a standalone client), Winbind relies entirely on your local /etc/samba/smb.conf file to know how to map Windows users to Linux.

## Step 4: Join the Domain via Samba
Because you are bypassing realmd/SSSD, you would join the machine natively using the Samba toolset:
```bash
sudo net ads join -U avery
```
## Step 5: Start the Services
Finally, you stop SSSD and enable the Winbind daemon:
```bash
sudo systemctl disable --now sssd
sudo systemctl enable --now winbind
```
# Fixing Asymmetric Routing Issues with ZeroTier and OCI
The issue lies in your NAT/Masquerade rules and how the Oracle Cloud Network (br0) interacts with your ZeroTier network.

## The Root Cause: Outbound Routing Isolation
You have a bridge interface (br0) setup on OCI, and you are explicitly telling the Linux kernel to MASQUERADE traffic leaving br0.

## The Fix: Isolate ZeroTier from MASQUERADE
You need to tell the OCI host not to change the source IP of packets heading to your ZeroTier network.

### Step 1: Add an Exception Rule
Add a rule that explicitly accepts traffic heading to your ZeroTier subnet before the MASQUERADE rule catches it:
```bash
sudo iptables -t nat -I POSTROUTING 1 -d YOUR_ZEROTIER_SUBNET/24 -j ACCEPT
```
### Step 2: Clear and Fix Duplicated Rules
You have duplicate MASQUERADE rules. Flush the NAT table and rewrite them cleanly so that masquerading only applies to traffic leaving br0 to external targets, skipping your internal tunnels:
```bash
# Flush the NAT table completely
sudo iptables -t nat -F

# Re-add your Ollama/LLM port forward if needed
sudo iptables -t nat -A PREROUTING -p tcp --dport 11434 -j DNAT --to-destination 192.168.200.183:11434

# Exclude your ZeroTier subnet from translation (use your actual ZT CIDR block)
sudo iptables -t nat -A POSTROUTING -d 192.168.192.0/24 -j ACCEPT

# Clean up the single masquerade rule for the bridge interface
To ensure proper routing, we need to configure the iptables rule for the bridge interface. This can be achieved by running the following command:
```bash
sudo iptables -t nat -A POSTROUTING -o br0 -j MASQUERADE
```
## Step 3: Save Your Setup Persistent
Because OCI uses `netfilter-persistent` (`iptables-persistent`), our changes will vanish on reboot unless we overwrite the file. To save our setup persistently, we can use the following command:
```bash
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```
Next, we'll focus on resolving the asymmetric routing issue.

## Resolving Asymmetric Routing
To fix the asymmetric routing, we need to ensure that our OCI instance can communicate with the Windows 2025 DCs. We can test this by running a ping command from the OCI instance to the DC IP:
```bash
ping -I <your-zt-interface-ip> <DC-IP>
```
If the ping is successful, it means our asymmetric routing is fixed, and we can proceed with Samba shares safely.

## Understanding the Network Layout
To better understand the network layout, let's examine the IP configuration:
```markdown
lo UNKNOWN 127.0.0.1/8 ::1/128
br0 slave: **enp0s6 UP ** enp1s0 UP
zerotier: <strong>zt6ntidzpt UNKNOWN 192.168.0.200/24 fe80::e449:cff:fefc:82a8/64</strong>
br0 UP 172.32.1.27/32 172.32.1.27/24
lxd: <strong>lxbr0 UP 192.168.200.1/24</strong>
```
From this output, we can see that our ZeroTier interface `zt6ntidzpt` is configured with the IP address `192.168.0.200/24`.

## Identifying the Cause of the Issue
The problem is likely due to a ZeroTier Managed Route missing link or an RP_Filter (Reverse Path Filtering) kernel drop. To resolve this, we need to check the ZeroTier routing table and ensure that the OCI instance knows how to reach the DCs.

## Configuring ZeroTier Managed Routes
We need to log into the ZeroTier Central Dashboard and go to Advanced -> Managed Routes. We should ensure that we have rules telling the network how to reach both the `192.168.1.0/24` and `192.168.0.0/24` subnets. If our home network is bridged, we need a route like:
```markdown
Target: 192.168.1.0/24 -> Via: (Leave blank / Managed by ZeroTier)
Target: 192.168.0.0/24 -> Via: (Leave blank)
```
On our OCI instance, we should run `ip route` and ensure that we see an explicit route forcing `192.168.1.0/24` out of `zt6ntidzpt`.

## Disabling Reverse Path Filtering
To test if Reverse Path Filtering is blocking us, we can temporarily disable `rp_filter` on all interfaces:
```bash
sudo sysctl -w net.ipv4.conf.all.rp_filter=0
sudo sysctl -w net.ipv4.conf.default.rp_filter=0
sudo sysctl -w net.ipv4.conf.zt6ntidzpt.rp_filter=0
```
Then, we can try to ping our DC from the OCI instance specifying the interface:
```bash
ping -I zt6ntidzpt 192.168.1.3
```
If the pings suddenly work, `rp_filter` was the culprit. We can make this fix permanent by adding the following lines to `/etc/sysctl.conf`:
```bash
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.conf.zt6ntidzpt.rp_filter = 0
```
## Active Directory Architecture: Subdomains vs. Sites
We have two architectural options for our Active Directory setup: a single domain with two AD sites or two separate subdomains. The recommended approach is to use a single domain with two AD sites.

### Option A: A Single Domain with Two AD Sites
This approach involves creating a single domain root and using Active Directory Sites and Services to divide the network logically by physical IP subnets.

#### How it Works
We tell Active Directory that `192.168.10.0/24` is Seattle and `192.168.20.0/24` is Woodinville.

#### The Benefit
This approach provides unified management, smart routing, and replication control.

### Option B: Two Separate Subdomains
This approach involves creating a root domain forest and provisioning the Woodinville DC as a distinct "Child Domain".

#### The Reality
This creates an explicit security and administrative boundary.

#### The Downsides
This approach requires managing separate sets of Group Policies, maintaining cross-domain Kerberos trusts, and adding DNS delegation complexity.

## Step-by-Step Execution Plan
To execute this plan smoothly, we should follow this structural order:

1. **Fix the Network Overlap**: Renumber one of our local networks away from the `192.168.1.0` default.
2. **Configure ZeroTier Managed Routes**: Add explicit routes so every device knows exactly where to send packets.
3. **Establish AD Sites and Services**: Once the network routes are clean and bi-directional, we can configure Active Directory Sites and Services.

## How ZeroTier Managed Routes Work
Managed Routes in the ZeroTier Central Console act as a global routing table injector. When a device joins our ZeroTier network, the ZeroTier agent automatically injects these routes directly into the operating system's kernel routing table.

## Your Global ZeroTier Routing Architecture
To make all four of our sites talk to each other flawlessly, we need to designate one machine at each physical site to act as the ZeroTier Gateway (or 'bridge router').

### The Managed Routes to Enter in ZeroTier Central
We should input the following exact pairings:
| Target Subnet (CIDR) | Via (Gateway ZT IP) | Description |
| --- | --- | --- |
| `192.168.0.0/24` | (Leave Blank) | This is the native ZeroTier pool. No gateway needed. |
| `192.168.20.0/24` | `192.168.0.10` | Sends Seattle traffic to the Seattle ZT gateway machine. |
| `192.168.10.0/24` | `192.168.0.20` | Sends Woodinville traffic to the Woodinville ZT gateway. |
| `172.32.1.0/24` | `192.168.0.200` | Sends traffic meant for OCI local networks to the OCI instance. |
| `192.168.1.0/32` | `192.168.0.100` | See note below for Olympia. |

### The Crucial Exception: Handling Olympia
Because we explicitly stated that we do not want to integrate with the business network and only need to hit a handful of IPs for RDP/SSH, we should not route their entire `/24` subnet. Instead, we should write Host Routes (using a 32 subnet mask) for only the specific target machines we manage.

## Enabling the Gateway Machines (OS Layer)
Once ZeroTier knows where to send the packets, the receiving machine at the site needs permission from its local operating system to pass that packet along to the rest of the local LAN. If our gateway machines are running Linux, we must explicitly turn on IP Forwarding and masquerading at the host level:
```bash
# 1. Enable IP forwarding in the Linux Kernel
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

# 2. Tell iptables to pass the traffic between the ZeroTier interface and local network
# (Replace zt6ntidzpt with the local machine's actual ZT interface name)
sudo iptables -A FORWARD -i zt6ntidzpt -j ACCEPT
sudo iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
```
With this complete cross-site mapping layout, our OCI instance will immediately recognize the path to our Windows 2025 DCs over the ZeroTier pipeline, resolving our routing mismatch completely.

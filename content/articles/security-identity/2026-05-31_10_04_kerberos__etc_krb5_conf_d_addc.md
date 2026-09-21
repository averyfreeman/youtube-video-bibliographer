---
Title: "kerberos /etc/krb5.conf.d/addc.conf"
Date: "2026-05-31_10_04"
Tags:
  - Security and Identity
Category: "Security and Identity"
Source_Products:
  - AI_Mode
  - Search
---
Configuring Kerberos for Active Directory Integration
=====================================================

### Introduction

To integrate a Linux system with an Active Directory (AD) domain, Kerberos configuration is essential. This guide provides a comprehensive overview of configuring Kerberos for AD integration, including the differences between MIT and Heimdal implementations.

### Purpose of addc.conf

The `/etc/krb5.conf.d/` directory allows for modularizing Kerberos configuration. Instead of editing the main `/etc/krb5.conf` file directly, environment-specific settings, such as Active Directory connections, can be placed in separate `.conf` files. The main configuration file automatically includes these snippets via the `includedir /etc/krb5.conf.d/` directive.

### Standard Configuration Template

To configure Kerberos for AD integration, create or edit the `/etc/krb5.conf.d/addc.conf` file with the following optimized structure:
```markdown
[realms]
    YOURDOMAIN.COM = {
        kdc = your-dc01.yourdomain.com
        kdc = your-dc02.yourdomain.com
        admin_server = your-dc01.yourdomain.com
        default_domain = yourdomain.com
    }

[domain_realm]
   .yourdomain.com = YOURDOMAIN.COM
    yourdomain.com = YOURDOMAIN.COM
```
Replace `YOURDOMAIN.COM` with your actual Active Directory domain name (in ALL CAPS) and `your-dc01` with your domain controller's hostname.

### Critical Configuration Settings

To ensure reliable integration with Active Directory, verify or add the following global settings in the `[libdefaults]` section:
* `dns_lookup_realm = false`: Disables DNS realm lookups to prevent performance lags and security risks.
* `dns_lookup_kdc = true`: Allows Kerberos to use DNS SRV records to find your Domain Controllers automatically if individual hostnames change.
* `rdns = false`: Disables reverse DNS lookups, which prevents authentication failures if reverse DNS zones are misconfigured in Active Directory.
* `default_realm = YOURDOMAIN.COM`: Sets your Active Directory domain as the default authentication target.

### Verification Steps

After saving the configuration file, verify the setup by running the following diagnostic commands:
1. **Test Ticket Acquisition**: Run `kinit Administrator@YOURDOMAIN.COM` (the realm must be capitalized). Enter your Active Directory password when prompted.
2. **View Active Tickets**: Run `klist` to confirm you have successfully received a Ticket Granting Ticket (TGT) from the Windows Domain Controller.
3. **Clear Cache**: Run `kdestroy` to remove the test ticket from your local credential cache when finished.

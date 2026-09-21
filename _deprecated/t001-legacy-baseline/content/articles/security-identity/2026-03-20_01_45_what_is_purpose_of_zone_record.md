---
Title: "what is purpose of zone records _caldavs._tcp.example.com. ?"
Date: "2026-03-20_01_45"
Tags:
  - Security and Identity
Category: "Security and Identity"
Source_Products:
  - AI_Mode
  - Search
---
# Understanding Zone Records for CalDAV Service Discovery
The purpose of the zone record `_caldavs._tcp.example.com.` is to enable automatic service discovery for calendar clients using the CalDAV protocol over a secure connection (SSL/TLS). This is an SRV (Service) record, which acts as a pointer that tells software where a particular service is hosted without the user needing to manually enter a server address or port number.

## Key Functions of SRV Records
SRV records have several key functions:
* **Auto-Configuration**: They allow calendar applications (like Apple Calendar, Thunderbird, or Outlook) to find the correct server and port just by using your email address.
* **Security Alignment**: The `s` in `_caldavs` indicates a secure (encrypted) connection, typically pointing to port 443.
* **Load Balancing**: By setting priority and weight values within the record, administrators can direct traffic to specific servers or distribute the load across multiple backup servers.

## Record Structure Breakdown
A typical entry in your DNS zone file would look like this:
```markdown
_caldavs._tcp.example.com. 86400 IN SRV 10 0 443 calendar.example.com.
```
This record specifies the service (`_caldavs`), protocol (`_tcp`), domain (`example.com`), time to live (`86400`), class (`IN`), type (`SRV`), priority (`10`), weight (`0`), port (`443`), and target (`calendar.example.com`).

## Configuring Email Authentication Records
To ensure your emails are authenticated correctly, you will need to add three specific records to your Cloudflare DNS dashboard:
* **SPF (TXT Record)**: Add a record that includes Google's mail servers (e.g., `v=spf1 include:_spf.google.com ~all`).
* **DKIM (TXT Record)**: Generate a unique "public key" within your Google Admin Console, then copy and paste that key into a new TXT record in Cloudflare.
* **DMARC (TXT Record)**: Create a record named `_dmarc` in Cloudflare that tells receiving servers what to do if SPF or DKIM fails (e.g., `v=DMARC1; p=none; rua=mailto:admin@example.com`).

## Important Considerations for DMARC Configuration
When configuring DMARC, keep the following considerations in mind:
* **Wait for Propagation**: Wait 48 hours after setting up SPF and DKIM before enabling your DMARC record to ensure all systems are aligned.
* **Alignment is Key**: DMARC will only pass if the domain in your "From" address matches the domain authenticated by SPF or DKIM.
* **Start Safely**: Start with a DMARC policy of `p=none` (monitoring mode) to receive reports via your `rua` email address and see if any legitimate mail is failing before moving to stricter policies like quarantine or reject.

By following these guidelines and configuring your SRV and DMARC records correctly, you can ensure secure and reliable email authentication and service discovery for your CalDAV clients. Additionally, consider utilizing Cloudflare's DMARC Management tool to visualize your XML reports and monitor your DMARC configuration.

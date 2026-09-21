---
Title: "active directory how can I create a trust between two subdomains"
Date: "2026-05-31_21_27"
Tags:
  - Security and Identity
Category: "Security and Identity"
Source_Products:
  - AI_Mode
  - Search
---
# Creating a Trust Between Two Subdomains in Active Directory
In Active Directory, subdomains belonging to the same forest do not require manual trust creation because two-way, transitive parent-child trusts are automatically established when a child domain is created. However, if your subdomains live in two entirely separate Active Directory forests, or if you need to create a Shortcut Trust to optimize authentication times between two distant subdomains in the same forest, you will need to manually configure the trust.

## Prerequisites and Considerations
Before creating an AD trust, ensure that the Domain Controllers (DCs) in both subdomains can resolve each other's Fully Qualified Domain Names (FQDNs). Additionally, consider the type of trust you need to create: 
- A Shortcut Trust optimizes the authentication path between two subdomains in the same forest.
- An External Trust connects two subdomains in different forests.
- A Forest Trust is required when creating a trust between two different forests, and it must be established from the Forest Root domains.

## Step 1: Configure DNS Resolution
To create an AD trust, configure DNS resolution between the two subdomains:
1. Log into the primary DNS server/Domain Controller of Subdomain A.
2. Open DNS Manager (`dnsmgmt.msc`).
3. Right-click Conditional Forwarders and select New Conditional Forwarder.
4. Enter the FQDN of Subdomain B and input the IP address of Subdomain B's Domain Controller.
5. Check the box to store the forwarder in Active Directory, then click OK.
6. Repeat this process on Subdomain B's DNS server, pointing back to Subdomain A.
7. Test connectivity by opening a command prompt on both sides and running: `nslookup [destination_subdomain_FQDN]`.

## Step 2: Ensure Firewall Ports are Open
Ensure that your network firewalls allow communication between the two subdomains over the required Active Directory ports:
- DNS: TCP/UDP 53
- Kerberos: TCP/UDP 88
- LDAP: TCP/UDP 389
- SMB: TCP 445
- RPC Endpoint Mapper: TCP 135
- RPC Dynamic Ports: TCP 49152-65535

## Step 3: Run the New Trust Wizard
To build the actual relationship, use the Active Directory Domains and Trusts console:
1. Log into a Domain Controller in Subdomain A with Domain Admin or Enterprise Admin credentials.
2. Open Server Manager, click Tools, and select Active Directory Domains and Trusts.
3. Right-click the name of your local subdomain and choose Properties.
4. Switch to the Trusts tab and click New Trust to open the wizard.
5. Click Next on the welcome page, then enter the FQDN of Subdomain B.
6. Choose the Trust Type:
   - Select Shortcut Trust if both subdomains are in the same forest but you want to optimize the authentication path.
   - Select External Trust if the subdomains are in different forests and you only want to connect these two specific subdomains.
7. Choose the Direction of Trust:
   - Two-way: Users in both subdomains can access resources in either domain.
   - One-way incoming or One-way outgoing: Restricts access to a single direction.
8. Select Sides of Trust:
   - Choose Both this domain and the specified domain if you have domain admin credentials for both sides.
   - Choose This domain only if you do not have credentials for the other side.
9. Specify the Authentication Level:
   - Domain-wide authentication: Automatically authenticates users from the trusted domain for all resources in this domain.
   - Selective authentication: Highly recommended for security. You must manually grant specific remote users or groups permission to access local computer objects.
10. Create a secure Trust Password (only required if you selected This domain only in step 8).
11. Complete the wizard and choose Yes, confirm the outgoing trust and Yes, confirm the incoming trust when prompted.

## Additional Considerations for Forest Trusts
If you are using two different forests and need to create a Forest Trust instead of an External Trust, you must run this wizard from the Forest Root domains (e.g., company1.com and company2.com) rather than the subdomains themselves.

## Troubleshooting and Further Assistance
If you encounter any issues during the setup, consider the following:
- Verify that the subdomains are in the same or different forests.
- Check the direction of trust (one-way or two-way).
- Review any specific error messages during the setup.
For targeted troubleshooting steps or PowerShell commands based on your setup, consider the following questions:
- Are these subdomains in the same forest or different forests?
- Do you want a one-way or two-way trust?
- Are you receiving any specific error messages during the setup?

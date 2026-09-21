---
Title: "macos terminal list ldap servers"
Date: "2026-06-10_21_10"
Tags:
  - Security and Identity
Category: "Security and Identity"
Source_Products:
  - AI_Mode
  - Search
---
# Listing LDAP Servers on macOS
To list the LDAP servers configured on your macOS system, use the `dscl` tool in your Terminal. Run the following command to retrieve the DNS host names or IP addresses of any configured LDAP or Open Directory servers.

If your system relies on Active Directory, you can use an alternative command to check binding status and dump your AD configuration.

For further assistance with checking search mappings or querying specific records on the LDAP server, additional guidance is available.

# Introduction to Platform SSO
Platform SSO (Platform Single Sign-On) is a modern macOS framework that integrates a user's cloud identity provider (IdP) directly into the Mac login window. Developed in collaboration with Apple and identity providers, it replaces traditional binding methods like Active Directory or LDAP with a cloud-first approach.

Platform SSO embeds authentication directly into the operating system, rather than treating single sign-on as an application-level feature. This provides a seamless authentication experience across the system.

## Key Features
The key features of Platform SSO include:

* **Password Synchronization**: Automatic matching and synchronization of local Mac login passwords with cloud corporate passwords.
* **True App and Web SSO**: Automatic sign-in to corporate apps and web browsers after unlocking the Mac, without repeated MFA or password prompts.
* **Passwordless Login**: Optional configuration to use the Mac's Secure Enclave, allowing hardware-bound, phishing-resistant keys triggered by Touch ID for login.
* **Just-In-Time Account Creation**: Instant provisioning of local user accounts for new employees on shared company Macs, using cloud credentials entered into the Mac login window.

## Supported Identity Providers and Management
Platform SSO requires a partnership between macOS, a Mobile Device Management (MDM) tool, and your Identity Provider. It is natively built into macOS 13 Ventura and newer, and is commonly deployed via:

* **Identity Providers**: Microsoft Entra ID (formerly Azure AD) and Okta.
* **MDM Platforms**: Configured and pushed to corporate devices using tools like Microsoft Intune or Jamf Pro.

For assistance with setting up Platform SSO, including MDM configuration profiles or troubleshooting registration tokens, additional resources are available.

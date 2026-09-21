---
Title: "macbook pro m1 stuck on 80% charged screen with mouse pointer"
Date: "2026-06-10_19_28"
Tags:
  - Security and Identity
Category: "Security and Identity"
Source_Products:
  - AI_Mode
  - Search
---
# Troubleshooting a Stuck MacBook Pro M1 and Removing Dead Directory Controller Remnants
===========================================================

## Introduction

This guide provides step-by-step instructions for troubleshooting a MacBook Pro M1 that is stuck on an 80% charged screen with a visible mouse pointer. Additionally, it covers how to remove dead remnants of a directory controller connection and authentication, ensuring that local account login does not require a captcha.

## Fixing the Stuck MacBook Pro M1

If your MacBook Pro M1 is frozen with a visible mouse cursor, you need to perform a hard reboot to clear the memory and reset the hardware management systems. To do this:

1. **Force Restart Your MacBook**:
	* Press and hold the Power button (Touch ID button) at the top right of your keyboard.
	* Keep holding it down for about 10-15 seconds until the screen goes completely black.
	* Wait about 30 seconds, then press the Power button once to turn your MacBook back on.
2. **Check Battery Settings (Once Restarted)**:
	* Go to the Apple menu  > System Settings (or System Preferences).
	* Click on Battery.
	* Click the Info button (the "i" icon) next to Charging.
	* Turn off Optimized Battery Charging or adjust your Charge Limit slider to 100% if you want a full charge immediately.
3. **Reset the SMC (System Management Controller)**:
	* Shut down your Mac.
	* Wait 30 seconds, then turn it back on.

If your screen is entirely unresponsive to the point where a force restart does not work, you may need to seek additional assistance.

## Removing Dead Directory Controller Remnants

To completely remove dead directory controller remnants and ensure your local account logins bypass any forced captcha prompts, follow these steps:

### 1. Remove Directory Controller Remnants

When a Mac is unlinked from a domain controller incorrectly, ghost configurations remain in the Directory Utility system and cache databases.

* **Open Terminal**: Go to Applications > Utilities > Terminal (or search via Spotlight).
* **Unbind via Command Line**: Force a clean unbind from any active directory services by typing:
```bash
sudo dsconfigad -force -remove -u username -p password
```
(Note: Replace `username` and `password` with your local admin credentials, or use dummy strings if the domain controller is permanently offline).
* **Delete Node References**: Clear out stale Search Policy nodes by running:
```bash
sudo dscl /Search -delete / Nodes/Active\ Directory/All\ Domains
```
* **Verify Directory Services**: Open Directory Utility via Spotlight. Click the lock icon to authenticate, then click Service. Ensure Active Directory or LDAPv3 are completely unchecked or unconfigured.
* **Flush Directory Caches**: Force macOS to rebuild its active authentication tables by restarting the directory daemon:
```bash
sudo killall opendirectoryd
```

### 2. Disable Local Login Captcha and Complex Auth

Local macOS accounts do not have a native captcha feature. If you are seeing a graphic puzzle, token prompt, or lock-out timer at login, it is a lingering security policy enforced by a Plugable Authentication Module (PAM) or an MDM configuration profile from the old directory controller.

#### Check for MDM Profiles

Stale corporate profiles often force strict login restrictions. Go to System Settings > Privacy & Security > Profiles. If an old corporate enrollment profile is present, select it and click the minus (-) icon to remove it.

#### Restore Default PAM Configurations

Check if the directory controller modified your core authentication files:
```bash
ls -l /etc/pam.d/
```
If files like `/etc/pam.d/authorization` or `/etc/pam.d/screensaver` contain custom lines referencing external verification modules, they must be commented out. You can reset them to standard macOS factory settings using:
```bash
sudo chmod +t /etc/pam.d/*
```

#### Clear Account Lockout Policies

If your local account is triggering a "Too Many Attempts" lockout block (which often looks like a captcha or countdown timer), reset the local password policy entirely:
```bash
sudo pwpolicy -clearaccountpolicies
```

#### Reboot Your Mac

Restart the system to fully initialize the cleaned directory environment.

## Understanding the Issue

A severed or dead directory authentication connection can cause local login issues, including captcha prompts. When a MacBook loses its connection to a domain controller, the background authentication systems continue searching for the missing network server, creating a severe lag or timeout during login. This triggers automated lockout mechanisms, extra multi-factor authentication (MFA) token prompts, or graphical security verification screens that mimic a captcha.

The issue can be caused by:

1. **Broken Pluggable Authentication Modules (PAM)**: Modified PAM files can route password checks through network security checks or third-party Identity Providers, leading to fallback states that demand secondary verification tokens or security keys.
2. **MDM and Local Password Policy Clashes**: Strict password policies pushed by an MDM system can trigger local account lockout thresholds when the directory link dies.
3. **Search Policy Timeouts**: A search policy still pointed to a dead network domain can cause the login screen to freeze or prompt safety checks.

By removing dead directory controller remnants and restoring default PAM configurations, you can eliminate the captcha prompt and ensure smooth local account login.

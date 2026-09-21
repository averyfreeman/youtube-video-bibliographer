---
Title: "what is oracle cloud shell connection?"
Date: "2026-05-24_16_24"
Tags:
  - DevOps and Cloud
Category: "DevOps and Cloud"
Source_Products:
  - AI_Mode
  - Search
---
## Oracle Cloud Shell Connection Overview
An Oracle Cloud Infrastructure (OCI) Cloud Shell connection is a secure, browser-based terminal that allows you to manage cloud resources directly from the Oracle Cloud Console. It provides an ephemeral Linux environment with 5GB of persistent storage and a pre-authenticated OCI Command Line Interface (CLI).

## Connection Types and Networking
Cloud Shell supports several networking modes to securely interact with your tenancy resources. These modes include:

* **Public Network Access**: By default, Cloud Shell has access to the public internet and OCI-wide services (like Object Storage) without additional configuration.
* **Private Network Access**: You can connect Cloud Shell sessions to a Private Network by selecting a specific Virtual Cloud Network (VCN) and subnet. This allows you to:
	+ SSH into Compute instances with only private IP addresses.
	+ Manage private Kubernetes (OKE) clusters or MySQL instances.
	+ Keep traffic off the public internet for enhanced security.
* **Instance Console Connection**: Cloud Shell can be used specifically for serial console connections to troubleshoot Compute instances when standard SSH is unavailable.

## Key Features and Limitations
Understanding the key features and limitations of Cloud Shell is essential for effective use.

## Connecting to Cloud Shell
To connect to Cloud Shell, follow these steps:
1. Sign in to the Oracle Cloud Console.
2. Click the Cloud Shell icon (resembling a command prompt) in the header of any page.
3. The terminal window will appear as a persistent frame at the bottom of your browser, staying active as you navigate between console pages.

## Cost and Usage
Oracle Cloud Shell does not incur any additional costs. It is completely free to use for all Oracle Cloud Infrastructure (OCI) users, including those on the Always Free tier. The underlying virtual machine used to run Cloud Shell is provisioned inside an Oracle-managed tenancy, which means it does not consume your own tenancy’s resources or computing allocations.

## Usage Allowances
Oracle provides generous allocations for Cloud Shell usage. The Oracle Cloud Shell Pricing Details outline the following monthly caps:
* **Pay-As-You-Go accounts**: Free for up to 50 concurrent active users and 240 shell hours per month per tenancy.
* **Monthly Universal Credit accounts**: Free for up to 75 concurrent active users and 400 shell hours per month per tenancy.
* **Persistent Storage**: The 5GB home directory is entirely free and encrypted.

## Important Distinction: Commands vs. Shell Usage
While the Cloud Shell terminal itself is free, any resources you provision or modify using the command line will be billed according to standard OCI pricing. For example, if you use a free Cloud Shell to run a Terraform script that deploys a paid database or an enterprise-tier Compute instance, you will be billed for that database or instance. To manage your budget effectively, consider setting up OCI budget alerts or reviewing the Always Free resource limits.

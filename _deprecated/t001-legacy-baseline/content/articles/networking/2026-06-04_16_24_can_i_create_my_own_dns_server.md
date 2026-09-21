---
Title: "can i create my own dns server for zerotier network?"
Date: "2026-06-04_16_24"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
Creating a Custom DNS Server for ZeroTier Network
=====================================================

As a network administrator, you can create your own custom DNS server for a ZeroTier network. ZeroTier allows you to specify managed DNS servers, enabling all devices on your virtual network to route their DNS queries through it.

### Setting Up Your Custom DNS Server

You have two primary options for setting up a custom DNS server: using ZeroTier's official companion tool, ZeroNSD, or setting up your own generic server.

#### Option 1: Using ZeroTier's Official Tool (ZeroNSD)

ZeroTier provides ZeroNSD, a lightweight DNS server designed to automatically sync your network node names and IPs directly from the ZeroTier controller. To use ZeroNSD:

* Host it on any machine connected to your network (or a dedicated VPS/local machine).
* Configure it to use your ZeroTier Central API token, allowing it to automatically update and resolve hostnames (e.g., my-laptop.my-network).

#### Option 2: Using Your Own DNS Server (e.g., BIND, Pi-hole, AdGuard Home)

ZeroTier allows you to push any custom DNS server's IP address to your connected devices. To use your own DNS server:

* Set up your preferred DNS resolver (like Pi-hole or BIND9) on a machine with a static ZeroTier IP address.
* Add your custom DNS records for your ZeroTier nodes in that server.

### Pointing Your Network to Your Custom DNS Server

Once your DNS server is running, you need to tell your ZeroTier devices to use it:

* Log into your ZeroTier Central console.
* Go to your network and locate the DNS section.
* Enter the ZeroTier IP address of your DNS server into the DNS Server field.
* Set a Search Domain if you want devices to resolve by name directly (e.g.,.local).
* Ensure that every client in your network has the Allow DNS (or auto DNS) option checked in their ZeroTier client UI/CLI.

Using CoreDNS with ZeroTier
---------------------------

CoreDNS has community-developed external plugins and tools for ZeroTier. While it is not included in the default CoreDNS installation, you can compile CoreDNS with a third-party plugin or run a pre-packaged wrapper.

### Option 1: Using an External CoreDNS Plugin

The open-source sbilly/coredns-zerotier-plugin on GitHub allows CoreDNS to query the ZeroTier Central API directly using your API token. It dynamically resolves hostnames based on your active ZeroTier network nodes.

To use this plugin:

* Modify the config: Open your CoreDNS source code repository and add the following line to your plugin.cfg file:
``` 
zerotier:github.com/sbilly/coredns-zerotier-plugin
```
* Compile CoreDNS: Generate the code and build your custom binary using Go:
``` 
go generate
go build./coredns -conf Corefile
```
* Configure the Corefile: In your Corefile, declare the zerotier plugin block with your ZeroTier Network ID and Central API Token.

### Option 2: Using ZTNet-CoreDNS (Docker Approach)

If you prefer a plug-and-play Docker setup without manually compiling Go code, you can use the Duoquote/ztnet-coredns container on GitHub. This project bundles CoreDNS with a script that pulls your ZeroTier network devices from the ZTNet/ZeroTier API and automatically formats them into a zone file for CoreDNS to serve.

For further assistance, you can request help with writing the specific Corefile configuration for the plugin or a Docker Compose template for the packaged container setup.

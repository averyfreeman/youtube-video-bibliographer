---
Title: "zerotier new website interface says I don't have an organization yet?"
Date: "2026-03-15_05_38"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
# Migrating to ZeroTier's New Central
In late 2025, ZeroTier launched New Central (at central.zerotier.com), introducing a new organizational structure that differs from the original Legacy Central (my.zerotier.com). If you're seeing a message indicating you don't have an organization yet, it's likely because the new interface requires a one-time setup to migrate or initialize your workspace.

## Automatic Provisioning and Interface Split
Under the new system, users joining independently are typically auto-provisioned as Organization Owners. If this didn't trigger, you must manually create one to see your networks. Your old networks still live on Legacy Central (my.zerotier.com) and won't automatically appear in the New Central dashboard until they're associated with an Organization.

## Creating Your First Organization
To create your first organization:
1. Log in at central.zerotier.com.
2. Follow the setup wizard that appears; this guides you through naming your organization and choosing a plan.
3. Once created, your organization will include one default Network Group and one Network.

## Creating Additional Organizations
If you already have access but need a new workspace, click the top-right menu and select New Organization.

## Accessing Legacy Networks
If you're looking for your existing networks and don't see them, go back to the Legacy Central login. ZeroTier is maintaining both interfaces during this transition period.

## Manually Migrating Networks
There is currently no automated import button to move a network from Legacy Central (my.zerotier.com) to New Central (central.zerotier.com). To migrate manually:
1. Recreate the Network: Log in to New Central and create a new network within your Organization and Network Group.
2. Manually copy over your settings (IPv4/IPv6 auto-assign ranges, DNS, and Flow Rules) from the Legacy Central dashboard.
3. Move Your Devices: On each device, join the new Network ID generated in New Central, then authorize the devices in the New Central dashboard. Once confirmed working, have the devices leave the old legacy network to avoid IP conflicts or unnecessary background traffic.

## Key Limitations
- **Unique Network IDs**: Every network created in New Central will have a brand new, unique 16-character ID. You cannot reuse your old ID in the new interface.
- **Re-authorization Required**: Because the network ID changes, every single device (node) must be manually joined to the new ID and re-authorized by an admin.

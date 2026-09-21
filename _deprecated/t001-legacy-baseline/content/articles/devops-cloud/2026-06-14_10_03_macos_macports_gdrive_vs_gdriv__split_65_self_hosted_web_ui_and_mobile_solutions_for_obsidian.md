---
Title: "Self-Hosted Web UI and Mobile Solutions for Obsidian"
Date: "2026-07-04_13_26"
Tags:
  - DevOps and Cloud
Split_From_Line: 65
Category: "DevOps and Cloud"
---
## Your prompt:

Is there a self-hosted web UI version of Obsidian or applicable/compatible alternative?

If self-hosted web UI markdown viewer is not suitable for mobile use, is there a markdown viewer I can use for my obsidian vault on my Android Pixel 10 Pro XL that can access my Obsidian vault?

I'm thinking perhaps I should host it on my OCI cloud instance rather than Google Drive, but I'm happy to use whichever is easier to access (should mention most devices connected via ZeroTier).

## Search's response:

Yes, there are excellent self-hosted alternatives and mobile-friendly setups that work perfectly with your ZeroTier network and OCI instance.

## Self-Hosted Web UIs for Obsidian

Obsidian itself does not offer an official self-hosted web UI, but the community has built excellent solutions:

* SilverBullet: An extensible, open-source markdown note editor that runs perfectly as a Docker container on your OCI instance. It saves notes as plain .md files, making it completely compatible with your existing vault structure.
* LiveBook: A web-based markdown editor specifically built to be a self-hosted web interface for Obsidian vaults.
* Obsidian-Remote: A Docker container that runs the full, desktop version of Obsidian inside a web browser via VNC/noVNC. You can host this on your OCI instance, access it via a browser, and point it to your vault folder.

## Best Android Approach (ZeroTier + Local Sync)

Web UIs can feel clunky on mobile browsers. Since your Pixel 10 Pro XL is on your ZeroTier network, the absolute best experience is running the official Obsidian Android app locally on your phone and syncing the files directly from your OCI instance.

Because Android cannot natively mount network shares easily, you can use these tools to sync your vault over ZeroTier:

* Syncthing: Install Syncthing on your OCI instance and your Pixel. It will securely sync your vault folder bi-directionally over your ZeroTier IP addresses in the background. It is free, open-source, and incredibly fast.
* GitJournal / Logseq: If you want alternative open-source Android markdown editors that can pull directly from a Git repository hosted on your OCI instance.

## Recommended Architecture

Hosting on your OCI cloud instance combined with ZeroTier is much more flexible and secure than Google Drive.

Storage: Host your master Obsidian vault folder on your OCI instance.

Web Access: Run a SilverBullet or Obsidian-Remote Docker container on OCI, bound only to your ZeroTier network interface for maximum security.

Mobile Access: Use Syncthing over ZeroTier to sync the vault folder from OCI directly to your Pixel's internal storage, and open it using the native Obsidian Android app.

If you want to set this up on your OCI instance, let me know:

Would you like the Docker Compose file to deploy SilverBullet or Obsidian-Remote?

Do you need instructions for configuring Syncthing to sync between Linux (OCI) and Android?

---
Title: "Ubuntu 26.04 equivs template to replace Ubuntu-repository docker (e.g. docker.io, etc.) with Docker-CE repo packages"
Date: "2026-04-12_00_01"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
Replacing Ubuntu Docker with Docker-CE using Equivs
=====================================================

### Create the control file (docker-mapping.ctl)

To replace the stock Ubuntu repository Docker packages with the official Docker-CE repository packages without breaking packages that depend on them, you can create a dummy or meta-package using equivs. This ensures that the Debian/Ubuntu packaging system recognizes that the requirements for docker.io are satisfied, even though you are running docker-ce.

```text
Section: misc
Priority: optional
Standards-Version: 3.9.2

Package: docker-ce-mapping
Version: 99:1.0
Maintainer: Local Administrator <admin@localhost>
Provides: docker.io, docker, docker-engine, containerd, runc
Conflicts: docker.io, docker, docker-engine
Replaces: docker.io, docker, docker-engine
Depends: docker-ce, docker-ce-cli, containerd.io
Architecture: all
Description: Dummy package to map Ubuntu stock Docker dependencies to Docker-CE
 This meta-package satisfies dependencies for stock Ubuntu docker packages (like docker.io) by forcing the installation of official Docker-CE packages instead.
```

### Installing Distrobox without Podman

The distrobox package has an OR dependency (`podman | docker.io`). To install it without installing `podman`—and without creating a global dummy package for Podman that would affect other applications—a manual `dpkg` override can be used.

#### The Successful Installation Steps

1. **Download the distrobox .deb package**:
   ```bash
apt download distrobox
```
2. **Force install the package while specifically ignoring the podman dependency**:
   ```bash
sudo dpkg -i --ignore-depens=podman distrobox_*.deb
```
3. **Force Distrobox to specifically use Docker as the container manager**:
   ```bash
echo 'container_manager=docker' > ~/.distroboxrc
```

### Handling Automated Updates

To prevent `apt` from overwriting the manual setup, you have two native options in Ubuntu: APT Pinning or DPKG Holding.

#### Option A: Put Distrobox on "Hold"

This tells the package manager to never touch or update the distrobox package automatically.

```bash
sudo apt-mark hold distrobox
```

If you ever want to update it manually in the future, you just run:
```bash
sudo apt-mark unhold distrobox
```

#### Option B: Fake the Dependency with APT Pinning

If you do want Distrobox to update automatically when Ubuntu releases new versions, but you still don't want it to pull in Podman, you can tell APT to ignore Podman globally for all installations.

1. **Create a preferences file**:
   ```bash
sudo nano /etc/apt/preferences.d/block-podman
```
2. **Paste the following text and save the file**:
   ```text
Package: podman
Pin: release *
Pin-Priority: -1
```

However, given the evidence of other packages relying on `podman`, using APT Pinning might break the installation of those packages.

### Undoing Both Options

Depending on which path you chose or might want to revert in the future, here is how you safely back out of them.

#### 1. How to Undo the DPKG Hold

If you decide you want to upgrade distrobox natively later, or you want to delete it and switch to the official external script:
```bash
sudo apt-mark unhold distrobox
sudo apt update
sudo apt install -f
```

#### 2. How to Undo the APT Pin

If you created the negative priority file to block Podman, you should remove it so you don't accidentally break the installation of those other tools in your `rdepends` list.

```bash
sudo rm /etc/apt/preferences.d/block-podman
sudo apt update
```

### Final Recommendation

Given that you have other packages relying on `podman`, sticking with the `dpkg` hold on `distrobox` is your best bet for system stability. However, if you encounter issues with `apt` trying to install `podman` and its dependencies, you can either create a dummy package for `podman` using `equivs` or switch to the official upstream script for `distrobox`.

#### Option 1: Fake Podman with Equivs

Create a system-wide dummy package for `podman`:

1. **Create a file named `podman-dummy.ctl`**:
   ```text
Section: misc
Priority: optional
Standards-Version: 3.9.2

Package: podman-dummy
Version: 99:1.0
Maintainer: Local Administrator <admin@localhost>
Provides: podman
Conflicts: podman
Replaces: podman
Architecture: all
Description: Dummy package to satisfy podman without installing it
```
2. **Build and install it**:
   ```bash
equivs-build podman-dummy.ctl
sudo dpkg -i podman-dummy_1.0_all.deb
```

#### Option 2: Purge the .deb and Use the Official Script

Remove the Ubuntu-packaged version of Distrobox and pull it directly from the creators:

1. **Force remove the broken Ubuntu distrobox package**:
   ```bash
sudo dpkg --purge --force-all distrobox
```
2. **Run the official upstream installer**:
   ```bash
curl -s https://raw.githubusercontent.com/89luca89/distrobox/main/install | sudo sh
```

By choosing one of these options, you can resolve the dependency issues with `distrobox` and `podman` while maintaining system stability.

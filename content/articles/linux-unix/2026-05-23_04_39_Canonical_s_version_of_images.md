---
Title: "Canonical's version of images.linuxcontainers.com"
Date: "2026-05-23_04_39"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
```markdown
Canonical’s equivalent of the images.linuxcontainers.org image server is the dedicated public LXD image server hosted at https://images.lxd.canonical.com. It serves official, security-maintained LXD system container and virtual machine images specifically optimized for Canonical’s ecosystem.

Because the Linux Containers project and Canonical separated, Canonical maintains its own remote repository. You can easily add and use this server in your LXD or Incus environment using the following standard commands:

* Add the Canonical images remote:
  ```bash
  lxc remote add canonical images https://images.lxd.canonical.com --protocol=simplestreams
  ```
* List available images:
  ```bash
  lxc image list canonical:
  ```
* Launch a container or VM from the Canonical server:
  ```bash
  lxc launch canonical:ubuntu/22.04 my-container
  ```

Official Ubuntu Cloud Images

If you specifically need the raw upstream Ubuntu cloud images instead of the LXD-optimized variants, you can access Canonical’s official image stream via https://cloud-images.ubuntu.com/releases/.

To read more about Canonical’s ecosystem and support for containerized environments, visit the Canonical LXD Page.

Thanks for the remote, but it’s actually the same as lxc image list images:.

This seems like it’s working for what I need: ```
lxc image list ubuntu-minimal:noble architecture=aarch64 type=squashfs -f yaml
```
aliases:
  - name: 24.04/arm64
    description:
  - name: n
    description:
  - name: noble
    description:
  - name: noble/arm64
    description:
    architecture: aarch64
    cached: false
    public: true
    filename: ubuntu-24.04-minimal-cloudimg-arm64-lxd.tar.xz
    fingerprint: 5d6e34037e76129f8fe44536d0f5cf25e0b4484f814480ef86884837bde9c3c1
    size: 102195612
    auto_update: false
    type: container
    created_at: 2026-05-21T00:00:00Z
    expires_at: 2029-05-31T00:00:00Z
    last_used_at: 0001-01-01T00:00:00Z
    uploaded_at: 2026-05-21T00:00:00Z
    properties:
      architecture: arm64
      description: ubuntu 24.04 LTS (minimal release)
      label: minimal release
      os: ubuntu
      release: noble
      serial: 20260521
      type: squashfs
      version: 24.04
      profiles: []
      project:
      release_codename: Noble Numbat
      release_title: 24.04 LTS

Interestingly `images:` remote responds to type=container, but ubuntu{,-minimal}: (etc.) return empty array with type=container. I noticed VMs are type=disk1.img so I filtered using type=squashfs.

I need to make sure it’s arm64/aarch64 -- Would it be installed with lxc launch ubuntu-minimal/noble/aarch64 llama-cpp ?

Yes, that is almost the exact command you need, but you need to swap the slash (/) for a colon (:) when calling the remote.

You can launch your ARM64 minimal container using this exact command:

\_\_PROTECTED\_BLOCK\_2\_\_
The Remote Split:
LXD uses a colon (`:`) to separate the remote server name (`ubuntu-minimal`) from the image name.


The Image Alias:
Your yaml output shows the alias name `noble/arm64`. Combining the remote and the alias gives you `ubuntu-minimal:noble/arm64`.


Automatic Architecture Choice:
If you are already running this command on an ARM64 host machine, you can shorten it to lxc launch ubuntu-minimal:noble llama-cpp. LXD will automatically match your host’s architecture.

Quick Tip on the Container Types

You made a great catch regarding the type filters.

The images: remote follows the upstream LXD standard where root filesystems are categorized strictly as type=container or type=virtual-machine.

The ubuntu: and ubuntu-minimal: remotes use Canonical’s daily image building system. They track the underlying compression format (like squashfs for containers and disk1.img for VMs) in the image metadata instead of mapping it directly to the root type field.

If you want to spin up llama-cpp with GPU acceleration later, let me know if you need the commands to passthrough your host GPU or allocate specific CPU cores to this new container.
```

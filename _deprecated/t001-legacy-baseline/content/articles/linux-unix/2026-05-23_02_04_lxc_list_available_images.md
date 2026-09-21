---
Title: "lxc list available images"
Date: "2026-05-23_02_04"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
To view available images for LXC (usually via the LXD/Incus command-line tool), the command depends on whether you want to see images you've already downloaded or images available on remote servers.

To see the massive list of images available from the official community or Ubuntu servers, use the following commands:

Community Images: This lists various Linux distributions (Debian, Alpine, Arch, etc.).

Ubuntu Official Images: This lists official Ubuntu releases.

Since the full list is huge, you can filter by distribution name, architecture, or type (container vs. virtual machine):

Search by OS:

Filter by Type:

Filter by Architecture:

To see images that are already downloaded and stored on your local machine, run:

If you are using the older, low-level LXC tools (without LXD/Incus), there is no single "list" command. Instead, you typically see available templates during container creation:

For a full list of image management options, you can refer to the LXD Documentation or check the Linux Containers Image Server directly.

To filter for Ubuntu arm64 images and reduce the column clutter, combine the remote server query with specific filters and formatting flags.

Use the --columns flag (or -c) to specify exactly which columns you want to see.

The letters passed to the --columns flag determine what information displays:

Alias (The easy-to-read name like 24.04)

Fingerprint (The unique image hash)

Public status

Description (OS version and architecture)

Extension

Type (container or virtual-machine)

Size

If you want to strip out all table borders entirely for scripting or maximum text density, change the output format:

CSV Format (No headers):

JSON Format (For parsing):

Would you like to know how to launch a container directly from one of these filtered images, or do you need help automating this check via a script?

To fix the /dev/kvm warning on your OCI Ampere A1 instance, you need to tell LXD to stop checking for hardware virtualization support. By default, LXD looks for KVM to support virtual machines, but Ampere A1 shapes running on Oracle Cloud Infrastructure often do not support nested virtualization in their default configuration.

Run this command to disable the virtual machine daemon initialization, which stops the /dev/kvm error logs:

Alternatively, if you installed via Snap, run this to completely disable the KVM check:

To completely hide virtual machines from your search results and only show arm64 Ubuntu containers with minimal columns, add the type=container filter to your command:

When launching a new instance, always specify that it should be a container so LXD doesn't attempt to spin up a VM:

```markdown
lxc launch ubuntu:24.04 my-container --container

Would you like to know how to optimize network settings for containers on OCI, or do you need help setting up a profile to automate container resource limits on your Ampere instance?

Your prompt:
are lxd lxcfs configuration params operable in lxd snap 6.8, or when using external zfs? Context: snap info lxd | grep lxcfs - lxcfs.pidfd: Start per-container process tracking [default=false] - lxcfs.loadavg: Start tracking per-container load average - lxcfs.cfs: Consider CPU shares for CPU usage [default=false] - lxcfs.debug: Increase logging to debug level [default=false] is using internal or external zfs preferable? snap get lxd -d { &quot;daemon&quot;: { &quot;kvm&quot;: false, &quot;syslog&quot;: true, &quot;verbose&quot;: true }, &quot;ui&quot;: { &quot;enable&quot;: true }, &quot;zfs&quot;: { &quot;external&quot;: true } } current config: lxd init --dump config: cluster.images_minimal_replica: 1 core.https_address: :4000 core.https_trusted_proxy: 127.0.0.1,[::1] oidc.audience: 208ff2bd55036224ff671f85ecac3eaa8c2700ed8dca759145b8f17876971a67 oidc.client.id: 208ff2bd55036224ff671f85ecac3eaa8c2700ed8dca759145b8f17876971a67 oidc.client.secret: 2d315404fbd37140b2a24fc247770d2eeba155a28ca29abcf563ebc519e25eb5 oidc.groups.claim: groups oidc.issuer: https://unixgreybeard.cloudflareaccess.com/cdn-cgi/access/sso/oidc/208ff2bd55036224ff671f85ecac3eaa8c2700ed8dca759145b8f17876971a67 oidc.scopes: openid email profile groups volatile.uuid: 019e528e-d5f0-7db1-9eb2-54e04d247584 networks: [] storage_pools: - config: source: lxzpool volatile.initial_source: lxzpool zfs.pool_name: lxzpool description: "&quot;&quot; name: lxzpool driver: zfs storage_volumes: [] profiles: - config: {} description: Default LXD profile devices: eth0: name: eth0 nictype: bridged parent: br0 type: nic root: path: / pool: lxzpool type: disk name: default projects: - config: features.images: true features.networks: true features.networks.zones: true features.profiles: true features.storage.buckets: true features.storage.volumes: true description: Default LXD project name: default storage: "&quot;&quot; network: "&quot;&quot;

Yes, the lxcfs configuration parameters are fully operable in the LXD Snap (including version 6.8), and they work completely independently of whether you use internal or external ZFS.

LXCFS Configuration in Snap 6.8

The lxcfs.* options pass configuration flags directly to the LXCFS daemon running inside the Snap. They do not interact with your storage layers (zfs, dir, btrfs), meaning they operate flawlessly with your lxzpool storage pool.

Note for 6.8 users: Starting in LXD 6.6, lxcfs.pidfd=true is now enabled by default to optimize per-container process tracking.

To modify or view these values alongside your existing settings, use the standard snap command structure:

# Enable container load average tracking
sudo snap set lxd lxcfs.loadavg=true

# Verify your updated snap configuration
snap get lxd -d

Internal vs. External ZFS: Which is preferable?

Your current configuration has lxcfs.external: true enabled. In LXD Snap deployment, lxcfs.external=true is highly preferred if you use a custom or distribution-upgraded kernel.


<table><thead><tr><th align="left">Feature / Scenario</th><th align="left"><code>zfs.external=false</code> (Internal/Default)</th><th align="left"><code>zfs.external=true</code> (External/Your Setup)</th></tr></thead><tbody><tr><td align="left"><strong>Tool Origin</strong></td><td align="left">Uses the ZFS user-space binaries compiled inside the LXD Snap.</td><td align="left">Uses the zfs / zpool binaries residing on your host OS.</td></tr><tr><td align="left"><strong>Kernel Alignment</strong></td><td align="left">Risks a version mismatch error if your host kernel module updates faster than the snap.</td><td align="left">Ensures the user-space tools perfectly match your running kernel module.</td></tr><tr><td align="left"><strong>Best Used For</strong></td><td align="left">Stock Ubuntu LTS kernels utilizing the default zfsutils-linux.</td><td align="left"><strong>Custom, mainline, or DKMS kernels</strong> (very common on OCI Ampere shapes).</td></tr></tbody></table>

Why your configuration is optimal:

Because LXD assumes exclusive data control over its datasets (lxzpool), the storage driver performance remains identical under both options. However, lxcfs.external=true immunizes your instance against the common "ZFS version mismatch" daemon-crashing loop that occurs when your host kernel updates its ZFS module ahead of a Snap package refresh. Keep your configuration exactly as it is configured right now.

Would you like help tuning the lxzpool ZFS properties (such as compression settings or record sizes) specifically for container performance on an ARM64 cloud instance?

Your prompt:
```
```markdown
<strong>yes</strong>! <code>zpool get all</code>: <code>NAME PROPERTY VALUE SOURCE lxzpool size 49.5G - lxzpool capacity 0% - lxzpool altroot - default lxzpool health ONLINE - lxzpool guid 10764336411512594952 - lxzpool version - default lxzpool bootfs - default lxzpool delegation on default lxzpool autoreplace off default lxzpool cachefile - default lxzpool failmode wait default lxzpool listsnapshots off default lxzpool autoexpand off default lxzpool dedupratio 1.00x - lxzpool free 49.5G - lxzpool allocated 1.66M - lxzpool readonly off - lxzpool ashift 0 default lxzpool comment - default lxzpool expandsize - - lxzpool freeing 0 - lxzpool fragmentation 0% - lxzpool leaked 0 - lxzpool multihost off default lxzpool checkpoint - - lxzpool load_guid 9131934457154021114 - lxzpool autotrim off default lxzpool compatibility off default lxzpool bcloneused 0 - lxzpool bclonesaved 0 - lxzpool bcloneratio 1.00x - lxzpool feature@async_destroy enabled local lxzpool feature@empty_bpobj active local lxzpool feature@lz4_compress active local lxzpool feature@multi_vdev_crash_dump enabled local lxzpool feature@spacemap_histogram active local lxzpool feature@enabled_txg active local lxzpool feature@hole_birth active local lxzpool feature@extensible_dataset active local lxzpool feature@embedded_data active local lxzpool feature@bookmarks enabled local lxzpool feature@filesystem_limits enabled local lxzpool feature@large_blocks enabled local lxzpool feature@large_dnode enabled local lxzpool feature@sha512 enabled local lxzpool feature@skein enabled local lxzpool feature@edonr enabled local lxzpool feature@userobj_accounting active local lxzpool feature@encryption enabled local lxzpool feature@project_quota active local lxzpool feature@device_removal enabled local lxzpool feature@obsolete_counts enabled local lxzpool feature@zpool_checkpoint enabled local lxzpool feature@spacemap_v2 active local lxzpool feature@allocation_classes enabled local lxzpool feature@resilver_defer enabled local lxzpool feature@bookmark_v2 enabled local lxzpool feature@redaction_bookmarks enabled local lxzpool feature@redacted_datasets enabled local lxzpool feature@bookmark_written enabled local lxzpool feature@log_spacemap active local lxzpool feature@livelist enabled local lxzpool feature@device_rebuild enabled local lxzpool feature@zstd_compress enabled local lxzpool feature@draid enabled local lxzpool feature@zilsaxattr enabled local lxzpool feature@head_errlog active local lxzpool feature@blake3 enabled local lxzpool feature@block_cloning enabled local lxzpool feature@vdev_zaps_v2 active local

<strong>Search&#39;s response:</strong><br>
To get maximum performance out of your OCI Ampere A1 instance (ARM64) running LXD on ZFS, you need to adjust <strong>dataset properties</strong> rather than pool properties, though there are critical fixes required for both.</p>
<h3>Critical Fixes &amp; Tuning Tasks</h3>
<h4>1. Crucial Fix: Correct <code>ashift=0</code></h4>
<p>Your output shows <code>ashift 0</code>. This means ZFS dynamically chose a sector size (often defaulting to a legacy 512-byte sector if it read OCI&#39;s virtual disk layer blindly). Since OCI block volumes use 4KB sectors (and ARM64 memory pages are frequently 64KB on Oracle Linux or Ubuntu kernel profiles), an <code>ashift</code> of 0 causes <strong>severe write amplification and performance degradation</strong>.</p>
<ul>
<li><strong>The Bad News:</strong> You cannot change <code>ashift</code> on an existing pool.</li>
<li><strong>The Recommendation:</strong> If you have no production data yet (allocated is only 1.66M), destroy and recreate this pool immediately with <code>-o ashift=12</code> (4KB sectors) or even <code>-o ashift=13</code> (8KB sectors) to align with ARM architectures.</li>
<pre><code># Example if recreating manually:
sudo zpool create -o ashift=12 lxzpool /dev/your_oci_block_device
</code></pre>
</li>
</ul>
<h4>2. Turn on Autotrim</h4>
<p>OCI Block Volumes are thinly provisioned SSD storage backing. Without TRIM, deleted files inside your containers remain allocated on Oracle&#39;s infrastructure, hurting long-term performance.</p>
<pre><code>sudo zpool set autotrim=on lxzpool
</code></pre>
<h4>3. Optimize LXD Dataset Properties</h4>
<p>Do not use raw <code>zfs set</code> on the root pool for container data properties; let LXD handle them natively through the storage pool configuration so new container datasets inherit them correctly.</p>
<p>Update your LXD pool (<code>lxzpool</code>) configuration with these commands:</p>
<ul>
<li><strong>Enable LZ4 Compression:</strong> Extremely fast, negligible CPU overhead on your Ampere CPU cores, saves OCI IOPS.
<pre><code>lxc storage set lxzpool zfs.dataset_options=compression=lz4
</code></pre>
</li>
<li><strong>Optimize Extended Attributes:</strong> Speeds up file lookups and container permission checks on Linux.
<pre><code>lxc storage set lxzpool zfs.dataset_options=xattr=sa
</code></pre>
</li>
<li><strong>Disable Access Time Updates:</strong> Eliminates unnecessary disk writes every time a container reads a file.
<pre><code>lxc storage set lxzpool zfs.dataset_options=atime=off
</code></pre>
</li>
</ul>
<h3>Verified Target Storage Configuration</h3>
<p>After running those commands, your LXD storage configuration block should implicitly look like this when you view <code>lxc storage show lxzpool</code>:</p>
<pre><code>config:
  source: lxzpool
  zfs.pool_name: lxzpool
  zfs.dataset_options: compression=lz4,xattr=sa,atime=off
</code></pre>
<p>If you are planning to run database containers like MySQL/PostgreSQL or applications with heavy write loads, tell me <strong>what workloads you intend to host</strong> so we can tailor the dataset record sizes specifically for them.</p>
<p><strong>Your prompt:</strong><br>
would you please provide comma-separated values for <code>zpool -o</code>?</p>
<p><strong>Search&#39;s response:</strong></p>
<p><strong>Your prompt:</strong><br>
```

---
Title: "Exposing and Troubleshooting ZeroTier on openSUSE Leap Micro"
Date: "2026-07-04_15_10"
Tags:
  - DevOps and Cloud
Split_From_Line: 37
Category: "DevOps and Cloud"
---
### Exposing the ZeroTier Interface on the Host
When using `--network host`, any network interface created inside the container should automatically appear on the host. If the interface is missing, it may be due to SELinux blocking the container or a missing `sysctl` privilege.

#### Resolving SELinux and sysctl Issues
On openSUSE Leap Micro, you can resolve these issues by passing additional flags to Podman:
1. `--security-opt label=disable`: Disables SELinux separation for the container.
2. `--sysctl net.ipv4.conf.all.src_valid_mark=1`: Configures the host's network settings to allow ZeroTier to function correctly.

To apply these changes, remove the current container and recreate it with the updated flags:
```bash
sudo podman rm -f zerotier

sudo podman run -d \
  --name zerotier \
  --restart always \
  --network host \
  --device /dev/net/tun \
  --cap-add NET_ADMIN \
  --cap-add SYS_ADMIN \
  --security-opt label=disable \
  --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  -v /var/lib/zerotier-one:/var/lib/zerotier-one:Z \
  docker.io/zerotier/zerotier:latest
```
Verify that the ZeroTier interface is now visible on the host by running `ip link`.

### Creating a Native systemd Service
Instead of relying on Podman's internal restart policy, you can generate a native systemd unit file for ZeroTier. This integrates the container into Leap Micro's boot sequence like a traditional system daemon.

#### Generating the systemd Service File
Use the following command to generate the service file:
```bash
sudo podman generate systemd --name zerotier --files --new
```
Move the generated file to the systemd configuration directory:
```bash
sudo mv container-zerotier.service /etc/systemd/system/
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now container-zerotier.service
```
You can now manage ZeroTier using standard host commands:
* Stop: `sudo systemctl stop container-zerotier`
* Logs: `sudo journalctl -u container-zerotier -f`

### Using Quadlets for ZeroTier Deployment
Quadlets are a built-in feature of Podman that allows you to manage containers directly as native systemd units. This approach provides a clean and declarative way to configure and deploy ZeroTier.

#### Creating a Quadlet File
Create a new file named `/etc/containers/systemd/zerotier.container` with the following content:
```ini
[Unit]
Description=ZeroTier One Network Virtualization Daemon
After=network-online.target

[Container]
ContainerName=zerotier
Image=docker.io/zerotier/zerotier:latest
Network=host
AddDevice=/dev/net/tun
AddCapability=NET_ADMIN SYS_ADMIN
SecurityLabel=disable
Volume=/var/lib/zerotier-one:/var/lib/zerotier-one:Z
Exec=363c67c55ae620a9

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
```
Reload systemd to process the new Quadlet file:
```bash
sudo systemctl daemon-reload
```
Enable and start the ZeroTier service:
```bash
sudo systemctl enable --now zerotier.service
```
Verify the service status:
```bash
sudo systemctl status zerotier.service
```
You can view the logs using the host's journal:
```bash
sudo journalctl -u zerotier.service -f
```
### Incorporating the Network ID into a Quadlet
To incorporate the Network ID into a Quadlet, you can pass it as an argument directly into the container's entrypoint script using the `Exec=` key in the Quadlet file.

#### Option A: The Declarative Command Approach
Update your `/etc/containers/systemd/zerotier.container` file to include the Network ID:
```ini
[Container]
...
Exec=363c67c55ae620a9
```
#### Option B: The Environment Variable Approach
Alternatively, you can declare the Network ID as an environment variable using the `Environment=` key:
```ini
[Container]
...
Environment=ZEROTIER_JOIN_NETWORKS=363c67c55ae620a9
```
### Troubleshooting Quadlet Deployment
If the Quadlet file is not being processed by systemd, ensure that the file is correctly formatted and that the host directory specified in the `Volume=` key exists on the system.

#### Validating the Quadlet File
Verify that the Quadlet file is correctly formatted and that there are no trailing newlines or hidden characters:
```bash
sudo cat -nE /etc/containers/systemd/zerotier.container
```
#### Creating the Host Directory
Create the missing host directory if it does not exist:
```bash
sudo mkdir -p /var/lib/zerotier-one
```
Reload systemd to force processing of the Quadlet file:
```bash
sudo systemctl daemon-reload
```
Verify the service status:
```bash
sudo systemctl status zerotier.service
```
If the service is still not visible, you can run the Podman generator manually to output any error messages:
```bash
sudo /usr/lib/systemd/system-generators/podman-systemd-generator --dry-run

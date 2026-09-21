---
Title: "coredns multi-site setup"
Date: "2026-06-04_18_47"
Tags:
  - Networking
Category: "Networking"
Source_Products:
  - AI_Mode
  - Search
---
CoreDNS Multi-Site Setup
========================
A CoreDNS multi-site setup connects multiple distinct environments, such as different data centers or Kubernetes clusters, allowing them to seamlessly resolve each other's domain names. This can be achieved using conditional forwarding or native multicluster DNS plugins.

### Core Approaches

There are three primary approaches to setting up a CoreDNS multi-site environment:

1. **Conditional Forwarding (The Simplest Method)**: This approach involves configuring CoreDNS to route queries matching a specific domain directly to the DNS server IP of the second site.
2. **Kubernetes Multi-Cluster Plugin (For K8s environments)**: If your multi-site setup involves different Kubernetes clusters, you can use CoreDNS natively with multicluster features.
3. **State-Store Synchronization (For high availability)**: For large-scale setups, a common architectural pattern is running an HA datastore like etcd across your sites, allowing CoreDNS to read records directly from this shared store.

### Key Requirements

To set up a CoreDNS multi-site environment, you must have:

* Network Connectivity: Routable network connectivity (VPN or direct links) between the sites for queries to reach the remote DNS endpoints.
* Firewall Rules: Port 53 (TCP/UDP) must be open to allow DNS traffic to traverse the sites.

### Designing a Resilient Three-Way DNS Mesh

For a three-way DNS mesh setup, where all sites are connected via ZeroTier, with plenty of Avahi devices, and no Kubernetes yet, but with lots of Podman containers, a decentralized CoreDNS architecture using mesh forwarding or a shared etcd database is the best approach.

#### The Architectural Blueprint

To ensure local survivability, run a CoreDNS instance at each site. Assign domain zones, giving each site its own subdomain (e.g., site1.lan, site2.lan, site3.lan). Handle Avahi/mDNS by keeping.local isolated to local link-local resolution on each site and using CoreDNS to map your container services globally across the ZeroTier IPs.

### Strategy 1: The CoreDNS Full Mesh (Easiest to Setup)

In this setup, each CoreDNS instance is authoritative for its local site domain and explicitly forwards queries for the other two sites over ZeroTier IPs.

```markdown
# Local site records
site1.lan {
    file /etc/coredns/db.site1.lan
}

# Forward to Site 2
site2.lan {
    forward. 10.147.20.2  # Site 2 CoreDNS ZeroTier IP
}

# Forward to Site 3
site3.lan {
    forward. 10.147.20.3  # Site 3 CoreDNS ZeroTier IP
}

# Global fallback for internet traffic
. {
    forward. 1.1.1.1 8.8.8.8
    cache 30
}
```

### Strategy 2: Shared etcd Backend (Most Scalable)

If you are frequently spinning up and tearing down Podman containers across all three sites, manual zone files become a chore. Instead, run a small etcd cluster across your ZeroTier network. CoreDNS can natively read from etcd using the etcd plugin.

Shared Corefile Configuration for All Sites:

```markdown
lan {
    etcd {
        stubzones
        path /skydns
        endpoint http://10.147.20.1:2379 http://10.147.20.2:2379 http://10.147.20.3:2379
    }
    cache 30
}

. {
    forward. 1.1.1.1
}
```

### Future-Proofing for Podman & Kubernetes

To future-proof your setup for both Podman and potential Kubernetes integration:

1. **Podman Integration Today**: Run CoreDNS as a systemd-managed Podman container on a static ZeroTier IP at each site. You can use the `--net=host` flag so it binds directly to your ZeroTier interface port 53.
2. **Smooth Kubernetes Transition Later**: If you transition to K8s, your future Kubernetes CoreDNS ConfigMap can easily ingest those same forwarding rules. If you went with Strategy 2 (etcd), Kubernetes can integrate with external etcd setups, or you can leverage Kube-DNS plugins to federate the clusters.

For further assistance, you may want to explore writing a Podman systemd service file to keep CoreDNS persistently running or look at a zone file template for Strategy 1.

---
Title: "does podman desktop support orchestrating containers on other machines?"
Date: "2026-05-30_01_44"
Tags:
  - DevOps and Cloud
Category: "DevOps and Cloud"
Source_Products:
  - AI_Mode
  - Search
---
# Podman Desktop: Orchestrating Containers on Remote Machines
Podman Desktop does not act as a multi-node container orchestrator like Kubernetes or Docker Swarm. However, it can manage containers on other machines using remote system connections, and it can deploy local configurations directly into external multi-node orchestration platforms like Red Hat OpenShift.

## Remote Machine Container Management
Podman Desktop features a native Remote Access capability, allowing control of a Podman engine running on a completely different machine rather than managing a local virtual machine. This is achieved by connecting securely over SSH to the Podman socket on the target remote host.

The capabilities of this feature include creating, starting, stopping, and deleting containers or pods on the remote machine, exactly as if they were running locally. To use this feature, an active Podman socket must be configured on the remote machine, and authentication must be done using ed25519 SSH keys (note that RSA keys are not supported).

## Bridging to True Orchestration
While Podman Desktop cannot orchestrate a single cluster across multiple machines on its own, it includes built-in integrations to pass workloads off to enterprise orchestration systems. This includes:

* **Kubernetes Integration**: Testing orchestration patterns locally using integrated extensions like Kind or Minikube.
* **Cloud Deployment**: Providing direct pathways to deploy local container and pod manifests into multi-node Kubernetes and Red Hat OpenShift clusters.
* **Podman Compose**: Running multi-container applications defined by a Compose YAML file on a single remote machine, offering a stepping stone toward full Kubernetes deployment. This allows for a seamless transition from local development to enterprise-scale orchestration.

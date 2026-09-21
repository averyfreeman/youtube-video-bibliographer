---
Title: "Automating ZeroTier Migration with IaC Tools"
Date: "2026-07-04_12_47"
Tags:
  - Software Development
Split_From_Line: 36
Category: "Software Development"
---
## Automating Migration with IaC Tools
Moving to an automated workflow for your 10 personal nodes is a great way to handle the migration from Legacy Central to New Central. Since the Network IDs will change, you essentially need to leave the old network and join the new one on each client, then authorize them in the new dashboard.

### Workflow Comparison
| Feature | Description |
| --- | --- |
| Terraform | Defines infrastructure in a human-readable configuration file. |
| Ansible | Configures and manages nodes using playbooks. |
| Uyuni + SaltStack | Manages systems and ensures consistency across nodes. |

### Example Code Snippets
#### Bash
```bash
#!/bin/bash
ZT_TOKEN="your_token_here"
NWID="your_legacy_network_id"

# Fetches members and prints ID and Name
curl -s -H "Authorization: token $ZT_TOKEN" \
  "https://api.zerotier.com/api/v1/network/$NWID/member" | \
  jq -r '.[] | "\(.nodeId) \(.name)"'
```
#### Python
```python
import requests

ZT_TOKEN = "your_token_here"
NWID = "your_legacy_network_id"
headers = {"Authorization": f"token {ZT_TOKEN}"}

# Fetch legacy members
response = requests.get(f"https://api.zerotier.com/api/v1/network/{NWID}/member", headers=headers)
for m in response.json():
    print(f"ID: {m['nodeId']} | Name: {m.get('name', 'Unknown')}")
```
#### PowerShell
```powershell
$ZT_TOKEN = "your_token_here"
$NWID = "your_legacy_network_id"
$headers = @{ "Authorization" = "token $ZT_TOKEN" }

# Fetch and output member details
$response = Invoke-RestMethod -Uri "https://api.zerotier.com/api/v1/network/$NWID/member" -Headers $headers
foreach ($member in $response) {
    Write-Output "ID: $($member.nodeId) | Name: $($member.name)"
}
```
#### Node.js
```javascript
const https = require('https');
const ZT_TOKEN = 'your_token_here';
const NWID = 'your_legacy_network_id';

const options = {
  hostname: 'api.zerotier.com',
  path: `/api/v1/network/${NWID}/member`,
  headers: { 'Authorization': `token ${ZT_TOKEN}` }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const members = JSON.parse(data);
    members.forEach(m => console.log(`ID: ${m.nodeId} | Name: ${m.name}`));
  });
});
```
## Using Go for Concurrent Authorization
To authorize all nodes concurrently, you can use Go with its built-in concurrency features.

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

const (
	ztToken    = "your_token_here"
	newNWID    = "your_new_network_id"
)

type Member struct {
	NodeID string `json:"nodeId"`
	Name   string `json:"name"`
}

func main() {
	// Sample data - in a real scenario, you'd fetch these first
	members := []Member{
		{NodeID: "89abcdef01", Name: "Node1"},
		{NodeID: "89abcdef02", Name: "Node2"},
		//... up to 10 nodes
	}

	var wg sync.WaitGroup
	for _, m := range members {
		wg.Add(1)
		go func(member Member) {
			defer wg.Done()
			err := authorize(newNWID, member.NodeID, member.Name)
			if err!= nil {
				fmt.Printf("[-] Error: %s -> %v\n", member.NodeID, err)
			} else {
				fmt.Printf("[+] Authorized: %s\n", member.Name)
			}
		}(m) // Pass the member as an argument to avoid loop variable issues
	}
	wg.Wait()
	fmt.Println("All migrations processed!")
}

func authorize(networkID, memberID, name string) error {
	url := fmt.Sprintf("https://api.zerotier.com/api/v1/network/%s/member/%s", networkID, memberID)
	payload := map[string]interface{}{
		"name": name,
		"config": map[string]bool{"authorized": true},
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	req.Header.Set("Authorization", "token "+ztToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := (&http.Client{}).Do(req)
	if err!= nil { return err }
	defer resp.Body.Close()
	return nil
}
```
## Terraform, Ansible, and Uyuni + SaltStack for Migration
Each of these tools can be used for different aspects of your migration:
- **Terraform**: Ideal for defining the network infrastructure and ensuring it matches your desired state.
- **Ansible**: Useful for configuring the nodes themselves, ensuring they join the correct network and have the necessary settings.
- **Uyuni + SaltStack**: Excellent for managing the consistency of your nodes over time, ensuring they remain in the desired state.

## Generating Inventory Files Automatically
To automate the generation of your inventory files (e.g., for Ansible), you can use a Python script that queries the ZeroTier API and formats the response into a valid YAML inventory.

```python
import requests
import json

ZT_TOKEN = "your_legacy_token"
NWID = "your_legacy_network_id"
headers = {"Authorization": f"token {ZT_TOKEN}"}

def fetch_members():
    url = f"https://api.zerotier.com/api/v1/network/{NWID}/member"
    response = requests.get(url, headers=headers)
    return response.json()

def main():
    members = fetch_members()

    # 1. Generate Ansible inventory.yaml
    ansible_inv = {"all": {"hosts": {}}}
    for m in members:
        clean_name = (m.get('name') or f"node-{m['nodeId']}").lower().replace(" ", "-")
        ansible_inv["all"]["hosts"][clean_name] = {
            "zt_node_id": m['nodeId'],
            "ansible_host": m['config']['ipAssignments'] if m['config']['ipAssignments'] else "0.0.0.0"
        }

    with open('inventory.yaml', 'w') as f:
        # Using json.dump because Ansible supports JSON inventories natively as well
        json.dump(ansible_inv, f, indent=2)

    # 2. Generate Terraform members.tfvars
    tf_vars = {m.get('name') or f"node_{m['nodeId']}": m['nodeId'] for m in members}
    with open('members.tfvars', 'w') as f:
        f.write("my_nodes = " + json.dumps(tf_vars, indent=2))

    print("Success: Generated inventory.yaml and members.tfvars")

if __name__ == "__main__":
    main()
```
## CDKTF and Pulumi for Infrastructure as Code
CDKTF (Cloud Development Kit for Terraform) and Pulumi are tools that allow you to define your infrastructure using programming languages like TypeScript, Python, or Go, instead of Terraform's HCL.

### CDKTF Example in TypeScript
```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { ZerotierProvider } from "./.gen/providers/zerotier/provider";
import { Member } from "./.gen/providers/zerotier/member";

class MyZTMigrationStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // 1. Initialize the ZeroTier Provider
    new ZerotierProvider(this, "zerotier", {
      apiToken: "your_central_api_token",
    });

    // 2. Your list of 10 nodes (The JS Object style you liked)
    const myNodes = [
      { name: "home-server", id: "89abcdef01" },
      { name: "my-laptop", id: "89abcdef02" },
      { name: "media-pi", id: "89abcdef03" },
      //... add the remaining 7 here
    ];

    // 3. The Migration Loop: Authorize all nodes automatically
    myNodes.map((node) => {
      new Member(this, `member-${node.name}`, {
        networkId: "your_new_network_id",
        memberId: node.id,
        name: node.name,
        authorized: true,
      });
    });
  }
}

const app = new App();
new MyZTMigrationStack(app, "zerotier-migration");
app.synth();
```
## Community Support for CDKTF
While HashiCorp has deprecated its support for CDKTF, a community-driven ecosystem is emerging to maintain and evolve the toolkit. Initiatives like CDK Terrain (CDKTN) and TerraConstructs aim to provide continued support for languages like TypeScript, Python, and Go, allowing users to provision infrastructure through both HashiCorp Terraform and OpenTofu.

## Key Differences at a Glance

Pulumi is actively developed and fully supported by Pulumi Corp as a "code-first" platform. In contrast to CDKTF, Pulumi offers several key advantages.

### Deployment Speed

Pulumi typically deploys faster because it communicates directly with cloud APIs, whereas CDKTF can be slower due to the extra transpilation/synthesis step.

### Advanced Logic

Pulumi supports complex, dynamic workflows via the Automation API, allowing you to embed Infrastructure as Code (IaC) directly into apps. This is in contrast to CDKTF, which is limited to what Terraform's engine can execute once synthesized.

### Secrets

Pulumi has built-in encryption for secrets at rest and in transit, whereas CDKTF relies on external Terraform providers for secrets management.

### Why Choose Pulumi Over CDKTF

Many developers prefer Pulumi due to its native experience, which treats infrastructure as actual software. Additionally, Pulumi provides ecosystem access, allowing you to reference existing Terraform state and use Terraform modules directly, making it easy to transition without losing previous work. Pulumi also includes built-in testing frameworks that work natively with standard language tools.

### The Migration Path

If you are moving from CDKTF, Pulumi provides automated migration tools that can convert your existing code and import your state files. This ensures that you don't have to recreate your infrastructure from scratch.

To demonstrate the power of Pulumi, let's consider an example of how it can interact with the ZeroTier central API.

### Pulumi TypeScript Example

To use ZeroTier with Pulumi, you'll use the `@pulumi/zerotier` provider. This allows you to manage your network and members as code, just as you would with other cloud resources.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as zerotier from "@pulumi/zerotier";

// 1. Configure the ZeroTier Provider (token usually set via 'pulumi config set --secret')
const config = new pulumi.Config();
const ztToken = config.requireSecret("ztToken");

// 2. Define your new network
const myNetwork = new zerotier.Network("migrated-network", {
    name: "Home-Fleet-V2",
    description: "New Central managed network",
    assignIpv4Central: true,
    //... other network settings
});

// 3. Authorize your 10 personal nodes
const nodeIds = {
    "home-server": "89abcdef01",
    "my-laptop": "89abcdef02",
    "media-pi": "89abcdef03",
};

// Use standard JS mapping to create Pulumi resources
Object.entries(nodeIds).map(([name, id]) => {
    new zerotier.Member("auth-" + name, {
        networkId: myNetwork.id,
        memberId: id,
        name: name,
        authorized: true,
    });
});

// Export the Network ID for use in other scripts
export const newNetworkId = myNetwork.id;
```
### Why Pulumi is Great for This

Pulumi offers several advantages for managing ZeroTier infrastructure.

*   **Built-in Secrets**: You can use `pulumi config set --secret ztToken <value>` to encrypt your ZeroTier API token. Pulumi handles the decryption only at runtime, so your token is never stored in plain text in your code.
*   **Dynamic Logic**: Because it's "just TypeScript," you can easily pull your node IDs from an external JSON file or even an API call during the deployment process.
*   **State Management**: Pulumi manages the state of which nodes are authorized. If you delete a node from your `nodeIds` object and run `pulumi up`, Pulumi will automatically deauthorize that node on the ZeroTier controller.

### The Automation API

Pulumi offers an Automation API that allows you to embed the entire Pulumi engine into a custom application. This enables you to build a "one-click" migration dashboard for yourself without ever touching a CLI.

For those interested in using Pulumi with Python, the same example can be implemented using Python.

```python
import pulumi
from pulumi_zerotier import Network, Member

# 1. Configure the ZeroTier Provider (token usually set via 'pulumi config set --secret')
config = pulumi.Config()
zt_token = config.require_secret("ztToken")

# 2. Define your new network
my_network = Network("migrated-network",
                     name="Home-Fleet-V2",
                     description="New Central managed network",
                     assign_ipv4_central=True,
                     #... other network settings
                     )

# 3. Authorize your 10 personal nodes
node_ids = {
    "home-server": "89abcdef01",
    "my-laptop": "89abcdef02",
    "media-pi": "89abcdef03",
}

# Use standard Python mapping to create Pulumi resources
for name, id in node_ids.items():
    Member(f"auth-{name}",
           network_id=my_network.id,
           member_id=id,
           name=name,
           authorized=True)

# Export the Network ID for use in other scripts
pulumi.export("newNetworkId", my_network.id)

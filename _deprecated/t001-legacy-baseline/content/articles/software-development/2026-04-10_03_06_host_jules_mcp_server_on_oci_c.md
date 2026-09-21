---
Title: "host jules mcp server on oci compute instance"
Date: "2026-04-10_03_06"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
Hosting a Jules Model Context Protocol (MCP) Server on an Oracle Cloud Infrastructure (OCI) Compute Instance
====================================================================================

To host a Jules MCP server on an Oracle Cloud Infrastructure (OCI) Compute Instance, you need to set up the VM, install the required runtime environment, pull your server code, and expose it via a transport layer like Server-Sent Events (SSE) or Streamable HTTP. Since most MCP clients connect to local MCP servers via standard input/output (`stdio`), hosting a server on a remote OCI compute instance requires exposing it over the network as a remote MCP server.

### Phase 1: Provision the OCI Compute Instance

To start, log in to your [OCI Console](https://cloud.oracle.com/) and navigate to **Compute** > **Instances**. Click **Create Instance** and configure the following:

* **Shape:** Choose a shape that fits your needs (e.g., an `Ampere` Always-Free shape or a standard `AMD/Intel` shape).
* **Image:** Select an OS such as **Oracle Linux 8/9** or **Ubuntu**.
* **Networking:** Ensure it's in a public subnet with a public IP assigned so external MCP clients can reach it.
* **SSH Keys:** Download or paste your public SSH key to access the box.

Click **Create** and wait for the instance state to change to "Running".

### Phase 2: Configure the Network Security (VCN)

By default, OCI blocks all inbound traffic except SSH. You must open the port your MCP server will listen on (e.g., port `3000` or `8000`).

In the OCI Console, go to your instance details and click on the **Virtual Cloud Network (VCN)** associated with it. Click on **Security Lists** and select the default security list. Click **Add Ingress Rules** and add a rule:

* **Source CIDR:** `0.0.0.0/0` (or your specific IP address for better security).
* **IP Protocol:** `TCP`.
* **Destination Port Range:** Enter your port (e.g., `8000`).

### Phase 3: Set Up the Server Environment

SSH into your instance using your terminal:
```bash
ssh -i /path/to/your/private_key opc@<your-instance-public-ip>
# Note: Use 'ubuntu' as the username if you chose an Ubuntu image
```

Depending on whether your Jules MCP server is written in Python or TypeScript/Node.js, follow the appropriate steps:

#### For Node.js/TypeScript MCP Servers:

1. Install Node.js:
```bash
sudo dnf module enable nodejs:20 -y  # On Oracle Linux
sudo dnf install nodejs -y
```
2. Clone your Jules server repository or create a directory and pull your files.
3. Install dependencies:
```bash
npm install
```

#### For Python MCP Servers:

1. Install Python and `pip`:
```bash
sudo dnf install python3 python3-pip -y
```
2. Install the official MCP Python SDK and any necessary tools (like `uv` for fast package handling):
```bash
pip3 install mcp
# Or using uv
pip3 install uv
```

### Phase 4: Run the Server over HTTP (Remote MCP)

Because standard `stdio` transport only works when the client starts the server as a local sub-process, you must run the server over **HTTP with Server-Sent Events (SSE)** or **Streamable HTTP** to access it remotely.

If you are using the official MCP SDKs, check your Jules server code to ensure it initializes an SSE transport instead of a `stdio` transport.

**Example (Python FastMCP SSE implementation):**
```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("jules-server")

@mcp.tool()
def my_custom_tool(param: str):
    return f"Processed {param}"

if __name__ == "__main__":
    # Run as a web server on port 8000
    mcp.run(transport="sse", host="0.0.0.0", port=8000)
```

Run your server on the OCI compute instance:
```bash
python3 server.py
```
(Tip: Use a process manager like `pm2` or `systemd` to keep the server running in the background when you close the SSH session).

### Phase 5: Connect your MCP Client

Now that your server is listening on `http://<your-instance-public-ip>:8000`, open your client's configuration (like Claude Desktop's `claude_desktop_config.json` or VS Code's Cline configuration) and add the remote server using the SSE transport protocol:
```json
{
  "mcpServers": {
    "jules-remote-server": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/client-sse",
        "http://<your-instance-public-ip>:8000/sse"
      ]
    }
  }
}
```
For additional security and scalability, consider containerizing your Jules MCP server using Docker on OCI or securing it with an API Gateway.

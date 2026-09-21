---
Title: "run supabase-memory-mcp as supabase edge function"
Date: "2026-04-12_10_56"
Tags:
  - Databases and Data
Category: "Databases and Data"
Source_Products:
  - AI_Mode
  - Search
---
Running Supabase-Memory-MCP as a Supabase Edge Function
=====================================================

To run an MCP (Model Context Protocol) server like supabase-memory-mcp as a Supabase Edge Function, it's necessary to adapt it from a standard Node/CLI standard I/O (stdio) process into an HTTP-based transport that the Deno-based Edge Runtime can execute. The most efficient way to achieve this is by using the lightweight `@modelcontextprotocol/sdk` or a community-vetted lightweight adapter like `mcp-lite`.

### Step 1: Initialize the Edge Function

To start, open your terminal in your project directory and create a new Edge Function using the following command:
```bash
supabase functions new memory-mcp
```
This creates a new file at `supabase/functions/memory-mcp/index.ts`.

### Step 2: Implement the MCP Server over HTTP

Open the `index.ts` file and replace its contents with the following implementation using native Deno and the official MCP SDK:
```javascript
import { Server } from "https://esm.sh/@modelcontextprotocol/sdk@1.5.0/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "https://esm.sh/@modelcontextprotocol/sdk@1.5.0/types.js";

// 1. Initialize the MCP Server
const server = new Server({
  name: "supabase-memory-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// 2. Define the graph/memory tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_memory",
        description: "Create a new memory node or entity in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entity: { type: "string", description: "The entity name" },
            relations: { type: "array", items: { type: "string" }, description: "Relations to other entities" },
          },
          required: ["entity"],
        },
      },
      // Add read_graph, search_nodes or delete_memory tools here...
    ],
  };
});

// 3. Define the tool execution logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "create_memory":
      // Implement your graph or database storage logic here.
      // E.g., querying your Supabase Postgres database.
      return {
        content: [
          {
            type: "text",
            text: `Memory successfully created for entity: ${args?.entity}`,
          },
        ],
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// 4. Handle HTTP requests (adapting Deno Edge Runtime to MCP HTTP transport)
Deno.serve(async (req) => {
  // Guard clause for non-POST requests
  if (req.method!== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const requestPayload = await req.json();
    
    // Process the MCP request payload directly
    const responsePayload = await server.handleRequest(requestPayload);
    
    return new Response(JSON.stringify(responsePayload), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```
### Step 3: Deploy the Function

Deploy your newly coded memory server directly to your Supabase project using the CLI:
```bash
supabase functions deploy memory-mcp --no-verify-jwt
```
Note that the `--no-verify-jwt` flag is used if your external AI client doesn't natively attach Supabase JWT tokens. If your environment demands gated access, keep JWT verification on and pass your anon or service_role key in the client header.

### Key Execution Constraints

To avoid deployment failures or crashing behaviors, keep the following Edge Function boundaries in mind:

*   **Memory Constraints**: Edge functions have a hard runtime memory limit of 150MB. If your memory-mcp fetches massive knowledge graph arrays into local compute memory at once, it will crash with an out-of-memory error. Page your database queries.
*   **Database Calls**: Instead of tracking standard memory locally in a JSON file (as some quick-start Node MCPs do), connect this function straight to your Supabase Postgres database using execution queries to save and query entities.

For further assistance with mapping the database schema or SQL RPCs to back this memory graph in Postgres, additional guidance can be provided.

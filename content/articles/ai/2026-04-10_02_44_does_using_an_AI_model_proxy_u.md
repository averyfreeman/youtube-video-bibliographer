---
Title: "does using an AI model proxy use more tokens?"
Date: "2026-04-10_02_44"
Tags:
  - AI
Category: "AI"
Source_Products:
  - AI_Mode
  - Search
---
## Using an AI Model Proxy: Understanding Token Usage
When using an AI model proxy, the impact on token usage depends on the configuration and features of the proxy. A basic AI proxy acts as a simple pass-through or router between the application and the AI provider, such as OpenAI or Anthropic. In this scenario, the token count remains the same as making a direct API call.

However, most proxies are not just simple pass-throughs. They can impact token consumption in several ways, depending on how they are used.

### Factors That Decrease Token Usage
Many modern AI proxies are designed to save money and reduce token usage. Some of the key features that decrease token usage include:

* **Semantic Caching**: If users ask the same or similar questions repeatedly, a proxy with semantic caching will return the stored answer instead of sending a new request to the AI model, reducing token usage to zero for that specific request.
* **Context Compression & Truncation**: Advanced proxies can automatically trim down long chat histories or compress system prompts before sending them to the model.
* **Prompt Caching Support**: Proxies can help orchestrate provider-level prompt caching, such as those offered by Anthropic or Gemini, which reduces the cost of processing large, repetitive contexts.

### Factors That Increase Token Usage
Some proxy features or settings can cause token counts to increase. These include:

* **System Prompt Injection**: Many proxies, especially those used for custom chatbots or roleplaying sites like JanitorAI, automatically inject large, permanent system prompts, lorebooks, or character definitions into every single message sent. This can scale up token consumption rapidly.
* **Automatic Tool Definitions**: If the proxy is configured to give the AI access to external tools or APIs, such as Model Context Protocol (MCP) servers, the proxy has to inject the definitions and schemas of those tools into the prompt, adding thousands of overhead tokens to every single request.
* **Guardrails and Moderation**: If the proxy runs the prompt through an additional AI-based moderation or safety check before sending it to the primary model, that secondary check will consume its own set of tokens.

### Optimizing Token Usage
To minimize token usage, it is essential to carefully select and configure the proxy features and settings. The following guidelines can help:

| Scenario | Recommendation |
| --- | --- |
| gemini-cli-jules | Keep |
| gemini-cli-ralph, ralph | Remove (Ralph is a separate, heavy self-referential agent loop that creates massive token chains) |
| system-agents, superpowers | Remove (These activate global sub-agents that listen to background tasks, eating up tokens heavily) |
| conductor | Remove (An orchestrator that often conflicts with how Jules autonomously plans tasks) |
| google-workspace | Keep (This is the standard official extension) |
| google-workspace-cli, google-workspace-developer-tools | Remove (These add redundant tool definitions) |
| cloud-run, GeminiCloudAssist | Keep only if actively deploying to GCP, otherwise remove |
| cc-skills-golang, flutter | Keep if writing Go or Flutter code |
| genkit, nanostack | Remove unless actively building Firebase Genkit apps or low-level network stacks |
| github | Keep (Jules requires a GitHub connection to work effectively) |
| chrome-devtools-mcp | Keep (Highly useful for debugging web apps) |
| huggingface, huggingface-skills | Remove unless active models from HF are pulled to the local machine daily |
| code-review | Remove (Jules handles code assessment and PRs inherently) |
| gemini-cli-prompt-library, prompt-engineering-extension | Remove (These dump massive text templates into your prompt history) |

By following these guidelines and carefully selecting the proxy features and settings, it is possible to minimize token usage while still leveraging the benefits of an AI model proxy.

---
Title: "ubuntu 26.04 how to use llm command"
Date: "2026-05-25_03_37"
Tags:
  - AI
Category: "AI"
Source_Products:
  - AI_Mode
  - Search
---
Using LLM and HTML Parsers on Ubuntu 26.04
=============================================

### Introduction to LLM

The LLM CLI utility, created by Simon Willison, allows users to interact with large language models directly from their terminal. This tool is particularly useful for tasks such as generating text, translating languages, and summarizing content.

### Installing LLM on Ubuntu 26.04

To install the LLM tool on Ubuntu, you can use the `uv` tool manager, which is often pre-installed or easily added on modern Ubuntu releases. Here are the steps to install LLM using `uv` and an alternative method using `pip`:

*   **Install via uv:**
    ```bash
uv tool install llm
```
*   **Alternative via pip:**
    ```bash
pip install llm
```
### Initial Setup (API Keys)

By default, the LLM tool is configured for OpenAI, but you must provide your own API key to use it. To set your API key, run the following command and paste your OpenAI API key when prompted:
```bash
llm keys set openai
```
### Common Usage Examples

Once installed, you can use the LLM command for single prompts, pipe data into it, or start interactive chats. Here are some examples:

*   **Direct Prompt:**
    ```bash
llm "Write a python script to list all files in a directory"
```
*   **Piping Data (System Prompts):** Use this to analyze files or command outputs.
    ```bash
cat error.log | llm -s "Explain why this log shows a connection timeout"
```
*   **Continue a Conversation:** Use the `-c` flag to continue the last chat.
    ```bash
llm "Now rewrite that in Go" -c
```

### Managing Models

You can list available models or install plugins to use local models (like Llama or Mistral) instead of cloud APIs. Here are some examples:

*   **List installed models:**
    ```bash
llm models
```
*   **Set a default model:**
    ```bash
llm models default gpt-4o-mini
```
*   **Install plugins for local models:**
    ```bash
llm install llm-llama-cpp
```

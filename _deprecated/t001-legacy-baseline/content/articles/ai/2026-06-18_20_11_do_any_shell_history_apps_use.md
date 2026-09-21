---
Title: "do any shell history apps use apfel and sqlite with vector?"
Date: "2026-06-18_20_11"
Tags:
  - AI
Category: "AI"
Source_Products:
  - AI_Mode
  - Search
---
Combining Apple Platforms, SQLite, and Vector Embeddings for Shell History Management
====================================================================================

While there are no mainstream shell history apps that natively combine Apple platforms, SQLite, and vector embeddings, it is possible to achieve this exact stack by integrating a local Large Language Model (LLM) with an SQLite-powered shell history manager. In this article, we will explore how to combine these tools and create a custom solution.

### SQLite Shell History Apps

Several tools use SQLite to log commands, time elapsed, exit codes, and execution directories. Two popular options are:

* [Atuin](https://github.com/atuinsh/atuin): A cross-platform tool that replaces your shell history with a local SQLite database and provides end-to-end encrypted synchronization.
* [ShellHistory](https://loshadki.app/shellhistory/): A native macOS app that tracks history in a local SQLite database and features iCloud synchronization.

### SQLite and Vector Extensions

SQLite does not natively compute vector distances, but it can be extended to support them using lightweight, local extensions. Two options are:

* [sqlite-vec](https://github.com/sqliteai/sqlite-vector): An ultra-efficient, cross-platform SQLite extension written in C that handles similarity searches and vector embeddings.
* [sqlite-vss](https://github.com/asg017/sqlite-vss): An alternative extension utilized for vector search inside SQLite environments.

### Building a Custom Solution

To use vector search for your command history, you can combine Atuin's SQLite storage with an embedding model to create a semantic search. The typical workflow involves:

1. Extracting historical commands directly from your Atuin SQLite database.
2. Passing the commands through a local embedding model (like **Ollama** or **EmbeddingGemma**).
3. Storing the resulting embeddings and searching them using the [sqlite-vec](https://github.com/sqliteai/sqlite-vector) extension.

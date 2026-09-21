---
Title: "are text-based ledgers like ledger, beancount, hledger, designed to natively use an SQL database, or is this an add-on available for some of them?"
Date: "2026-06-20_01_36"
Tags:
  - Databases and Data
Category: "Databases and Data"
Source_Products:
  - AI_Mode
  - Search
---
Text-Based Ledgers and SQL Interactions
=====================================

Text-based ledgers like Ledger, Beancount, and hledger are designed around Plain Text Accounting (PTA), where financial transactions are recorded in a plain-text file. These tools read and parse the file directly into memory to generate reports, rather than relying on a database. While native SQL storage is not a core feature of these tools, SQL interactions are available through add-ons, built-in exporters, or community scripts.

### Beancount

Beancount features a built-in SQL-like Query Language (BQL) that allows querying of in-memory data using `bean-query`. This tool mimics SQL syntax to filter and aggregate transactions. Community tools like `beanquery` also enable running lighter SQL queries directly over Beancount's dataset.

### hledger

hledger has a built-in command (`-O sql`) that outputs plain-text ledger data into a format suitable for a relational database. This output can be piped directly into an interactive SQLite environment or session. Additionally, community scripts like `hledger2psql` are available to export journaling data into a PostgreSQL database.

### Ledger CLI

The original Ledger CLI operates entirely in-memory and does not have built-in SQL exporting. Users typically write custom scripts to parse Ledger data into CSVs or JSON before loading them into a database.

Evaluating Text-Based Ledgers
-----------------------------

When evaluating these tools, consider the desired workflow and the level of SQL interaction required. Each tool has its strengths and weaknesses, and understanding these differences is crucial for making an informed decision.

Community Efforts and Experimental Projects
-----------------------------------------

There have been community experiments regarding SQL storage for Beancount, such as Beanpost and Beancount-SQL. Beanpost implements a PostgreSQL schema for Beancount, allowing for import/export of transactions between a text file and a Postgres database. Most users, however, rely on the built-in `bean-query` tool for SQL-like syntax.

hledger and AI: Vectorization and Interfacing
-----------------------------------------

The hledger community has moved toward Agentic Interfaces rather than raw vector storage. The hledger MCP (Model Context Protocol) Server is a significant effort, allowing AI assistants to directly interact with the hledger CLI. This protocol enables real-time commands, bypassing the need for a complex vector database pipeline.

Other community tools, such as `smart_importer`, use classic Machine Learning (Support Vector Machines) to learn from existing data and predict which account a new transaction belongs to. This functionality runs entirely locally, training a small model on the specific file every time an import is performed.

DIY Community Approach
----------------------

The community approach to vectorizing hledger data involves:

1. **Export**: `hledger print -O csv > data.csv`
2. **Vectorize**: Load the CSV into a tool like PandasAI or a local Postgres + pgvector instance
3. **Query**: Use a standard LLM to query the vectorized data

Summary of Projects
--------------------

| Feature | hledger Ecosystem | Beancount Ecosystem |
| --- | --- | --- |
| **SQL Interface** | `hledger-lib` / `hledger2psql` (Export to DB) | `bean-query` (Native SQL-like syntax) |
| **AI Agent Interface** | **hledger-mcp** (Direct AI control) | **Beancount Telegram Bot** (LLM powered) |
| **Auto-Categorization** | Bayesian scripts / External tools | **smart_importer** (Machine Learning/SVM) |
| **Vector Search** | Via generic PostgreSQL export | "Beancount.io" (Commercial/Hosted AI features) |

For further information, consider exploring the following topics:

* How to set up the **smart_importer** for auto-categorization
* Steps to run the **hledger MCP server** locally
* Using **beanquery** to run SQL-like reports on your current files

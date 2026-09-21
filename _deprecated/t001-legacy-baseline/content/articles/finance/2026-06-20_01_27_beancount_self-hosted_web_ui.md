---
Title: "beancount self-hosted web ui"
Date: "2026-06-20_01_27"
Tags:
  - Finance
Category: "Finance"
Source_Products:
  - AI_Mode
  - Search
---
```markdown
Your prompt:
beancount self-hosted web ui

Search's response:
Fava is the premier, community-standard, self-hosted web interface for Beancount. It provides a feature-rich, interactive dashboard to view double-entry reports, charts, and visualizations for your plain-text financial ledgers.

Why Choose Fava

Interactive Dashboards: Automatically generates reports on net worth, income/expenses, and investment holdings.
Plain Text Integrity: Reads and modifies your underlying .beancount files directly without locking your data into a database.
Extensibility: Supports powerful Beancount plugins and custom queries.
Mobile Friendly: Designed to be accessible from mobile and desktop browsers.

How to Self-Host Fava

Running Fava is simple and lightweight. It can be executed directly via Python or run in a Docker container on your local server.

Option 1: Native Python

Install Beancount and Fava via pip:
pip install beancount fava

Start the web interface by pointing it to your ledger file:
fava /path/to/your/ledger.beancount

Access the UI in your browser at http://localhost:5000.

Option 2: Docker

To host it on a home server, use the official Fava Docker image:
docker run -d \
  -p 5000:5000 \
  -v /path/to/your/ledger.beancount:/ledger.beancount \
  -e FAVA_HOST=0.0.0.0 \
  beancount/fava

For detailed documentation on filters, extensions, and configuration, explore the Fava GitHub Repository.

FollowUp

If you're interested, I can also:
* Explain how to use Beancount-import for semi-automatically bringing in bank statements.
* Guide you on setting up Beancount-git for automatic version control backups.

Let me know if you need help integrating Fava into your local environment.

Your prompt:
does fava have any competitors?

Search's response:
Yes, Fava has competitors, though because Fava is the unofficially designated community standard for Beancount specifically, its primary alternatives are either alternative plain-text engines with their own web interfaces or self-hosted SQL-based web UIs.

The main alternatives are categorized below by their underlying system architecture:

1. Direct Plain-Text Web Competitors

If you want to stick strictly to plain-text accounting (PTA) files but don't want to use Fava/Beancount, look into these options:

hledger-web: The most prominent direct rival. It is the native web interface for hledger, a major alternative plain-text ecosystem. While it is historically known for being a simpler web interface for data browsing and data entry compared to Fava's complex charts, it has a passionate developer community.

Buchhaltung: A web interface specifically designed to run on top of Ledger or hledger engines. It is well-regarded for its dead-simple transaction matching system and integrated European bank API (AqBanking) fetching.

2. Commercial Cloud-Native Beancount Platforms

BeanHub: A commercial, cloud-hosted SaaS layer built explicitly around git-managed Beancount files. It provides an automated web interface, specialized formatting tools (beanhub-format), and web-based data ingestion workflows.

3. Self-Hosted SQL/Database Competitors

Firefly III: A massive self-hosted PHP-based personal finance manager. It uses a standard database (MySQL/PostgreSQL) and provides extensive budget management, piggy banks, and charts.

Actual Budget: Originally a commercial app, now a fully open-source, local-first, self-hosted budgeting application. It focuses heavily on 100% envelope-method budgeting with a slick, responsive web interface.

Ghostfolios: A modern, self-hosted web dashboard written in TypeScript. It is highly optimized for tracking investments, stocks, and crypto portfolios rather than daily checking account double-entry bookkeeping.

Your prompt:
does hledger have any plaid connector attempts?

Search's response:
Yes, hledger users have made multiple attempts to connect to Plaid, though there is no official, built-in "hledger-plaid" button. Because Plain Text Accounting (PTA) emphasizes privacy, local control, and avoiding external dependencies, most Plaid integration attempts rely on third-party CLI scripts and middle layers that convert Plaid data into format-agnostic CSV files, which hledger then natively imports.

The most prominent ways hledger users connect to Plaid include:

1. plaid-cli + Custom Bash Pipelines

The most popular local approach in the community involves using a generic, community-developed tool like plaid-cli.
```
## Workflow:

Users create a free Plaid Developer account (which allows connecting up to 5 personal bank institutions).

## Mechanism:

A simple 2-to-3 line bash script triggers plaid-cli via a cron job or make command to pull transactions into a local .csv folder.

## Import:

hledger's native CSV conversion rules tool takes that CSV file, auto-assigns matching double-entry accounts, and appends the transactions directly into the hledger journal.

## BeanHub Direct Connect

While BeanHub was originally built strictly for Beancount users, they launched a feature called BeanHub Direct Connect.

It is a paid utility layer built directly on top of the Plaid API that pulls bank transactions from over 12,000 global financial institutions.

It allows users to execute a command-line dump (bh connect dump --sync) to download completely sanitized, structured CSV files locally onto their computer.

Even though the tool is part of the BeanHub ecosystem, hledger users leverage these standardized CSV outputs specifically to feed their local hledger rules.

## SimpleFIN Bridge Alternative

Many members of the Plain Text Accounting Forum have shifted from building direct Plaid integrations to using a service called SimpleFIN Bridge.

Plaid's developer accounts have historically suffered from frequent token expirations, high bank security friction (especially with multi-factor authentication), and strict developer terms of service.

SimpleFIN acts as a privacy-focused, very low-cost middleman that maintains the bank connection links and exposes a dead-simple, scriptable JSON/CSV endpoint. hledger users heavily favor this over maintaining custom Plaid OAuth tokens.

## Historic Scripts (e.g., ledger-autosync)

Historically, the ecosystem relied on Python tools like ledger-autosync to pull bank data. However, many of these direct aggregators have been discontinued or abandoned due to changes in banking OAuth protocols and Plaid's API pricing shifts for higher-tier account structures.

## FollowUp

If you want to try setting this up, let me know:

* Do you already have a **Plaid Developer Account** API key?
* Are you comfortable using **Python or Bash scripts** to automate file writing?
* Which **operating system** are you planning to run your hledger engine on?

I can provide a boilerplate shell script and an hledger.rules template to get your bank CSVs auto-formatting!

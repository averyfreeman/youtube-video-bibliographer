---
Title: "Productivity on Chromebook: VS Code, Google Workspace, and Automation"
Date: "2026-07-04_16_15"
Tags:
  - Software Development
Split_From_Line: 28
Category: "Software Development"
---
## Running VS Code on a Chromebook
You can run a full, desktop-grade VS Code locally using the built-in Linux development environment:

1. **The Local Desktop Route (Linux)**: Install VS Code using the `.deb` package and run it locally, accessing your local file system.
2. **The Browser & Web App Route (PWA)**: Install VS Code as a Progressive Web App (PWA) via `vscode.dev` or GitHub Codespaces, which strips away browser tabs and navigation buttons, launching in a dedicated window.

## Google Workspace Studio and Automation
Google Workspace Studio is a no-code/low-code "Agent Builder" that lets you build simple agents like "Inbox Triage" or "Meeting Prep" that can read your Gmail and write to your Calendar. To automate tasks, you can use:

* **Google Workspace CLI (GWS)**: A command-line tool that lets you control Gmail, Drive, Calendar, and Docs directly from your terminal.
* **Google Apps Script**: A cloud-based JavaScript platform that runs on Google's servers, allowing you to automate tasks using scripts.

## Antigravity and Clasp
Google Antigravity is an autonomous, agent-first development platform that supports `clasp` capabilities, allowing you to write, update, and deploy your Workspace Standard email sorting script. However, it is restricted to personal (@gmail.com) Google accounts for direct application login.

To use Antigravity with your Workspace Standard account, you can create a desktop client in Google Cloud, feed the token to Antigravity, and use the `clasp` login flow to authenticate against your corporate Workspace account.

## Conclusion
In conclusion, there are various options available for creating a ChromeOS-like experience, from Chromium-based distributions to traditional Linux distros and building your own environment using specific desktop interfaces. Additionally, tools like Google Workspace Studio, Google Workspace CLI, and Antigravity can help you automate tasks and deploy scripts to your Workspace account.

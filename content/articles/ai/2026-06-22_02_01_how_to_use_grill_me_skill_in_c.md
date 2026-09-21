---
Title: "how to use grill me skill in cli"
Date: "2026-06-22_02_01"
Tags:
  - AI
Category: "AI"
Source_Products:
  - AI_Mode
  - Search
---
Using the Grill-Me Skill with Your Terminal AI Agent
=====================================================

To utilize the grill-me skill in your terminal AI agent, such as Claude Code, Codex, or OpenClaw, you first need to install it via the Vercel Labs skills CLI and then trigger it using a slash command during your planning phase. The purpose of this skill is to force the AI to relentlessly interview you one question at a time, mapping out your project's decision tree and identifying edge cases before writing code.

### Installation

To install the grill-me skill, open your terminal in your project directory and use the universal skills installer tool:

```bash
npx skills@latest add mattpocock/skills/grill-me
```
By default, this creates a `.claude/skills/grill-me/SKILL.md` file in your local project scope. To use it across all projects globally, append the `--global` flag.

### Invocation

Start your terminal AI agent session normally. Before describing your feature or writing code, trigger the skill by passing your initial idea:

```bash
/grill-me "I want to add a multi-user dashboard with real-time analytics"
```
Alternatively, you can just type `/grill-me` and reference a document, like `/grill-me read client-brief.md`.

### Running Through the Session

Once invoked, the agent changes its behavior to a Socratic interrogation workflow:

* One question at a time: The CLI will present a single, focused question about an architectural choice, data model, or edge case.
* Recommended answers: For each question, the AI will provide a smart recommendation based on best practices.
* Codebase exploration: If a question can be answered by looking at your existing files, the agent will automatically read the code instead of bugging you.
* Provide feedback: Type your response to the question or simply press enter to accept its recommended answer.

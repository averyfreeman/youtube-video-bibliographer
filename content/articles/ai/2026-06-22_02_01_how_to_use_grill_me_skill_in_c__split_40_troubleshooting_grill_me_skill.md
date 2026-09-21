---
Title: "Troubleshooting Grill Me Skill"
Date: "2026-07-04_12_28"
Tags:
  - AI
Split_From_Line: 40
Category: "AI"
---
### Completing the Session

Once all branches of the decision tree are resolved, the skill will stop asking questions and provide a finalized architectural summary or plan. From there, you can pipe the output into standard building commands or use the to-prd skill to automatically convert the context into a Product Requirements Document.

To streamline this workflow further, consider pairing the grill-me skill with other skills like to-prd or tdd. This can be achieved by chaining them together for an automated pipeline.

Troubleshooting: Resolving the Google Antigravity Backend Executor Crash
------------------------------------------------------------------------

When running an intensive interactive skill like grill-me, the tool output logs can balloon inside your local trajectory history faster than the agent's background compaction engine can summarize them. Once the history hits this limit, the system abruptly terminates the executor rather than attempting a truncation.

To resolve the crash on macOS 26.5.1:

1. **Clear the Corrupted Trajectory & Cache**: Close your terminal/IDE and run the following commands to wipe the local runtime buffers:

```bash
rm -rf ~/Library/Application\ Support/Antigravity/logs/*
rm -rf ~/Library/Caches/Antigravity/*

rm -rf ~/.cortex
rm -rf ~/.jetski
```
2. **Reset the Local Agent Session**: Open your terminal again and force a clean handshake with the server:
	* If you are in an IDE variant of agy, press `Cmd + Shift + P` to open the Command Palette.
	* Run `Antigravity: Reset onboarding`.
	* Re-authenticate when prompted.
	* Start a brand new conversation/task instead of retrying the broken one, which clears the broken trajectory.

3. **Mitigate Context Overflows for grill-me**: Because the grill-me skill forces a long, multi-turn sequence of questions, you need to manage your token headroom:
	* Disable unused MCP servers: Go to your MCP settings and toggle off external tools (like search or database integrations) that you don't need for the brainstorming phase.
	* Temporarily switch models: If you are crashing on a premium model tier, use the dropdown or CLI flags to switch your session model to Gemini 3.5 Flash (Medium).

Authenticating the Antigravity CLI
---------------------------------

The Antigravity CLI is built as an end-user developer tool rather than an automated pipeline utility. Because of this design choice, its engine explicitly rejects service accounts and mandates the OAuth 3-Legged (User) flow.

To authenticate the Antigravity CLI correctly:

1. **Unset the service account variable**: Run `unset GOOGLE_APPLICATION_CREDENTIALS` to stop overriding the Application Default Credentials (ADC).
2. **Authenticate the gcloud CLI with your personal user account**: Run `gcloud auth login`.
3. **Generate the correct local ADC user token file**: Run `gcloud auth application-default login`.

Once you execute the third command, a browser window will open to complete the secure OAuth flow. After consenting, a local user credential file is generated in your system's well-known location (`~/.config/gcloud/application_default_credentials.json`), which the Antigravity CLI will detect automatically to log you in.

Verifying IAM Roles
------------------

To ensure your developer user account has the same permissions as your service account, consider verifying your IAM roles. This step is crucial to ensure a seamless transition from using a service account to using your personal developer identity.

---
Title: "Automating Video Transcription and Summarization with Local AI"
Date: "2026-07-04_11_31"
Tags:
  - AI
Split_From_Line: 31
Category: "AI"
---
## Automating Video Transcription and Summarization
To automate video transcription and summarization, a Python script can be used to loop through a folder of video chapters, transcribe each chapter using a local AI model, and save the transcripts as individual text files.

## Setting Up a Virtual Environment for Audio Processing
To set up a virtual environment for audio processing, use `uv` to create a dedicated Python environment. Install the required libraries, including `faster-whisper` and `huggingface_hub`, using `uv pip install`.

## Recursive Script for Processing Tutorial Videos
A recursive script can be used to process tutorial videos in a nested folder structure. The script uses `ffmpeg` to extract audio and video frames, and a local AI model to transcribe the audio and generate summaries.

## Using Hermes for High-Quality Summarization
Hermes is an open-source model family that can be used for high-quality summarization. When paired with a compatible model like Gemma 4B, it can provide comprehensive and detailed summaries.

## Best Practices for Summarization Prompts
When using a model like Hermes for summarization, it's essential to provide clear and structured prompts. This includes specifying the chapter title, timestamp range, and the type of summary required.

## Example Summarization Prompt
An example summarization prompt might include:
* Executive concept overview
* Granular technical deep dive
* Explicit code, commands, and syntax

By following these best practices and using a model like Hermes, you can generate high-quality summaries of your tutorial videos.

## Organizing the System Locally
With Ollama running, you can interact with your models instantly. To run Gemma 4B via terminal, use the command `ollama run gemma:4b`. For a heavy-duty Hermes model, use `ollama run hermes3:8b`. This 8B parameter version of Hermes 3 fits within a MacBook Air's 24GB RAM and delivers rich, nuanced technical breakdowns.

If using a visual chat interface like Open WebUI or LM Studio, you can save a massive blueprint prompt as a reusable System Prompt / Persona. Then, drop a chapter's text file into the window to generate textbook-style output instantly.

## Creating a Custom Modelfile
To create a custom, automated Modelfile inside Ollama with a detailed system prompt baked directly into the model, you can use the `ollama` command with specific flags and configurations. However, the exact steps depend on your specific requirements and the version of Ollama you are using.

## Understanding Hermes Agent
Hermes Agent is an autonomous tool-use ecosystem that can write scripts, look at file directories, and pipe data between tools. It relies on parsing complex tool definitions and generating structured function calls. For heavy multi-step logic, a larger model like Hermes-3-Llama-3.1-8B is recommended.

## Configuring Hermes Agent
To configure Hermes Agent, you can edit the global config.yaml file, which handles all behavioral settings. You can open and edit this file directly from your terminal session using `hermes config edit`. To assign a lighter model for tasks delegated to sub-agents, add a delegation block inside config.yaml.

## Model Tiering and Sub-Agent Task Routing
Model tiering and sub-agent task routing are configured inside the global config.yaml file. You can add a delegation block to assign a lighter model for sub-agents. For example:
```yml
model: "hermes3:8b"
provider: "ollama"

delegation:
  model: "gemma:2b"
  provider: "ollama"
```
## Available Skills
Hermes Agent comes with several high-utility toolsets pre-installed, including code_execution, note-taking, and media skills. You can use these skills to automate tasks like transcription, note-taking, and media processing.

## Audio Processing
Hermes Agent uses specific audio processing engines in the background to handle speech-to-text and text-to-speech tasks. You can use the audicraft-audio-generation skill to generate audio files.

## Configuring Obsidian Skill
To configure the Obsidian skill, you can set the vault path using `hermes config set skills.obsidian.vault_path "~/Tutorials"`. This allows Hermes Agent to generate and update markdown files cleanly inside your Obsidian vault.

## Ollama Model Storage
Ollama stores models locally in a hidden user directory. You can confirm the models are stored safely on your hard drive by checking the storage path directly using `ls -lh ~/.ollama/models/blobs`.

## Updating Config File
To update the config file, you can edit the ~/.hermes/config.yml file directly. Make sure to update the model targets, provider definitions, and delegation blocks as needed.

## Chat Interfaces and Token Usage
Setting up a chat interface will make your life easier, but it will not reduce token usage. Every platform integration adds its own formatting hints and system guidelines, which can slightly increase token usage.

## Choosing a Chat Provider
Telegram is a good choice for a chat provider due to its simplicity and security. You can configure Telegram by running `hermes gateway setup` and following the prompts.

## Restarting Services
You need to restart the Hermes Agent service after modifying the config file. You can do this by running `hermes gateway start --restart`.

## Final Config Setup
Before launching your gateway session, apply a few final adjustments to align with your newly installed models. Update your primary text model targets, provider definitions, and delegation blocks as needed.

## Launching the System
Once your credentials are keyed into the setup wizard, you can launch the gateway process using `hermes gateway start`. Open your Telegram app, search for your bot's name, and send it a simple message to test the setup.

## Creating a Separate Bot Account
Yes, you should create a separate bot account for Hermes to keep it separate from other agent frameworks. Reusing the same bot token can cause collisions and data loss.

## Resolving Path Collisions
When activating a virtual environment, the script intentionally takes over your path, stripping out variables it doesn't like and prepending its own venv/bin directory. This can cause mise's tools to disappear from your path. You can resolve this by using one of three simple approaches:

1.  **Manually add mise's binary directory** to your $PATH variable after activating the virtual environment.
2.  **Use the `--preserve-path` flag** when activating the virtual environment to prevent it from modifying your $PATH.
3.  **Create an alias or function** to run mise's tools, which will allow you to bypass the virtual environment's path modifications.

By following these steps and configurations, you can set up and use Hermes Agent and Ollama effectively for your specific needs.

### Fix 1: Stop Using `source activate` Completely (Recommended for `uv`)

One of the main reasons `uv` was invented is to kill off the old manual step of activating virtual environments entirely. You never actually need to run `source.venv/bin/activate` when working with `uv`.

As long as you are standing in a folder that contains a `.venv` directory, running `uv pip install <package>` will automatically find the sandbox and install the library inside it.

To fix your current broken path terminal tab:

### Retrieving Your API Token

If you have already created the bot but didn't save the token, follow these steps:

1. Open Telegram and search for @BotFather.
2. Send the command /mybots.
3. Select the bot you just created from the list (e.g., MyHermesTutorialBot).
4. Click on API Token to display your unique string.
5. Alternatively, you can send the /token command directly to see your existing tokens.

### Important Security and Formatting

- **Token Format:** The token will look similar to 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ.
- **Treat as a Password:** This token is functionally a password; if it leaks, anyone can control your bot. If you accidentally share it or it appears in a screenshot, use the /revoke command in BotFather to immediately generate a new one.
- **Configuring Hermes:** Once you have the token, you can add it to your ~/.hermes/.env file by adding the line TELEGRAM_BOT_TOKEN="your_token_here".

### Next Steps for Setup

Don't forget that Hermes also requires your numeric User ID to restrict access to the bot. You can find this by messaging @userinfobot or @IdBot on Telegram. After saving these to your.env file, restart the gateway with `hermes gateway restart`.

### Recommended AI Gear for Your Lab

Since you're diving deep into the Hermes and Ollama ecosystem, you might want to deck out your workspace with some relevant gear:

- **Official Hermes Agent Shirt:** Nous Research offers a long anticipated Hermes Agent shirt. It's a screen-printed, 100% cotton, heavy-duty shirt made in the USA, featuring a new HERMES AGENT label inside the collar.
- **Ollama Enthusiast Apparel:** You can find unisex Ollama T-shirts designed for AI enthusiasts, featuring unique prints that symbolize the fusion of technology and innovation. These are often made from 100% combed and ring-spun cotton.
- **Custom AI Stickers:** If you want to customize your ThinkPad or MacBook Air, there are various Ollama-themed stickers available, including "Open Source AI Logo" and "Support Local. Use Ollama".

### Project Kickoff: Automated Tutorial Summaries

Since your Obsidian vault is already mapped to ~/Tutorials, you can trigger the agentic workflow directly from your new Telegram bot. Here is a prompt you can use to start the process:

> Scan the directory ~/Tutorials recursively. Use your code execution skills to find all video files and extract their audio. For each chapter, generate a detailed technical summary including key concepts and code snippets. Save these summaries directly into my Obsidian vault as a structured study guide.

### Refining Your Configuration

- **Orchestration:** Your setup of hermes3:8b for orchestration and qwen2.5-coder:7b for sub-tasks is a Level three agentic workflow. This means the AI can independently figure out steps, choose tools, and adapt as it gathers information.
- **Memory:** By integrating with Obsidian, your agent will have persistent context, effectively turning your vault into a navigable galaxy where it can recall your past notes and preferences for future sessions.
- **Sub-agents:** Hermes can autonomously create sub-agents to handle specific parts of this pipeline, such as one dedicated purely to transcription while another handles the markdown formatting.

### Debugging and Troubleshooting

If you encounter issues, such as the "The model provider failed after retries" error, it may be due to a configuration mismatch or a port conflict. Ensure that your `config.yaml` file is correctly set up, and consider restarting the Hermes gateway.

When dealing with truncation errors, it's essential to understand that the model has a limited output capacity. You can increase the `max_tokens` limit in your `config.yaml` file, but be aware of the potential memory tradeoff.

To resolve truncation issues, consider phasing your commands, focusing on one task at a time, and using more targeted prompts. This approach will help you avoid overloading the model and reduce the likelihood of errors.

### Resetting the Hermes Configuration
If you need to start from scratch, you can wipe the entire configuration and history by running `rm -rf ~/.hermes` and then regenerating the vanilla configuration with `hermes setup`. This will give you a clean slate to work with.

To configure `ollama-launch` the vanilla way, use the native configuration commands to safely inject your models, ensuring no duplicate keys or broken indentation.

By following these steps and guidelines, you should be able to set up and refine your Hermes configuration, troubleshoot common issues, and effectively utilize the `ollama-launch` framework for a seamless AI experience.

## Troubleshooting and Recovery
After attempting to set up the Hermes agent, you may encounter issues that prevent it from functioning correctly. If you're experiencing problems, it's essential to troubleshoot and recover your system.

### Reinstalling the Hermes Agent
If you've installed Ollama using Homebrew, you can reinstall the Hermes agent by running the following command:
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```
This script will automatically detect your Apple Silicon architecture, isolate its internal Python environment, and place a working binary back into your path.

### Verifying the Installation
Once the installation script finishes, open a fresh terminal tab and type `hermes --version` to confirm that your local command-line is fully restored.

### Resolving Path Conflicts with Homebrew
If you're using Homebrew, you may encounter path conflicts with the Python installation. Homebrew installs Python 3.14 and places it in the global system path, which can hijack your terminal shell.

To resolve this issue, you can explicitly force the installation script to build its isolated sandbox using your Mac's built-in, stable Python 3.9 system framework. However, this approach requires using `uv` and `mise`, which may not be desirable.

Alternatively, you can try to bypass the Homebrew installation and use a standalone Python environment. However, this approach is not recommended, as it can lead to further complications.

### Starting Fresh
If you're completely fed up with the setup process and want to start fresh, you can delete everything related to Homebrew and the Hermes agent. This approach will give you a clean slate, but you'll need to reinstall any necessary packages and tools.

Before proceeding, make sure you understand the implications of deleting your Homebrew installation and the Hermes agent. If you're unsure, it's recommended that you seek guidance from a qualified professional or the official documentation for each tool.

In any case, it's essential to be cautious when working with system configurations and package installations to avoid causing irreparable damage to your system. If you're not comfortable with the process, it's best to seek help or start fresh with a clean installation.

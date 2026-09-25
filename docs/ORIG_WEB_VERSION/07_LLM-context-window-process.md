# Turn 07 — LLM context-window process

_Source: [Gemini shared thread](https://share.gemini.google/2ApXwUdLrtcZ)_

## User prompt

> Please identify the key concepts and process steps for this video: https://www.youtube.com/watch?v=Y8vAQ1FgNbM&pp

## Gemini response

Here is a breakdown of the core concepts and process steps outlined in the video for managing LLM context windows and avoiding token limits.

## Key Concepts: The Physics of Token Limits

- **The "Reused Input" Trap:** LLMs do not have native memory. Every time you submit a prompt in an ongoing chat, the entire conversation history is bundled and sent back to the model. In a heavy coding session, up to 96% of processed tokens are just the model re-reading the old conversation.

- **Compounding Costs:** Your 1st message costs exactly what you typed. Your 10th message costs what you typed *plus* the previous nine exchanges. By message 30, your actual prompt is a rounding error compared to the bloat of the context window.

- **The "Messy Desk" Analogy:** More capable models and larger tool integrations (like GitHub, Sentry, or local file search) load massive amounts of hidden instructions and definitions into the context window before you even type a word. You must actively curate what is on your "desk."

- **Double Penalty on Output:** Output tokens are the most expensive to generate, and if you ask for long, verbose answers, you pay for those tokens *again* on every subsequent turn of the conversation.

## Process Steps: The 3-Level Token Optimization Framework

The creator outlines 15 rules divided across three escalating levels of technical implementation.

### Level 1: Clean Your Own Desk (Manual Habits)

These are behavioral steps that require no extra software and apply to web UI users (Claude, ChatGPT).

1.  **Edit, don't append:** If you make a typo or ask an unclear question, do not send a new message saying "Wait, I meant..." Use the edit button on your previous prompt and resubmit.

2.  **Batch questions and specify format:** Put all questions regarding a specific document into a single query and explicitly declare the desired output format (e.g., "5 bullets", "JSON only"). This prevents the AI from burning tokens on conversational filler.

3.  **Start clean threads constantly:** When the specific task changes, open a new chat. Do not keep a single mega-thread alive for a whole project.

4.  **Carry the artifact, not the argument:** When moving to a new step in a workflow, copy *only* the final generated output (the artifact) into a new chat. Leave behind your bad first drafts, rejected ideas, and the AI's reasoning.

5.  **Restrict output length:** Explicitly ask for short answers ("in 50 words") to prevent long outputs from permanently bloating the subsequent context window.

6.  **Search manually:** Do not use the LLM's file-search tool if you can avoid it. Find the exact code snippet or text you need and paste it directly.

7.  **Send the lightest file format:** Never upload a PDF or a screenshot if the visual layout doesn't matter. Convert documents to raw Markdown or plain text before pasting.

8.  **Archive accepted answers:** If you solve a problem, store the answer in a local database or notes app. Search your own notes before asking the LLM to recalculate the same solution next week.

### Level 2: Skill Automation (Token Saver)

These steps rely on IDE extensions or CLI tools (like the creator's "Token Saver" script) to automate context hygiene.

1.  **Load only necessary tools:** Tool definitions (what a tool does and what arguments it takes) can consume 50,000+ tokens before you even send a prompt. Only mount the tools required for the immediate task.

2.  **Utilize context compaction:** If a thread must remain long (e.g., deep debugging), rely on the model's native context editing or compaction tools to actively delete old tool results and "thinking" blocks from the history.

3.  **Select the "dumbest" capable model:** Use smaller, cheaper models for routine tasks. The automation script attempts to pre-screen your prompt and route it to the cheapest model that can handle the logic.

4.  **Implement Prompt Caching:** If making API calls, utilize prompt caching so that static instructions (like large system prompts or uploaded reference documents) do not need to be re-processed on every turn.

### Level 3: Intermediary Infrastructure (Ringer Framework)

These steps are for advanced users routing requests through local middleware (like the creator's "Ringer" framework) positioned between the user and the LLM API.

1.  **Enforce hard byte limits:** Configure the intermediary to block or truncate outgoing request packets and incoming response packets that exceed a strict token budget.

2.  **Intercept with local vector search:** Before the request ever hits the LLM API, the intermediary checks a local database (e.g., OpenBrain) for a cached answer. If found, it returns the solution locally, resulting in zero API token usage.

    Video link: https://www.youtube.com/watch?v=Y8vAQ1FgNbM


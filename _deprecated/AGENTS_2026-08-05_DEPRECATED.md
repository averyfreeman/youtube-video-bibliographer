[ disclaimer ] the `content` folder will be loaded as a submodule. However, content from this folder may be required for articles on the site [ `.md` or `.mdx` files ]. Do NOT alter anything inside of this folder, unless there is a _very_ good reason, and always check with me first. **consider `content` folder read only** with caveats. Rules listed here: `docs/CONSTRAINTS.md`
[ end disclaimer ]

[ phase description ] Warm up, familiarization, and overall planning:
[ ongoing tasks ]

1. Make regular commits at checkpoints, milestones, feature updates and removals, significant breakthroughs, and other appropriate stages, using commit messages appropriate for `git-cliff`.
2. Complete revisions to directives files in `docs` when it makes architectural sense. Propose changes to big-picture project steering directives for approval [ overall site purpose, site layout, foundation libraries ], but always silently [ autonomously ] update syntax, correctness, conciseness, filenames, and number of files in `docs` folder _without_ approval. [ One exception: ] _Do not remove content from `CONSTRAINTS.md` without approval._
3. Avoid mistakes and hallucinations: Prioritize compacting your memory in an on-going manner, and clearing your entire context window before starting on a new project [ agent discretion ].
4. Highly prefer utilizing long-term memory, `git` history, `docs` folder, and other persistent agent resources to exhausting your context window (see number 2).
5. [ docs folder directives files ] Once you are done finishing the tasks in an `AGENTS.md` file, deprecate it by renaming it, rename `docs/NEXT_STEPS.md` to `AGENTS.md`, empty your context window, and open `AGENTS.md` in `plan` mode.
   Ongoing tasks listed in: `docs/PRACTICES.md`
   [ end ongoing tasks ]

[ specific activities ] 0. Recommend Good models for this codebase I can use with oh-my-pi, prefer OpenRouter and Huggingface.

1. Read documents in `docs` folder for overall expectations and past information.
2. Assess whether the documents present a cogent argument for agents to follow, especially re: `ARCHITECTURE.md`, `WORKFLOW.md`, and `NEXT_STEPS.md` file(s).
3. Rename all files in `docs` using `SCREAMING_SNAKE_CASE`.
4. **Plan** to rewrite the instructions files in `docs` folder so they are more "agent-friendly", _while still retaining the same directives level of detail._ **Aim at improving agent efficicacy.** Rename and/or reduce the number of files in `docs` [if valid ] [ except: `CONSTRAINTS.md` ].
5. After evaluating the project toolset and codebase, create a list of recommended tools for this project in `docs/TOOLS.md` file under the [ agent_recommendations ] stub. Contrived examples: `nextjs-mcp`, `npmjs-mcp`, `daisyui-mcp`, `@openclaw/pi-coder`, plugins for pi-coding-agent harness such as `@pi-mfin/ass-kicking-connector`, skills from claude code (or other), skill writer, rewriting mcps to axi format, etc. List it so I can make it happen for you!

**Important:**

- Ensure there is a separation of concerns when choosing filenames so I can add additional rules to `PRACTICES.md`, `CONSTRAINTS.md`, `WORKFLOWS.md`, and so on. Not particular about filename choice, but I need to know subject of files in `docs` folder immediately by filename.
  [ gratuitous question about syntax ]
- Also, let me know if you like my notation, or if you'd prefer YAML, JSON, XML, etc. for prompts (or a mix of them all). Provide statistical evidence of best practices for prompt syntax / structure, if available and applicable. I want to accomodate you in the most effective way possible. Thanks!
  [ end gratuitous syntax question ]
  [ end specific activities ]

Please respond with **PLANS** in the TUI window when you are finished!

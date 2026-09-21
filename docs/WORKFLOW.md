<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Workflow Operating Model

## Purpose

Define a repeatable working model for AI-assisted software delivery in which the human sets direction and approval boundaries and the agent executes within a bounded task scope.

For autonomous front-end work, refer to `AGENTS.md` and the `docs` folder. Architecture and boundaries: `docs/ARCHITECTURE.md`.

## Scope

This model applies to non-trivial software work that is delegated through a written task brief.

It covers:

- Task intake
- Handoff between human and agent
- Execution behavior
- Validation and evidence expectations
- Risk-based stop conditions
- Final review and approval

It does not define product-specific architecture, repository conventions, or deployment policy unless those are provided in the task brief or existing project documents.

## Roles

### Human Responsibilities

The human owns priorities, intent, acceptance criteria, and final approval.

The human is responsible for:

- Choosing what work matters now
- Writing or approving the task brief before non-trivial work starts
- Defining acceptance criteria and required deliverables
- Supplying critical context, constraints, and known risks
- Setting approval boundaries for destructive, sensitive, or irreversible actions
- Reviewing evidence, outputs, and tradeoffs
- Deciding whether work is accepted, revised, deferred, or rejected

### Agent Responsibilities

The agent owns execution within the provided scope.

The agent is responsible for:

- Inspecting relevant files, configuration, and local documentation before changing anything
- Calling out assumptions, missing context, and conflicts early
- Proposing a narrow plan when the task is non-trivial
- Making changes incrementally inside the approved scope
- Preserving unrelated work and avoiding unsupported assumptions about the repository
- Running specified validations when available
- Reporting results using explicit status states
- Stopping and escalating when risk or uncertainty exceeds the allowed threshold

### Shared Responsibilities

Both parties are responsible for:

- Keeping scope explicit
- Using concise, operational language
- Distinguishing facts from assumptions
- Maintaining a reviewable evidence trail
- Avoiding silent changes to goals, constraints, or approval boundaries
- Protecting secrets, credentials, and sensitive data

## Task Intake and Handoff Process

Non-trivial work requires a written task brief before execution starts.

The handoff process is:

1. The human prepares a task brief using the `## Task Template` section in `docs/WORKFLOW.md` or an equivalent format.
2. The agent inspects the current workspace, relevant files, and local instructions.
3. The agent confirms scope, notes assumptions, and identifies any missing critical context.
4. If the task is viable, the agent states a narrow execution plan.
5. If the task is not viable, the agent stops and escalates with the blocking reason.

Briefs should reference paths, commands, environment variables, and constraints using portable forms such as relative paths, `$HOME`, and documented shell commands.

## Task Template

Use this brief before starting non-trivial work.

### Objective

What outcome is required?

### Background/Context

What project context, prior decisions, paths, or documents matter?

### In-Scope Work

- Item

### Out-of-Scope Work

- Item

### Constraints

- Constraint

### Required Commands/Tests

- Command or check

For each item, note expected use:

- `required`
- `optional`
- `not available in this environment`

### Acceptance Criteria

- Criterion

### Deliverables

- File, artifact, or summary to produce

### Risks

- Known risk

### Unknowns Requiring Escalation

- Unknown or decision placeholder

## Execution Loop

The agent follows this loop:

1. Inspect the relevant files and current state.
2. Clarify assumptions and mark unknowns.
3. Plan narrowly.
4. Implement incrementally.
5. Validate with the required commands or checks.
6. Summarize evidence against the acceptance criteria.
7. Stop or continue based on results and risk.

Rules for the loop:

- Work sequentially unless parallel work is clearly safe.
- Prefer small, reviewable changes over broad edits.
- Reassess after each failed validation or material surprise.
- Do not continue through unresolved high-risk uncertainty.

## Validation and Evidence Requirements

Every requested validation or relevant check must be reported in one of these states:

- `performed and passed`
- `performed and failed`
- `could not be performed`
- `not applicable`

Evidence should include:

- The command, test, or check that was used
- The outcome state
- A short result summary
- Any relevant artifact path if one was produced

If validation could not be performed, the agent must state why. If a requested check is not applicable, the agent must state what condition made it irrelevant.

Claims of completion must be tied directly to the acceptance criteria, not just to file changes.

## Risk Thresholds and Stop Conditions

The agent must stop and escalate when any of the following applies:

- Missing critical context prevents a safe or correct change
- The next step is destructive or high-risk without explicit approval
- Instructions conflict and the conflict is unresolved
- Repeated failed attempts indicate the current approach is not working
- Correctness cannot be verified with reasonable evidence
- A secret, credential, token, key, or other sensitive material may be exposed
- The requested action would exceed the stated scope
- A dependency on unavailable tools, permissions, or environments blocks safe execution

Minimum stop rule for repeated failed attempts:

- Stop after two materially similar failed attempts unless new evidence justifies one more try.

## Definition of Done

Work is done only when both conditions are true:

1. The requested in-scope work is complete.
2. Evidence is provided and tied to the acceptance criteria.

Done requires:

- Requested deliverables are present
- Scope boundaries were respected
- Validation results are reported with explicit status states
- Assumptions and unresolved items are called out
- The human has enough evidence to make a final approval decision

## Escalation Rules

Escalate immediately when:

- A stop condition is met
- A decision requires human judgment on product intent, priority, policy, or risk tolerance
- The task brief is incomplete in a way that changes implementation choices
- Validation results conflict with the stated acceptance criteria

Escalation output should include:

- What blocked progress
- What was attempted
- What assumption or decision is needed
- The safest next options

## Assumptions and Open Decisions

- Assumption: The workflow will be used in Unix-like shell environments.
- Assumption: Non-trivial work means any task that changes multiple files, affects behavior, or requires validation.
- Assumption: Product-specific contribution rules, if any, live outside this document.
- Open decision: Define whether trivial tasks may bypass the written brief in this workspace.
- Open decision: Define whether the human wants pre-approval for specific command classes such as package installation, network calls, or file deletion.
- Open decision: Define the preferred location for evidence artifacts if a project requires saved logs or reports.

## AI Review Checklist

### Correctness

- Output matches the stated objective.
- In-scope work is complete.
- Out-of-scope work was not done.
- Acceptance criteria are met or gaps are explicit.

### Safety/Risk

- No destructive action happened without approval.
- No secrets or sensitive data were exposed.
- Conflicts, assumptions, and blockers were surfaced.
- High-risk uncertainty caused a stop, not a guess.

### Portability

- Paths use relative forms, `$HOME`, or env vars where practical.
- Commands are usable on Unix-like systems.
- Machine-specific assumptions are avoided or marked.

### Evidence

- Each validation is labeled `performed and passed`, `performed and failed`, `could not be performed`, or `not applicable`.
- Evidence is tied to acceptance criteria.
- Failures and skipped checks include a reason.

### Maintainability

- Changes are narrow and reviewable.
- Wording is clear and operational.
- Assumptions and open decisions are documented.

### Completion Quality

- Deliverables requested in the brief exist.
- Summary states what was created or changed.
- Remaining risks and unresolved decisions are explicit.
- Final approval is still left to the human.

# Reusability and Efficiency

For reusable project patterns and practices, create a strategy to prioritize prompt and handoff compactness through utilizing your resources and referencing these files instead of pasting large instructions inline. Resources include: agent/harness memory, docs files, mcp servers, and so on. Once you have created a strategy, update the block below.

# Strategy for Efficiency

Start each non-trivial task by reading `AGENTS.md` and only the relevant files in `docs/`; reference those paths in handoffs instead of copying their contents. Read the matching local skill and the narrow Next.js 16 guide under `node_modules/next/dist/docs/` before framework changes. Keep durable product decisions in `docs/ARCHITECTURE.md`, constraints in `docs/CONSTRAINTS.md`, reusable UX decisions in focused files such as `docs/CAROUSEL_UX.md`, and validation evidence in `test-results/`.

Use repository search and git history for code context, then make the smallest coherent patch. Parallelize independent read-only checks, but serialize edits that share layout or content contracts. Handoffs should contain the objective, owned paths, acceptance criteria, constraints, and commands by reference; final reports should map each criterion to a passed, failed, unavailable, or not-applicable check.

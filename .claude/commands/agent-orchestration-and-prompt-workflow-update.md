---
name: agent-orchestration-and-prompt-workflow-update
description: Workflow command scaffold for agent-orchestration-and-prompt-workflow-update in code-scenario-vscode.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /agent-orchestration-and-prompt-workflow-update

Use this workflow when working on **agent-orchestration-and-prompt-workflow-update** in `code-scenario-vscode`.

## Goal

Adds or updates agent workflow documentation and related prompts for orchestration or PM processes.

## Common Files

- `.github/agents/*.agent.md`
- `.github/prompts/*.prompt.md`
- `.github/progress/agents/orchestration/*.md`
- `.github/instructions/*.instructions.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Update or add .github/agents/*.agent.md files for new or changed agents
- Update or add .github/prompts/*.prompt.md files for new or changed prompts
- Update related .github/progress/agents/orchestration/*.md progress documentation
- Optionally update .github/instructions/*.instructions.md

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
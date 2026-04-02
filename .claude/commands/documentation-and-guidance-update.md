---
name: documentation-and-guidance-update
description: Workflow command scaffold for documentation-and-guidance-update in code-scenario-vscode.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /documentation-and-guidance-update

Use this workflow when working on **documentation-and-guidance-update** in `code-scenario-vscode`.

## Goal

Updates documentation and workflow guidance, especially for Copilot and commit workflows.

## Common Files

- `.github/copilot-instructions.md`
- `.github/workflows/copilot-instructions.md`
- `.github/progress/feature/*/*.md`
- `.github/skills/*/SKILL.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Update or add markdown files for instructions in .github/ or .github/workflows/
- Update or add progress tracking markdown files in .github/progress/feature/*/
- Update or add skill documentation in .github/skills/*/SKILL.md

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
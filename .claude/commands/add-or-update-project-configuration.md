---
name: add-or-update-project-configuration
description: Workflow command scaffold for add-or-update-project-configuration in code-scenario-vscode.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-project-configuration

Use this workflow when working on **add-or-update-project-configuration** in `code-scenario-vscode`.

## Goal

Adds or updates project-level configuration files for development, publishing, or licensing.

## Common Files

- `.github/workflows/*.yml`
- `.vscode/launch.json`
- `.vscode/tasks.json`
- `LICENSE.txt`
- `package.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add or update configuration files in .github/workflows/ for CI/CD
- Add or update files in .vscode/ for local development tasks and launch settings
- Add or update LICENSE.txt
- Update package.json with publisher or repository information

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
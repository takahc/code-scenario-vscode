---
name: feature-development-with-progress-tracking
description: Workflow command scaffold for feature-development-with-progress-tracking in code-scenario-vscode.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-progress-tracking

Use this workflow when working on **feature-development-with-progress-tracking** in `code-scenario-vscode`.

## Goal

Implements a new feature and documents its progress using progress files and skill documentation.

## Common Files

- `src/extension.ts`
- `src/itemEditorPanel.ts`
- `src/scenarioModel.ts`
- `package.json`
- `.github/progress/feature/enhance-ux/*.md`
- `.github/progress/feature-enhance-ux/*.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Implement or update feature code in src/ files and package.json
- Create or update .github/progress/feature/... progress markdown files describing feature steps
- Update or add .github/skills/.../SKILL.md to document new skills or workflows
- Optionally update .github/copilot-instructions.md for commit guidance

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
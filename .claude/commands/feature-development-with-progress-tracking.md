---
name: feature-development-with-progress-tracking
description: Workflow command scaffold for feature-development-with-progress-tracking in code-scenario-vscode.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-with-progress-tracking

Use this workflow when working on **feature-development-with-progress-tracking** in `code-scenario-vscode`.

## Goal

Implements a new feature and tracks its progress using dedicated progress markdown files and skill documentation.

## Common Files

- `src/extension.ts`
- `src/itemEditorPanel.ts`
- `src/scenarioModel.ts`
- `package.json`
- `.github/progress/feature/*/*.md`
- `.github/skills/*/SKILL.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update feature implementation files in src/ (e.g., src/extension.ts, src/itemEditorPanel.ts, src/scenarioModel.ts)
- Update package.json if necessary
- Add or update progress tracking markdown files in .github/progress/feature/<feature-name>/
- Add or update skill documentation in .github/skills/<skill>/SKILL.md

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
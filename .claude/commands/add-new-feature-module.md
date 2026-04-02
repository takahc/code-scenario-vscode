---
name: add-new-feature-module
description: Workflow command scaffold for add-new-feature-module in code-scenario-vscode.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-feature-module

Use this workflow when working on **add-new-feature-module** in `code-scenario-vscode`.

## Goal

Implements a new feature or module by creating new TypeScript source files, updating the extension entry point, and modifying configuration/manifest files.

## Common Files

- `src/*.ts`
- `package.json`
- `tsconfig.json`
- `resources/*.svg`
- `.gitignore`
- `.vscodeignore`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update TypeScript source files in src/ (e.g., scenarioModel.ts, scenarioProvider.ts, symbolResolver.ts, extension.ts)
- Add or update package.json with new commands, menus, or contributions
- Update or add configuration files such as tsconfig.json
- Add or update resource files (e.g., icons in resources/)
- Update .gitignore and .vscodeignore as needed

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.